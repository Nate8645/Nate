'use strict';

const crypto = require('crypto');
const { one, run, nowIso } = require('./db');

const SESSION_COOKIE = 'ul_session';
const CSRF_COOKIE = 'ul_csrf';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 210_000;
const PASSWORD_MIN_LENGTH = 10;
let ephemeralSecret;

function getSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to at least 32 characters in production.');
  }
  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(32).toString('hex');
    console.warn('Warning: SESSION_SECRET is not set. Using an ephemeral development secret.');
  }
  return ephemeralSecret;
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join('=') || '');
    return acc;
  }, {});
}

function cookieString(name, value, { maxAge, httpOnly = true, sameSite = 'Lax', path = '/', secure } = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (typeof maxAge === 'number') parts.push(`Max-Age=${maxAge}`);
  const shouldSecure = secure ?? process.env.NODE_ENV === 'production';
  if (shouldSecure) parts.push('Secure');
  return parts.join('; ');
}

function setCookie(res, name, value, options = {}) {
  res.append('Set-Cookie', cookieString(name, value, options));
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  const actual = crypto.pbkdf2Sync(password, salt, iterations, Buffer.from(expected, 'hex').length, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function passwordPolicyError(password) {
  if (String(password || '').length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include letters and at least one number.';
  }
  return null;
}

function isAdminEmail(email) {
  const configured = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(normalizeEmail(email));
}

function createUser(db, { name, email, password }) {
  const cleanEmail = normalizeEmail(email);
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) throw new Error('Name is required.');
  if (!isValidEmail(cleanEmail)) throw new Error('Valid email is required.');
  const policy = passwordPolicyError(password);
  if (policy) throw new Error(policy);

  const existing = one(db, 'SELECT id FROM users WHERE email = :email', { email: cleanEmail });
  if (existing) throw new Error('An account already exists for this email.');

  const userCount = Number(one(db, 'SELECT COUNT(*) AS n FROM users')?.n || 0);
  const role = userCount === 0 || isAdminEmail(cleanEmail) ? 'admin' : 'user';
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO users (email, name, password_hash, role, created_at, updated_at)
                          VALUES (:email, :name, :passwordHash, :role, :createdAt, :updatedAt)`, {
    email: cleanEmail,
    name: cleanName,
    passwordHash: hashPassword(password),
    role,
    createdAt,
    updatedAt: createdAt,
  });
  return one(db, 'SELECT * FROM users WHERE id = :id', { id: Number(result.lastInsertRowid) });
}

function createSession(db, user, req, res) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO sessions (token_hash, user_id, csrf_token, ip, user_agent, created_at, expires_at)
                          VALUES (:tokenHash, :userId, :csrfToken, :ip, :userAgent, :createdAt, :expiresAt)`, {
    tokenHash: sha256(rawToken),
    userId: user.id,
    csrfToken,
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    createdAt,
    expiresAt: expires,
  });
  run(db, 'UPDATE users SET last_login_at = :lastLoginAt, updated_at = :updatedAt WHERE id = :id', {
    id: user.id,
    lastLoginAt: createdAt,
    updatedAt: createdAt,
  });
  setCookie(res, SESSION_COOKIE, rawToken, { maxAge: SESSION_DAYS * 24 * 60 * 60, httpOnly: true });
  clearCookie(res, CSRF_COOKIE);
  return Number(result.lastInsertRowid);
}

function destroySession(db, req, res) {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (rawToken) {
    run(db, 'DELETE FROM sessions WHERE token_hash = :tokenHash', { tokenHash: sha256(rawToken) });
  }
  clearCookie(res, SESSION_COOKIE);
}

function loadUser(db) {
  return (req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie || '');
    res.setHeader('Vary', 'Cookie');

    const rawToken = req.cookies[SESSION_COOKIE];
    if (!rawToken) return next();

    const session = one(db, `SELECT sessions.*, users.email, users.name, users.role, users.plan, users.stripe_customer_id,
                                   users.stripe_subscription_id, users.subscription_status, users.created_at AS user_created_at
                            FROM sessions
                            JOIN users ON users.id = sessions.user_id
                            WHERE sessions.token_hash = :tokenHash`, { tokenHash: sha256(rawToken) });
    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      if (session) run(db, 'DELETE FROM sessions WHERE id = :id', { id: session.id });
      clearCookie(res, SESSION_COOKIE);
      return next();
    }

    req.session = {
      id: session.id,
      userId: session.user_id,
      csrfToken: session.csrf_token,
      expiresAt: session.expires_at,
    };
    req.user = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      role: session.role,
      plan: session.plan,
      stripeCustomerId: session.stripe_customer_id,
      stripeSubscriptionId: session.stripe_subscription_id,
      subscriptionStatus: session.subscription_status,
      createdAt: session.user_created_at,
    };
    next();
  };
}

function csrfMiddleware() {
  return (req, res, next) => {
    if (req.path === '/webhooks/stripe') return next();
    let token = req.session?.csrfToken || req.cookies?.[CSRF_COOKIE];
    if (!token || token.length < 20) {
      token = crypto.randomBytes(24).toString('base64url');
      if (!req.session) setCookie(res, CSRF_COOKIE, token, { maxAge: 2 * 60 * 60, httpOnly: true });
    }
    req.csrfToken = token;

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const supplied = req.body?.csrf_token || req.headers['x-csrf-token'];
      if (!supplied || supplied !== token) {
        return res.status(403).send('Invalid CSRF token. Refresh the page and try again.');
      }
    }
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    const returnTo = encodeURIComponent(req.originalUrl || '/dashboard');
    return res.redirect(`/login?returnTo=${returnTo}`);
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl || '/admin')}`);
  if (req.user.role !== 'admin') return res.status(403).send('Admin access required.');
  next();
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim()
    .slice(0, 80);
}

function hmac(input) {
  return crypto.createHmac('sha256', getSecret()).update(input).digest('hex');
}

module.exports = {
  SESSION_COOKIE,
  CSRF_COOKIE,
  parseCookies,
  setCookie,
  clearCookie,
  sha256,
  hmac,
  hashPassword,
  verifyPassword,
  normalizeEmail,
  isValidEmail,
  passwordPolicyError,
  createUser,
  createSession,
  destroySession,
  loadUser,
  csrfMiddleware,
  requireAuth,
  requireAdmin,
  clientIp,
};

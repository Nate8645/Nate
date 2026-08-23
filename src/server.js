'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const { openDatabase, one, all, run, nowIso, insertUsage, insertAnalytics, monthlyUsage, dashboardMetrics } = require('./db');
const { createUser, createSession, destroySession, loadUser, csrfMiddleware, requireAuth, requireAdmin, normalizeEmail, verifyPassword, clientIp, sha256 } = require('./auth');
const { getPlan, plans } = require('./plans');
const { activeAiProvider, generateLaunchKit } = require('./ai');
const { stripeClient, createCheckoutSession, createPilotCheckoutSession, createPortalSession, stripeWebhookHandler, syncCheckoutSession } = require('./stripe');
const views = require('./views');

function createApp(options = {}) {
  const db = options.db || openDatabase(options.dbPath);
  const app = express();
  app.locals.db = db;
  app.locals.close = () => db.close?.();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(securityHeaders);
  app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler(db));
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.use(loadUser(db));
  app.use(express.urlencoded({ extended: false, limit: '80kb' }));
  app.use(express.json({ limit: '80kb' }));
  app.use(csrfMiddleware());
  app.use(trackPageViews(db));

  app.get('/', (req, res) => res.send(views.heroPage(req)));
  app.get('/features', (req, res) => res.send(views.featuresPage(req)));
  app.get('/pricing', (req, res) => res.send(views.pricingPage(req, req.query.message || '')));
  app.get('/pilot', (req, res) => res.send(views.pilotPage(req, { message: req.query.message || '', error: req.query.error || '' })));
  app.post('/pilot/request', rateLimit({ windowMs: 15 * 60 * 1000, max: 6, prefix: 'pilot-request' }), (req, res) => {
    try {
      const name = safeText(req.body.name, 80);
      const email = normalizeEmail(req.body.email);
      const company = safeText(req.body.company, 120, false);
      const website = safeText(req.body.website, 200, false);
      const offer = safeText(req.body.offer, 1200);
      const urgency = safeChoice(req.body.urgency, ['Need first customer this week', 'Launching in 30 days', 'Testing positioning', 'Agency/client workflow'], 'Need first customer this week');
      const budget = safeChoice(req.body.budget, ['Ready for $199 sprint', 'Need free kit first', 'Considering subscription only', 'Not sure yet'], 'Not sure yet');
      if (!name || !isEmail(email) || !offer) throw new Error('Name, valid email, and offer are required.');
      run(db, `INSERT INTO pilot_requests (user_id, name, email, company, website, offer, urgency, budget, status, created_at, updated_at)
               VALUES (:userId, :name, :email, :company, :website, :offer, :urgency, :budget, 'new', :createdAt, :updatedAt)`, {
        userId: req.user?.id || null,
        name,
        email,
        company,
        website,
        offer,
        urgency,
        budget,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      insertAnalytics(db, eventContext(req, 'pilot_request_submitted', { budget, urgency }));
      res.redirect('/pilot?message=Pilot%20request%20received.%20We%20will%20follow%20up%20with%20next%20steps.');
    } catch (error) {
      res.status(400).send(views.pilotPage(req, { error: error.message }));
    }
  });
  app.get('/use-cases', (req, res) => res.send(views.useCasesPage(req)));
  app.get('/faq', (req, res) => res.send(views.faqPage(req)));

  app.get('/contact', (req, res) => res.send(views.contactPage(req)));
  app.post('/contact', rateLimit({ windowMs: 15 * 60 * 1000, max: 6, prefix: 'contact' }), (req, res) => {
    try {
      const name = safeText(req.body.name, 80);
      const email = normalizeEmail(req.body.email);
      const company = safeText(req.body.company, 120, false);
      const message = safeText(req.body.message, 2000);
      if (!name || !isEmail(email) || !message) throw new Error('Name, valid email, and message are required.');
      run(db, `INSERT INTO contacts (name, email, company, message, created_at)
               VALUES (:name, :email, :company, :message, :createdAt)`, {
        name,
        email,
        company,
        message,
        createdAt: nowIso(),
      });
      insertAnalytics(db, eventContext(req, 'contact_submitted', { email }));
      res.send(views.contactPage(req, { message: 'Message received. We will reply as soon as possible.' }));
    } catch (error) {
      res.status(400).send(views.contactPage(req, { error: error.message }));
    }
  });

  app.get('/register', redirectIfAuthed('/dashboard'), (req, res) => res.send(views.authPage(req, { mode: 'register' })));
  app.post('/register', redirectIfAuthed('/dashboard'), rateLimit({ windowMs: 15 * 60 * 1000, max: 8, prefix: 'register' }), (req, res) => {
    try {
      const user = createUser(db, {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
      });
      createSession(db, user, req, res);
      insertUsage(db, { userId: user.id, eventType: 'signup', units: 1 });
      insertAnalytics(db, eventContext(req, 'signup_completed', { userId: user.id }));
      res.redirect('/dashboard?message=Account%20created');
    } catch (error) {
      res.status(400).send(views.authPage(req, { mode: 'register', error: error.message }));
    }
  });

  app.get('/login', redirectIfAuthed('/dashboard'), (req, res) => {
    res.send(views.authPage(req, { mode: 'login', returnTo: safeReturnTo(req.query.returnTo, '') }));
  });
  app.post('/login', redirectIfAuthed('/dashboard'), rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'login' }), (req, res) => {
    const returnTo = safeReturnTo(req.body.returnTo, '/dashboard');
    try {
      const email = normalizeEmail(req.body.email);
      const user = one(db, 'SELECT * FROM users WHERE email = :email', { email });
      if (!user || !verifyPassword(String(req.body.password || ''), user.password_hash)) {
        throw new Error('Invalid email or password.');
      }
      createSession(db, user, req, res);
      insertAnalytics(db, eventContext(req, 'login_completed', { userId: user.id }));
      res.redirect(returnTo);
    } catch (error) {
      res.status(400).send(views.authPage(req, { mode: 'login', error: error.message, returnTo }));
    }
  });

  app.post('/logout', requireAuth, (req, res) => {
    destroySession(db, req, res);
    res.redirect('/?message=Logged%20out');
  });

  app.get('/dashboard', requireAuth, (req, res) => {
    res.send(renderDashboard(req, db, { message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/dashboard/launch-kits', requireAuth, rateLimit({ windowMs: 60 * 60 * 1000, max: 20, prefix: 'kit' }), async (req, res, next) => {
    try {
      const plan = getPlan(req.user.plan);
      const used = monthlyUsage(db, req.user.id, 'launch_kit_generated');
      if (used >= plan.kitLimit) {
        return res.status(402).send(renderDashboard(req, db, { error: `Monthly kit limit reached for ${plan.name}. Upgrade to continue.` }));
      }

      const input = {
        businessName: safeText(req.body.businessName, 100),
        industry: safeText(req.body.industry, 100),
        audience: safeText(req.body.audience, 700),
        offer: safeText(req.body.offer, 900),
        goal: safeChoice(req.body.goal, ['Get first paying customer', 'Book 10 demos', 'Validate pricing', 'Launch ecommerce product', 'Build agency lead magnet'], 'Get first paying customer'),
        tone: safeChoice(req.body.tone, ['Direct and premium', 'Friendly and practical', 'Bold and disruptive', 'Technical and credible'], 'Direct and premium'),
        website: safeText(req.body.website, 200, false),
        language: safeChoice(req.body.language, ['English', 'German'], 'English'),
        ecommerce: req.body.ecommerce === 'yes' ? 'yes' : 'no',
      };
      if (!input.businessName || !input.industry || !input.audience || !input.offer) {
        throw new Error('Business name, industry, audience, and offer are required.');
      }

      const { result, provider } = await generateLaunchKit(input);
      const createdAt = nowIso();
      const insert = run(db, `INSERT INTO launch_kits (user_id, name, industry, input_json, result_json, ai_provider, created_at)
                              VALUES (:userId, :name, :industry, :inputJson, :resultJson, :provider, :createdAt)`, {
        userId: req.user.id,
        name: input.businessName,
        industry: input.industry,
        inputJson: JSON.stringify(input),
        resultJson: JSON.stringify(result),
        provider,
        createdAt,
      });
      insertUsage(db, { userId: req.user.id, eventType: 'launch_kit_generated', units: 1, metadata: { kitId: Number(insert.lastInsertRowid), provider } });
      insertAnalytics(db, eventContext(req, 'launch_kit_generated', { kitId: Number(insert.lastInsertRowid), provider }));
      res.redirect(`/dashboard/kits/${Number(insert.lastInsertRowid)}`);
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('AI')) console.error(error);
      res.status(400).send(renderDashboard(req, db, { error: error.message }));
    }
  });

  app.get('/dashboard/kits/:id', requireAuth, (req, res) => {
    const kit = getUserKit(db, req.user, req.params.id);
    if (!kit) return res.status(404).send(views.errorPage(req, { status: 404, title: 'Kit not found', message: 'This launch kit does not exist or belongs to another account.' }));
    res.send(views.kitPage(req, { kit, result: JSON.parse(kit.result_json) }));
  });

  app.get('/dashboard/kits/:id/download', requireAuth, (req, res) => {
    const kit = getUserKit(db, req.user, req.params.id);
    if (!kit) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="launch-kit-${kit.id}.json"`);
    res.send(JSON.stringify({ ...kit, input: JSON.parse(kit.input_json), result: JSON.parse(kit.result_json) }, null, 2));
  });

  app.get('/support', requireAuth, (req, res) => {
    const tickets = all(db, 'SELECT * FROM support_tickets WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId: req.user.id });
    res.send(views.supportPage(req, { tickets, message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/support', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 8, prefix: 'support' }), (req, res) => {
    try {
      const subject = safeText(req.body.subject, 120);
      const message = safeText(req.body.message, 3000);
      if (!subject || !message) throw new Error('Subject and message are required.');
      run(db, `INSERT INTO support_tickets (user_id, name, email, subject, message, status, created_at, updated_at)
               VALUES (:userId, :name, :email, :subject, :message, 'open', :createdAt, :updatedAt)`, {
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        subject,
        message,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      insertAnalytics(db, eventContext(req, 'support_ticket_created', { subject }));
      res.redirect('/support?message=Ticket%20opened');
    } catch (error) {
      res.redirect(`/support?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/billing', requireAuth, (req, res) => res.send(views.billingPage(req, { message: req.query.message || '', error: req.query.error || '' })));

  app.post('/billing/checkout/:plan', requireAuth, rateLimit({ windowMs: 10 * 60 * 1000, max: 12, prefix: 'checkout' }), async (req, res, next) => {
    try {
      const planKey = safeChoice(req.params.plan, Object.keys(plans), 'free');
      if (planKey === 'free') return res.redirect('/billing');
      const session = await createCheckoutSession(db, req, planKey);
      if (!session.configured) return res.status(412).send(views.stripeConfigPage(req, { planKey }));
      insertAnalytics(db, eventContext(req, 'stripe_checkout_started', { plan: planKey, sessionId: session.id }));
      res.redirect(303, session.url);
    } catch (error) {
      next(error);
    }
  });

  app.post('/billing/checkout-pilot', requireAuth, rateLimit({ windowMs: 10 * 60 * 1000, max: 12, prefix: 'pilot-checkout' }), async (req, res, next) => {
    try {
      const session = await createPilotCheckoutSession(db, req);
      if (!session.configured) return res.status(412).send(views.stripeConfigPage(req, { planKey: 'pilot' }));
      insertAnalytics(db, eventContext(req, 'stripe_pilot_checkout_started', { sessionId: session.id }));
      res.redirect(303, session.url);
    } catch (error) {
      next(error);
    }
  });

  app.post('/billing/portal', requireAuth, rateLimit({ windowMs: 10 * 60 * 1000, max: 12, prefix: 'portal' }), async (req, res, next) => {
    try {
      const session = await createPortalSession(db, req);
      if (!session.configured) {
        return res.status(412).send(views.billingPage(req, { error: session.reason || 'Stripe Customer Portal is not configured yet.' }));
      }
      insertAnalytics(db, eventContext(req, 'stripe_portal_started'));
      res.redirect(303, session.url);
    } catch (error) {
      next(error);
    }
  });

  app.get('/billing/success', requireAuth, async (req, res, next) => {
    try {
      if (req.query.session_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = stripeClient();
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        if (String(session.metadata?.userId || session.client_reference_id) === String(req.user.id)) {
          await syncCheckoutSession(db, session);
        }
      }
      const message = req.query.kind === 'pilot'
        ? 'Payment flow completed. Your Concierge Launch Sprint order is recorded after Stripe webhook confirmation.'
        : 'Payment flow completed. Subscription status is updated by Stripe webhooks.';
      res.send(views.billingPage(refreshReqUser(req, db), { message }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/billing/cancel', requireAuth, (req, res) => {
    res.send(views.billingPage(req, { error: 'Checkout was canceled. No payment was made.' }));
  });

  app.get('/admin', requireAdmin, (req, res) => {
    res.send(adminView(req, db, req.query.message || ''));
  });

  app.post('/admin/tickets/:id/status', requireAdmin, (req, res) => {
    const status = safeChoice(req.body.status, ['open', 'waiting', 'closed'], 'open');
    run(db, 'UPDATE support_tickets SET status = :status, updated_at = :updatedAt WHERE id = :id', {
      status,
      updatedAt: nowIso(),
      id: Number(req.params.id),
    });
    res.redirect('/admin?message=Ticket%20updated');
  });

  app.post('/admin/pilot-requests/:id/status', requireAdmin, (req, res) => {
    const status = safeChoice(req.body.status, ['new', 'contacted', 'qualified', 'won', 'lost'], 'new');
    run(db, 'UPDATE pilot_requests SET status = :status, updated_at = :updatedAt WHERE id = :id', {
      status,
      updatedAt: nowIso(),
      id: Number(req.params.id),
    });
    res.redirect('/admin?message=Pilot%20lead%20updated');
  });

  app.get('/admin/pilot-requests.csv', requireAdmin, (req, res) => {
    const rows = all(db, 'SELECT id, name, email, company, website, offer, urgency, budget, status, created_at FROM pilot_requests ORDER BY created_at DESC');
    sendCsv(res, 'pilot-requests.csv', ['id', 'name', 'email', 'company', 'website', 'offer', 'urgency', 'budget', 'status', 'created_at'], rows);
  });

  app.get('/admin/contacts.csv', requireAdmin, (req, res) => {
    const rows = all(db, 'SELECT id, name, email, company, message, created_at FROM contacts ORDER BY created_at DESC');
    sendCsv(res, 'contacts.csv', ['id', 'name', 'email', 'company', 'message', 'created_at'], rows);
  });

  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ user: req.user, plan: getPlan(req.user.plan), aiProvider: activeAiProvider() });
  });

  app.get('/health', (req, res) => res.json({ ok: true, app: process.env.APP_NAME || 'UltraLaunch AI', time: nowIso(), aiProvider: activeAiProvider() }));

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: ' + (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '') + '/sitemap.xml\n');
  });

  app.get('/sitemap.xml', (req, res) => {
    const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const paths = ['/', '/features', '/pricing', '/pilot', '/use-cases', '/faq', '/contact', '/login', '/register'];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${base}${p}</loc></url>`).join('')}</urlset>`);
  });

  app.use((req, res) => {
    res.status(404).send(views.errorPage(req, { status: 404, title: 'Page not found', message: 'The page you requested does not exist.' }));
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send(views.errorPage(req, { status: 500, title: 'Server error', message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : error.message }));
  });

  return app;
}

function renderDashboard(req, db, { message = '', error = '' } = {}) {
  const freshUser = one(db, 'SELECT * FROM users WHERE id = :id', { id: req.user.id });
  req.user = mapUser(freshUser);
  const plan = getPlan(req.user.plan);
  const used = monthlyUsage(db, req.user.id, 'launch_kit_generated');
  const kits = all(db, 'SELECT * FROM launch_kits WHERE user_id = :userId ORDER BY created_at DESC LIMIT 8', { userId: req.user.id });
  return views.dashboardPage(req, {
    plan,
    used,
    remaining: Math.max(0, plan.kitLimit - used),
    kits,
    message,
    error,
    provider: activeAiProvider(),
  });
}

function getUserKit(db, user, id) {
  const kitId = Number(id);
  if (!Number.isInteger(kitId) || kitId <= 0) return null;
  if (user.role === 'admin') return one(db, 'SELECT * FROM launch_kits WHERE id = :id', { id: kitId });
  return one(db, 'SELECT * FROM launch_kits WHERE id = :id AND user_id = :userId', { id: kitId, userId: user.id });
}

function adminView(req, db, message = '') {
  const metrics = dashboardMetrics(db);
  const users = all(db, 'SELECT id, name, email, role, plan, subscription_status, created_at FROM users ORDER BY created_at DESC LIMIT 20');
  const tickets = all(db, `SELECT * FROM support_tickets WHERE status != 'closed' ORDER BY created_at DESC LIMIT 20`);
  const pilotRequests = all(db, `SELECT * FROM pilot_requests WHERE status != 'lost' ORDER BY created_at DESC LIMIT 20`);
  const orders = all(db, `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20`);
  const events = all(db, 'SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 30');
  return views.adminPage(req, { metrics, users, tickets, pilotRequests, orders, events, message });
}

function refreshReqUser(req, db) {
  const user = one(db, 'SELECT * FROM users WHERE id = :id', { id: req.user.id });
  req.user = mapUser(user);
  return req;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    createdAt: row.created_at,
  };
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'self'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

const buckets = new Map();
function rateLimit({ windowMs, max, prefix }) {
  return (req, res, next) => {
    const key = `${prefix}:${clientIp(req)}:${req.user?.id || 'anon'}`;
    const now = Date.now();
    const existing = buckets.get(key) || { count: 0, reset: now + windowMs };
    if (existing.reset < now) {
      existing.count = 0;
      existing.reset = now + windowMs;
    }
    existing.count += 1;
    buckets.set(key, existing);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - existing.count)));
    if (existing.count > max) {
      return res.status(429).send('Rate limit exceeded. Please wait and try again.');
    }
    next();
  };
}

function trackPageViews(db) {
  return (req, res, next) => {
    if (req.method === 'GET' && acceptsHtml(req) && !req.path.startsWith('/api') && req.path !== '/health' && !req.path.endsWith('.xml') && !req.path.endsWith('.txt')) {
      try {
        insertAnalytics(db, eventContext(req, 'page_view'));
      } catch (error) {
        console.warn('Analytics insert failed:', error.message);
      }
    }
    next();
  };
}

function eventContext(req, eventName, metadata = null) {
  return {
    userId: req.user?.id || null,
    sessionId: req.session?.id || null,
    eventName,
    path: req.originalUrl?.slice(0, 500) || req.path,
    referrer: String(req.headers.referer || req.headers.referrer || '').slice(0, 500) || null,
    ipHash: sha256(clientIp(req) || 'unknown').slice(0, 32),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    metadata,
  };
}

function acceptsHtml(req) {
  const accept = String(req.headers.accept || '');
  return !accept || accept.includes('text/html') || accept.includes('*/*');
}

function redirectIfAuthed(pathname) {
  return (req, res, next) => {
    if (req.user) return res.redirect(pathname);
    next();
  };
}

function safeText(value, max, required = true) {
  const text = String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (required && !text) throw new Error('Required field is missing.');
  return text.slice(0, max);
}

function safeChoice(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function safeReturnTo(value, fallback = '/dashboard') {
  const text = String(value || '');
  if (text.startsWith('/') && !text.startsWith('//') && !text.includes('://')) return text;
  return fallback;
}

function sendCsv(res, filename, headers, rows) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv + '\n');
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const app = createApp();
  const server = app.listen(port, host, () => {
    console.log(`${process.env.APP_NAME || 'UltraLaunch AI'} listening on http://${host}:${port}`);
    console.log(`AI provider: ${activeAiProvider()}`);
    if (!process.env.STRIPE_SECRET_KEY) console.log('Stripe is not configured yet. Set STRIPE_SECRET_KEY and price IDs before accepting real payments.');
  });
  const shutdown = () => {
    server.close(() => {
      app.locals.close?.();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { createApp };

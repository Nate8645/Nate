'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function nowIso() {
  return new Date().toISOString();
}

function defaultDbPath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ultralaunch.sqlite');
}

function openDatabase(dbPath = defaultDbPath()) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  runMigrations(db);
  return db;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      plan TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS launch_kits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      input_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      ai_provider TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_launch_kits_user_id ON launch_kits(user_id);

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      units INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_usage_user_created ON usage_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_event_type ON usage_events(event_type);

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      session_id INTEGER,
      event_name TEXT NOT NULL,
      path TEXT,
      referrer TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pilot_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      website TEXT,
      offer TEXT NOT NULL,
      urgency TEXT NOT NULL,
      budget TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pilot_requests_status ON pilot_requests(status);
    CREATE INDEX IF NOT EXISTS idx_pilot_requests_created ON pilot_requests(created_at);

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      product_key TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      stripe_checkout_session_id TEXT UNIQUE,
      stripe_payment_intent_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_product_key ON orders(product_key);

    CREATE TABLE IF NOT EXISTS stripe_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);
}

function getDb(reqOrApp) {
  if (reqOrApp?.app?.locals?.db) return reqOrApp.app.locals.db;
  if (reqOrApp?.locals?.db) return reqOrApp.locals.db;
  throw new Error('Database not available on app locals.');
}

function one(db, sql, params = {}) {
  return db.prepare(sql).get(params);
}

function all(db, sql, params = {}) {
  return db.prepare(sql).all(params);
}

function run(db, sql, params = {}) {
  return db.prepare(sql).run(params);
}

function insertUsage(db, { userId = null, eventType, units = 1, metadata = null }) {
  run(db, `INSERT INTO usage_events (user_id, event_type, units, metadata, created_at)
           VALUES (:userId, :eventType, :units, :metadata, :createdAt)`, {
    userId,
    eventType,
    units,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: nowIso(),
  });
}

function insertAnalytics(db, { userId = null, sessionId = null, eventName, path: eventPath = null, referrer = null, ipHash = null, userAgent = null, metadata = null }) {
  run(db, `INSERT INTO analytics_events (user_id, session_id, event_name, path, referrer, ip_hash, user_agent, metadata, created_at)
           VALUES (:userId, :sessionId, :eventName, :path, :referrer, :ipHash, :userAgent, :metadata, :createdAt)`, {
    userId,
    sessionId,
    eventName,
    path: eventPath,
    referrer,
    ipHash,
    userAgent,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: nowIso(),
  });
}

function monthlyUsage(db, userId, eventType) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const row = one(db, `SELECT COALESCE(SUM(units), 0) AS units
                       FROM usage_events
                       WHERE user_id = :userId
                         AND event_type = :eventType
                         AND created_at >= :start`, {
    userId,
    eventType,
    start: start.toISOString(),
  });
  return Number(row?.units || 0);
}

function dashboardMetrics(db) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayIso = today.toISOString();

  return {
    users: Number(one(db, 'SELECT COUNT(*) AS n FROM users')?.n || 0),
    paidUsers: Number(one(db, `SELECT COUNT(*) AS n FROM users WHERE plan != 'free' AND subscription_status IN ('active','trialing','past_due')`)?.n || 0),
    paidOrders: Number(one(db, `SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'`)?.n || 0),
    paidRevenueCents: Number(one(db, `SELECT COALESCE(SUM(amount), 0) AS n FROM orders WHERE status = 'paid'`)?.n || 0),
    pilotRequests: Number(one(db, 'SELECT COUNT(*) AS n FROM pilot_requests')?.n || 0),
    newPilotRequests: Number(one(db, `SELECT COUNT(*) AS n FROM pilot_requests WHERE status = 'new'`)?.n || 0),
    launchKits: Number(one(db, 'SELECT COUNT(*) AS n FROM launch_kits')?.n || 0),
    openTickets: Number(one(db, `SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'open'`)?.n || 0),
    visitsToday: Number(one(db, `SELECT COUNT(*) AS n FROM analytics_events WHERE event_name = 'page_view' AND created_at >= :dayIso`, { dayIso })?.n || 0),
    signupsToday: Number(one(db, `SELECT COUNT(*) AS n FROM users WHERE created_at >= :dayIso`, { dayIso })?.n || 0),
    kitsToday: Number(one(db, `SELECT COUNT(*) AS n FROM launch_kits WHERE created_at >= :dayIso`, { dayIso })?.n || 0),
  };
}

module.exports = {
  openDatabase,
  getDb,
  one,
  all,
  run,
  nowIso,
  insertUsage,
  insertAnalytics,
  monthlyUsage,
  dashboardMetrics,
};

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

    CREATE TABLE IF NOT EXISTS user_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      memory_key TEXT NOT NULL,
      memory_value TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'system',
      confidence REAL NOT NULL DEFAULT 0.8,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, memory_key)
    );

    CREATE INDEX IF NOT EXISTS idx_user_memories_user ON user_memories(user_id);

    CREATE TABLE IF NOT EXISTS permission_grants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'limited',
      scope TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, permission_key)
    );

    CREATE INDEX IF NOT EXISTS idx_permission_grants_user ON permission_grants(user_id);

    CREATE TABLE IF NOT EXISTS ai_action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      agent_key TEXT NOT NULL,
      action_type TEXT NOT NULL,
      status TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'low',
      permission_key TEXT,
      summary TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_action_logs_user ON ai_action_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_action_logs_status ON ai_action_logs(status);

    CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      condition_text TEXT NOT NULL,
      action_text TEXT NOT NULL,
      requires_approval INTEGER NOT NULL DEFAULT 1,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id);

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_key TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      priority TEXT NOT NULL DEFAULT 'normal',
      requires_approval INTEGER NOT NULL DEFAULT 1,
      result TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

    CREATE TABLE IF NOT EXISTS connected_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_connected',
      scopes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, provider)
    );

    CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, status);

    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      source_type TEXT NOT NULL,
      name TEXT NOT NULL,
      source_uri TEXT,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'indexed',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_sources_user ON knowledge_sources(user_id, source_type);

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS orchestrator_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id INTEGER REFERENCES ai_conversations(id) ON DELETE SET NULL,
      user_goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_user ON orchestrator_runs(user_id, created_at);

    CREATE TABLE IF NOT EXISTS action_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      run_id INTEGER REFERENCES orchestrator_runs(id) ON DELETE SET NULL,
      task_id INTEGER REFERENCES agent_tasks(id) ON DELETE SET NULL,
      agent_key TEXT NOT NULL,
      action_type TEXT NOT NULL,
      what TEXT NOT NULL,
      why TEXT NOT NULL,
      data_used TEXT NOT NULL,
      tool TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'medium',
      permission_key TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_action_approvals_user ON action_approvals(user_id, status);

    CREATE TABLE IF NOT EXISTS integration_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_connected',
      permissions_json TEXT NOT NULL DEFAULT '[]',
      config_json TEXT,
      last_checked_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, provider_key)
    );

    CREATE INDEX IF NOT EXISTS idx_integration_connections_user ON integration_connections(user_id, provider_key);

    CREATE TABLE IF NOT EXISTS agent_permission_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_key TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      decision TEXT NOT NULL DEFAULT 'ask',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, agent_key, permission_key)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_permission_rules_user ON agent_permission_rules(user_id, agent_key);

    CREATE TABLE IF NOT EXISTS ai_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      goals TEXT NOT NULL,
      tools TEXT NOT NULL,
      permissions TEXT NOT NULL,
      schedule TEXT,
      kpis TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_employees_user ON ai_employees(user_id, status);

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cadence TEXT NOT NULL,
      agent_key TEXT NOT NULL,
      action_text TEXT NOT NULL,
      requires_approval INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      last_run_at TEXT,
      next_run_hint TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user ON scheduled_jobs(user_id, status);

    CREATE TABLE IF NOT EXISTS automation_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_id INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      step_type TEXT NOT NULL DEFAULT 'ai',
      agent_key TEXT,
      action_text TEXT NOT NULL,
      requires_approval INTEGER NOT NULL DEFAULT 1,
      config_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_automation_steps_rule ON automation_steps(rule_id, step_order);
    CREATE INDEX IF NOT EXISTS idx_automation_steps_user ON automation_steps(user_id, rule_id);

    CREATE TABLE IF NOT EXISTS autopilot_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      signal_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_autopilot_signals_user ON autopilot_signals(user_id, status);

    CREATE TABLE IF NOT EXISTS security_settings (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, setting_key)
    );

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
    aiActions: Number(one(db, 'SELECT COUNT(*) AS n FROM ai_action_logs')?.n || 0),
    orchestratorRuns: Number(one(db, 'SELECT COUNT(*) AS n FROM orchestrator_runs')?.n || 0),
    pendingApprovals: Number(one(db, `SELECT COUNT(*) AS n FROM action_approvals WHERE status = 'pending'`)?.n || 0)
      + Number(one(db, `SELECT COUNT(*) AS n FROM agent_tasks WHERE status = 'queued' AND requires_approval = 1`)?.n || 0),
    automationRules: Number(one(db, 'SELECT COUNT(*) AS n FROM automation_rules WHERE is_enabled = 1')?.n || 0),
    integrationsPrepared: Number(one(db, 'SELECT COUNT(*) AS n FROM integration_connections')?.n || 0),
    knowledgeSources: Number(one(db, 'SELECT COUNT(*) AS n FROM knowledge_sources')?.n || 0),
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

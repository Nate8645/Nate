'use strict';

const { all, one, run, nowIso } = require('./db');

const agentCatalog = [
  {
    key: 'launch-orchestrator',
    name: 'Launch Orchestrator',
    role: 'Chief of Staff AI',
    goal: 'Coordinate launch kits, sprint tasks, approvals, and next-best actions.',
    tools: ['Launch kits', 'Usage events', 'Automation rules', 'Approval queue'],
    permissions: ['ai_memory', 'workflow_automation'],
    kpis: ['Kit-to-demo rate', 'Approval turnaround', 'Sprint conversion'],
  },
  {
    key: 'growth-agent',
    name: 'Growth Agent',
    role: 'CMO/CRO AI',
    goal: 'Turn every launch kit into outreach, content, and conversion experiments.',
    tools: ['Content packs', 'Lead source strategy', 'Analytics events'],
    permissions: ['ai_memory', 'browser_research'],
    kpis: ['Replies', 'Pilot leads', 'Checkout starts'],
  },
  {
    key: 'trust-guardian',
    name: 'Trust Guardian',
    role: 'Security and Privacy AI',
    goal: 'Track AI actions, permissions, sensitive workflows, and customer trust controls.',
    tools: ['Action logs', 'Permission grants', 'Data export'],
    permissions: ['audit_logs'],
    kpis: ['Logged actions', 'Open approvals', 'Permission coverage'],
  },
  {
    key: 'ops-automation',
    name: 'Ops Automation Agent',
    role: 'COO AI',
    goal: 'Create safe automations for onboarding, support, reporting, and launch follow-up.',
    tools: ['Automation rules', 'Support tickets', 'Usage events'],
    permissions: ['workflow_automation', 'notifications'],
    kpis: ['Time saved', 'Rules enabled', 'Support response time'],
  },
  {
    key: 'computer-control',
    name: 'Computer Control Agent',
    role: 'Permissioned Browser and File Automation AI',
    goal: 'Prepare browser, file, terminal, and document tasks with explicit user approval before critical actions.',
    tools: ['Browser task planner', 'File export', 'Terminal task queue', 'Document processing'],
    permissions: ['browser_research', 'file_management', 'terminal_actions', 'document_processing'],
    kpis: ['Approved actions', 'Rejected actions', 'Manual time saved'],
  },
];

const permissionCatalog = [
  {
    key: 'ai_memory',
    name: 'AI Memory',
    description: 'Remember launch preferences, industries, ICP notes, and repeated offer patterns.',
    risk: 'low',
    defaultStatus: 'granted',
  },
  {
    key: 'workflow_automation',
    name: 'Workflow Automation',
    description: 'Create rules for onboarding, follow-up, reporting, and support triage.',
    risk: 'medium',
    defaultStatus: 'granted',
  },
  {
    key: 'notifications',
    name: 'Notifications',
    description: 'Prepare email or in-app notification drafts for user approval.',
    risk: 'medium',
    defaultStatus: 'limited',
  },
  {
    key: 'browser_research',
    name: 'Browser Research',
    description: 'Plan browser research and competitor checks. External automation requires approval.',
    risk: 'medium',
    defaultStatus: 'limited',
  },
  {
    key: 'document_processing',
    name: 'Document Processing',
    description: 'Analyze user-provided launch briefs, notes, CSVs, and exported kits.',
    risk: 'medium',
    defaultStatus: 'limited',
  },
  {
    key: 'file_management',
    name: 'File Management',
    description: 'Prepare exports and organize workspace files. Deletion always requires confirmation.',
    risk: 'high',
    defaultStatus: 'approval_required',
  },
  {
    key: 'terminal_actions',
    name: 'Terminal / Computer Actions',
    description: 'Plan terminal or computer-control tasks. Execution always requires explicit approval.',
    risk: 'critical',
    defaultStatus: 'approval_required',
  },
  {
    key: 'connected_accounts',
    name: 'Connected Accounts',
    description: 'Use external accounts such as Stripe, Shopify, social platforms, or email providers only after secure connection.',
    risk: 'critical',
    defaultStatus: 'approval_required',
  },
  {
    key: 'audit_logs',
    name: 'Audit Logs',
    description: 'Record AI actions, permission changes, billing events, and workflow activity.',
    risk: 'low',
    defaultStatus: 'granted',
  },
];

function ensureTrustDefaults(db, userId) {
  for (const permission of permissionCatalog) {
    run(db, `INSERT INTO permission_grants (user_id, permission_key, status, scope, created_at, updated_at)
             VALUES (:userId, :permissionKey, :status, :scope, :createdAt, :updatedAt)
             ON CONFLICT(user_id, permission_key) DO NOTHING`, {
      userId,
      permissionKey: permission.key,
      status: permission.defaultStatus,
      scope: JSON.stringify({ risk: permission.risk }),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  const count = Number(one(db, 'SELECT COUNT(*) AS n FROM automation_rules WHERE user_id = :userId', { userId })?.n || 0);
  if (count === 0) {
    const templates = [
      ['New launch kit follow-up', 'launch_kit_generated', 'If the kit was generated on Free plan', 'Create next-best-action checklist and offer sprint CTA', 0],
      ['Pilot lead triage', 'pilot_request_submitted', 'If budget is Ready for $199 sprint', 'Flag lead as high-intent and prepare reply script', 1],
      ['Weekly growth report', 'weekly_schedule', 'Every Monday morning', 'Summarize visitors, signups, kits, leads, and checkout starts', 0],
    ];
    for (const [name, triggerType, conditionText, actionText, requiresApproval] of templates) {
      run(db, `INSERT INTO automation_rules (user_id, name, trigger_type, condition_text, action_text, requires_approval, is_enabled, created_at, updated_at)
               VALUES (:userId, :name, :triggerType, :conditionText, :actionText, :requiresApproval, 1, :createdAt, :updatedAt)`, {
        userId,
        name,
        triggerType,
        conditionText,
        actionText,
        requiresApproval,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  const connectedCount = Number(one(db, 'SELECT COUNT(*) AS n FROM connected_accounts WHERE user_id = :userId', { userId })?.n || 0);
  if (connectedCount === 0) {
    const accounts = [
      ['stripe', 'not_connected', 'Checkout, subscriptions, portal, webhooks via environment secrets'],
      ['email', 'not_connected', 'Draft-only outreach until a provider is connected and approved'],
      ['browser-research', 'not_connected', 'Research planning only; external browsing requires approval'],
      ['shopify', 'not_connected', 'Optional ecommerce context; no store access until connected'],
    ];
    for (const [provider, status, scopes] of accounts) {
      run(db, `INSERT INTO connected_accounts (user_id, provider, status, scopes, created_at, updated_at)
               VALUES (:userId, :provider, :status, :scopes, :createdAt, :updatedAt)
               ON CONFLICT(user_id, provider) DO NOTHING`, {
        userId,
        provider,
        status,
        scopes,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }
}

function logAction(db, { userId = null, agentKey = 'system', actionType, status = 'completed', riskLevel = 'low', permissionKey = null, summary, metadata = null }) {
  run(db, `INSERT INTO ai_action_logs (user_id, agent_key, action_type, status, risk_level, permission_key, summary, metadata, created_at)
           VALUES (:userId, :agentKey, :actionType, :status, :riskLevel, :permissionKey, :summary, :metadata, :createdAt)`, {
    userId,
    agentKey,
    actionType,
    status,
    riskLevel,
    permissionKey,
    summary: String(summary || actionType).slice(0, 500),
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: nowIso(),
  });
}

function upsertMemory(db, { userId, key, value, source = 'system', confidence = 0.8 }) {
  if (!userId || !key || value == null || String(value).trim() === '') return;
  run(db, `INSERT INTO user_memories (user_id, memory_key, memory_value, source, confidence, created_at, updated_at)
           VALUES (:userId, :key, :value, :source, :confidence, :createdAt, :updatedAt)
           ON CONFLICT(user_id, memory_key) DO UPDATE SET
             memory_value = excluded.memory_value,
             source = excluded.source,
             confidence = excluded.confidence,
             updated_at = excluded.updated_at`, {
    userId,
    key: String(key).slice(0, 100),
    value: String(value).slice(0, 1200),
    source,
    confidence,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function userTrustSnapshot(db, userId) {
  ensureTrustDefaults(db, userId);
  return {
    permissions: all(db, 'SELECT * FROM permission_grants WHERE user_id = :userId ORDER BY permission_key', { userId })
      .map((grant) => ({ ...grant, ...(permissionCatalog.find((p) => p.key === grant.permission_key) || {}) })),
    memories: all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 30', { userId }),
    logs: all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId OR user_id IS NULL ORDER BY created_at DESC LIMIT 60', { userId }),
    automations: all(db, 'SELECT * FROM automation_rules WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    tasks: all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    connectedAccounts: all(db, 'SELECT * FROM connected_accounts WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId }),
    sessions: all(db, `SELECT id, ip, user_agent, created_at, expires_at
                       FROM sessions WHERE user_id = :userId ORDER BY created_at DESC LIMIT 10`, { userId }),
  };
}

function agentWorkspace(db, userId) {
  ensureTrustDefaults(db, userId);
  const tasks = all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC LIMIT 30', { userId });
  const logs = all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId OR user_id IS NULL ORDER BY created_at DESC LIMIT 30', { userId });
  const memories = all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 12', { userId });
  return { agents: agentCatalog, tasks, logs, memories };
}

function createAgentTask(db, { userId, agentKey, title, priority = 'normal', requiresApproval = 1 }) {
  const agent = agentCatalog.find((item) => item.key === agentKey) || agentCatalog[0];
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO agent_tasks (user_id, agent_key, title, status, priority, requires_approval, created_at, updated_at)
                          VALUES (:userId, :agentKey, :title, 'queued', :priority, :requiresApproval, :createdAt, :updatedAt)`, {
    userId,
    agentKey: agent.key,
    title: String(title || 'New agent task').slice(0, 180),
    priority,
    requiresApproval,
    createdAt,
    updatedAt: createdAt,
  });
  logAction(db, {
    userId,
    agentKey: agent.key,
    actionType: 'agent_task_created',
    status: requiresApproval ? 'approval_required' : 'queued',
    riskLevel: requiresApproval ? 'medium' : 'low',
    permissionKey: agent.permissions[0] || 'workflow_automation',
    summary: `${agent.name} queued task: ${title}`,
    metadata: { taskId: Number(result.lastInsertRowid) },
  });
  return Number(result.lastInsertRowid);
}

function exportUserData(db, user) {
  const userId = user.id;
  return {
    exportedAt: nowIso(),
    user,
    launchKits: all(db, 'SELECT * FROM launch_kits WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    usageEvents: all(db, 'SELECT * FROM usage_events WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    analyticsEvents: all(db, 'SELECT * FROM analytics_events WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    supportTickets: all(db, 'SELECT * FROM support_tickets WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    pilotRequests: all(db, 'SELECT * FROM pilot_requests WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    orders: all(db, 'SELECT * FROM orders WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    memories: all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC', { userId }),
    permissions: all(db, 'SELECT * FROM permission_grants WHERE user_id = :userId ORDER BY permission_key', { userId }),
    actionLogs: all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    automationRules: all(db, 'SELECT * FROM automation_rules WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    agentTasks: all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    sessions: all(db, `SELECT id, ip, user_agent, created_at, expires_at
                      FROM sessions WHERE user_id = :userId ORDER BY created_at DESC`, { userId }),
  };
}

module.exports = {
  agentCatalog,
  permissionCatalog,
  ensureTrustDefaults,
  logAction,
  upsertMemory,
  userTrustSnapshot,
  agentWorkspace,
  createAgentTask,
  exportUserData,
};

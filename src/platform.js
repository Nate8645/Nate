'use strict';

const { all, one, run, nowIso } = require('./db');
const { agentCatalog, permissionCatalog, ensureTrustDefaults, createAgentTask, logAction, upsertMemory } = require('./intelligence');

const integrationCatalog = [
  provider('github', 'GitHub', 'Code repositories, issues, pull requests, releases, code search', ['read_repos', 'issues', 'pull_requests'], ['read_data', 'write_data', 'connected_accounts'], ['Create branch plans', 'Draft PR descriptions', 'Open issues after approval']),
  provider('gitlab', 'GitLab', 'Repositories, merge requests, CI/CD metadata', ['read_repository', 'api'], ['read_data', 'write_data', 'connected_accounts'], ['Draft MRs', 'Inspect pipelines']),
  provider('shopify', 'Shopify', 'Products, orders, customers, discounts, storefront analytics', ['read_products', 'read_orders', 'write_products'], ['read_data', 'write_data', 'payments', 'connected_accounts'], ['Audit product pages', 'Prepare order workflows', 'Draft lifecycle campaigns']),
  provider('stripe', 'Stripe', 'Customers, subscriptions, checkout, invoices, webhooks', ['read_only', 'billing_portal', 'webhooks'], ['payments', 'connected_accounts', 'api_keys'], ['Analyze revenue', 'Prepare refunds for approval', 'Monitor webhook health']),
  provider('google-drive', 'Google Drive', 'Company documents, PDFs, spreadsheets, folders', ['drive.readonly', 'drive.file'], ['knowledge_base', 'document_processing', 'connected_accounts'], ['Index docs', 'Create knowledge sources']),
  provider('google-calendar', 'Google Calendar', 'Meetings, schedules, reminders', ['calendar.readonly', 'calendar.events'], ['scheduling', 'connected_accounts'], ['Schedule reports', 'Prepare meeting agendas']),
  provider('gmail', 'Gmail', 'Email drafts, inbox summaries, support handoffs', ['gmail.readonly', 'gmail.compose'], ['notifications', 'connected_accounts'], ['Draft replies', 'Summarize customer emails']),
  provider('slack', 'Slack', 'Channels, alerts, approvals, internal notifications', ['channels:read', 'chat:write'], ['notifications', 'connected_accounts'], ['Post summaries after approval', 'Route alerts']),
  provider('discord', 'Discord', 'Community channels and notifications', ['identify', 'bot_channels'], ['notifications', 'connected_accounts'], ['Draft community replies', 'Send approved updates']),
  provider('notion', 'Notion', 'Docs, databases, wikis, project pages', ['read_content', 'update_content'], ['knowledge_base', 'write_data', 'connected_accounts'], ['Sync docs', 'Prepare wiki updates']),
  provider('microsoft-365', 'Microsoft 365', 'Outlook, OneDrive, SharePoint, Teams', ['openid', 'files.read', 'mail.read'], ['knowledge_base', 'notifications', 'connected_accounts'], ['Index docs', 'Draft Outlook replies']),
  provider('dropbox', 'Dropbox', 'Cloud files and folders', ['files.metadata.read', 'files.content.read'], ['knowledge_base', 'files', 'connected_accounts'], ['Index files', 'Prepare exports']),
  provider('trello', 'Trello', 'Boards, cards, checklists', ['read', 'write'], ['workflow_automation', 'write_data', 'connected_accounts'], ['Create task cards after approval']),
  provider('jira', 'Jira', 'Issues, projects, sprints', ['read:jira-work', 'write:jira-work'], ['workflow_automation', 'write_data', 'connected_accounts'], ['Create tickets', 'Summarize sprint risk']),
  provider('linear', 'Linear', 'Issues, teams, cycles, roadmaps', ['read', 'write'], ['workflow_automation', 'write_data', 'connected_accounts'], ['Draft issues', 'Plan cycles']),
  provider('hubspot', 'HubSpot', 'CRM contacts, companies, deals, tickets', ['crm.objects.contacts.read', 'crm.objects.deals.write'], ['connected_accounts', 'write_data', 'notifications'], ['Prepare CRM updates', 'Create follow-ups after approval']),
  provider('salesforce', 'Salesforce', 'CRM accounts, leads, opportunities, cases', ['api', 'refresh_token'], ['connected_accounts', 'write_data', 'notifications'], ['Analyze pipeline', 'Draft CRM updates']),
  provider('meta', 'Meta', 'Ad accounts, pages, campaign analytics', ['ads_read', 'pages_read_engagement'], ['connected_accounts', 'read_data', 'payments'], ['Analyze campaign performance', 'Prepare budget changes for approval']),
  provider('instagram', 'Instagram', 'Content planning, comments, insights', ['instagram_basic', 'instagram_manage_comments'], ['connected_accounts', 'notifications'], ['Draft replies', 'Summarize content insights']),
  provider('facebook', 'Facebook', 'Pages, comments, ad insights', ['pages_read_engagement', 'pages_manage_posts'], ['connected_accounts', 'notifications'], ['Draft posts', 'Analyze page engagement']),
  provider('tiktok', 'TikTok', 'Content, analytics, campaign signals', ['user.info.basic', 'video.list'], ['connected_accounts', 'read_data'], ['Analyze content performance', 'Draft video ideas']),
  provider('youtube', 'YouTube', 'Videos, comments, channel analytics', ['youtube.readonly', 'youtube.force-ssl'], ['connected_accounts', 'notifications'], ['Draft scripts', 'Summarize comments']),
  provider('wordpress', 'WordPress', 'Posts, pages, media, comments', ['posts.read', 'posts.write'], ['connected_accounts', 'write_data'], ['Draft posts', 'Prepare landing pages for approval']),
  provider('websites', 'Websites', 'Public websites, sitemaps, landing pages, screenshots', ['public_web_read'], ['browser_research', 'browser', 'network'], ['Research pages', 'Prepare screenshot audits']),
  provider('databases', 'Databases', 'Postgres, MySQL, SQLite, warehouses via safe credentials', ['read_only', 'limited_write'], ['read_data', 'write_data', 'api_keys'], ['Analyze data', 'Prepare migrations for approval']),
  provider('cloud-services', 'Cloud Services', 'Render, Railway, AWS, GCP, Azure, Vercel, logs and deployments', ['read_status', 'deploy_manage'], ['connected_accounts', 'api_keys', 'execute_actions'], ['Monitor health', 'Prepare deploy/rollback tasks']),
  provider('analytics-platforms', 'Analytics Platforms', 'GA4, Plausible, Mixpanel, PostHog, first-party analytics', ['read_analytics'], ['read_data', 'connected_accounts'], ['Analyze funnels', 'Detect anomalies']),
];

const commandNavigation = [
  ['Dashboard', '/dashboard'], ['AI Chat', '/command'], ['Agents', '/agents'], ['Tasks', '/tasks'], ['Automations', '/automations'], ['Integrations', '/integrations'], ['Files', '/files'], ['Projects', '/projects'], ['Analytics', '/analytics'], ['Security', '/security'], ['Permissions', '/permissions'], ['Billing', '/billing'], ['Memory', '/memory'], ['Activity Logs', '/trust'],
];

function provider(key, name, description, authScopes, permissions, tools) {
  return {
    key,
    name,
    description,
    auth: 'OAuth/API token via official provider; secrets remain in deployment environment or encrypted provider storage when implemented.',
    authScopes,
    permissions,
    tools,
    rateLimits: 'Provider-specific; execute through queued jobs with retry/backoff and visible errors.',
    errorHandling: 'Log failures, show reconnect state, never silently continue with partial permissions.',
    status: 'prepared_not_connected',
  };
}

function ensurePlatformDefaults(db, userId) {
  ensureTrustDefaults(db, userId);

  const projectCount = Number(one(db, 'SELECT COUNT(*) AS n FROM projects WHERE user_id = :userId', { userId })?.n || 0);
  if (projectCount === 0) {
    run(db, `INSERT INTO projects (user_id, name, description, status, metadata, created_at, updated_at)
             VALUES (:userId, 'UltraLaunch Command Project', 'Default workspace for launch kits, agents, automations, knowledge sources, and approvals.', 'active', :metadata, :createdAt, :updatedAt)`, {
      userId,
      metadata: JSON.stringify({ default: true, commandCenter: true }),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  const scheduleCount = Number(one(db, 'SELECT COUNT(*) AS n FROM scheduled_jobs WHERE user_id = :userId', { userId })?.n || 0);
  if (scheduleCount === 0) {
    const schedules = [
      ['Daily sales and launch report', 'daily_morning', 'analytics-agent', 'Summarize visits, signups, kits, pilot requests, checkout starts, and open approvals.', 0, 'Every morning'],
      ['Weekly marketing analysis', 'weekly_monday', 'marketing-agent', 'Review content, SEO, pilot lead quality, and campaign ideas.', 1, 'Every Monday'],
      ['Nightly security audit', 'daily_evening', 'security-agent', 'Check sessions, permissions, pending critical approvals, and failed tasks.', 1, 'Every evening'],
    ];
    for (const [name, cadence, agentKey, actionText, requiresApproval, nextRunHint] of schedules) {
      run(db, `INSERT INTO scheduled_jobs (user_id, name, cadence, agent_key, action_text, requires_approval, status, next_run_hint, created_at, updated_at)
               VALUES (:userId, :name, :cadence, :agentKey, :actionText, :requiresApproval, 'active', :nextRunHint, :createdAt, :updatedAt)`, {
        userId,
        name,
        cadence,
        agentKey,
        actionText,
        requiresApproval,
        nextRunHint,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  const employeeCount = Number(one(db, 'SELECT COUNT(*) AS n FROM ai_employees WHERE user_id = :userId', { userId })?.n || 0);
  if (employeeCount === 0) {
    createAiEmployee(db, {
      userId,
      name: 'Launch Manager AI',
      role: 'Virtual launch employee coordinating daily customer-acquisition work.',
      goals: 'Generate launch assets, queue outreach tasks, watch conversion signals, and escalate approvals.',
      tools: ['Launch kits', 'Task queue', 'Automation builder', 'Analytics'],
      permissions: ['read_data', 'ai_memory', 'workflow_automation'],
      schedule: 'Daily standup + weekly strategy review',
      kpis: ['Launch kits shipped', 'Approvals cleared', 'Pilot leads generated'],
    });
  }

  seedAutopilotSignals(db, userId);
}

function seedAutopilotSignals(db, userId) {
  const openCount = Number(one(db, `SELECT COUNT(*) AS n FROM autopilot_signals WHERE user_id = :userId AND status = 'open'`, { userId })?.n || 0);
  if (openCount > 0) return;
  const metrics = {
    kits: Number(one(db, 'SELECT COUNT(*) AS n FROM launch_kits WHERE user_id = :userId', { userId })?.n || 0),
    approvals: Number(one(db, `SELECT COUNT(*) AS n FROM action_approvals WHERE user_id = :userId AND status = 'pending'`, { userId })?.n || 0),
    integrations: Number(one(db, `SELECT COUNT(*) AS n FROM integration_connections WHERE user_id = :userId AND status != 'disabled'`, { userId })?.n || 0),
  };
  const signals = [];
  if (metrics.kits === 0) signals.push(['activation', 'warning', 'No launch kit generated yet', 'The fastest route to value is still unstarted.', 'Generate the first launch kit or ask the Command Center to build one.']);
  if (metrics.approvals > 0) signals.push(['approval_backlog', 'info', 'Pending approvals need review', 'Critical AI actions are waiting for human decision.', 'Open the Security Center and approve or deny each action.']);
  if (metrics.integrations === 0) signals.push(['integrations', 'info', 'No integrations prepared', 'The platform can plan work now, but external systems need official connection before execution.', 'Install Stripe, Shopify, GitHub, or Google Drive from Integrations when ready.']);
  if (!signals.length) signals.push(['health', 'info', 'Autopilot baseline healthy', 'No urgent anomalies were detected from local first-party data.', 'Keep generating kits and connect real data sources for deeper monitoring.']);
  for (const [signalType, severity, title, summary, recommendedAction] of signals) {
    run(db, `INSERT INTO autopilot_signals (user_id, signal_type, severity, title, summary, recommended_action, status, created_at, updated_at)
             VALUES (:userId, :signalType, :severity, :title, :summary, :recommendedAction, 'open', :createdAt, :updatedAt)`, {
      userId,
      signalType,
      severity,
      title,
      summary,
      recommendedAction,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

function createAiEmployee(db, { userId, name, role, goals, tools, permissions, schedule = '', kpis = [] }) {
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO ai_employees (user_id, name, role, goals, tools, permissions, schedule, kpis, status, created_at, updated_at)
                          VALUES (:userId, :name, :role, :goals, :tools, :permissions, :schedule, :kpis, 'active', :createdAt, :updatedAt)`, {
    userId,
    name: String(name).slice(0, 120),
    role: String(role).slice(0, 300),
    goals: String(goals).slice(0, 1200),
    tools: JSON.stringify(tools || []),
    permissions: JSON.stringify(permissions || []),
    schedule: String(schedule || '').slice(0, 300),
    kpis: JSON.stringify(kpis || []),
    createdAt,
    updatedAt: createdAt,
  });
  logAction(db, { userId, agentKey: 'ceo-agent', actionType: 'ai_employee_created', status: 'active', riskLevel: 'low', permissionKey: 'ai_memory', summary: `AI employee created: ${name}` });
  return Number(result.lastInsertRowid);
}

function commandCenterSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    nav: commandNavigation,
    agents: agentCatalog,
    conversations: all(db, 'SELECT * FROM ai_conversations WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 8', { userId }),
    messages: all(db, `SELECT ai_messages.* FROM ai_messages
                       JOIN ai_conversations ON ai_conversations.id = ai_messages.conversation_id
                       WHERE ai_conversations.user_id = :userId
                       ORDER BY ai_messages.created_at DESC LIMIT 10`, { userId }),
    runs: all(db, 'SELECT * FROM orchestrator_runs WHERE user_id = :userId ORDER BY created_at DESC LIMIT 8', { userId }),
    tasks: all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC LIMIT 12', { userId }),
    approvals: all(db, 'SELECT * FROM action_approvals WHERE user_id = :userId ORDER BY created_at DESC LIMIT 10', { userId }),
    automations: all(db, 'SELECT * FROM automation_rules WHERE user_id = :userId ORDER BY created_at DESC LIMIT 8', { userId }),
    integrations: integrationSnapshot(db, userId).connections.slice(0, 8),
    memories: all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 8', { userId }),
    projects: all(db, 'SELECT * FROM projects WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 8', { userId }),
    signals: all(db, 'SELECT * FROM autopilot_signals WHERE user_id = :userId ORDER BY created_at DESC LIMIT 8', { userId }),
    killSwitch: one(db, `SELECT setting_value FROM security_settings WHERE user_id = :userId AND setting_key = 'kill_switch'`, { userId })?.setting_value || 'off',
  };
}

function orchestrateCommand(db, { userId, prompt }) {
  ensurePlatformDefaults(db, userId);
  const goal = String(prompt || '').trim().slice(0, 1600);
  if (!goal) throw new Error('Command is required.');
  const now = nowIso();
  const conversation = run(db, `INSERT INTO ai_conversations (user_id, title, status, created_at, updated_at)
                                VALUES (:userId, :title, 'open', :createdAt, :updatedAt)`, {
    userId,
    title: goal.slice(0, 90),
    createdAt: now,
    updatedAt: now,
  });
  const conversationId = Number(conversation.lastInsertRowid);
  run(db, `INSERT INTO ai_messages (conversation_id, user_id, role, content, metadata, created_at)
           VALUES (:conversationId, :userId, 'user', :content, :metadata, :createdAt)`, {
    conversationId,
    userId,
    content: goal,
    metadata: JSON.stringify({ source: 'command_center' }),
    createdAt: now,
  });

  const plan = planForGoal(goal);
  const runResult = run(db, `INSERT INTO orchestrator_runs (user_id, conversation_id, user_goal, status, plan_json, created_at, updated_at)
                             VALUES (:userId, :conversationId, :goal, 'planned', :planJson, :createdAt, :updatedAt)`, {
    userId,
    conversationId,
    goal,
    planJson: JSON.stringify(plan),
    createdAt: now,
    updatedAt: now,
  });
  const runId = Number(runResult.lastInsertRowid);

  const createdTasks = [];
  for (const step of plan.steps) {
    const taskId = createAgentTask(db, {
      userId,
      agentKey: step.agentKey,
      title: step.title,
      priority: step.priority || 'normal',
      requiresApproval: step.requiresApproval ? 1 : 0,
    });
    createdTasks.push({ taskId, ...step });
    if (step.requiresApproval) {
      createApproval(db, { userId, runId, taskId, ...step });
    }
  }

  const response = summarizePlan(goal, plan, createdTasks);
  run(db, `INSERT INTO ai_messages (conversation_id, user_id, role, content, metadata, created_at)
           VALUES (:conversationId, :userId, 'assistant', :content, :metadata, :createdAt)`, {
    conversationId,
    userId,
    content: response,
    metadata: JSON.stringify({ runId, stepCount: plan.steps.length, approvalCount: plan.steps.filter((step) => step.requiresApproval).length }),
    createdAt: nowIso(),
  });
  upsertMemory(db, { userId, key: 'last_command_goal', value: goal, source: 'command_center', confidence: 0.85 });
  logAction(db, { userId, agentKey: 'ceo-agent', actionType: 'orchestrator_run_created', status: 'planned', riskLevel: 'medium', permissionKey: 'workflow_automation', summary: `Orchestrated command: ${goal.slice(0, 140)}`, metadata: { runId, createdTasks: createdTasks.length } });
  return { conversationId, runId, plan, createdTasks, response };
}

function planForGoal(goal) {
  const text = goal.toLowerCase();
  const steps = [];
  const add = (agentKey, title, options = {}) => steps.push({
    agentKey,
    title,
    priority: options.priority || 'normal',
    requiresApproval: options.requiresApproval || false,
    tool: options.tool || inferTool(agentKey),
    permissionKey: options.permissionKey || primaryPermission(agentKey),
    riskLevel: options.riskLevel || (options.requiresApproval ? 'medium' : 'low'),
    why: options.why || 'This step moves the requested business goal forward while keeping work visible.',
    dataUsed: options.dataUsed || 'User command, account context, launch kits, analytics events, memory, and connected knowledge sources.',
    expectedResult: options.expectedResult || 'A concrete draft, analysis, or task output ready for user review.',
  });

  if (hasAny(text, ['verkauf', 'sales', 'umsatz', 'revenue', 'analysiere meine verkäufe', 'orders'])) {
    add('analytics-agent', 'Analyze sales, usage, orders, checkout starts, and conversion signals', { priority: 'high', tool: 'First-party analytics + billing events', permissionKey: 'read_data' });
    add('cfo-agent', 'Summarize revenue risks, pricing opportunities, and billing gaps', { tool: 'Revenue diagnostics', permissionKey: 'payments', requiresApproval: true, riskLevel: 'medium' });
  }
  if (hasAny(text, ['shop', 'shopify', 'ecommerce', 'store'])) {
    add('shopify-agent', 'Prepare Shopify store audit: product pages, conversion, retention, and order workflows', { priority: 'high', tool: 'Shopify connector plan', permissionKey: 'connected_accounts', requiresApproval: true, riskLevel: 'high' });
    add('ux-agent', 'Review store UX and conversion friction from available website or product context', { tool: 'UX audit', permissionKey: 'browser_research' });
  }
  if (hasAny(text, ['marketing', 'kampagne', 'campaign', 'content', 'social'])) {
    add('marketing-agent', 'Design a campaign strategy, channels, hooks, offer angle, and approval checklist', { priority: 'high', tool: 'Campaign builder', permissionKey: 'workflow_automation' });
    add('content-agent', 'Draft content assets, email copy, social posts, and repurposing ideas', { tool: 'Content generator', permissionKey: 'write_data' });
  }
  if (hasAny(text, ['konkurrenz', 'competitor', 'research', 'markt', 'analysiere meine konkurrenz'])) {
    add('competitor-agent', 'Research competitor positioning, pricing, features, channels, and gaps', { priority: 'high', tool: 'Browser research planner', permissionKey: 'browser_research', requiresApproval: true, riskLevel: 'medium' });
    add('research-agent', 'Collect evidence and assumptions for the market analysis', { tool: 'Knowledge base + browser research', permissionKey: 'knowledge_base' });
  }
  if (hasAny(text, ['landingpage', 'landing page', 'website', 'page', 'frontend', 'ui', 'ux'])) {
    add('ui-agent', 'Create a landing-page structure, hero, sections, CTAs, and responsive design notes', { priority: 'high', tool: 'UI planner', permissionKey: 'write_data' });
    add('frontend-agent', 'Prepare implementation-ready frontend tasks and accessibility checks', { tool: 'Frontend task planner', permissionKey: 'write_data' });
  }
  if (hasAny(text, ['kunden', 'support', 'beantworte', 'customer'])) {
    add('customer-support-agent', 'Triage customer context and draft safe support replies for approval', { priority: 'high', tool: 'Support reply drafts', permissionKey: 'notifications', requiresApproval: true, riskLevel: 'medium' });
    add('customer-success-agent', 'Detect onboarding or retention opportunities from customer history', { tool: 'Customer success planner', permissionKey: 'read_data' });
  }
  if (hasAny(text, ['computer', 'desktop', 'browser', 'terminal', 'datei', 'file', 'screenshot', 'führe'])) {
    add('computer-control', 'Prepare a computer-control execution plan with exact steps and approval requirements', { priority: 'urgent', tool: 'Desktop/browser/file/terminal planner', permissionKey: 'desktop_control', requiresApproval: true, riskLevel: 'critical', why: 'Computer-control actions can affect files, apps, accounts, or systems and must be explicitly approved.' });
  }
  if (hasAny(text, ['seo', 'google', 'ranking'])) {
    add('seo-agent', 'Audit SEO opportunities, keyword clusters, and technical SEO tasks', { tool: 'SEO brief builder', permissionKey: 'browser_research' });
  }
  if (hasAny(text, ['sicherheit', 'security', 'permission', 'audit', '2fa'])) {
    add('security-agent', 'Review permissions, sessions, pending approvals, kill switch, and audit log coverage', { priority: 'high', tool: 'Security center', permissionKey: 'audit_logs' });
  }

  if (!steps.length) {
    add('ceo-agent', 'Turn the user goal into a company-level operating plan', { priority: 'high', tool: 'Strategy planner', permissionKey: 'ai_memory' });
    add('research-agent', 'Gather necessary context and assumptions before execution', { tool: 'Knowledge base', permissionKey: 'read_data' });
    add('operations-agent', 'Break the goal into tasks, dependencies, schedules, and approvals', { tool: 'Task orchestrator', permissionKey: 'workflow_automation' });
  }

  const hasExecution = steps.some((step) => ['developer-agent', 'frontend-agent', 'backend-agent', 'computer-control'].includes(step.agentKey));
  if (!hasExecution && hasAny(text, ['erstelle', 'build', 'baue', 'implementiere', 'create'])) {
    add('developer-agent', 'Prepare implementation tasks and validation steps', { priority: 'high', tool: 'Code/task planner', permissionKey: 'write_data', requiresApproval: true, riskLevel: 'medium' });
  }
  add('qa-agent', 'Define validation, acceptance checks, and rollback/safety criteria', { tool: 'QA checklist', permissionKey: 'read_data' });
  add('ceo-agent', 'Synthesize the cross-agent plan into one executive next-action list', { tool: 'Executive summary', permissionKey: 'ai_memory' });

  return {
    mode: 'deterministic_orchestrator_v1',
    goalType: classifyGoal(goal),
    steps,
    parallelGroups: buildParallelGroups(steps),
    safety: {
      criticalActionsRequireApproval: true,
      noCaptchaBypass: true,
      noTwoFactorBypass: true,
      noHiddenDesktopControl: true,
      noPurchasesWithoutApproval: true,
    },
  };
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classifyGoal(goal) {
  const text = goal.toLowerCase();
  if (hasAny(text, ['shopify', 'shop', 'ecommerce'])) return 'commerce_optimization';
  if (hasAny(text, ['verkauf', 'sales', 'revenue', 'umsatz'])) return 'sales_analysis';
  if (hasAny(text, ['marketing', 'kampagne', 'content'])) return 'marketing_campaign';
  if (hasAny(text, ['computer', 'desktop', 'terminal', 'browser'])) return 'computer_control_plan';
  if (hasAny(text, ['security', 'sicherheit', 'permission'])) return 'security_audit';
  return 'general_business_goal';
}

function inferTool(agentKey) {
  return agentCatalog.find((agent) => agent.key === agentKey)?.tools?.[0] || 'Task planner';
}

function primaryPermission(agentKey) {
  return agentCatalog.find((agent) => agent.key === agentKey)?.permissions?.[0] || 'read_data';
}

function buildParallelGroups(steps) {
  const research = steps.filter((step) => ['research-agent', 'competitor-agent', 'analytics-agent', 'seo-agent', 'ux-agent'].includes(step.agentKey)).map((step) => step.agentKey);
  const execution = steps.filter((step) => !research.includes(step.agentKey) && step.agentKey !== 'ceo-agent').map((step) => step.agentKey);
  const synthesis = steps.filter((step) => step.agentKey === 'ceo-agent').map((step) => step.agentKey);
  return [research, execution, synthesis].filter((group) => group.length);
}

function createApproval(db, { userId, runId, taskId, agentKey, title, tool, permissionKey, riskLevel, why, dataUsed, expectedResult }) {
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO action_approvals (user_id, run_id, task_id, agent_key, action_type, what, why, data_used, tool, expected_result, risk_level, permission_key, status, created_at, updated_at)
                          VALUES (:userId, :runId, :taskId, :agentKey, 'agent_execution', :what, :why, :dataUsed, :tool, :expectedResult, :riskLevel, :permissionKey, 'pending', :createdAt, :updatedAt)`, {
    userId,
    runId,
    taskId,
    agentKey,
    what: title,
    why,
    dataUsed,
    tool,
    expectedResult,
    riskLevel,
    permissionKey,
    createdAt,
    updatedAt: createdAt,
  });
  logAction(db, { userId, agentKey, actionType: 'approval_requested', status: 'pending', riskLevel, permissionKey, summary: `Approval requested: ${title}`, metadata: { approvalId: Number(result.lastInsertRowid), runId, taskId } });
  return Number(result.lastInsertRowid);
}

function summarizePlan(goal, plan, tasks) {
  const approvals = tasks.filter((task) => task.requiresApproval).length;
  return `I created an AI operating plan for: ${goal}\n\nAgents selected: ${[...new Set(tasks.map((task) => task.agentKey))].join(', ')}.\nTasks queued: ${tasks.length}. Approval-gated actions: ${approvals}.\nParallel groups: ${plan.parallelGroups.map((group) => group.join(' + ')).join(' → ')}.\nCritical computer, payment, file, browser, or connected-account actions will not execute until approved.`;
}

function integrationSnapshot(db, userId) {
  ensureTrustDefaults(db, userId);
  const rows = all(db, 'SELECT * FROM integration_connections WHERE user_id = :userId ORDER BY updated_at DESC', { userId });
  const byKey = new Map(rows.map((row) => [row.provider_key, row]));
  return {
    catalog: integrationCatalog,
    connections: integrationCatalog.map((item) => ({ ...item, connection: byKey.get(item.key) || null })),
  };
}

function installIntegration(db, { userId, providerKey, permissions = [] }) {
  const providerItem = integrationCatalog.find((item) => item.key === providerKey);
  if (!providerItem) throw new Error('Unknown integration.');
  const chosen = permissions.length ? permissions : providerItem.permissions;
  const createdAt = nowIso();
  run(db, `INSERT INTO integration_connections (user_id, provider_key, status, permissions_json, config_json, error_message, created_at, updated_at)
           VALUES (:userId, :providerKey, 'prepared_needs_auth', :permissionsJson, :configJson, NULL, :createdAt, :updatedAt)
           ON CONFLICT(user_id, provider_key) DO UPDATE SET
             status = excluded.status,
             permissions_json = excluded.permissions_json,
             config_json = excluded.config_json,
             error_message = NULL,
             updated_at = excluded.updated_at`, {
    userId,
    providerKey,
    permissionsJson: JSON.stringify(chosen),
    configJson: JSON.stringify({ auth: providerItem.auth, authScopes: providerItem.authScopes, connected: false }),
    createdAt,
    updatedAt: createdAt,
  });
  logAction(db, { userId, agentKey: 'cloud-agent', actionType: 'integration_prepared', status: 'needs_auth', riskLevel: 'medium', permissionKey: 'connected_accounts', summary: `${providerItem.name} integration prepared; official OAuth/API credentials still required`, metadata: { providerKey, permissions: chosen } });
}

function testIntegration(db, { userId, providerKey }) {
  const connection = one(db, 'SELECT * FROM integration_connections WHERE user_id = :userId AND provider_key = :providerKey', { userId, providerKey });
  if (!connection) throw new Error('Install the integration before testing it.');
  const providerItem = integrationCatalog.find((item) => item.key === providerKey);
  const message = `${providerItem?.name || providerKey} is prepared but not authenticated. Add official OAuth/API credentials before live actions.`;
  run(db, `UPDATE integration_connections SET last_checked_at = :checkedAt, error_message = :message, updated_at = :updatedAt WHERE id = :id`, {
    checkedAt: nowIso(),
    message,
    updatedAt: nowIso(),
    id: connection.id,
  });
  logAction(db, { userId, agentKey: 'cloud-agent', actionType: 'integration_tested', status: 'needs_auth', riskLevel: 'low', permissionKey: 'connected_accounts', summary: message, metadata: { providerKey } });
  return message;
}

function disconnectIntegration(db, { userId, providerKey }) {
  run(db, `UPDATE integration_connections SET status = 'disabled', updated_at = :updatedAt WHERE user_id = :userId AND provider_key = :providerKey`, {
    userId,
    providerKey,
    updatedAt: nowIso(),
  });
  logAction(db, { userId, agentKey: 'trust-guardian', actionType: 'integration_disabled', status: 'disabled', riskLevel: 'low', permissionKey: 'connected_accounts', summary: `Integration disabled: ${providerKey}` });
}

function projectsSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    projects: all(db, 'SELECT * FROM projects WHERE user_id = :userId ORDER BY updated_at DESC', { userId }),
    sources: all(db, 'SELECT * FROM knowledge_sources WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 80', { userId }),
  };
}

function createProject(db, { userId, name, description = '' }) {
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO projects (user_id, name, description, status, metadata, created_at, updated_at)
                          VALUES (:userId, :name, :description, 'active', :metadata, :createdAt, :updatedAt)`, {
    userId,
    name: String(name).slice(0, 120),
    description: String(description).slice(0, 800),
    metadata: JSON.stringify({ source: 'user_created' }),
    createdAt,
    updatedAt: createdAt,
  });
  logAction(db, { userId, agentKey: 'operations-agent', actionType: 'project_created', status: 'active', riskLevel: 'low', permissionKey: 'write_data', summary: `Project created: ${name}` });
  return Number(result.lastInsertRowid);
}

function createKnowledgeSource(db, { userId, projectId = null, sourceType, name, sourceUri = '', content = '' }) {
  const createdAt = nowIso();
  const result = run(db, `INSERT INTO knowledge_sources (user_id, project_id, source_type, name, source_uri, content, status, metadata, created_at, updated_at)
                          VALUES (:userId, :projectId, :sourceType, :name, :sourceUri, :content, 'indexed', :metadata, :createdAt, :updatedAt)`, {
    userId,
    projectId: projectId ? Number(projectId) : null,
    sourceType: String(sourceType).slice(0, 40),
    name: String(name).slice(0, 140),
    sourceUri: String(sourceUri || '').slice(0, 500),
    content: String(content || '').slice(0, 8000),
    metadata: JSON.stringify({ indexedMode: 'metadata_and_text', vectorSearch: 'prepared_not_enabled' }),
    createdAt,
    updatedAt: createdAt,
  });
  logAction(db, { userId, agentKey: 'documentation-agent', actionType: 'knowledge_source_indexed', status: 'indexed', riskLevel: 'low', permissionKey: 'knowledge_base', summary: `Knowledge source indexed: ${name}` });
  return Number(result.lastInsertRowid);
}

function memorySnapshot(db, userId) {
  ensureTrustDefaults(db, userId);
  const memories = all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC', { userId });
  return {
    types: ['short_term', 'long_term', 'project', 'customer', 'agent', 'conversation', 'task_history', 'preference', 'knowledge_base'],
    memories,
  };
}

function createMemory(db, { userId, memoryType, key, value }) {
  upsertMemory(db, { userId, key: `${memoryType}:${key}`, value, source: 'user_memory', confidence: 1 });
  logAction(db, { userId, agentKey: 'trust-guardian', actionType: 'memory_created', status: 'completed', riskLevel: 'low', permissionKey: 'ai_memory', summary: `Memory saved: ${memoryType}:${key}` });
}

function securitySnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    killSwitch: one(db, `SELECT setting_value FROM security_settings WHERE user_id = :userId AND setting_key = 'kill_switch'`, { userId })?.setting_value || 'off',
    approvals: all(db, 'SELECT * FROM action_approvals WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    permissions: all(db, 'SELECT * FROM permission_grants WHERE user_id = :userId ORDER BY permission_key', { userId })
      .map((grant) => ({ ...grant, ...(permissionCatalog.find((p) => p.key === grant.permission_key) || {}) })),
    rules: all(db, 'SELECT * FROM agent_permission_rules WHERE user_id = :userId ORDER BY agent_key, permission_key LIMIT 150', { userId }),
    sessions: all(db, 'SELECT id, ip, user_agent, created_at, expires_at FROM sessions WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId }),
    logs: all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId ORDER BY created_at DESC LIMIT 60', { userId }),
    diagnostics: diagnosticsSnapshot(db, userId),
  };
}

function setKillSwitch(db, { userId, state }) {
  const value = state === 'on' ? 'on' : 'off';
  run(db, `INSERT INTO security_settings (user_id, setting_key, setting_value, created_at, updated_at)
           VALUES (:userId, 'kill_switch', :value, :createdAt, :updatedAt)
           ON CONFLICT(user_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`, {
    userId,
    value,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (value === 'on') {
    run(db, `UPDATE agent_tasks SET status = 'paused', updated_at = :updatedAt WHERE user_id = :userId AND status IN ('queued','approved')`, { userId, updatedAt: nowIso() });
  }
  logAction(db, { userId, agentKey: 'security-agent', actionType: 'kill_switch_changed', status: value, riskLevel: 'critical', permissionKey: 'execute_actions', summary: `Kill switch turned ${value}` });
}

function decideApproval(db, { userId, approvalId, decision }) {
  const status = decision === 'approve' ? 'approved' : 'denied';
  const approval = one(db, 'SELECT * FROM action_approvals WHERE id = :id AND user_id = :userId', { id: Number(approvalId), userId });
  if (!approval) return;
  run(db, 'UPDATE action_approvals SET status = :status, updated_at = :updatedAt WHERE id = :id AND user_id = :userId', {
    status,
    updatedAt: nowIso(),
    id: Number(approvalId),
    userId,
  });
  if (approval.task_id) {
    run(db, 'UPDATE agent_tasks SET status = :taskStatus, updated_at = :updatedAt WHERE id = :taskId AND user_id = :userId', {
      taskStatus: status === 'approved' ? 'approved' : 'rejected',
      updatedAt: nowIso(),
      taskId: approval.task_id,
      userId,
    });
  }
  logAction(db, { userId, agentKey: approval.agent_key, actionType: 'approval_decision', status, riskLevel: approval.risk_level, permissionKey: approval.permission_key, summary: `Approval ${status}: ${approval.what}` });
}

function diagnosticsSnapshot(db, userId) {
  const failedTasks = Number(one(db, `SELECT COUNT(*) AS n FROM agent_tasks WHERE user_id = :userId AND status IN ('failed','rejected')`, { userId })?.n || 0);
  const pendingCritical = Number(one(db, `SELECT COUNT(*) AS n FROM action_approvals WHERE user_id = :userId AND status = 'pending' AND risk_level IN ('high','critical')`, { userId })?.n || 0);
  const openTickets = Number(one(db, `SELECT COUNT(*) AS n FROM support_tickets WHERE user_id = :userId AND status = 'open'`, { userId })?.n || 0);
  const disconnectedPrepared = Number(one(db, `SELECT COUNT(*) AS n FROM integration_connections WHERE user_id = :userId AND status = 'prepared_needs_auth'`, { userId })?.n || 0);
  return [
    { name: 'Failed or rejected tasks', value: failedTasks, status: failedTasks ? 'review' : 'ok', action: failedTasks ? 'Review task history and fix root cause.' : 'No failed/rejected tasks detected.' },
    { name: 'Critical approvals', value: pendingCritical, status: pendingCritical ? 'attention' : 'ok', action: pendingCritical ? 'Approve or deny critical actions before execution.' : 'No pending critical approvals.' },
    { name: 'Open support tickets', value: openTickets, status: openTickets ? 'attention' : 'ok', action: openTickets ? 'Customer Support Agent should triage.' : 'No open logged-in support tickets.' },
    { name: 'Prepared integrations needing auth', value: disconnectedPrepared, status: disconnectedPrepared ? 'setup' : 'ok', action: disconnectedPrepared ? 'Connect official OAuth/API credentials.' : 'No prepared unauthenticated integrations.' },
  ];
}

function analyticsSnapshot(db, userId) {
  return {
    usage: all(db, 'SELECT event_type, COUNT(*) AS events, COALESCE(SUM(units),0) AS units FROM usage_events WHERE user_id = :userId GROUP BY event_type ORDER BY events DESC', { userId }),
    productEvents: all(db, 'SELECT event_name, COUNT(*) AS events FROM analytics_events WHERE user_id = :userId GROUP BY event_name ORDER BY events DESC LIMIT 20', { userId }),
    tasksByStatus: all(db, 'SELECT status, COUNT(*) AS n FROM agent_tasks WHERE user_id = :userId GROUP BY status ORDER BY n DESC', { userId }),
    approvalsByStatus: all(db, 'SELECT status, COUNT(*) AS n FROM action_approvals WHERE user_id = :userId GROUP BY status ORDER BY n DESC', { userId }),
    signals: all(db, 'SELECT * FROM autopilot_signals WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId }),
    diagnostics: diagnosticsSnapshot(db, userId),
  };
}

function marketplaceSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    agents: agentCatalog.map((agent) => ({
      ...agent,
      installed: true,
      description: agent.goal,
      price: agent.marketplace.price,
      version: agent.marketplace.version,
      reviews: 'No reviews yet — no fake reviews shown.',
      security: agent.permissions.join(', '),
    })),
    integrations: integrationSnapshot(db, userId).connections,
  };
}

function tasksSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    tasks: all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC LIMIT 100', { userId }),
    approvals: all(db, 'SELECT * FROM action_approvals WHERE user_id = :userId ORDER BY created_at DESC LIMIT 100', { userId }),
    schedules: all(db, 'SELECT * FROM scheduled_jobs WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    employees: all(db, 'SELECT * FROM ai_employees WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
  };
}

function permissionMatrixSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    agents: agentCatalog,
    permissions: permissionCatalog,
    rules: all(db, 'SELECT * FROM agent_permission_rules WHERE user_id = :userId ORDER BY agent_key, permission_key', { userId }),
  };
}

function updateAgentPermissionRule(db, { userId, agentKey, permissionKey, decision }) {
  const agent = agentCatalog.find((item) => item.key === agentKey);
  const permission = permissionCatalog.find((item) => item.key === permissionKey);
  if (!agent) throw new Error('Unknown agent.');
  if (!permission) throw new Error('Unknown permission.');
  const safeDecision = ['allow', 'ask', 'deny'].includes(decision) ? decision : 'ask';
  run(db, `INSERT INTO agent_permission_rules (user_id, agent_key, permission_key, decision, created_at, updated_at)
           VALUES (:userId, :agentKey, :permissionKey, :decision, :createdAt, :updatedAt)
           ON CONFLICT(user_id, agent_key, permission_key) DO UPDATE SET decision = excluded.decision, updated_at = excluded.updated_at`, {
    userId,
    agentKey,
    permissionKey,
    decision: safeDecision,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logAction(db, { userId, agentKey: 'security-agent', actionType: 'agent_permission_rule_changed', status: safeDecision, riskLevel: permission.risk, permissionKey, summary: `${agent.name} permission ${permission.name} set to ${safeDecision}` });
}

function automationBuilderSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  const rules = all(db, 'SELECT * FROM automation_rules WHERE user_id = :userId ORDER BY created_at DESC', { userId });
  const steps = all(db, 'SELECT * FROM automation_steps WHERE user_id = :userId ORDER BY rule_id, step_order', { userId });
  return { rules, steps, agents: agentCatalog };
}

function addAutomationStep(db, { userId, ruleId, stepType, agentKey, actionText, requiresApproval = 1 }) {
  const rule = one(db, 'SELECT * FROM automation_rules WHERE id = :id AND user_id = :userId', { id: Number(ruleId), userId });
  if (!rule) throw new Error('Automation rule not found.');
  const current = Number(one(db, 'SELECT COALESCE(MAX(step_order), 0) AS n FROM automation_steps WHERE rule_id = :ruleId AND user_id = :userId', { ruleId: Number(ruleId), userId })?.n || 0);
  const agent = agentCatalog.find((item) => item.key === agentKey) || agentCatalog.find((item) => item.key === 'automation-agent');
  run(db, `INSERT INTO automation_steps (user_id, rule_id, step_order, step_type, agent_key, action_text, requires_approval, config_json, created_at, updated_at)
           VALUES (:userId, :ruleId, :stepOrder, :stepType, :agentKey, :actionText, :requiresApproval, :configJson, :createdAt, :updatedAt)`, {
    userId,
    ruleId: Number(ruleId),
    stepOrder: current + 1,
    stepType,
    agentKey: agent?.key || 'automation-agent',
    actionText: String(actionText).slice(0, 900),
    requiresApproval,
    configJson: JSON.stringify({ visualBuilder: true, approvalModel: requiresApproval ? 'human_required' : 'draft_only' }),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logAction(db, { userId, agentKey: agent?.key || 'automation-agent', actionType: 'automation_step_created', status: 'created', riskLevel: requiresApproval ? 'medium' : 'low', permissionKey: 'workflow_automation', summary: `Automation step added to ${rule.name}` });
}

function createComputerActionApproval(db, { userId, actionType, what, why, dataUsed, tool, expectedResult, permissionKey }) {
  ensurePlatformDefaults(db, userId);
  const agentKey = actionType === 'browser' ? 'browser-agent' : actionType === 'file' ? 'file-agent' : actionType === 'terminal' ? 'desktop-agent' : 'computer-control';
  const taskId = createAgentTask(db, {
    userId,
    agentKey,
    title: what,
    priority: 'urgent',
    requiresApproval: 1,
  });
  createApproval(db, {
    userId,
    runId: null,
    taskId,
    agentKey,
    title: what,
    tool,
    permissionKey,
    riskLevel: ['terminal', 'desktop', 'payment', 'file'].includes(actionType) ? 'critical' : 'high',
    why,
    dataUsed,
    expectedResult,
  });
}

function computerSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    approvals: all(db, `SELECT * FROM action_approvals WHERE user_id = :userId AND permission_key IN ('desktop_control','browser','files','file_management','terminal_actions','applications','payments') ORDER BY created_at DESC LIMIT 30`, { userId }),
    tasks: all(db, `SELECT * FROM agent_tasks WHERE user_id = :userId AND agent_key IN ('computer-control','browser-agent','desktop-agent','file-agent') ORDER BY created_at DESC LIMIT 30`, { userId }),
    safety: [
      'No hidden desktop control.',
      'No captcha bypass or 2FA bypass.',
      'No purchases, refunds, deletion, terminal execution, or external writes without explicit approval.',
      'Every planned action creates a WHAT / WHY / DATA / TOOL / RESULT / RISK explainer.',
    ],
  };
}

function mobileSnapshot(db, userId) {
  const command = commandCenterSnapshot(db, userId);
  return {
    command,
    approvals: all(db, `SELECT * FROM action_approvals WHERE user_id = :userId AND status = 'pending' ORDER BY created_at DESC LIMIT 8`, { userId }),
    notifications: all(db, `SELECT * FROM autopilot_signals WHERE user_id = :userId AND status = 'open' ORDER BY created_at DESC LIMIT 8`, { userId }),
  };
}

function voiceSnapshot(db, userId) {
  ensurePlatformDefaults(db, userId);
  return {
    intents: [
      ['sales_report', 'Hey AI, analysiere meine Verkäufe.', 'analytics-agent'],
      ['start_marketing', 'Starte den Marketing-Agenten.', 'marketing-agent'],
      ['daily_summary', 'Was ist heute passiert?', 'operations-agent'],
      ['open_tasks', 'Welche Aufgaben sind offen?', 'ceo-agent'],
      ['security_check', 'Prüfe meine offenen Sicherheitsfreigaben.', 'security-agent'],
    ],
    readiness: [
      'Speech-to-text adapter prepared; no microphone recording is active.',
      'Text-to-speech adapter prepared for summaries and briefings.',
      'Realtime AI channel should reuse the same orchestrator and approval system.',
      'Voice commands never bypass permissions or approvals.',
    ],
  };
}

module.exports = {
  commandNavigation,
  integrationCatalog,
  ensurePlatformDefaults,
  commandCenterSnapshot,
  orchestrateCommand,
  integrationSnapshot,
  installIntegration,
  testIntegration,
  disconnectIntegration,
  projectsSnapshot,
  createProject,
  createKnowledgeSource,
  memorySnapshot,
  createMemory,
  securitySnapshot,
  setKillSwitch,
  decideApproval,
  diagnosticsSnapshot,
  analyticsSnapshot,
  marketplaceSnapshot,
  tasksSnapshot,
  permissionMatrixSnapshot,
  updateAgentPermissionRule,
  automationBuilderSnapshot,
  addAutomationStep,
  computerSnapshot,
  createComputerActionApproval,
  mobileSnapshot,
  voiceSnapshot,
  createAiEmployee,
};

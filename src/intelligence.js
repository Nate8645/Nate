'use strict';

const { all, one, run, nowIso } = require('./db');

function defineAgent(key, name, role, goal, options = {}) {
  const department = options.department || 'General';
  const executionTools = options.tools || ['Task queue', 'Knowledge base', 'Action logs', 'Approval queue'];
  const permissions = options.permissions || ['read_data', 'ai_memory', 'audit_logs'];
  return {
    key,
    name,
    role,
    department,
    goal,
    tools: executionTools,
    permissions,
    memoryScopes: options.memoryScopes || ['short_term', 'long_term', 'project', 'agent'],
    kpis: options.kpis || ['Task completion rate', 'Approval quality', 'Business impact'],
    approvalRules: options.approvalRules || approvalRulesFor(permissions),
    level: options.level || 'specialist',
    marketplace: options.marketplace || { type: 'first_party', price: 'included', version: '1.0.0' },
  };
}

function approvalRulesFor(permissions) {
  const critical = ['execute_actions', 'terminal_actions', 'desktop_control', 'payments', 'file_management', 'connected_accounts', 'api_keys'];
  return permissions.some((permission) => critical.includes(permission))
    ? ['Ask before external writes', 'Ask before spending money', 'Ask before deleting files', 'Ask before terminal or desktop execution']
    : ['Log every action', 'Ask when data leaves the workspace'];
}

const agentCatalog = [
  defineAgent('ceo-agent', 'CEO Agent', 'Executive Strategy AI', 'Set company strategy, prioritize initiatives, coordinate departments, and turn goals into operating plans.', { department: 'Executive', level: 'management', tools: ['Company strategy', 'Orchestrator runs', 'KPI dashboards', 'Approval queue'], permissions: ['read_data', 'ai_memory', 'business_autopilot', 'audit_logs'], kpis: ['Strategic clarity', 'Revenue impact', 'Cross-team alignment'] }),
  defineAgent('cto-agent', 'CTO Agent', 'Technical Leadership AI', 'Plan architecture, technical debt, integrations, security posture, and engineering execution.', { department: 'Executive', level: 'management', tools: ['Architecture planner', 'Code tasks', 'Integration catalog', 'Diagnostics'], permissions: ['read_data', 'write_data', 'execute_actions', 'terminal_actions', 'audit_logs'], kpis: ['Delivery velocity', 'System reliability', 'Technical risk reduction'] }),
  defineAgent('coo-agent', 'COO Agent', 'Operations Leadership AI', 'Design operating rhythms, handoffs, SOPs, schedules, and automation opportunities.', { department: 'Executive', level: 'management', tools: ['Automation rules', 'Schedules', 'Task dependencies', 'Process maps'], permissions: ['workflow_automation', 'scheduling', 'write_data', 'audit_logs'], kpis: ['Cycle time', 'Manual work removed', 'SLA adherence'] }),
  defineAgent('cfo-agent', 'CFO Agent', 'Finance Leadership AI', 'Track revenue, costs, pricing, margins, billing signals, and financial risk.', { department: 'Executive', level: 'management', tools: ['Revenue metrics', 'Stripe readiness', 'Cost diagnostics', 'Pricing models'], permissions: ['read_data', 'payments', 'connected_accounts', 'audit_logs'], kpis: ['MRR quality', 'Margin visibility', 'Cost risk'] }),
  defineAgent('cmo-agent', 'CMO Agent', 'Marketing Leadership AI', 'Coordinate positioning, campaigns, content, SEO, paid tests, and growth experiments.', { department: 'Executive', level: 'management', tools: ['Campaign planner', 'Content packs', 'Analytics', 'Launch kits'], permissions: ['read_data', 'workflow_automation', 'browser_research', 'notifications'], kpis: ['Qualified demand', 'Campaign lift', 'Content velocity'] }),
  defineAgent('cpo-agent', 'CPO Agent', 'Product Leadership AI', 'Convert customer insights into roadmap, packaging, onboarding, and product improvements.', { department: 'Executive', level: 'management', tools: ['Roadmap planner', 'Feedback analysis', 'Launch kits', 'Usage metrics'], permissions: ['read_data', 'ai_memory', 'write_data', 'audit_logs'], kpis: ['Activation rate', 'Retention signals', 'Roadmap confidence'] }),
  defineAgent('launch-orchestrator', 'Launch Orchestrator', 'Chief of Staff AI', 'Coordinate launch kits, sprint tasks, approvals, dependencies, and next-best actions.', { department: 'Command', level: 'management', tools: ['Launch kits', 'Usage events', 'Automation rules', 'Approval queue'], permissions: ['ai_memory', 'workflow_automation', 'read_data', 'audit_logs'], kpis: ['Kit-to-demo rate', 'Approval turnaround', 'Sprint conversion'] }),
  defineAgent('growth-agent', 'Growth Agent', 'Growth Strategy AI', 'Turn every launch kit into outreach, content, experiments, and conversion improvements.', { department: 'Growth', tools: ['Content packs', 'Lead source strategy', 'Analytics events'], permissions: ['ai_memory', 'browser_research', 'workflow_automation'], kpis: ['Replies', 'Pilot leads', 'Checkout starts'] }),
  defineAgent('sales-agent', 'Sales Agent', 'Pipeline and Closing AI', 'Create sales scripts, objection handling, account research, follow-ups, and deal next steps.', { department: 'Sales', tools: ['CRM notes', 'Outreach scripts', 'Pipeline tasks', 'Call prep'], permissions: ['read_data', 'notifications', 'workflow_automation', 'connected_accounts'], kpis: ['Replies', 'Booked calls', 'Close readiness'] }),
  defineAgent('sales-outreach-agent', 'Sales Outreach Agent', 'Outbound Execution AI', 'Prepare safe outbound batches, personalization, follow-up sequences, and reply triage.', { department: 'Sales', tools: ['Lead lists', 'Email drafts', 'Social DM drafts', 'Approval queue'], permissions: ['notifications', 'browser_research', 'connected_accounts', 'audit_logs'], kpis: ['Reply rate', 'Approval rate', 'Meetings booked'] }),
  defineAgent('lead-generation-agent', 'Lead Generation Agent', 'Prospecting AI', 'Find ICP-aligned account segments, lead source plans, and enrichment tasks.', { department: 'Sales', tools: ['Browser research planner', 'Lead scoring', 'CSV import', 'Knowledge base'], permissions: ['browser_research', 'document_processing', 'read_data', 'audit_logs'], kpis: ['Qualified leads', 'Segment fit', 'Research accuracy'] }),
  defineAgent('pricing-agent', 'Pricing Agent', 'Offer Economics AI', 'Analyze packaging, pricing ladders, tests, discounts, and willingness-to-pay evidence.', { department: 'Finance', tools: ['Plan metrics', 'Competitor notes', 'Revenue events'], permissions: ['read_data', 'browser_research', 'ai_memory'], kpis: ['ARPU insight', 'Conversion confidence', 'Margin fit'] }),
  defineAgent('marketing-agent', 'Marketing Agent', 'Campaign AI', 'Plan campaigns, angles, channels, landing-page hooks, and campaign QA.', { department: 'Marketing', tools: ['Campaign builder', 'Launch kits', 'Content calendar'], permissions: ['workflow_automation', 'notifications', 'read_data'], kpis: ['Campaign launches', 'CTR ideas tested', 'Qualified visits'] }),
  defineAgent('seo-agent', 'SEO Agent', 'Organic Growth AI', 'Research keywords, content clusters, technical SEO issues, and SERP opportunities.', { department: 'Marketing', tools: ['SEO brief builder', 'Browser research planner', 'Content inventory'], permissions: ['browser_research', 'read_data', 'document_processing'], kpis: ['Brief quality', 'Ranking opportunities', 'Technical fixes found'] }),
  defineAgent('content-agent', 'Content Agent', 'Editorial AI', 'Create articles, emails, posts, scripts, lead magnets, and repurposing plans.', { department: 'Marketing', tools: ['Content generator', 'Knowledge base', 'Brand voice memory'], permissions: ['ai_memory', 'document_processing', 'write_data'], kpis: ['Draft velocity', 'Brand consistency', 'Approved assets'] }),
  defineAgent('social-media-agent', 'Social Media Agent', 'Social Distribution AI', 'Plan platform-specific posts, reels scripts, hooks, and community responses.', { department: 'Marketing', tools: ['Social calendar', 'Video script drafts', 'Approval queue'], permissions: ['notifications', 'document_processing', 'connected_accounts'], kpis: ['Posts approved', 'Engagement ideas', 'Response speed'] }),
  defineAgent('research-agent', 'Research Agent', 'Market Research AI', 'Research markets, customers, trends, vendors, and data-backed assumptions.', { department: 'Research', tools: ['Browser research planner', 'Knowledge sources', 'Evidence notes'], permissions: ['browser_research', 'read_data', 'knowledge_base'], kpis: ['Evidence quality', 'Research coverage', 'Decision usefulness'] }),
  defineAgent('competitor-agent', 'Competitor Agent', 'Competitive Intelligence AI', 'Track competitor positioning, pricing, features, campaigns, and gaps.', { department: 'Research', tools: ['Competitor database', 'Browser research planner', 'Comparison matrix'], permissions: ['browser_research', 'knowledge_base', 'ai_memory'], kpis: ['Competitors tracked', 'Positioning gaps', 'Pricing insight'] }),
  defineAgent('product-agent', 'Product Agent', 'Product Strategy AI', 'Analyze customer needs, product gaps, activation friction, and roadmap priorities.', { department: 'Product', tools: ['Roadmap', 'Feedback themes', 'Usage metrics'], permissions: ['read_data', 'write_data', 'ai_memory'], kpis: ['Roadmap quality', 'Activation ideas', 'Feedback coverage'] }),
  defineAgent('developer-agent', 'Developer Agent', 'Full-Stack Development AI', 'Plan implementation tasks, code changes, test strategy, and release notes.', { department: 'Engineering', tools: ['Code planner', 'Task queue', 'QA checklist'], permissions: ['read_data', 'write_data', 'execute_actions', 'terminal_actions'], kpis: ['Tasks shipped', 'Defects reduced', 'Review readiness'] }),
  defineAgent('frontend-agent', 'Frontend Agent', 'Frontend Engineering AI', 'Improve UI, accessibility, responsiveness, performance, and interaction quality.', { department: 'Engineering', tools: ['UI review', 'Accessibility checklist', 'Performance notes'], permissions: ['read_data', 'write_data', 'document_processing'], kpis: ['UX fixes', 'Accessibility coverage', 'Mobile quality'] }),
  defineAgent('backend-agent', 'Backend Agent', 'Backend Engineering AI', 'Plan APIs, data models, queues, integrations, observability, and reliability.', { department: 'Engineering', tools: ['API planner', 'Database schema', 'Diagnostics'], permissions: ['read_data', 'write_data', 'execute_actions', 'terminal_actions'], kpis: ['API quality', 'Reliability', 'Schema safety'] }),
  defineAgent('database-agent', 'Database Agent', 'Data Persistence AI', 'Analyze schema, migrations, indexes, tenant isolation, backup needs, and retention.', { department: 'Engineering', tools: ['Schema review', 'Migration planner', 'Data export'], permissions: ['read_data', 'write_data', 'audit_logs'], kpis: ['Migration safety', 'Query health', 'Data integrity'] }),
  defineAgent('devops-agent', 'DevOps Agent', 'Deployment Operations AI', 'Prepare deployment, environment checks, rollback plans, logs, and uptime readiness.', { department: 'Engineering', tools: ['Launch readiness', 'Deployment checklist', 'Diagnostics'], permissions: ['execute_actions', 'terminal_actions', 'api_keys', 'audit_logs'], kpis: ['Deploy readiness', 'Incident risk', 'Recovery time'] }),
  defineAgent('cloud-agent', 'Cloud Agent', 'Cloud Infrastructure AI', 'Plan cloud resources, secrets, persistent storage, scaling, and cost safeguards.', { department: 'Engineering', tools: ['Cloud checklist', 'Cost planner', 'Secrets inventory'], permissions: ['connected_accounts', 'api_keys', 'read_data', 'audit_logs'], kpis: ['Cloud readiness', 'Cost clarity', 'Scale risk'] }),
  defineAgent('security-agent', 'Security Agent', 'Security AI', 'Analyze permissions, sessions, secrets, audit logs, threats, and security tasks.', { department: 'Security', tools: ['Security center', 'Permission matrix', 'Session list', 'Audit logs'], permissions: ['audit_logs', 'read_data', 'api_keys', 'desktop_control'], kpis: ['Open risks', 'Audit coverage', 'Permission drift'] }),
  defineAgent('trust-guardian', 'Trust Guardian', 'Security and Privacy AI', 'Track AI actions, permissions, sensitive workflows, and customer trust controls.', { department: 'Security', tools: ['Action logs', 'Permission grants', 'Data export'], permissions: ['audit_logs', 'read_data', 'ai_memory'], kpis: ['Logged actions', 'Open approvals', 'Permission coverage'] }),
  defineAgent('qa-agent', 'QA Agent', 'Quality Assurance AI', 'Create test plans, regression coverage, acceptance criteria, and release verification.', { department: 'Quality', tools: ['Test checklist', 'Bug notes', 'Release gates'], permissions: ['read_data', 'execute_actions', 'document_processing'], kpis: ['Tests planned', 'Regression risk', 'Release confidence'] }),
  defineAgent('testing-agent', 'Testing Agent', 'Automated Testing AI', 'Prepare smoke tests, route tests, scenario tests, and validation commands.', { department: 'Quality', tools: ['Test runner plan', 'Smoke scripts', 'Diagnostics'], permissions: ['execute_actions', 'terminal_actions', 'read_data'], kpis: ['Tests executed', 'Failures found', 'Fix verification'] }),
  defineAgent('analytics-agent', 'Analytics Agent', 'Business Analytics AI', 'Analyze traffic, conversion, usage, revenue, funnels, and anomalies.', { department: 'Data', tools: ['Analytics events', 'Usage events', 'Revenue dashboards'], permissions: ['read_data', 'business_autopilot', 'audit_logs'], kpis: ['Insights found', 'Anomalies detected', 'Metric clarity'] }),
  defineAgent('data-agent', 'Data Agent', 'Data Operations AI', 'Prepare imports, exports, cleaning steps, schemas, and reporting data products.', { department: 'Data', tools: ['CSV planner', 'Knowledge base', 'Data export'], permissions: ['read_data', 'write_data', 'document_processing'], kpis: ['Data quality', 'Export success', 'Report readiness'] }),
  defineAgent('finance-agent', 'Finance Agent', 'Finance Operations AI', 'Track billing, subscriptions, pilot orders, invoice readiness, and financial workflows.', { department: 'Finance', tools: ['Billing dashboard', 'Stripe readiness', 'Order logs'], permissions: ['payments', 'connected_accounts', 'read_data'], kpis: ['Billing issues', 'Revenue visibility', 'Payment risk'] }),
  defineAgent('customer-support-agent', 'Customer Support Agent', 'Support AI', 'Triage tickets, draft replies, identify account context, and escalate issues.', { department: 'Support', tools: ['Support tickets', 'Knowledge base', 'Reply drafts'], permissions: ['read_data', 'notifications', 'workflow_automation'], kpis: ['Response time', 'Resolution quality', 'Escalations'] }),
  defineAgent('customer-success-agent', 'Customer Success Agent', 'Retention AI', 'Guide onboarding, expansion opportunities, adoption risks, and customer outcomes.', { department: 'Support', tools: ['Onboarding checklist', 'Usage events', 'Success plans'], permissions: ['read_data', 'notifications', 'ai_memory'], kpis: ['Activation', 'Retention risk', 'Upsell opportunities'] }),
  defineAgent('email-agent', 'Email Agent', 'Email Operations AI', 'Draft transactional, marketing, onboarding, and support emails for approval.', { department: 'Operations', tools: ['Email drafts', 'Templates', 'Approval queue'], permissions: ['notifications', 'connected_accounts', 'audit_logs'], kpis: ['Emails approved', 'Draft quality', 'Compliance checks'] }),
  defineAgent('crm-agent', 'CRM Agent', 'CRM Operations AI', 'Prepare contact updates, lifecycle stages, tasks, and follow-up cadences.', { department: 'Sales', tools: ['CRM connector plan', 'Contact notes', 'Pipeline tasks'], permissions: ['connected_accounts', 'write_data', 'notifications'], kpis: ['CRM hygiene', 'Follow-up coverage', 'Deal tasks'] }),
  defineAgent('ecommerce-agent', 'E-Commerce Agent', 'Commerce Operations AI', 'Analyze orders, products, conversion, retention, and store operations.', { department: 'Commerce', tools: ['Commerce analytics', 'Product notes', 'Order workflows'], permissions: ['read_data', 'connected_accounts', 'business_autopilot'], kpis: ['Conversion ideas', 'Order workflow quality', 'Retention signals'] }),
  defineAgent('shopify-agent', 'Shopify Agent', 'Shopify Store AI', 'Plan Shopify audits, product page improvements, lifecycle campaigns, and store workflows.', { department: 'Commerce', tools: ['Shopify connector plan', 'Product page audit', 'Order triggers'], permissions: ['connected_accounts', 'browser_research', 'write_data'], kpis: ['Store fixes', 'Product page lift ideas', 'Order automation'] }),
  defineAgent('stripe-agent', 'Stripe Agent', 'Billing Integration AI', 'Monitor Stripe setup, prices, webhooks, checkout events, and subscription workflows.', { department: 'Finance', tools: ['Stripe readiness', 'Webhook logs', 'Billing routes'], permissions: ['payments', 'connected_accounts', 'api_keys', 'audit_logs'], kpis: ['Checkout health', 'Webhook reliability', 'Billing readiness'] }),
  defineAgent('legal-research-agent', 'Legal-Research Agent', 'Legal Research AI', 'Research legal/compliance topics and produce non-lawyer summaries with disclaimers.', { department: 'Risk', tools: ['Research planner', 'Policy notes', 'Document processing'], permissions: ['browser_research', 'document_processing', 'audit_logs'], kpis: ['Risk notes', 'Source quality', 'Escalation clarity'] }),
  defineAgent('documentation-agent', 'Documentation Agent', 'Documentation AI', 'Create docs, SOPs, onboarding guides, changelogs, and help center drafts.', { department: 'Operations', tools: ['Knowledge base', 'Docs drafts', 'Release notes'], permissions: ['document_processing', 'write_data', 'ai_memory'], kpis: ['Docs shipped', 'Coverage', 'Clarity'] }),
  defineAgent('design-agent', 'Design Agent', 'Visual Design AI', 'Plan brand systems, visual concepts, creative direction, and asset briefs.', { department: 'Creative', tools: ['Design briefs', 'Brand memory', 'Image prompts'], permissions: ['document_processing', 'ai_memory', 'write_data'], kpis: ['Creative quality', 'Brand fit', 'Asset readiness'] }),
  defineAgent('ui-agent', 'UI Agent', 'Interface Design AI', 'Design screens, layout systems, components, navigation, and responsive patterns.', { department: 'Creative', tools: ['Component planner', 'Accessibility notes', 'Wireframe briefs'], permissions: ['write_data', 'document_processing', 'read_data'], kpis: ['UI consistency', 'Mobile fit', 'Accessibility'] }),
  defineAgent('ux-agent', 'UX Agent', 'User Experience AI', 'Analyze flows, friction, onboarding, information architecture, and conversion UX.', { department: 'Product', tools: ['UX audit', 'Funnel notes', 'Task flows'], permissions: ['read_data', 'browser_research', 'ai_memory'], kpis: ['Friction reduced', 'Activation ideas', 'Conversion clarity'] }),
  defineAgent('3d-agent', '3D Agent', '3D Creative AI', 'Prepare 3D asset briefs, model requirements, render direction, and lightweight fallbacks.', { department: 'Creative', tools: ['3D brief', 'Asset planner', 'Performance guardrails'], permissions: ['document_processing', 'write_data', 'file_management'], kpis: ['Asset briefs', 'Performance safety', 'Visual differentiation'] }),
  defineAgent('video-agent', 'Video Agent', 'Video Production AI', 'Write scripts, storyboards, reels, tutorial plans, and publishing checklists.', { department: 'Creative', tools: ['Video scripts', 'Storyboard planner', 'Voiceover notes'], permissions: ['document_processing', 'file_management', 'voice'], kpis: ['Scripts approved', 'Hook quality', 'Production readiness'] }),
  defineAgent('image-agent', 'Image Agent', 'Image Creative AI', 'Create image briefs, prompt packs, ad concepts, thumbnails, and brand visuals.', { department: 'Creative', tools: ['Image prompts', 'Asset library', 'Brand memory'], permissions: ['document_processing', 'file_management', 'write_data'], kpis: ['Assets prepared', 'Brand fit', 'Approval rate'] }),
  defineAgent('automation-agent', 'Automation Agent', 'Workflow Automation AI', 'Build trigger-condition-action workflows with approval gates and logs.', { department: 'Automation', tools: ['Automation builder', 'Schedules', 'Approval queue'], permissions: ['workflow_automation', 'scheduling', 'execute_actions', 'audit_logs'], kpis: ['Automations enabled', 'Time saved', 'Approval safety'] }),
  defineAgent('browser-agent', 'Browser Agent', 'Browser Automation AI', 'Plan safe browser navigation, research, extraction, screenshots, and form workflows.', { department: 'Automation', tools: ['Browser plan', 'Screenshot review', 'Extraction checklist'], permissions: ['browser', 'browser_research', 'network', 'audit_logs'], kpis: ['Research tasks', 'Screenshots analyzed', 'Blocked unsafe actions'] }),
  defineAgent('desktop-agent', 'Desktop Agent', 'Desktop Automation AI', 'Plan desktop actions: apps, files, screenshots, documents, and terminal tasks with explicit approval.', { department: 'Automation', tools: ['Desktop task planner', 'File planner', 'Screenshot analysis', 'Approval explainer'], permissions: ['desktop_control', 'applications', 'file_management', 'terminal_actions'], kpis: ['Approved actions', 'Rejected actions', 'Manual time saved'] }),
  defineAgent('computer-control', 'Computer Control Agent', 'Permissioned Browser and File Automation AI', 'Prepare browser, file, terminal, app, document, and screenshot tasks with explicit user approval before critical actions.', { department: 'Automation', tools: ['Browser task planner', 'File export', 'Terminal task queue', 'Document processing', 'Screenshot analysis'], permissions: ['browser_research', 'file_management', 'terminal_actions', 'document_processing', 'desktop_control'], kpis: ['Approved actions', 'Rejected actions', 'Manual time saved'] }),
  defineAgent('file-agent', 'File Agent', 'File Operations AI', 'Organize documents, exports, knowledge sources, and file tasks without destructive changes unless approved.', { department: 'Automation', tools: ['File planner', 'Exports', 'Knowledge source index'], permissions: ['files', 'file_management', 'document_processing', 'audit_logs'], kpis: ['Files indexed', 'Exports prepared', 'Deletion approvals'] }),
  defineAgent('voice-agent', 'Voice Agent', 'Voice Command AI', 'Prepare voice-command flows, summaries, TTS/STT handoffs, and realtime assistant readiness.', { department: 'Interface', tools: ['Voice command schema', 'TTS/STT planner', 'Conversation summaries'], permissions: ['voice', 'ai_memory', 'notifications'], kpis: ['Voice intents mapped', 'Summary quality', 'Mobile readiness'] }),
  defineAgent('translation-agent', 'Translation Agent', 'Localization AI', 'Translate and adapt launch assets, support responses, and product copy across languages.', { department: 'Operations', tools: ['Translation memory', 'Tone guide', 'Document processing'], permissions: ['document_processing', 'ai_memory', 'write_data'], kpis: ['Localization quality', 'Languages supported', 'Review pass rate'] }),
  defineAgent('operations-agent', 'Operations Agent', 'Business Operations AI', 'Run operating checklists, daily reports, schedules, reminders, and process improvements.', { department: 'Operations', tools: ['Schedules', 'Daily reports', 'Process tasks'], permissions: ['scheduling', 'workflow_automation', 'read_data', 'notifications'], kpis: ['Operational rhythm', 'Open issues', 'Time saved'] }),
];

const permissionCatalog = [
  { key: 'read_data', name: 'Read Data', description: 'Read account, project, analytics, task, and knowledge data.', risk: 'low', defaultStatus: 'granted' },
  { key: 'write_data', name: 'Write Data', description: 'Create or edit non-critical records such as drafts, tasks, docs, and plans.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'execute_actions', name: 'Execute Actions', description: 'Run workflow actions beyond drafting. External or irreversible actions require approval.', risk: 'high', defaultStatus: 'approval_required' },
  { key: 'browser', name: 'Browser Automation', description: 'Plan browser navigation, research, extraction, screenshot, and form-fill workflows. No captcha or 2FA bypass.', risk: 'high', defaultStatus: 'approval_required' },
  { key: 'files', name: 'File Read/Write', description: 'Read, create, and organize files. Deletion is always approval-gated.', risk: 'high', defaultStatus: 'approval_required' },
  { key: 'network', name: 'Network Access', description: 'Call approved APIs or public websites through official integrations or safe research.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'applications', name: 'Applications', description: 'Plan app actions on desktop or browser contexts. Execution requires explicit consent.', risk: 'high', defaultStatus: 'approval_required' },
  { key: 'payments', name: 'Payments', description: 'Prepare billing and payment workflows. Purchases, refunds, or live charges require confirmation.', risk: 'critical', defaultStatus: 'approval_required' },
  { key: 'ai_memory', name: 'AI Memory', description: 'Remember launch preferences, industries, ICP notes, repeated offer patterns, and agent context.', risk: 'low', defaultStatus: 'granted' },
  { key: 'workflow_automation', name: 'Workflow Automation', description: 'Create trigger-condition-action rules for onboarding, follow-up, reporting, and support triage.', risk: 'medium', defaultStatus: 'granted' },
  { key: 'scheduling', name: 'Scheduling', description: 'Prepare recurring reports, checks, workflows, and agent schedules.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'business_autopilot', name: 'Business Autopilot', description: 'Monitor sales, marketing, support, analytics, security, costs, and performance for proactive suggestions.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'notifications', name: 'Notifications', description: 'Prepare email, in-app, Slack, or CRM notification drafts for user approval.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'browser_research', name: 'Browser Research', description: 'Plan browser research and competitor checks. External automation requires approval.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'document_processing', name: 'Document Processing', description: 'Analyze user-provided launch briefs, notes, CSVs, PDFs, images, screenshots, and exported kits.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'knowledge_base', name: 'Knowledge Base', description: 'Index company documents, URLs, notes, PDFs, and project context for answers and actions.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'file_management', name: 'File Management', description: 'Prepare exports and organize workspace files. Destructive actions require confirmation.', risk: 'high', defaultStatus: 'approval_required' },
  { key: 'terminal_actions', name: 'Terminal / Computer Actions', description: 'Plan terminal or computer-control tasks. Execution always requires explicit approval.', risk: 'critical', defaultStatus: 'approval_required' },
  { key: 'desktop_control', name: 'Desktop Control', description: 'Prepare app, screenshot, document, and local-computer tasks. Execution needs approval.', risk: 'critical', defaultStatus: 'approval_required' },
  { key: 'connected_accounts', name: 'Connected Accounts', description: 'Use external accounts such as Stripe, Shopify, social platforms, or email providers only after secure connection.', risk: 'critical', defaultStatus: 'approval_required' },
  { key: 'api_keys', name: 'API Key Management', description: 'Track required API keys as environment/deployment secrets; never store secrets in chat.', risk: 'critical', defaultStatus: 'approval_required' },
  { key: 'voice', name: 'Voice Commands', description: 'Prepare voice AI, speech-to-text, text-to-speech, and realtime command flows.', risk: 'medium', defaultStatus: 'limited' },
  { key: 'audit_logs', name: 'Audit Logs', description: 'Record AI actions, permission changes, billing events, approvals, and workflow activity.', risk: 'low', defaultStatus: 'granted' },
];

function ensureTrustDefaults(db, userId) {
  for (const permission of permissionCatalog) {
    run(db, `INSERT INTO permission_grants (user_id, permission_key, status, scope, created_at, updated_at)
             VALUES (:userId, :permissionKey, :status, :scope, :createdAt, :updatedAt)
             ON CONFLICT(user_id, permission_key) DO NOTHING`, {
      userId,
      permissionKey: permission.key,
      status: permission.defaultStatus,
      scope: JSON.stringify({ risk: permission.risk, model: 'user-global' }),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  const permissionRuleCount = Number(one(db, 'SELECT COUNT(*) AS n FROM agent_permission_rules WHERE user_id = :userId', { userId })?.n || 0);
  if (permissionRuleCount === 0) {
    for (const agent of agentCatalog) {
      for (const permissionKey of agent.permissions) {
        const catalog = permissionCatalog.find((item) => item.key === permissionKey);
        const decision = catalog?.risk === 'critical' || catalog?.risk === 'high' ? 'ask' : catalog?.defaultStatus === 'granted' ? 'allow' : 'ask';
        run(db, `INSERT INTO agent_permission_rules (user_id, agent_key, permission_key, decision, created_at, updated_at)
                 VALUES (:userId, :agentKey, :permissionKey, :decision, :createdAt, :updatedAt)
                 ON CONFLICT(user_id, agent_key, permission_key) DO NOTHING`, {
          userId,
          agentKey: agent.key,
          permissionKey,
          decision,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
    }
  }

  const count = Number(one(db, 'SELECT COUNT(*) AS n FROM automation_rules WHERE user_id = :userId', { userId })?.n || 0);
  if (count === 0) {
    const templates = [
      ['New launch kit follow-up', 'launch_kit_generated', 'If the kit was generated on Free plan', 'Create next-best-action checklist and offer sprint CTA', 0],
      ['Pilot lead triage', 'pilot_request_submitted', 'If budget is Ready for $199 sprint', 'Flag lead as high-intent and prepare reply script', 1],
      ['Weekly growth report', 'weekly_schedule', 'Every Monday morning', 'Summarize visitors, signups, kits, leads, and checkout starts', 0],
      ['Daily business autopilot scan', 'daily_schedule', 'Every morning before work starts', 'Check sales, support, analytics, security, cost, and task anomalies', 1],
      ['Security audit reminder', 'weekly_schedule', 'Every Friday afternoon', 'Review permissions, sessions, failed tasks, and connected-account drift', 1],
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
      ['github', 'not_connected', 'Code repository planning through official API/OAuth only'],
      ['google-drive', 'not_connected', 'Knowledge-base documents through OAuth scopes only'],
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

  const killSwitch = one(db, `SELECT setting_value FROM security_settings WHERE user_id = :userId AND setting_key = 'kill_switch'`, { userId });
  if (!killSwitch) {
    run(db, `INSERT INTO security_settings (user_id, setting_key, setting_value, created_at, updated_at)
             VALUES (:userId, 'kill_switch', 'off', :createdAt, :updatedAt)`, {
      userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
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

function trustCount(db, sql, params) {
  return Number(one(db, sql, params)?.n || 0);
}

function trustDataUsage(db, userId) {
  return [
    { label: 'Generated launch kits', value: trustCount(db, 'SELECT COUNT(*) AS n FROM launch_kits WHERE user_id = :userId', { userId }), retention: 'Customer-owned generated outputs; removable from Trust Center.' },
    { label: 'AI memories', value: trustCount(db, 'SELECT COUNT(*) AS n FROM user_memories WHERE user_id = :userId', { userId }), retention: 'Editable/deletable user memories used for personalization.' },
    { label: 'AI action logs', value: trustCount(db, 'SELECT COUNT(*) AS n FROM ai_action_logs WHERE user_id = :userId', { userId }), retention: 'Security/audit evidence retained for transparency and abuse prevention.' },
    { label: 'Approval records', value: trustCount(db, 'SELECT COUNT(*) AS n FROM action_approvals WHERE user_id = :userId', { userId }), retention: 'Human-control evidence for critical actions.' },
    { label: 'Knowledge sources', value: trustCount(db, 'SELECT COUNT(*) AS n FROM knowledge_sources WHERE user_id = :userId', { userId }), retention: 'Customer-provided project context; exportable with account data.' },
    { label: 'Connected-account records', value: trustCount(db, 'SELECT COUNT(*) AS n FROM connected_accounts WHERE user_id = :userId', { userId }), retention: 'Connection status/scopes only; secrets stay out of the database.' },
    { label: 'Privacy requests', value: trustCount(db, 'SELECT COUNT(*) AS n FROM privacy_requests WHERE user_id = :userId', { userId }), retention: 'Access/deletion/correction requests tracked for accountable support handling.' },
    { label: 'Active sessions', value: trustCount(db, 'SELECT COUNT(*) AS n FROM sessions WHERE user_id = :userId', { userId }), retention: 'Login security records; other sessions can be revoked.' },
  ];
}

function envGroupStatus(keys) {
  const configured = keys.filter((key) => Boolean(process.env[key])).length;
  if (configured === 0) return 'not configured';
  if (configured === keys.length) return 'configured';
  return `partial (${configured}/${keys.length})`;
}

function trustApiAccess() {
  return [
    { area: 'AI provider', status: process.env.OPENAI_API_KEY ? 'external provider configured' : 'offline engine active', detail: process.env.OPENAI_API_KEY ? 'Prompts needed for generation can be sent to the configured OpenAI-compatible endpoint.' : 'Launch kits use deterministic local generation; no external LLM key is required for local demos.' },
    { area: 'Stripe billing', status: envGroupStatus(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_BUSINESS', 'STRIPE_PRICE_PILOT']), detail: 'Checkout/webhooks are implemented, but live payments require Stripe secret, webhook secret, and all price IDs.' },
    { area: 'GitHub connector', status: envGroupStatus(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_WEBHOOK_SECRET']), detail: 'Future OAuth/App integration only. No repo write actions are live without official credentials and approval.' },
    { area: 'Shopify connector', status: envGroupStatus(['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET']), detail: 'Future store integration only. No store data is accessed until OAuth credentials and scopes are configured.' },
    { area: 'Google connector', status: envGroupStatus(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']), detail: 'Future Drive/Gmail/Calendar access only through OAuth scopes and approval gates.' },
    { area: 'Secret policy', status: 'masked', detail: 'This page shows configured/not-configured state only. Secret values are never rendered.' },
  ];
}

function userTrustSnapshot(db, userId) {
  ensureTrustDefaults(db, userId);
  return {
    dataUsage: trustDataUsage(db, userId),
    apiAccess: trustApiAccess(),
    permissions: all(db, 'SELECT * FROM permission_grants WHERE user_id = :userId ORDER BY permission_key', { userId })
      .map((grant) => ({ ...grant, ...(permissionCatalog.find((p) => p.key === grant.permission_key) || {}) })),
    permissionRules: all(db, 'SELECT * FROM agent_permission_rules WHERE user_id = :userId ORDER BY agent_key, permission_key LIMIT 120', { userId }),
    memories: all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 30', { userId }),
    logs: all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId OR user_id IS NULL ORDER BY created_at DESC LIMIT 60', { userId }),
    automations: all(db, 'SELECT * FROM automation_rules WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    tasks: all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    approvals: all(db, 'SELECT * FROM action_approvals WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50', { userId }),
    privacyRequests: all(db, 'SELECT * FROM privacy_requests WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId }),
    connectedAccounts: all(db, 'SELECT * FROM connected_accounts WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId }),
    sessions: all(db, `SELECT id, ip, user_agent, created_at, expires_at
                       FROM sessions WHERE user_id = :userId ORDER BY created_at DESC LIMIT 10`, { userId }),
    killSwitch: one(db, `SELECT setting_value FROM security_settings WHERE user_id = :userId AND setting_key = 'kill_switch'`, { userId })?.setting_value || 'off',
  };
}

function agentWorkspace(db, userId) {
  ensureTrustDefaults(db, userId);
  const tasks = all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC LIMIT 30', { userId });
  const logs = all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId OR user_id IS NULL ORDER BY created_at DESC LIMIT 30', { userId });
  const memories = all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC LIMIT 12', { userId });
  const employees = all(db, 'SELECT * FROM ai_employees WHERE user_id = :userId ORDER BY created_at DESC LIMIT 20', { userId });
  return { agents: agentCatalog, tasks, logs, memories, employees };
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
    metadata: { taskId: Number(result.lastInsertRowid), permissions: agent.permissions },
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
    privacyRequests: all(db, 'SELECT * FROM privacy_requests WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    orders: all(db, 'SELECT * FROM orders WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    memories: all(db, 'SELECT * FROM user_memories WHERE user_id = :userId ORDER BY updated_at DESC', { userId }),
    permissions: all(db, 'SELECT * FROM permission_grants WHERE user_id = :userId ORDER BY permission_key', { userId }),
    permissionRules: all(db, 'SELECT * FROM agent_permission_rules WHERE user_id = :userId ORDER BY agent_key, permission_key', { userId }),
    actionLogs: all(db, 'SELECT * FROM ai_action_logs WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    actionApprovals: all(db, 'SELECT * FROM action_approvals WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    automationRules: all(db, 'SELECT * FROM automation_rules WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    scheduledJobs: all(db, 'SELECT * FROM scheduled_jobs WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    autopilotSignals: all(db, 'SELECT * FROM autopilot_signals WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    agentTasks: all(db, 'SELECT * FROM agent_tasks WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    aiEmployees: all(db, 'SELECT * FROM ai_employees WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    conversations: all(db, 'SELECT * FROM ai_conversations WHERE user_id = :userId ORDER BY updated_at DESC', { userId }),
    orchestratorRuns: all(db, 'SELECT * FROM orchestrator_runs WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    projects: all(db, 'SELECT * FROM projects WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    knowledgeSources: all(db, 'SELECT * FROM knowledge_sources WHERE user_id = :userId ORDER BY created_at DESC', { userId }),
    integrationConnections: all(db, 'SELECT * FROM integration_connections WHERE user_id = :userId ORDER BY updated_at DESC', { userId }),
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

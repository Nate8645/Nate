'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const { openDatabase, one, all, run, nowIso, insertUsage, insertAnalytics, monthlyUsage, dashboardMetrics } = require('./db');
const { createUser, createSession, destroySession, loadUser, csrfMiddleware, requireAuth, requireAdmin, normalizeEmail, verifyPassword, clientIp, sha256 } = require('./auth');
const { getPlan, plans } = require('./plans');
const { activeAiProvider, buildFallbackKit, generateLaunchKit } = require('./ai');
const { stripeClient, createCheckoutSession, createPilotCheckoutSession, createPortalSession, stripeWebhookHandler, syncCheckoutSession } = require('./stripe');
const { launchReadiness } = require('./launch-readiness');
const { ensureTrustDefaults, logAction, upsertMemory, userTrustSnapshot, agentWorkspace, createAgentTask, exportUserData, permissionCatalog } = require('./intelligence');
const { commandCenterSnapshot, orchestrateCommand, integrationSnapshot, installIntegration, testIntegration, disconnectIntegration, projectsSnapshot, createProject, createKnowledgeSource, memorySnapshot, createMemory, securitySnapshot, setKillSwitch, decideApproval, analyticsSnapshot, marketplaceSnapshot, tasksSnapshot, permissionMatrixSnapshot, updateAgentPermissionRule, automationBuilderSnapshot, addAutomationStep, computerSnapshot, createComputerActionApproval, mobileSnapshot, voiceSnapshot, createAiEmployee } = require('./platform');
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
  app.get('/product', (req, res) => res.send(views.productPage(req)));
  app.get('/features', (req, res) => res.send(views.featuresPage(req)));
  app.get('/about', (req, res) => res.send(views.aboutPage(req)));
  app.get('/pricing', (req, res) => res.send(views.pricingPage(req, req.query.message || '')));
  app.get('/demo', (req, res) => {
    const result = buildFallbackKit({
      businessName: 'RetentionPilot',
      industry: 'Shopify retention analytics',
      audience: 'Shopify founders with repeat purchase problems',
      offer: 'AI audit that identifies retention leaks and writes lifecycle campaigns',
      goal: 'Get first paying customer',
      tone: 'Direct and premium',
      ecommerce: 'yes',
    });
    res.send(views.sampleKitPage(req, { result }));
  });
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
      if (req.user?.id) {
        upsertMemory(db, { userId: req.user.id, key: 'pilot_offer_context', value: offer, source: 'pilot_request', confidence: 0.9 });
        logAction(db, { userId: req.user.id, agentKey: 'growth-agent', actionType: 'pilot_request_submitted', status: 'queued', riskLevel: 'medium', permissionKey: 'workflow_automation', summary: `Pilot request submitted: ${urgency}`, metadata: { budget } });
      }
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
      ensureTrustDefaults(db, user.id);
      logAction(db, { userId: user.id, agentKey: 'trust-guardian', actionType: 'account_created', status: 'completed', riskLevel: 'low', summary: 'Account created and default permissions initialized' });
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
      logAction(db, { userId: user.id, agentKey: 'trust-guardian', actionType: 'login_completed', status: 'completed', riskLevel: 'low', summary: 'User logged in' });
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
    ensureTrustDefaults(db, req.user.id);
    res.send(renderDashboard(req, db, { message: req.query.message || '', error: req.query.error || '' }));
  });

  app.get('/command', requireAuth, (req, res) => {
    res.send(views.commandCenterPage(req, { snapshot: commandCenterSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/command/chat', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 16, prefix: 'command-chat' }), (req, res) => {
    try {
      const prompt = safeText(req.body.prompt, 1600);
      const result = orchestrateCommand(db, { userId: req.user.id, prompt });
      insertAnalytics(db, eventContext(req, 'command_orchestrated', { runId: result.runId, steps: result.createdTasks.length }));
      res.redirect(`/command?message=${encodeURIComponent('AI plan created with tasks and approvals')}`);
    } catch (error) {
      res.redirect(`/command?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/tasks', requireAuth, (req, res) => {
    res.send(views.tasksPage(req, { snapshot: tasksSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/approvals/:id/decision', requireAuth, (req, res) => {
    decideApproval(db, { userId: req.user.id, approvalId: req.params.id, decision: req.body.decision });
    res.redirect(`${safeReturnTo(req.body.returnTo, '/security')}?message=Approval%20updated`);
  });

  app.get('/integrations', requireAuth, (req, res) => {
    res.send(views.integrationsPage(req, { snapshot: integrationSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/integrations/:provider/install', requireAuth, (req, res) => {
    try {
      installIntegration(db, { userId: req.user.id, providerKey: safeText(req.params.provider, 80, false), permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [req.body.permissions].filter(Boolean) });
      res.redirect('/integrations?message=Integration%20prepared');
    } catch (error) {
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post('/integrations/:provider/test', requireAuth, (req, res) => {
    try {
      const message = testIntegration(db, { userId: req.user.id, providerKey: safeText(req.params.provider, 80, false) });
      res.redirect(`/integrations?message=${encodeURIComponent(message)}`);
    } catch (error) {
      res.redirect(`/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post('/integrations/:provider/disconnect', requireAuth, (req, res) => {
    disconnectIntegration(db, { userId: req.user.id, providerKey: safeText(req.params.provider, 80, false) });
    res.redirect('/integrations?message=Integration%20disabled');
  });

  app.get('/projects', requireAuth, (req, res) => {
    res.send(views.projectsPage(req, { snapshot: projectsSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/projects', requireAuth, (req, res) => {
    try {
      createProject(db, { userId: req.user.id, name: safeText(req.body.name, 120), description: safeText(req.body.description, 800, false) });
      res.redirect('/projects?message=Project%20created');
    } catch (error) {
      res.redirect(`/projects?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/files', requireAuth, (req, res) => {
    res.send(views.filesPage(req, { snapshot: projectsSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/files/sources', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'knowledge-source' }), (req, res) => {
    try {
      createKnowledgeSource(db, {
        userId: req.user.id,
        projectId: req.body.projectId || null,
        sourceType: safeChoice(req.body.sourceType, ['note', 'url', 'pdf', 'document', 'screenshot', 'database', 'cloud_storage'], 'note'),
        name: safeText(req.body.name, 140),
        sourceUri: safeText(req.body.sourceUri, 500, false),
        content: safeText(req.body.content, 8000, false),
      });
      res.redirect('/files?message=Knowledge%20source%20indexed');
    } catch (error) {
      res.redirect(`/files?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/memory', requireAuth, (req, res) => {
    res.send(views.memoryPage(req, { snapshot: memorySnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/memory', requireAuth, (req, res) => {
    try {
      createMemory(db, { userId: req.user.id, memoryType: safeChoice(req.body.memoryType, ['short_term', 'long_term', 'project', 'customer', 'agent', 'conversation', 'task_history', 'preference', 'knowledge_base'], 'preference'), key: safeText(req.body.key, 80), value: safeText(req.body.value, 1200) });
      res.redirect('/memory?message=Memory%20saved');
    } catch (error) {
      res.redirect(`/memory?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/security', requireAuth, (req, res) => {
    res.send(views.securityPage(req, { snapshot: securitySnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/security/kill-switch', requireAuth, (req, res) => {
    setKillSwitch(db, { userId: req.user.id, state: req.body.state });
    res.redirect('/security?message=Kill%20switch%20updated');
  });

  app.get('/permissions', requireAuth, (req, res) => {
    res.send(views.permissionsPage(req, { snapshot: permissionMatrixSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/permissions/rules', requireAuth, (req, res) => {
    try {
      updateAgentPermissionRule(db, {
        userId: req.user.id,
        agentKey: safeText(req.body.agentKey, 120),
        permissionKey: safeText(req.body.permissionKey, 120),
        decision: safeChoice(req.body.decision, ['allow', 'ask', 'deny'], 'ask'),
      });
      res.redirect('/permissions?message=Permission%20rule%20updated');
    } catch (error) {
      res.redirect(`/permissions?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/computer', requireAuth, (req, res) => {
    res.send(views.computerPage(req, { snapshot: computerSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/computer/actions', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'computer-action' }), (req, res) => {
    try {
      const actionType = safeChoice(req.body.actionType, ['browser', 'desktop', 'file', 'terminal', 'document', 'screenshot', 'payment'], 'browser');
      const permissionMap = { browser: 'browser', desktop: 'desktop_control', file: 'file_management', terminal: 'terminal_actions', document: 'document_processing', screenshot: 'document_processing', payment: 'payments' };
      createComputerActionApproval(db, {
        userId: req.user.id,
        actionType,
        what: safeText(req.body.what, 240),
        why: safeText(req.body.why, 700),
        dataUsed: safeText(req.body.dataUsed, 700, false) || 'User-provided command and approved workspace context.',
        tool: safeText(req.body.tool, 160, false) || `${actionType} planner`,
        expectedResult: safeText(req.body.expectedResult, 700),
        permissionKey: permissionMap[actionType],
      });
      res.redirect('/computer?message=Computer%20action%20approval%20created');
    } catch (error) {
      res.redirect(`/computer?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/mobile', requireAuth, (req, res) => {
    res.send(views.mobileCommandPage(req, { snapshot: mobileSnapshot(db, req.user.id) }));
  });

  app.get('/voice', requireAuth, (req, res) => {
    res.send(views.voiceCommandPage(req, { snapshot: voiceSnapshot(db, req.user.id) }));
  });

  app.get('/analytics', requireAuth, (req, res) => {
    res.send(views.analyticsPage(req, { snapshot: analyticsSnapshot(db, req.user.id) }));
  });

  app.get('/marketplace', requireAuth, (req, res) => {
    res.send(views.marketplacePage(req, { snapshot: marketplaceSnapshot(db, req.user.id) }));
  });

  app.post('/employees', requireAuth, (req, res) => {
    try {
      const role = safeText(req.body.role, 240);
      createAiEmployee(db, {
        userId: req.user.id,
        name: safeText(req.body.name, 120),
        role,
        goals: safeText(req.body.goals, 1200),
        tools: ['Task queue', 'Knowledge base', 'Automation builder', 'Approval queue'],
        permissions: ['read_data', 'ai_memory', 'workflow_automation'],
        schedule: safeText(req.body.schedule, 300, false),
        kpis: ['Tasks completed', 'Approvals cleared', 'Business impact'],
      });
      res.redirect('/agents?message=AI%20employee%20created');
    } catch (error) {
      res.redirect(`/agents?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.get('/agents', requireAuth, (req, res) => {
    res.send(views.agentsPage(req, { workspace: agentWorkspace(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/agents/tasks', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 12, prefix: 'agent-task' }), (req, res) => {
    try {
      const agentKey = safeText(req.body.agentKey, 80);
      const title = safeText(req.body.title, 180);
      const priority = safeChoice(req.body.priority, ['low', 'normal', 'high', 'urgent'], 'normal');
      const requiresApproval = req.body.requiresApproval === 'no' ? 0 : 1;
      createAgentTask(db, { userId: req.user.id, agentKey, title, priority, requiresApproval });
      res.redirect('/agents?message=Agent%20task%20queued');
    } catch (error) {
      res.redirect(`/agents?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post('/agents/tasks/:id/status', requireAuth, (req, res) => {
    const status = safeChoice(req.body.status, ['approved', 'rejected', 'completed'], 'approved');
    const taskId = Number(req.params.id);
    const task = one(db, 'SELECT * FROM agent_tasks WHERE id = :id AND user_id = :userId', { id: taskId, userId: req.user.id });
    if (task) {
      run(db, 'UPDATE agent_tasks SET status = :status, updated_at = :updatedAt WHERE id = :id AND user_id = :userId', {
        status,
        updatedAt: nowIso(),
        id: taskId,
        userId: req.user.id,
      });
      logAction(db, { userId: req.user.id, agentKey: task.agent_key, actionType: 'agent_task_status_changed', status, riskLevel: status === 'approved' ? 'medium' : 'low', summary: `Task ${task.title} marked ${status}` });
    }
    res.redirect('/agents?message=Task%20updated');
  });

  app.get('/automations', requireAuth, (req, res) => {
    res.send(views.automationsPage(req, { snapshot: automationBuilderSnapshot(db, req.user.id), message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/automations', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'automation' }), (req, res) => {
    try {
      const name = safeText(req.body.name, 120);
      const triggerType = safeChoice(req.body.triggerType, ['launch_kit_generated', 'pilot_request_submitted', 'weekly_schedule', 'support_ticket_created', 'manual'], 'manual');
      const conditionText = safeText(req.body.conditionText, 500);
      const actionText = safeText(req.body.actionText, 700);
      const requiresApproval = req.body.requiresApproval === 'no' ? 0 : 1;
      run(db, `INSERT INTO automation_rules (user_id, name, trigger_type, condition_text, action_text, requires_approval, is_enabled, created_at, updated_at)
               VALUES (:userId, :name, :triggerType, :conditionText, :actionText, :requiresApproval, 1, :createdAt, :updatedAt)`, {
        userId: req.user.id,
        name,
        triggerType,
        conditionText,
        actionText,
        requiresApproval,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      logAction(db, { userId: req.user.id, agentKey: 'ops-automation', actionType: 'automation_rule_created', status: 'created', riskLevel: requiresApproval ? 'medium' : 'low', permissionKey: 'workflow_automation', summary: `Automation rule created: ${name}` });
      res.redirect('/automations?message=Automation%20created');
    } catch (error) {
      res.redirect(`/automations?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post('/automations/:id/steps', requireAuth, (req, res) => {
    try {
      addAutomationStep(db, {
        userId: req.user.id,
        ruleId: req.params.id,
        stepType: safeChoice(req.body.stepType, ['trigger', 'ai', 'action', 'approval', 'condition', 'complete'], 'ai'),
        agentKey: safeText(req.body.agentKey, 120, false) || 'automation-agent',
        actionText: safeText(req.body.actionText, 900),
        requiresApproval: req.body.requiresApproval === 'no' ? 0 : 1,
      });
      res.redirect('/automations?message=Automation%20step%20added');
    } catch (error) {
      res.redirect(`/automations?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post('/automations/:id/toggle', requireAuth, (req, res) => {
    const ruleId = Number(req.params.id);
    const rule = one(db, 'SELECT * FROM automation_rules WHERE id = :id AND user_id = :userId', { id: ruleId, userId: req.user.id });
    if (rule) {
      const next = rule.is_enabled ? 0 : 1;
      run(db, 'UPDATE automation_rules SET is_enabled = :next, updated_at = :updatedAt WHERE id = :id AND user_id = :userId', { next, updatedAt: nowIso(), id: ruleId, userId: req.user.id });
      logAction(db, { userId: req.user.id, agentKey: 'ops-automation', actionType: 'automation_rule_toggled', status: next ? 'enabled' : 'disabled', riskLevel: 'low', summary: `Automation ${rule.name} ${next ? 'enabled' : 'disabled'}` });
    }
    res.redirect('/automations?message=Automation%20updated');
  });

  app.get('/trust', requireAuth, (req, res) => {
    res.send(views.trustCenterPage(req, { snapshot: userTrustSnapshot(db, req.user.id), permissions: permissionCatalog, message: req.query.message || '', error: req.query.error || '' }));
  });

  app.post('/trust/permissions/:key', requireAuth, (req, res) => {
    const permission = permissionCatalog.find((item) => item.key === req.params.key);
    if (!permission) return res.redirect('/trust?error=Unknown%20permission');
    const status = safeChoice(req.body.status, ['granted', 'limited', 'approval_required', 'revoked'], permission.defaultStatus);
    run(db, `INSERT INTO permission_grants (user_id, permission_key, status, scope, created_at, updated_at)
             VALUES (:userId, :permissionKey, :status, :scope, :createdAt, :updatedAt)
             ON CONFLICT(user_id, permission_key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`, {
      userId: req.user.id,
      permissionKey: permission.key,
      status,
      scope: JSON.stringify({ risk: permission.risk }),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    logAction(db, { userId: req.user.id, agentKey: 'trust-guardian', actionType: 'permission_changed', status, riskLevel: permission.risk, permissionKey: permission.key, summary: `${permission.name} permission set to ${status}` });
    res.redirect('/trust?message=Permission%20updated');
  });

  app.post('/trust/memories/:id/delete', requireAuth, (req, res) => {
    run(db, 'DELETE FROM user_memories WHERE id = :id AND user_id = :userId', { id: Number(req.params.id), userId: req.user.id });
    logAction(db, { userId: req.user.id, agentKey: 'trust-guardian', actionType: 'memory_deleted', status: 'completed', riskLevel: 'low', permissionKey: 'ai_memory', summary: 'User deleted one AI memory' });
    res.redirect('/trust?message=Memory%20deleted');
  });

  app.get('/trust/export.json', requireAuth, (req, res) => {
    logAction(db, { userId: req.user.id, agentKey: 'trust-guardian', actionType: 'data_export_created', status: 'completed', riskLevel: 'medium', permissionKey: 'file_management', summary: 'User exported account data' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="ultralaunch-data-export.json"');
    res.send(JSON.stringify(exportUserData(db, req.user), null, 2));
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
      upsertMemory(db, { userId: req.user.id, key: 'last_industry', value: input.industry, source: 'launch_kit' });
      upsertMemory(db, { userId: req.user.id, key: 'last_audience', value: input.audience, source: 'launch_kit' });
      upsertMemory(db, { userId: req.user.id, key: 'preferred_tone', value: input.tone, source: 'launch_kit' });
      logAction(db, { userId: req.user.id, agentKey: 'launch-orchestrator', actionType: 'launch_kit_generated', status: 'completed', riskLevel: 'low', permissionKey: 'ai_memory', summary: `Generated launch kit for ${input.businessName}`, metadata: { kitId: Number(insert.lastInsertRowid), provider } });
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
      logAction(db, { userId: req.user.id, agentKey: 'ops-automation', actionType: 'support_ticket_created', status: 'open', riskLevel: 'low', summary: `Support ticket opened: ${subject}` });
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
      logAction(db, { userId: req.user.id, agentKey: 'growth-agent', actionType: 'stripe_checkout_started', status: 'redirected', riskLevel: 'medium', permissionKey: 'connected_accounts', summary: `Started subscription checkout for ${planKey}`, metadata: { sessionId: session.id } });
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
      logAction(db, { userId: req.user.id, agentKey: 'growth-agent', actionType: 'stripe_pilot_checkout_started', status: 'redirected', riskLevel: 'medium', permissionKey: 'connected_accounts', summary: 'Started concierge sprint checkout', metadata: { sessionId: session.id } });
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

  app.get('/admin/launch', requireAdmin, (req, res) => {
    res.send(views.launchStatusPage(req, { status: launchReadiness() }));
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
    const paths = ['/', '/product', '/features', '/about', '/pricing', '/demo', '/pilot', '/use-cases', '/faq', '/contact', '/login', '/register'];
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

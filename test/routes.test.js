'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_secret_1234567890_test_secret_1234567890';
process.env.APP_URL = 'http://localhost:3000';

test('core SaaS flow: home, register, dashboard, generate kit, admin', async () => {
  const { createApp } = require('../src/server');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultra-routes-'));
  const app = createApp({ dbPath: path.join(dir, 'test.sqlite') });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = {};

  async function request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) headers.cookie = cookie;
    const response = await fetch(base + url, { redirect: 'manual', ...options, headers });
    storeCookies(response, jar);
    return response;
  }

  try {
    let res = await request('/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /AI Launch Operating System/);

    res = await request('/register');
    const registerHtml = await res.text();
    const csrf = extractCsrf(registerHtml);
    assert.ok(csrf);

    res = await request('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: csrf,
        name: 'Launch Admin',
        email: 'admin@example.com',
        password: 'StrongPass123',
      }),
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/dashboard?message=Account%20created');
    assert.ok(jar.ul_session);

    res = await request('/dashboard');
    const dashboardHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(dashboardHtml, /AI Launch Kit/);
    const csrf2 = extractCsrf(dashboardHtml);

    res = await request('/dashboard/launch-kits', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: csrf2,
        businessName: 'RetentionPilot',
        industry: 'Shopify retention analytics',
        audience: 'Shopify founders trying to increase repeat purchases',
        offer: 'AI audit that finds retention leaks and writes lifecycle campaigns',
        goal: 'Get first paying customer',
        tone: 'Direct and premium',
        language: 'English',
        ecommerce: 'yes',
      }),
    });
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /^\/dashboard\/kits\//);

    res = await request(res.headers.get('location'));
    const kitHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(kitHtml, /RetentionPilot/);
    assert.match(kitHtml, /E-commerce mode/);

    res = await request('/admin');
    const adminHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(adminHtml, /Operating cockpit/);
    assert.match(adminHtml, /Launch kits/);
    assert.match(adminHtml, /AI actions/);

    res = await request('/agents');
    const agentsHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(agentsHtml, /AI Workforce/);
    assert.match(agentsHtml, /Computer Control Agent/);
    const agentsCsrf = extractCsrf(agentsHtml);

    res = await request('/agents/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: agentsCsrf,
        agentKey: 'computer-control',
        title: 'Prepare browser research plan for 20 Shopify leads',
        priority: 'high',
        requiresApproval: 'yes',
      }),
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/agents?message=Agent%20task%20queued');

    res = await request('/trust');
    const trustHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(trustHtml, /Trust center/);
    assert.match(trustHtml, /Terminal \/ Computer Actions/);

    res = await request('/automations');
    const automationsHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(automationsHtml, /Automation engine/);
    assert.match(automationsHtml, /TRIGGER/);
    const automationRuleId = automationsHtml.match(/\/automations\/(\d+)\/steps/)?.[1];
    assert.ok(automationRuleId);
    const automationCsrf = extractCsrf(automationsHtml);

    res = await request(`/automations/${automationRuleId}/steps`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: automationCsrf,
        stepType: 'ai',
        agentKey: 'automation-agent',
        actionText: 'Analyze trigger data and prepare next safe action',
        requiresApproval: 'yes',
      }),
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/automations?message=Automation%20step%20added');

    res = await request('/command');
    const commandHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(commandHtml, /AI Command Center/);
    assert.match(commandHtml, /Orchestrate with AI/);
    const commandCsrf = extractCsrf(commandHtml);

    res = await request('/command/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: commandCsrf,
        prompt: 'Optimiere meinen Shopify-Shop und erstelle eine Marketingkampagne',
      }),
    });
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /^\/command\?message=/);

    res = await request('/tasks');
    const tasksHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(tasksHtml, /Agent work/);
    assert.match(tasksHtml, /shopify-agent/);

    res = await request('/integrations');
    const integrationsHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(integrationsHtml, /MCP \/ Connector Marketplace/);
    assert.match(integrationsHtml, /Shopify/);
    const integrationCsrf = extractCsrf(integrationsHtml);

    res = await request('/integrations/shopify/install', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrf_token: integrationCsrf, permissions: 'connected_accounts' }),
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/integrations?message=Integration%20prepared');

    res = await request('/memory');
    const memoryHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(memoryHtml, /AI Memory/);

    res = await request('/files');
    const filesHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(filesHtml, /Knowledge Base/);

    res = await request('/security');
    const securityHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(securityHtml, /Security \+ Trust/);
    assert.match(securityHtml, /STOP all active AI actions/);

    res = await request('/analytics');
    const analyticsHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(analyticsHtml, /AI Analytics/);

    res = await request('/marketplace');
    const marketplaceHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(marketplaceHtml, /AI Agent Marketplace/);
    assert.match(marketplaceHtml, /CEO Agent/);

    res = await request('/permissions');
    const permissionsHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(permissionsHtml, /Computer Permission System/);
    const permissionsCsrf = extractCsrf(permissionsHtml);

    res = await request('/permissions/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: permissionsCsrf,
        agentKey: 'browser-agent',
        permissionKey: 'browser',
        decision: 'ask',
      }),
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/permissions?message=Permission%20rule%20updated');

    res = await request('/computer');
    const computerHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(computerHtml, /Desktop \+ Browser AI/);
    const computerCsrf = extractCsrf(computerHtml);

    res = await request('/computer/actions', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: computerCsrf,
        actionType: 'browser',
        what: 'Open Shopify analytics and prepare a conversion report',
        why: 'The operator needs a safe browser workflow plan',
        dataUsed: 'Approved Shopify context only',
        tool: 'Browser planner',
        expectedResult: 'Approval-gated steps for the operator to review',
      }),
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/computer?message=Computer%20action%20approval%20created');

    res = await request('/mobile');
    const mobileHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(mobileHtml, /Mobile Command Center/);

    res = await request('/voice');
    const voiceHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(voiceHtml, /Voice Command Center/);
    assert.match(voiceHtml, /No microphone is active yet/);

    res = await request('/product');
    const productHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(productHtml, /Product experience/);

    res = await request('/demo');
    const demoHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(demoHtml, /Sample output/);
    assert.match(demoHtml, /RetentionPilot/);

    res = await request('/admin/launch');
    const launchHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(launchHtml, /Launch control/);

    res = await request('/pilot');
    const pilotHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(pilotHtml, /Concierge Launch Sprint/);
    const pilotCsrf = extractCsrf(pilotHtml);

    res = await request('/pilot/request', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrf_token: pilotCsrf,
        name: 'Launch Admin',
        email: 'admin@example.com',
        company: 'RetentionPilot',
        website: 'https://example.com',
        offer: 'Need first paid Shopify audit customer',
        urgency: 'Need first customer this week',
        budget: 'Ready for $199 sprint',
      }),
    });
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /^\/pilot\?message=/);

    res = await request('/billing');
    const billingHtml = await res.text();
    assert.equal(res.status, 200);
    assert.match(billingHtml, /Manage subscription/);

    const csrf3 = extractCsrf(billingHtml);
    res = await request('/billing/checkout/starter', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrf_token: csrf3 }),
    });
    assert.equal(res.status, 412);
    assert.match(await res.text(), /Stripe is technically implemented/);

    res = await request('/billing');
    const billingHtml2 = await res.text();
    const csrf4 = extractCsrf(billingHtml2);
    res = await request('/billing/checkout-pilot', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrf_token: csrf4 }),
    });
    assert.equal(res.status, 412);
    assert.match(await res.text(), /STRIPE_PRICE_PILOT/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    app.locals.close?.();
  }
});

function extractCsrf(html) {
  return html.match(/name="csrf_token" value="([^"]+)"/)?.[1];
}

function storeCookies(response, jar) {
  const getSetCookie = response.headers.getSetCookie ? response.headers.getSetCookie() : null;
  const raw = getSetCookie && getSetCookie.length ? getSetCookie : splitSetCookie(response.headers.get('set-cookie'));
  for (const cookie of raw) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    if (index === -1) continue;
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (!value) delete jar[name];
    else jar[name] = value;
  }
}

function splitSetCookie(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[^;=]+=[^;]+)/g).map((item) => item.trim());
}

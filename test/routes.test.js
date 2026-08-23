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
    assert.match(await res.text(), /AI launch operator/);

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

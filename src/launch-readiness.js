'use strict';

const { paidPlans, pilotOffer } = require('./plans');

function mask(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 10) return 'set';
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function check(name, ok, detail, action = '') {
  return { name, ok: Boolean(ok), detail, action };
}

function launchReadiness() {
  const appUrl = process.env.APP_URL || '';
  const sessionSecret = process.env.SESSION_SECRET || '';
  const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const priceChecks = paidPlans().map((plan) => check(
    `Stripe price: ${plan.name}`,
    Boolean(process.env[plan.stripeEnv]),
    process.env[plan.stripeEnv] ? mask(process.env[plan.stripeEnv]) : `${plan.stripeEnv} missing`,
    `Run npm run stripe:setup and set ${plan.stripeEnv}.`,
  ));

  const checks = [
    check('Production APP_URL', /^https:\/\//.test(appUrl), appUrl || 'APP_URL missing', 'Set APP_URL to your deployed https:// domain.'),
    check('Session secret', sessionSecret.length >= 32, sessionSecret ? 'configured' : 'missing', 'Generate one: openssl rand -hex 32'),
    check('Admin email', Boolean(process.env.ADMIN_EMAILS), process.env.ADMIN_EMAILS || 'First registered user becomes admin', 'Set ADMIN_EMAILS=your@email.com before first production signup.'),
    check('Stripe secret key', Boolean(stripeSecret), stripeSecret ? mask(stripeSecret) : 'missing', 'Set STRIPE_SECRET_KEY in deployment secrets.'),
    ...priceChecks,
    check(`Stripe price: ${pilotOffer.name}`, Boolean(process.env[pilotOffer.stripeEnv]), process.env[pilotOffer.stripeEnv] ? mask(process.env[pilotOffer.stripeEnv]) : `${pilotOffer.stripeEnv} missing`, `Run npm run stripe:setup and set ${pilotOffer.stripeEnv}.`),
    check('Stripe webhook secret', Boolean(webhookSecret), webhookSecret ? mask(webhookSecret) : 'missing', 'Create webhook /webhooks/stripe and set STRIPE_WEBHOOK_SECRET.'),
    check('AI provider', Boolean(process.env.OPENAI_API_KEY), process.env.OPENAI_API_KEY ? 'external LLM configured' : 'offline engine active', 'Optional: set OPENAI_API_KEY for external LLM output.'),
    check('Support email', Boolean(process.env.SUPPORT_EMAIL), process.env.SUPPORT_EMAIL || 'default support@example.com', 'Set SUPPORT_EMAIL to a real inbox.'),
    check('Database path', Boolean(process.env.DATABASE_PATH), process.env.DATABASE_PATH || 'default data/ultralaunch.sqlite', 'Use a persistent disk or managed DB in production.'),
  ];

  const requiredNames = new Set([
    'Production APP_URL',
    'Session secret',
    'Stripe secret key',
    ...paidPlans().map((plan) => `Stripe price: ${plan.name}`),
    `Stripe price: ${pilotOffer.name}`,
    'Stripe webhook secret',
  ]);
  const required = checks.filter((item) => requiredNames.has(item.name));
  const requiredPassed = required.filter((item) => item.ok).length;
  const ready = requiredPassed === required.length;
  return {
    ready,
    requiredPassed,
    requiredTotal: required.length,
    checks,
    missingRequired: required.filter((item) => !item.ok),
    nextManualActions: nextManualActions(checks),
  };
}

function nextManualActions(checks) {
  return checks
    .filter((item) => !item.ok && item.action)
    .map((item) => item.action)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 8);
}

module.exports = {
  launchReadiness,
};

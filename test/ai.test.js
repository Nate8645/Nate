'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFallbackKit, generateLaunchKit } = require('../src/ai');

test('offline launch engine generates a complete launch kit', () => {
  const kit = buildFallbackKit({
    businessName: 'RetentionPilot',
    industry: 'Shopify retention analytics',
    audience: 'Shopify founders with repeat purchase problems',
    offer: 'AI audit that identifies retention leaks and writes lifecycle campaigns',
    goal: 'Get first paying customer',
    ecommerce: 'yes',
  });

  assert.match(kit.executiveSummary, /RetentionPilot/);
  assert.ok(kit.landingPage.heroHeadline);
  assert.ok(Array.isArray(kit.content.tiktokIdeas));
  assert.ok(kit.ecommerce.productResearch.length > 0);
  assert.ok(kit.warRoom['16–24h Customer acquisition']);
});

test('generateLaunchKit works without external API keys', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const { result, provider } = await generateLaunchKit({
    businessName: 'FounderKit',
    industry: 'SaaS launch planning',
    audience: 'solo founders',
    offer: 'launch assets from one brief',
  });
  process.env.OPENAI_API_KEY = oldKey;

  assert.equal(provider, 'offline-launch-engine');
  assert.ok(result.outreach.coldEmail.includes('FounderKit'));
});

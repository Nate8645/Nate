'use strict';

require('dotenv').config();
const Stripe = require('stripe');
const { paidPlans, pilotOffer } = require('../src/plans');

async function ensurePrice(stripe, { name, description, lookupKey, unitAmount, recurring = null, metadata }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data.length) {
    const price = existing.data[0];
    console.log(`${name}: existing price=${price.id}`);
    return price.id;
  }

  const product = await stripe.products.create({
    name,
    description,
    metadata,
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'usd',
    ...(recurring ? { recurring } : {}),
    lookup_key: lookupKey,
    metadata,
  });
  console.log(`${name}: product=${product.id} price=${price.id}`);
  return price.id;
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY. Add a Stripe test or live secret key to .env, then run again.');
    process.exit(1);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  console.log('Creating or reusing Stripe products/prices for UltraLaunch AI...');
  const outputs = {};

  for (const plan of paidPlans()) {
    outputs[plan.stripeEnv] = await ensurePrice(stripe, {
      name: `UltraLaunch AI ${plan.name}`,
      description: plan.description,
      lookupKey: `ultralaunch_${plan.key}_monthly`,
      unitAmount: plan.price * 100,
      recurring: { interval: 'month' },
      metadata: { app: 'ultralaunch-ai', plan: plan.key, kitLimit: String(plan.kitLimit) },
    });
  }

  outputs[pilotOffer.stripeEnv] = await ensurePrice(stripe, {
    name: `UltraLaunch AI ${pilotOffer.name}`,
    description: pilotOffer.description,
    lookupKey: 'ultralaunch_pilot_onetime',
    unitAmount: pilotOffer.price * 100,
    metadata: { app: 'ultralaunch-ai', product: pilotOffer.key },
  });

  console.log('\nCopy these values into your .env or deployment environment:');
  for (const [key, value] of Object.entries(outputs)) {
    console.log(`${key}=${value}`);
  }
  console.log('\nNext: create a Stripe webhook endpoint pointing to APP_URL/webhooks/stripe, listen for checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, then set STRIPE_WEBHOOK_SECRET.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

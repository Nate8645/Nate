'use strict';

require('dotenv').config();
const Stripe = require('stripe');
const { paidPlans } = require('../src/plans');

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY. Add a Stripe test or live secret key to .env, then run again.');
    process.exit(1);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  console.log('Creating Stripe products/prices for UltraLaunch AI...');
  const outputs = {};

  for (const plan of paidPlans()) {
    const product = await stripe.products.create({
      name: `UltraLaunch AI ${plan.name}`,
      description: plan.description,
      metadata: { app: 'ultralaunch-ai', plan: plan.key },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price * 100,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: `ultralaunch_${plan.key}_monthly`,
      metadata: { app: 'ultralaunch-ai', plan: plan.key, kitLimit: String(plan.kitLimit) },
    });
    outputs[plan.stripeEnv] = price.id;
    console.log(`${plan.name}: product=${product.id} price=${price.id}`);
  }

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

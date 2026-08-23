'use strict';

const Stripe = require('stripe');
const { one, run, nowIso } = require('./db');
const { getPlan, stripePriceIdForPlan, planFromStripePrice } = require('./plans');

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    appInfo: { name: 'UltraLaunch AI', version: '0.1.0' },
  });
}

function billingConfigured(planKey) {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  if (planKey && !stripePriceIdForPlan(planKey)) return false;
  return true;
}

function appUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

async function ensureStripeCustomer(db, stripe, user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user.id) },
  });
  run(db, 'UPDATE users SET stripe_customer_id = :customerId, updated_at = :updatedAt WHERE id = :userId', {
    customerId: customer.id,
    updatedAt: nowIso(),
    userId: user.id,
  });
  return customer.id;
}

async function createCheckoutSession(db, req, planKey) {
  const plan = getPlan(planKey);
  if (!plan || plan.key === 'free' || !billingConfigured(plan.key)) return { configured: false, plan };
  const stripe = stripeClient();
  const customerId = await ensureStripeCustomer(db, stripe, req.user);
  const base = appUrl(req);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: stripePriceIdForPlan(plan.key), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing/cancel`,
    client_reference_id: String(req.user.id),
    metadata: { userId: String(req.user.id), plan: plan.key },
    subscription_data: { metadata: { userId: String(req.user.id), plan: plan.key } },
  });
  return { configured: true, url: session.url, id: session.id, plan };
}

async function createPortalSession(db, req) {
  if (!process.env.STRIPE_SECRET_KEY) return { configured: false, reason: 'STRIPE_SECRET_KEY is missing.' };
  const stripe = stripeClient();
  const user = one(db, 'SELECT * FROM users WHERE id = :id', { id: req.user.id });
  if (!user?.stripe_customer_id) return { configured: false, reason: 'No Stripe customer exists yet. Start a paid checkout first.' };
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: process.env.STRIPE_PORTAL_RETURN_URL || `${appUrl(req)}/billing`,
  });
  return { configured: true, url: session.url };
}

async function syncCheckoutSession(db, session) {
  const userId = Number(session.metadata?.userId || session.client_reference_id || 0);
  if (!userId) return;
  let planKey = session.metadata?.plan || null;
  let subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  let status = 'active';

  if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
    const stripe = stripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
    status = subscription.status || status;
    const priceId = subscription.items?.data?.[0]?.price?.id;
    planKey = planFromStripePrice(priceId) || planKey;
  }

  if (!planKey) planKey = 'starter';
  run(db, `UPDATE users
           SET plan = :plan, stripe_customer_id = :customerId, stripe_subscription_id = :subscriptionId,
               subscription_status = :status, updated_at = :updatedAt
           WHERE id = :userId`, {
    plan: planKey,
    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    subscriptionId,
    status,
    updatedAt: nowIso(),
    userId,
  });
}

function updateUserFromSubscription(db, subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const subscriptionId = subscription.id;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planKey = planFromStripePrice(priceId) || subscription.metadata?.plan || null;
  const status = subscription.status || 'active';
  const userId = Number(subscription.metadata?.userId || 0);

  const existing = userId
    ? one(db, 'SELECT * FROM users WHERE id = :id', { id: userId })
    : one(db, 'SELECT * FROM users WHERE stripe_customer_id = :customerId OR stripe_subscription_id = :subscriptionId', { customerId, subscriptionId });

  if (!existing) return;

  const nextPlan = ['active', 'trialing', 'past_due'].includes(status) ? (planKey || existing.plan || 'starter') : 'free';
  run(db, `UPDATE users
           SET plan = :plan, stripe_customer_id = :customerId, stripe_subscription_id = :subscriptionId,
               subscription_status = :status, updated_at = :updatedAt
           WHERE id = :id`, {
    id: existing.id,
    plan: nextPlan,
    customerId,
    subscriptionId,
    status,
    updatedAt: nowIso(),
  });
}

function markSubscriptionCanceled(db, subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const existing = one(db, 'SELECT * FROM users WHERE stripe_customer_id = :customerId OR stripe_subscription_id = :subscriptionId', {
    customerId,
    subscriptionId: subscription.id,
  });
  if (!existing) return;
  run(db, `UPDATE users SET plan = 'free', subscription_status = 'canceled', stripe_subscription_id = :subscriptionId, updated_at = :updatedAt WHERE id = :id`, {
    id: existing.id,
    subscriptionId: subscription.id,
    updatedAt: nowIso(),
  });
}

function stripeWebhookHandler(db) {
  return async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send('Stripe webhook not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.');
    }

    const stripe = stripeClient();
    const signature = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
    }

    const alreadyProcessed = one(db, 'SELECT id FROM stripe_events WHERE id = :id', { id: event.id });
    if (alreadyProcessed) return res.json({ received: true, duplicate: true });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await syncCheckoutSession(db, event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          updateUserFromSubscription(db, event.data.object);
          break;
        case 'customer.subscription.deleted':
          markSubscriptionCanceled(db, event.data.object);
          break;
        case 'invoice.payment_failed': {
          const customerId = typeof event.data.object.customer === 'string' ? event.data.object.customer : event.data.object.customer?.id;
          run(db, `UPDATE users SET subscription_status = 'past_due', updated_at = :updatedAt WHERE stripe_customer_id = :customerId`, {
            customerId,
            updatedAt: nowIso(),
          });
          break;
        }
        default:
          break;
      }

      run(db, `INSERT INTO stripe_events (id, type, processed_at, payload)
               VALUES (:id, :type, :processedAt, :payload)`, {
        id: event.id,
        type: event.type,
        processedAt: nowIso(),
        payload: JSON.stringify(event),
      });
      return res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook processing error', error);
      return res.status(500).send('Webhook processing failed.');
    }
  };
}

module.exports = {
  stripeClient,
  billingConfigured,
  createCheckoutSession,
  createPortalSession,
  stripeWebhookHandler,
  syncCheckoutSession,
  updateUserFromSubscription,
};

'use strict';

const plans = {
  free: {
    key: 'free',
    name: 'Free Launch Audit',
    price: 0,
    cadence: 'forever',
    stripeEnv: null,
    kitLimit: 3,
    support: 'Community support',
    cta: 'Start free',
    description: 'Validate one idea and generate a lean launch pack without a card.',
    features: [
      '3 launch kits per month',
      'Landing page + pricing copy',
      'Basic outreach scripts',
      'Usage dashboard',
    ],
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    price: 19,
    cadence: 'month',
    stripeEnv: 'STRIPE_PRICE_STARTER',
    kitLimit: 30,
    support: 'Email support',
    cta: 'Launch faster',
    description: 'For solo founders testing offers and booking the first calls.',
    features: [
      '30 launch kits per month',
      'ICP, positioning, pricing, FAQ',
      'Email + DM sequences',
      'SEO article briefs',
      'Stripe customer portal',
    ],
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    price: 49,
    cadence: 'month',
    stripeEnv: 'STRIPE_PRICE_PRO',
    kitLimit: 150,
    support: 'Priority support',
    cta: 'Scale acquisition',
    description: 'For agencies, consultants, and operators launching weekly campaigns.',
    features: [
      '150 launch kits per month',
      'Competitor angles + objection handling',
      'Short-form video content packs',
      'E-commerce research mode',
      'Admin analytics dashboard',
    ],
    featured: true,
  },
  business: {
    key: 'business',
    name: 'Business',
    price: 149,
    cadence: 'month',
    stripeEnv: 'STRIPE_PRICE_BUSINESS',
    kitLimit: 500,
    support: 'Priority support + onboarding',
    cta: 'Build a launch machine',
    description: 'For small teams needing repeatable offer creation and sales enablement.',
    features: [
      '500 launch kits per month',
      'Team-ready playbooks',
      'Custom CTA and sales-call assets',
      'Support ticket prioritization',
      'Roadmap-ready analytics exports',
    ],
  },
};

function getPlan(key) {
  return plans[key] || plans.free;
}

function paidPlans() {
  return Object.values(plans).filter((plan) => plan.price > 0);
}

function publicPlans() {
  return Object.values(plans);
}

function stripePriceIdForPlan(planKey) {
  const plan = getPlan(planKey);
  return plan.stripeEnv ? process.env[plan.stripeEnv] : null;
}

function planFromStripePrice(priceId) {
  if (!priceId) return null;
  return paidPlans().find((plan) => process.env[plan.stripeEnv] === priceId)?.key || null;
}

module.exports = {
  plans,
  getPlan,
  paidPlans,
  publicPlans,
  stripePriceIdForPlan,
  planFromStripePrice,
};

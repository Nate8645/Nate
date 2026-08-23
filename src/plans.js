'use strict';

const pilotOffer = {
  key: 'pilot',
  name: 'Concierge Launch Sprint',
  price: 199,
  cadence: 'one-time',
  stripeEnv: 'STRIPE_PRICE_PILOT',
  description: 'Founder-led 24-hour launch sprint: refined kit, landing-page critique, and first 25 outreach messages prepared with you.',
  cta: 'Buy launch sprint',
  deliverables: [
    '1 live or async launch-kit review',
    'Landing-page hero and pricing refinement',
    'First 25 personalized outreach messages prepared',
    'Objection map and close script',
    'Subscription credit recommendation after sprint',
  ],
};

const plans = {
  free: {
    key: 'free',
    name: 'Free Launch Audit',
    price: 0,
    cadence: 'forever',
    stripeEnv: null,
    kitLimit: 3,
    aiCredits: 100,
    agentSeats: 1,
    premiumIntegrations: 0,
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
    aiCredits: 1000,
    agentSeats: 3,
    premiumIntegrations: 2,
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
    aiCredits: 5000,
    agentSeats: 10,
    premiumIntegrations: 8,
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
    aiCredits: 20000,
    agentSeats: 50,
    premiumIntegrations: 25,
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

function stripePriceIdForPilot() {
  return process.env[pilotOffer.stripeEnv] || null;
}

function planFromStripePrice(priceId) {
  if (!priceId) return null;
  return paidPlans().find((plan) => process.env[plan.stripeEnv] === priceId)?.key || null;
}

module.exports = {
  plans,
  pilotOffer,
  getPlan,
  paidPlans,
  publicPlans,
  stripePriceIdForPlan,
  stripePriceIdForPilot,
  planFromStripePrice,
};

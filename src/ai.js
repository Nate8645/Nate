'use strict';

function activeAiProvider() {
  if (process.env.OPENAI_API_KEY) return process.env.AI_PROVIDER || 'openai';
  return 'offline-launch-engine';
}

function clean(value, fallback = '') {
  return String(value || fallback).trim();
}

function words(value) {
  return clean(value).split(/\s+/).filter(Boolean);
}

function truncate(value, max = 700) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function inferPainPoints(audience, offer, industry) {
  const base = [
    `They want the outcome promised by ${industry} without adding another complex tool.`,
    'They are skeptical of generic AI output and need assets they can use immediately.',
    'They have limited time to validate demand before building more features.',
  ];
  const text = `${audience} ${offer}`.toLowerCase();
  if (text.includes('shopify') || text.includes('ecommerce') || text.includes('store')) {
    base.push('They need product, SEO, retention, and conversion improvements that connect to revenue.');
  }
  if (text.includes('agency') || text.includes('client')) {
    base.push('They need repeatable deliverables that can be customized for multiple clients.');
  }
  if (text.includes('founder') || text.includes('startup')) {
    base.push('They need proof from sales conversations before spending weeks on engineering.');
  }
  return base.slice(0, 5);
}

function buildFallbackKit(input) {
  const businessName = clean(input.businessName, 'Launch Offer');
  const industry = clean(input.industry, 'AI business services');
  const audience = truncate(input.audience, 500) || 'time-constrained founders who need a clear path to paying customers';
  const offer = truncate(input.offer, 650) || 'a focused AI-powered launch kit that converts a rough idea into sales assets';
  const goal = clean(input.goal, 'Get first paying customer');
  const tone = clean(input.tone, 'Direct and premium').toLowerCase();
  const language = clean(input.language, 'English');
  const ecommerce = input.ecommerce === 'yes' || input.ecommerce === true;
  const premium = tone.includes('premium') || tone.includes('technical');
  const priceAnchor = premium ? 149 : 49;
  const keywordSeed = words(`${industry} ${businessName}`).slice(0, 5).join(' ') || industry;

  const kit = {
    executiveSummary: `${businessName} should launch as a narrow, outcome-led offer for ${audience}. The fastest path to ${goal.toLowerCase()} is not a broad product launch; it is a paid diagnostic or starter package that proves demand, creates a customer conversation, and captures objections before scaling.`,
    targetCustomer: {
      primaryICP: audience,
      buyingTrigger: `The buyer is actively trying to improve ${industry} results, but lacks a clear message, offer, or repeatable acquisition motion.`,
      painPoints: inferPainPoints(audience, offer, industry),
      decisionMaker: ecommerce ? 'Founder, head of ecommerce, growth lead, or retention manager.' : 'Founder, operator, agency owner, consultant, or revenue leader.',
      disqualifiers: ['Only wants free advice', 'Cannot act within 14 days', 'Has no budget owner', 'Needs enterprise procurement before a small test'],
    },
    positioning: {
      oneLiner: `${businessName} helps ${audience} turn ${industry} uncertainty into a launch-ready offer and sales motion in one focused sprint.`,
      category: ecommerce ? 'AI ecommerce growth launch workspace' : 'AI launch operations workspace',
      uniqueMechanism: 'A structured launch kit combines positioning, pricing, landing copy, outreach, content, and a 24-hour war-room plan instead of generating isolated copy snippets.',
      proofToCollect: ['Before/after landing copy', 'Number of prospects contacted', 'Demo calls booked', 'First paid pilot or pre-order', 'Customer objections learned'],
    },
    offerAndPricing: {
      freeTrial: 'Free Launch Audit: one generated kit, no card, designed to reveal the buyer’s fastest path to demand validation.',
      starter: `Starter Sprint: ${money(priceAnchor)}/mo for solo users who need repeatable launch kits and outreach packs.`,
      pro: `Pro Growth: ${money(priceAnchor * 3)}/mo for agencies or operators running multiple campaigns each month.`,
      business: `Business War Room: ${money(priceAnchor * 9)}/mo for teams needing higher volume, support priority, and custom workflows.`,
      firstCustomerOffer: `Offer a paid pilot: ${money(priceAnchor * 2)} for a 7-day ${businessName} launch sprint. Credit the pilot fee toward the first subscription if they continue.`,
      guarantee: 'Guarantee deliverables and speed, not revenue. Example: “If you do not receive the complete launch kit within 24 hours, you do not pay.”',
    },
    landingPage: {
      heroHeadline: `Launch ${industry} offers people understand, trust, and buy faster.`,
      subheadline: `${businessName} turns your brief into positioning, pricing, website copy, outreach scripts, and a 24-hour action plan built for ${audience}.`,
      primaryCTA: 'Generate my launch kit',
      secondaryCTA: 'See pricing',
      bullets: [
        'Clarify the buyer, pain, promise, and offer in one workflow.',
        'Create landing-page copy, FAQ, objections, emails, DMs, and sales scripts.',
        'Track usage, support, and subscription status inside the dashboard.',
      ],
      socialProofPlaceholder: 'Replace with the first real pilot result as soon as it exists. Do not fabricate testimonials.',
      faq: [
        'How fast can I use the output? Most assets are ready to paste into a landing page or outreach sequence immediately.',
        'Is revenue guaranteed? No. The product improves speed and clarity; customers still need to execute real outreach.',
        'Can I edit the kit? Yes. Treat it as the first strong draft and improve it with real market feedback.',
      ],
    },
    outreach: {
      emailSubjectLines: [
        `Quick idea for your ${industry} launch`,
        `I built a ${businessName} launch kit for teams like yours`,
        `Can I show you a 24-hour path to validate this offer?`,
      ],
      coldEmail: `Hi {{first_name}},\n\nI noticed {{company}} is in ${industry}. I am testing ${businessName}, which turns a rough offer into a landing page narrative, pricing ladder, outreach scripts, and a 24-hour validation plan for ${audience}.\n\nIf I build a sample launch kit around one offer you are considering, would you be open to a 15-minute review this week? If it is useful, the paid pilot is ${money(priceAnchor * 2)} and includes the complete kit plus launch checklist.\n\nWorth a look?`,
      dmScript: `Saw your work in ${industry}. I am looking for 3 operators who want a sharper offer + outreach pack this week. I can generate a sample ${businessName} launch kit around one idea and walk you through it in 15 minutes. Interested?`,
      followUp: `Quick follow-up — the useful part is not more AI copy. It is having the buyer, offer, pricing, landing copy, objections, and first 25 outreach messages in one place so you can test demand immediately. Want me to make one for {{company}}?`,
    },
    content: {
      tiktokIdeas: [
        `“I turned a messy ${industry} idea into a sellable offer in 3 minutes — here is the before/after.”`,
        'Screen-record a launch kit being generated, then highlight the cold email and pricing section.',
        'Break down three reasons founders overbuild before validating willingness to pay.',
      ],
      instagramPosts: [
        'Carousel: The 7 assets every 24-hour launch needs.',
        `Carousel: How to price a ${industry} pilot without sounding cheap.`,
        'Reel: From rough idea to first DM script — fast walkthrough.',
      ],
      youtubeShorts: [
        '“Stop asking AI for one headline. Ask for the whole sales motion.”',
        `“Here is the exact ${industry} outreach script I would send today.”`,
        '“The first customer checklist: buyer, pain, promise, price, proof, pipeline.”',
      ],
      seoBriefs: [
        `Best AI launch tools for ${keywordSeed}`,
        `How to validate a ${industry} offer in 24 hours`,
        `Cold outreach script for ${industry} founders`,
      ],
      adHeadlines: [
        'Launch your offer before you overbuild.',
        'Generate the sales assets your MVP is missing.',
        'One AI launch kit. One clear next action.',
      ],
    },
    salesScript: {
      opener: `“I help ${audience} turn a rough ${industry} idea into a launch-ready offer and sales motion within 24 hours. The goal is to get real market feedback before you invest more time.”`,
      discoveryQuestions: [
        'What are you trying to sell in the next 30 days?',
        'Who is the exact buyer and what triggers the purchase?',
        'What have you already tried to validate demand?',
        'What price would make this worth supporting personally?',
        'If we had the launch kit tomorrow, who would you send it to first?',
      ],
      objectionHandling: [
        '“We can do this ourselves.” — Absolutely. The value is speed and completeness: a full sales motion in one pass, then you edit with your domain knowledge.',
        '“No budget.” — Start with the free kit; if it creates a real sales conversation, upgrade or buy the sprint.',
        '“AI output is generic.” — The workflow forces ICP, pricing, objections, and channel-specific execution so it is more actionable than a blank prompt.',
      ],
      close: `“If I prepare the complete kit around your current offer by tomorrow, are you comfortable starting with the ${money(priceAnchor * 2)} pilot?”`,
    },
    competitorResearch: {
      directCompetitorsToCheck: ['AI landing page builders', 'AI business plan generators', 'Sales outreach generators', 'Agency offer audit templates'],
      differentiationAngles: [
        'Position around first-customer speed rather than generic document generation.',
        'Bundle landing page, pricing, outreach, social, SEO, and analytics into one launch workflow.',
        'Use transparent usage limits and Stripe subscriptions instead of opaque credits.',
      ],
      validationTasks: [
        'Search Product Hunt, G2, AppSumo, and LinkedIn for repeated complaints about launch tools.',
        'Interview five target buyers about their last failed launch.',
        'Compare entry pricing and identify a narrow wedge where speed matters more than design control.',
      ],
    },
    ecommerce: ecommerce ? {
      productResearch: [
        `Identify 10 products in ${industry} with high repeat purchase or subscription potential.`,
        'Collect customer review phrases and convert them into landing-page benefit language.',
        'Score products by margin, urgency, repeatability, differentiation, and paid acquisition risk.',
      ],
      storeIntegration: ['Create Shopify product-description variants.', 'Draft collection SEO copy.', 'Prepare Klaviyo welcome, abandon cart, and win-back email hooks.', 'Track conversion rate, AOV, repeat purchase rate, and refund reasons.'],
      supportMacros: ['Where is my order?', 'Which product is right for me?', 'Can I return this?', 'How long does shipping take?'],
    } : null,
    warRoom: {
      '0–2h Research + decision': ['Narrow ICP', 'Pick first paid pilot offer', 'List 50 reachable leads', 'Prepare Stripe test checkout'],
      '2–8h Build': ['Publish landing page', 'Create demo kit', 'Set usage limits', 'Create onboarding email and support flow'],
      '8–12h Test + fixes': ['Run signup, login, kit generation, billing config, webhook test, mobile UI, admin review'],
      '12–16h Launch prep': ['Record 30-second demo', 'Post LinkedIn/Twitter/communities', 'Prepare founder DM list', 'Set calendar CTA'],
      '16–24h Customer acquisition': ['Send first 50 DMs/emails', 'Offer 3 paid pilot slots', 'Book demos', 'Update copy from objections', 'Ask every call for one referral'],
    },
    launchChecklist: [
      'Add real Stripe API keys and webhook secret.',
      'Connect an LLM key if you want external model output instead of offline engine.',
      'Register first admin account and generate a demo launch kit.',
      'Record a short product walkthrough from the dashboard.',
      'Send the first targeted outreach batch manually — no fake customers or fake revenue.',
      'Track visits, signups, kits generated, demos booked, paid pilots, and churn risk.',
    ],
    metrics: ['Landing page visitors', 'Visitor-to-signup rate', 'Signup-to-kit rate', 'Kit-to-demo rate', 'Demo-to-paid pilot rate', 'Monthly recurring revenue', 'Usage per active account', 'Support response time'],
  };

  if (language.toLowerCase().startsWith('german')) {
    kit.executiveSummary = `${businessName} sollte als klares, ergebnisorientiertes Angebot für ${audience} starten. Der schnellste Weg zu „${goal}“ ist kein breiter Produktlaunch, sondern ein bezahlter Pilot oder Sprint, der Nachfrage beweist, Einwände sammelt und echte Verkaufsgespräche erzeugt.`;
  }

  return kit;
}

function money(value) {
  return `$${Number(value).toLocaleString('en-US')}`;
}

function parseJsonFromModel(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty AI response');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  return JSON.parse(candidate);
}

async function callOpenAi(input) {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = `You are a senior AI startup CEO, CRO, CMO, product strategist, and launch operator. Generate a launch-ready AI SaaS business kit as strict JSON with these top-level keys: executiveSummary, targetCustomer, positioning, offerAndPricing, landingPage, outreach, content, salesScript, competitorResearch, ecommerce, warRoom, launchChecklist, metrics.\n\nInput:\n${JSON.stringify(input, null, 2)}\n\nRules: no fake revenue, no fake testimonials, no illegal scraping, actionable copy, realistic first-customer plan, concise but complete. Output only JSON.`;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You create practical launch assets for real businesses. Never invent traction, customers, or payments.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI-compatible API failed: ${response.status} ${body.slice(0, 300)}`);
  }
  const data = await response.json();
  return parseJsonFromModel(data.choices?.[0]?.message?.content);
}

async function generateLaunchKit(input) {
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await callOpenAi(input);
      return { result, provider: process.env.AI_PROVIDER || 'openai' };
    } catch (error) {
      console.warn('External AI provider failed; falling back to offline launch engine:', error.message);
      const result = buildFallbackKit(input);
      result.providerWarning = 'External AI provider failed, so this kit was generated by the built-in offline launch engine.';
      return { result, provider: 'offline-launch-engine' };
    }
  }
  return { result: buildFallbackKit(input), provider: 'offline-launch-engine' };
}

module.exports = {
  activeAiProvider,
  buildFallbackKit,
  generateLaunchKit,
};

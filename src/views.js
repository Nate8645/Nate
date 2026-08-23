'use strict';

const { publicPlans, getPlan } = require('./plans');

function e(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US')}`;
}

function csrf(req) {
  return `<input type="hidden" name="csrf_token" value="${e(req.csrfToken || '')}">`;
}

function navLink(active, href, label) {
  return `<a class="nav-link ${active === href ? 'active' : ''}" href="${href}">${label}</a>`;
}

function flashHtml(message, type = 'info') {
  if (!message) return '';
  return `<div class="flash ${e(type)}">${e(message)}</div>`;
}

function renderPage(req, { title, description = 'AI launch workspace for founders and agencies.', active = '/', content, footerCta = true }) {
  const user = req.user;
  const appName = process.env.APP_NAME || 'UltraLaunch AI';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const currentPath = req.path === '/' ? '/' : req.path;
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
  const authenticatedLinks = user
    ? `<a class="nav-link ${currentPath.startsWith('/dashboard') ? 'active' : ''}" href="/dashboard">Dashboard</a>
       ${user.role === 'admin' ? `<a class="nav-link ${currentPath.startsWith('/admin') ? 'active' : ''}" href="/admin">Admin</a>` : ''}
       <form action="/logout" method="post" class="inline-form">${csrf(req)}<button class="nav-button" type="submit">Logout</button></form>`
    : `<a class="nav-link ${currentPath === '/login' ? 'active' : ''}" href="/login">Login</a><a class="btn btn-small" href="/register">Start free</a>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(title)} · ${e(appName)}</title>
  <meta name="description" content="${e(description)}">
  <meta property="og:title" content="${e(title)} · ${e(appName)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(appUrl + req.originalUrl)}">
  <link rel="canonical" href="${e(appUrl + req.path)}">
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container nav-shell">
      <a class="brand" href="/" aria-label="${e(appName)} home">
        <span class="brand-mark">UL</span>
        <span>${e(appName)}</span>
      </a>
      <button class="mobile-menu" data-menu-toggle aria-label="Open navigation">Menu</button>
      <nav class="site-nav" data-menu>
        ${navLink(currentPath, '/', 'Home')}
        ${navLink(currentPath, '/features', 'Features')}
        ${navLink(currentPath, '/pricing', 'Pricing')}
        ${navLink(currentPath, '/use-cases', 'Use cases')}
        ${navLink(currentPath, '/faq', 'FAQ')}
        ${navLink(currentPath, '/contact', 'Contact')}
        ${authenticatedLinks}
      </nav>
    </div>
  </header>
  <main id="main">
    ${content}
    ${footerCta ? finalCta(req) : ''}
  </main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <strong>${e(appName)}</strong>
        <p>AI launch kits, pricing, outreach, and operating dashboards for founders who need proof fast.</p>
      </div>
      <div>
        <span class="footer-title">Product</span>
        <a href="/features">Features</a>
        <a href="/pricing">Pricing</a>
        <a href="/use-cases">Use cases</a>
      </div>
      <div>
        <span class="footer-title">Company</span>
        <a href="/faq">FAQ</a>
        <a href="/contact">Contact</a>
        <a href="mailto:${e(supportEmail)}">Support</a>
      </div>
      <div>
        <span class="footer-title">Trust</span>
        <p>No fake revenue, no hidden spend, no API keys in code. Stripe and LLMs are configured with environment variables.</p>
      </div>
    </div>
  </footer>
  <script src="/app.js" defer></script>
</body>
</html>`;
}

function finalCta(req) {
  if (req.user) return '';
  return `<section class="section cta-band">
    <div class="container cta-card">
      <div>
        <p class="eyebrow">24-hour launch sprint</p>
        <h2>Turn your next offer into a sellable launch kit today.</h2>
        <p>Generate the website story, pricing ladder, outreach scripts, content calendar, and launch checklist from one brief.</p>
      </div>
      <a class="btn btn-light" href="/register">Create free account</a>
    </div>
  </section>`;
}

function heroPage(req) {
  return renderPage(req, {
    title: 'AI launch operator for first-customer speed',
    active: '/',
    description: 'Generate launch kits with pricing, landing page copy, outreach, short-form content, and analytics in minutes.',
    content: `<section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">From idea to first sales conversation</p>
          <h1>Build a launch-ready offer, website story, and outbound pack in minutes.</h1>
          <p class="hero-subtitle">UltraLaunch AI helps founders, consultants, agencies, and ecommerce operators transform a rough idea into a focused launch kit: ICP, positioning, pricing, landing copy, SEO briefs, social scripts, and a 24-hour execution plan.</p>
          <div class="hero-actions">
            <a class="btn" href="/register">Start free</a>
            <a class="btn btn-secondary" href="/pricing">See pricing</a>
          </div>
          <div class="trust-row" aria-label="Product proof points">
            <span>✓ No card for Free</span>
            <span>✓ Stripe-ready subscriptions</span>
            <span>✓ Built-in usage tracking</span>
          </div>
        </div>
        <div class="hero-panel" aria-label="Launch kit preview">
          <div class="panel-toolbar"><span></span><span></span><span></span></div>
          <div class="mini-dashboard">
            <div class="metric-card"><strong>3 min</strong><span>Launch brief to assets</span></div>
            <div class="metric-card"><strong>12+</strong><span>Sales assets per kit</span></div>
            <div class="metric-card"><strong>24h</strong><span>War-room plan</span></div>
          </div>
          <div class="launch-preview">
            <p class="eyebrow">Generated offer</p>
            <h3>AI retention audit for Shopify brands</h3>
            <ul>
              <li>Hero promise and pricing ladder</li>
              <li>Founder DM sequence and discovery script</li>
              <li>TikTok, Shorts, Instagram, SEO pack</li>
              <li>Customer objections and launch checklist</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container logo-strip">
        <span>Designed for speed</span>
        <span>Founders</span>
        <span>AI agencies</span>
        <span>Consultants</span>
        <span>E-commerce operators</span>
      </div>
    </section>

    <section class="section">
      <div class="container split">
        <div>
          <p class="eyebrow">Why this product now</p>
          <h2>Most launch tools stop at copy. UltraLaunch connects copy to selling.</h2>
        </div>
        <div class="card-grid three">
          <article class="card"><h3>Offer clarity</h3><p>AI-generated positioning, ICP, pricing, value proof, objection handling, and landing-page copy.</p></article>
          <article class="card"><h3>Sales motion</h3><p>Email, DM, sales-call scripts, demo flow, and call-to-action assets aimed at real conversations.</p></article>
          <article class="card"><h3>Operating layer</h3><p>Usage limits, accounts, subscriptions, support tickets, and admin analytics already included.</p></article>
        </div>
      </div>
    </section>

    <section class="section muted">
      <div class="container">
        <div class="section-heading">
          <p class="eyebrow">How it works</p>
          <h2>One brief. One launch kit. One next action.</h2>
        </div>
        <div class="steps">
          <div><span>01</span><h3>Describe the market</h3><p>Enter the niche, buyer, offer, goal, and tone. Optional ecommerce mode adds store-specific assets.</p></div>
          <div><span>02</span><h3>Generate the kit</h3><p>The AI engine creates positioning, pricing, website copy, content, outreach, and a 24-hour plan.</p></div>
          <div><span>03</span><h3>Sell and iterate</h3><p>Track usage, export assets, open support tickets, and upgrade when outbound volume grows.</p></div>
        </div>
      </div>
    </section>`,
  });
}

function featuresPage(req) {
  return renderPage(req, {
    title: 'Features',
    active: '/features',
    description: 'AI launch kits, dashboard, subscriptions, support, analytics, and admin operations.',
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">Product</p><h1>Everything needed to make an idea sellable today.</h1><p>Not a mood board. UltraLaunch combines a working SaaS workflow with acquisition assets.</p></div></section>
    <section class="section"><div class="container card-grid three">
      ${featureCard('Launch Kit AI', 'Generate ICP, offer, pricing, landing-page copy, outreach scripts, SEO briefs, video ideas, ecommerce angles, and a 24-hour execution plan.')}
      ${featureCard('Accounts and auth', 'Secure registration, login, session cookies, password hashing, CSRF protection, and user-specific dashboards.')}
      ${featureCard('Usage tracking', 'Plan-based monthly kit limits, usage events, and dashboard progress so cost and value stay visible.')}
      ${featureCard('Stripe subscriptions', 'Checkout, subscription webhooks, upgrade/downgrade via Stripe Customer Portal, cancellation handling, and price setup script.')}
      ${featureCard('Admin cockpit', 'Monitor signups, visits, launch kits, paid users, support tickets, and account status from a protected admin area.')}
      ${featureCard('Customer support', 'Public contact form and logged-in support tickets with admin status management.')}
      ${featureCard('Analytics', 'First-party page-view and product-event analytics stored in SQLite without third-party tracking scripts.')}
      ${featureCard('Responsive UI', 'Conversion-focused desktop and mobile pages with accessible navigation and performance-first static assets.')}
      ${featureCard('Security baseline', 'Environment variables for secrets, no hard-coded API keys, input validation, rate limiting, and verified Stripe webhooks.')}
    </div></section>`,
  });
}

function featureCard(title, body) {
  return `<article class="card"><div class="icon-dot"></div><h3>${e(title)}</h3><p>${e(body)}</p></article>`;
}

function pricingCards(req, mode = 'public') {
  const currentPlan = req.user?.plan || 'free';
  return `<div class="pricing-grid">
    ${publicPlans().map((plan) => {
      const isCurrent = currentPlan === plan.key;
      const href = plan.key === 'free' ? '/register' : `/billing/checkout/${plan.key}`;
      const button = req.user && plan.key !== 'free'
        ? `<form action="${href}" method="post">${csrf(req)}<button class="btn ${plan.featured ? '' : 'btn-secondary'}" type="submit">${isCurrent ? 'Manage plan' : e(plan.cta)}</button></form>`
        : `<a class="btn ${plan.featured ? '' : 'btn-secondary'}" href="${plan.key === 'free' ? '/register' : '/register'}">${e(plan.cta)}</a>`;
      return `<article class="price-card ${plan.featured ? 'featured' : ''}">
        ${plan.featured ? '<span class="badge">Most popular</span>' : ''}
        <h3>${e(plan.name)}</h3>
        <p>${e(plan.description)}</p>
        <div class="price"><span>${money(plan.price)}</span><small>/${e(plan.cadence)}</small></div>
        <ul>${plan.features.map((item) => `<li>${e(item)}</li>`).join('')}</ul>
        <p class="support-note">${e(plan.support)} · ${plan.kitLimit} kits/month</p>
        ${button}
      </article>`;
    }).join('')}
  </div>`;
}

function pricingPage(req, message = '') {
  return renderPage(req, {
    title: 'Pricing',
    active: '/pricing',
    description: 'Simple AI SaaS subscriptions with free trial, Starter, Pro, and Business plans.',
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">Pricing</p><h1>Start free. Upgrade when launch volume grows.</h1><p>Flat monthly plans with visible usage limits. Stripe Checkout and Customer Portal are wired for subscription management.</p>${flashHtml(message)}</div></section>
    <section class="section"><div class="container">${pricingCards(req)}</div></section>
    <section class="section muted"><div class="container split"><div><h2>What counts as usage?</h2><p>Each generated launch kit counts as one unit. Page visits, support tickets, and billing actions do not reduce your kit allowance.</p></div><div class="card"><h3>Need more?</h3><p>Business customers can request higher limits, team workflows, or white-label agency reports through support.</p><a class="text-link" href="/contact">Talk to us →</a></div></div></section>`,
  });
}

function useCasesPage(req) {
  const cases = [
    ['Solo founder', 'Validate a micro-SaaS idea, draft the website, and start outbound before overbuilding.'],
    ['AI agency', 'Create client-specific offer audits, campaign scripts, and lead-magnet pages in one workflow.'],
    ['Consultant', 'Package expertise into a clear paid diagnostic, sales script, and follow-up email sequence.'],
    ['E-commerce operator', 'Analyze a product category, sharpen product descriptions, generate SEO briefs, and prep retention offers.'],
    ['Product marketer', 'Turn feature notes into launch messaging, FAQ, objection handling, and social snippets.'],
    ['Sales team', 'Create segment-specific email/DM scripts and discovery calls for new offers.'],
  ];
  return renderPage(req, {
    title: 'Use cases',
    active: '/use-cases',
    description: 'Use UltraLaunch AI for founders, agencies, consultants, ecommerce teams, product marketers, and sales teams.',
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">Use cases</p><h1>Launch assets for teams that sell before they scale.</h1></div></section>
    <section class="section"><div class="container card-grid three">${cases.map(([title, body]) => featureCard(title, body)).join('')}</div></section>`,
  });
}

function faqPage(req) {
  const faqs = [
    ['Is this a real product or a mockup?', 'It is a working Node/Express SaaS app with authentication, SQLite persistence, usage tracking, Stripe integration hooks, AI generation, support tickets, admin analytics, and responsive pages.'],
    ['Do I need an OpenAI key?', 'No for local demos: the built-in Launch Intelligence Engine generates structured launch kits. Add an OpenAI-compatible API key to use an external LLM.'],
    ['Can customers actually pay?', 'Yes after you add Stripe keys and price IDs from your Stripe account. Checkout, webhooks, subscriptions, customer portal, upgrades, downgrades, and cancellations are implemented.'],
    ['Do you run ads or spend money automatically?', 'No. The product prepares campaigns and scripts, but no ad spend, purchases, or fake transactions are started without explicit human approval.'],
    ['How is usage limited?', 'Each plan has a monthly launch-kit allowance. The dashboard shows used and remaining kits.'],
    ['Who is the first admin?', 'The first registered user becomes admin automatically. You can also set ADMIN_EMAILS in environment variables.'],
  ];
  return renderPage(req, {
    title: 'FAQ',
    active: '/faq',
    description: 'Frequently asked questions about UltraLaunch AI.',
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">FAQ</p><h1>Fast answers before launch.</h1></div></section>
    <section class="section"><div class="container faq-list">${faqs.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')}</div></section>`,
  });
}

function contactPage(req, { message = '', error = '' } = {}) {
  const user = req.user;
  return renderPage(req, {
    title: 'Contact',
    active: '/contact',
    description: 'Contact UltraLaunch AI for support, demos, and launch questions.',
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">Contact</p><h1>Need help launching or buying?</h1><p>Send a message. Logged-in users can also open support tickets from the dashboard.</p>${flashHtml(message, 'success')}${flashHtml(error, 'error')}</div></section>
    <section class="section"><div class="container form-layout">
      <form class="card form-card" method="post" action="/contact">
        ${csrf(req)}
        <label>Name<input name="name" required maxlength="80" value="${e(user?.name || '')}"></label>
        <label>Email<input name="email" type="email" required maxlength="120" value="${e(user?.email || '')}"></label>
        <label>Company<input name="company" maxlength="120" placeholder="Optional"></label>
        <label>Message<textarea name="message" required maxlength="2000" rows="7" placeholder="Tell us what you want to launch."></textarea></label>
        <button class="btn" type="submit">Send message</button>
      </form>
      <aside class="card side-card"><h2>Fastest path to a demo</h2><ol><li>Create a free account.</li><li>Generate a launch kit for your own offer.</li><li>Reply with the kit link and the outcome you want.</li></ol><a class="btn btn-secondary" href="/register">Create account</a></aside>
    </div></section>`,
  });
}

function authPage(req, { mode = 'login', error = '', returnTo = '' } = {}) {
  const isRegister = mode === 'register';
  return renderPage(req, {
    title: isRegister ? 'Register' : 'Login',
    active: isRegister ? '/register' : '/login',
    footerCta: false,
    content: `<section class="auth-section"><div class="container auth-shell">
      <div class="auth-copy"><p class="eyebrow">${isRegister ? 'Start free' : 'Welcome back'}</p><h1>${isRegister ? 'Create your launch workspace.' : 'Log in to your dashboard.'}</h1><p>${isRegister ? 'The first registered user becomes the admin. Free plan includes three launch kits per month.' : 'Continue generating launch kits, tracking usage, and managing billing.'}</p></div>
      <form class="card form-card auth-card" method="post" action="${isRegister ? '/register' : '/login'}">
        ${csrf(req)}
        ${returnTo ? `<input type="hidden" name="returnTo" value="${e(returnTo)}">` : ''}
        ${flashHtml(error, 'error')}
        ${isRegister ? `<label>Name<input name="name" required maxlength="80" autocomplete="name"></label>` : ''}
        <label>Email<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
        <label>Password<input name="password" type="password" required minlength="10" autocomplete="${isRegister ? 'new-password' : 'current-password'}"></label>
        <button class="btn" type="submit">${isRegister ? 'Create account' : 'Login'}</button>
        <p class="muted-text">${isRegister ? 'Already have an account? <a href="/login">Login</a>' : 'No account yet? <a href="/register">Start free</a>'}</p>
      </form>
    </div></section>`,
  });
}

function dashboardPage(req, { plan, used, remaining, kits, message = '', error = '', provider = 'offline' }) {
  const progress = Math.min(100, Math.round((used / Math.max(1, plan.kitLimit)) * 100));
  return renderPage(req, {
    title: 'Dashboard',
    active: '/dashboard',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container dashboard-head"><div><p class="eyebrow">Dashboard</p><h1>Welcome, ${e(req.user.name)}.</h1><p>Generate launch kits and move directly to outreach.</p></div><a class="btn btn-secondary" href="/billing">Manage billing</a></div></section>
    <section class="section dashboard-section"><div class="container dashboard-grid">
      <aside class="stack">
        <div class="card usage-card"><h2>${e(plan.name)}</h2><p>${e(req.user.subscriptionStatus || 'free')} subscription · ${e(provider)} mode</p><div class="usage-bar"><span style="width:${progress}%"></span></div><p><strong>${used}</strong> used · <strong>${remaining}</strong> remaining this month</p><a class="text-link" href="/pricing">View plan limits →</a></div>
        <div class="card"><h2>Recent kits</h2>${kits.length ? `<ul class="kit-list">${kits.map((kit) => `<li><a href="/dashboard/kits/${kit.id}">${e(kit.name)}</a><span>${formatDate(kit.created_at)}</span></li>`).join('')}</ul>` : '<p>No kits yet. Generate the first one now.</p>'}</div>
      </aside>
      <div class="stack">
        ${flashHtml(message, 'success')}${flashHtml(error, 'error')}
        <form class="card form-card generator-form" method="post" action="/dashboard/launch-kits">
          ${csrf(req)}
          <div class="form-header"><div><p class="eyebrow">AI Launch Kit</p><h2>Describe the offer</h2></div><span class="badge">1 usage credit</span></div>
          <div class="form-grid two">
            <label>Business or offer name<input name="businessName" required maxlength="100" placeholder="e.g. RetentionPilot"></label>
            <label>Industry / niche<input name="industry" required maxlength="100" placeholder="e.g. Shopify retention analytics"></label>
          </div>
          <label>Ideal customer<textarea name="audience" required maxlength="700" rows="3" placeholder="Who buys? What pain do they have?"></textarea></label>
          <label>Core offer<textarea name="offer" required maxlength="900" rows="4" placeholder="What do you sell? What outcome is promised?"></textarea></label>
          <div class="form-grid two">
            <label>Launch goal<select name="goal"><option>Get first paying customer</option><option>Book 10 demos</option><option>Validate pricing</option><option>Launch ecommerce product</option><option>Build agency lead magnet</option></select></label>
            <label>Tone<select name="tone"><option>Direct and premium</option><option>Friendly and practical</option><option>Bold and disruptive</option><option>Technical and credible</option></select></label>
          </div>
          <div class="form-grid two">
            <label>Website or competitor URL<input name="website" maxlength="200" placeholder="Optional"></label>
            <label>Language<select name="language"><option>English</option><option>German</option></select></label>
          </div>
          <label class="checkbox-row"><input type="checkbox" name="ecommerce" value="yes"> Include ecommerce/product research mode</label>
          <button class="btn" type="submit">Generate launch kit</button>
        </form>
      </div>
    </div></section>`,
  });
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`;
}

function renderSection(title, body) {
  if (Array.isArray(body)) return `<section class="kit-section"><h2>${e(title)}</h2>${renderList(body)}</section>`;
  if (body && typeof body === 'object') {
    return `<section class="kit-section"><h2>${e(title)}</h2>${Object.entries(body).map(([key, value]) => `<div class="kit-field"><h3>${e(key.replace(/([A-Z])/g, ' $1'))}</h3>${Array.isArray(value) ? renderList(value) : `<p>${e(value)}</p>`}</div>`).join('')}</section>`;
  }
  return `<section class="kit-section"><h2>${e(title)}</h2><p>${e(body)}</p></section>`;
}

function kitPage(req, { kit, result }) {
  const sections = [
    ['Executive summary', result.executiveSummary],
    ['Target customer', result.targetCustomer],
    ['Positioning', result.positioning],
    ['Offer and pricing', result.offerAndPricing],
    ['Landing page copy', result.landingPage],
    ['Outreach pack', result.outreach],
    ['Social and SEO content', result.content],
    ['Sales script', result.salesScript],
    ['Competitor and validation angles', result.competitorResearch],
    ['24-hour war room', result.warRoom],
    ['Launch checklist', result.launchChecklist],
    ['Metrics to track', result.metrics],
  ];
  if (result.ecommerce) sections.splice(8, 0, ['E-commerce mode', result.ecommerce]);

  return renderPage(req, {
    title: kit.name,
    active: '/dashboard',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container dashboard-head"><div><p class="eyebrow">Launch Kit</p><h1>${e(kit.name)}</h1><p>${e(kit.industry)} · generated ${formatDate(kit.created_at)} · ${e(kit.ai_provider)} mode</p></div><div class="button-row"><a class="btn btn-secondary" href="/dashboard">New kit</a><a class="btn" href="/dashboard/kits/${kit.id}/download">Download JSON</a></div></div></section>
    <section class="section"><div class="container kit-layout"><aside class="card"><h2>Quick action</h2><ol><li>Publish the landing copy.</li><li>Send the first 25 targeted DMs.</li><li>Book demos before adding features.</li></ol><a class="text-link" href="/support">Ask support for help →</a></aside><article class="kit-document">${sections.map(([title, body]) => renderSection(title, body)).join('')}</article></div></section>`,
  });
}

function billingPage(req, { message = '', error = '' } = {}) {
  const plan = getPlan(req.user.plan);
  return renderPage(req, {
    title: 'Billing',
    active: '/dashboard',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container"><p class="eyebrow">Billing</p><h1>Manage subscription</h1><p>Current plan: <strong>${e(plan.name)}</strong> · status: <strong>${e(req.user.subscriptionStatus)}</strong></p>${flashHtml(message, 'success')}${flashHtml(error, 'error')}</div></section>
    <section class="section"><div class="container stack">
      ${pricingCards(req, 'billing')}
      <div class="card billing-actions"><h2>Customer Portal</h2><p>Use Stripe Customer Portal to upgrade, downgrade, cancel, update payment method, and download invoices.</p><form method="post" action="/billing/portal">${csrf(req)}<button class="btn btn-secondary" type="submit">Open customer portal</button></form></div>
    </div></section>`,
  });
}

function supportPage(req, { tickets = [], message = '', error = '' } = {}) {
  return renderPage(req, {
    title: 'Support',
    active: '/dashboard',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container"><p class="eyebrow">Support</p><h1>Customer support</h1><p>Open a ticket for billing, launch strategy, or technical help.</p>${flashHtml(message, 'success')}${flashHtml(error, 'error')}</div></section>
    <section class="section"><div class="container dashboard-grid"><form class="card form-card" method="post" action="/support">${csrf(req)}<label>Subject<input name="subject" required maxlength="120"></label><label>Message<textarea name="message" required rows="7" maxlength="3000"></textarea></label><button class="btn" type="submit">Open ticket</button></form><aside class="card"><h2>Your tickets</h2>${tickets.length ? `<ul class="ticket-list">${tickets.map((ticket) => `<li><strong>${e(ticket.subject)}</strong><span>${e(ticket.status)} · ${formatDate(ticket.created_at)}</span></li>`).join('')}</ul>` : '<p>No tickets yet.</p>'}</aside></div></section>`,
  });
}

function adminPage(req, { metrics, users, tickets, events, message = '' }) {
  return renderPage(req, {
    title: 'Admin',
    active: '/admin',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container"><p class="eyebrow">Admin</p><h1>Operating cockpit</h1><p>Monitor activation, usage, support, and subscription readiness.</p>${flashHtml(message, 'success')}</div></section>
    <section class="section"><div class="container stack">
      <div class="metric-grid">
        ${metric('Users', metrics.users)}${metric('Paid users', metrics.paidUsers)}${metric('Visits today', metrics.visitsToday)}${metric('Kits today', metrics.kitsToday)}${metric('Launch kits', metrics.launchKits)}${metric('Open tickets', metrics.openTickets)}
      </div>
      <div class="admin-grid">
        <div class="card table-card"><h2>Latest users</h2>${table(['Name','Email','Plan','Role','Created'], users.map((u) => [u.name, u.email, `${u.plan} / ${u.subscription_status}`, u.role, formatDate(u.created_at)]))}</div>
        <div class="card table-card"><h2>Open support</h2>${tickets.length ? tickets.map((ticket) => `<form class="ticket-admin" method="post" action="/admin/tickets/${ticket.id}/status">${csrf(req)}<div><strong>${e(ticket.subject)}</strong><p>${e(ticket.message)}</p><span>${e(ticket.email)} · ${formatDate(ticket.created_at)}</span></div><select name="status"><option ${ticket.status === 'open' ? 'selected' : ''}>open</option><option ${ticket.status === 'waiting' ? 'selected' : ''}>waiting</option><option ${ticket.status === 'closed' ? 'selected' : ''}>closed</option></select><button class="btn btn-small" type="submit">Update</button></form>`).join('') : '<p>No open tickets.</p>'}</div>
      </div>
      <div class="card table-card"><h2>Latest analytics events</h2>${table(['Event','Path','User','Time'], events.map((event) => [event.event_name, event.path || '—', event.user_id || 'anonymous', formatDate(event.created_at)]))}</div>
    </div></section>`,
  });
}

function metric(label, value) {
  return `<div class="metric-card large"><strong>${e(value)}</strong><span>${e(label)}</span></div>`;
}

function table(headers, rows) {
  if (!rows.length) return '<p>No data yet.</p>';
  return `<div class="responsive-table"><table><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function stripeConfigPage(req, { planKey }) {
  const plan = getPlan(planKey);
  return renderPage(req, {
    title: 'Stripe setup required',
    active: '/pricing',
    footerCta: false,
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">Manual setup required</p><h1>Stripe is technically implemented. Add keys to accept real payments.</h1><p>You selected <strong>${e(plan.name)}</strong>. Checkout cannot redirect until the one-time Stripe configuration is complete.</p></div></section>
    <section class="section"><div class="container form-layout"><div class="card"><h2>One-time manual step</h2><ol><li>Create or open your Stripe account.</li><li>Run <code>npm run stripe:setup</code> locally after setting <code>STRIPE_SECRET_KEY</code>.</li><li>Copy the generated price IDs into <code>STRIPE_PRICE_STARTER</code>, <code>STRIPE_PRICE_PRO</code>, and <code>STRIPE_PRICE_BUSINESS</code>.</li><li>Create a webhook endpoint for <code>/webhooks/stripe</code> and set <code>STRIPE_WEBHOOK_SECRET</code>.</li><li>Restart the app and click checkout again.</li></ol><p>No fake payment or bypass has been performed.</p></div><div class="card"><h2>Test mode checklist</h2><ul><li>Use Stripe test keys first.</li><li>Complete Checkout with Stripe test cards.</li><li>Verify webhook updates the user plan.</li><li>Use Customer Portal for upgrade, downgrade, and cancellation.</li></ul><a class="btn btn-secondary" href="/billing">Back to billing</a></div></div></section>`,
  });
}

function errorPage(req, { status = 500, title = 'Something went wrong', message = 'Please try again.' }) {
  return renderPage(req, {
    title,
    footerCta: false,
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">${status}</p><h1>${e(title)}</h1><p>${e(message)}</p><a class="btn btn-secondary" href="/">Go home</a></div></section>`,
  });
}

module.exports = {
  e,
  csrf,
  flashHtml,
  renderPage,
  heroPage,
  featuresPage,
  pricingPage,
  useCasesPage,
  faqPage,
  contactPage,
  authPage,
  dashboardPage,
  kitPage,
  billingPage,
  supportPage,
  adminPage,
  stripeConfigPage,
  errorPage,
};

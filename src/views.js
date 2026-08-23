'use strict';

const { publicPlans, getPlan, pilotOffer } = require('./plans');

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
  const isActive = active === href || (href !== '/' && active.startsWith(href));
  return `<a class="nav-link ${isActive ? 'active' : ''}" href="${href}">${label}</a>`;
}

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
}

function sectionHeader(eyebrow, title, body = '') {
  return `<div class="section-heading reveal"><p class="eyebrow">${e(eyebrow)}</p><h2>${e(title)}</h2>${body ? `<p>${e(body)}</p>` : ''}</div>`;
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
  const schema = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: appName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: appUrl,
    description,
    offers: publicPlans().filter((plan) => plan.price > 0).map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    })),
  });
  const authenticatedLinks = user
    ? `<a class="nav-link ${currentPath.startsWith('/dashboard') ? 'active' : ''}" href="/dashboard">Dashboard</a>
       <a class="nav-link ${currentPath.startsWith('/command') ? 'active' : ''}" href="/command">Command</a>
       <a class="nav-link ${currentPath.startsWith('/agents') ? 'active' : ''}" href="/agents">Agents</a>
       <a class="nav-link ${currentPath.startsWith('/security') || currentPath.startsWith('/trust') ? 'active' : ''}" href="/security">Security</a>
       <a class="nav-link ${currentPath.startsWith('/billing') ? 'active' : ''}" href="/billing">Billing</a>
       ${user.role === 'admin' ? `<a class="nav-link ${currentPath.startsWith('/admin') ? 'active' : ''}" href="/admin">Admin</a>` : ''}
       <form action="/logout" method="post" class="inline-form">${csrf(req)}<button class="nav-button" type="submit">Logout</button></form>`
    : `<a class="nav-link ${currentPath === '/login' ? 'active' : ''}" href="/login">Account</a><a class="btn btn-small magnetic" href="/register">Start free</a>`;

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
  <meta property="og:image" content="${e(appUrl)}/og-card.svg">
  <meta name="theme-color" content="#070914">
  <link rel="canonical" href="${e(appUrl + req.path)}">
  <link rel="stylesheet" href="/app.css">
  ${schema}
</head>
<body>
  <div class="scroll-progress" data-scroll-progress></div>
  <div class="ambient-orb orb-one" aria-hidden="true"></div>
  <div class="ambient-orb orb-two" aria-hidden="true"></div>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header glass-nav">
    <div class="container nav-shell">
      <a class="brand" href="/" aria-label="${e(appName)} home">
        <span class="brand-mark">UL</span>
        <span><strong>${e(appName)}</strong><small>Launch OS</small></span>
      </a>
      <button class="mobile-menu" data-menu-toggle aria-label="Open navigation" aria-expanded="false">Menu</button>
      <nav class="site-nav" data-menu aria-label="Primary navigation">
        ${navLink(currentPath, '/', 'Home')}
        ${navLink(currentPath, '/product', 'Product')}
        ${navLink(currentPath, '/features', 'Features')}
        ${navLink(currentPath, '/about', 'About')}
        ${navLink(currentPath, '/pricing', 'Pricing')}
        ${navLink(currentPath, '/demo', 'Demo')}
        ${navLink(currentPath, '/pilot', 'Sprint')}
        ${navLink(currentPath, '/faq', 'FAQ')}
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
        <a href="/demo">Demo kit</a>
        <a href="/pilot">Concierge sprint</a>
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
  return `<section class="section cta-band cinematic-cut">
    <div class="container cta-card premium-cta reveal">
      <div>
        <p class="eyebrow">Launch control</p>
        <h2>Stop guessing. Put the offer, page, pricing, and first outreach motion in one operating system.</h2>
        <p>Start free, inspect a sample kit, or buy the concierge sprint when you need the first serious customer conversation fast.</p>
      </div>
      <div class="cta-actions">
        <a class="btn btn-light magnetic" href="/register">Create free workspace</a>
        <a class="btn btn-secondary" href="/demo">View sample kit</a>
      </div>
    </div>
  </section>`;
}

function heroPage(req) {
  return renderPage(req, {
    title: 'Premium AI Launch OS for first-customer speed',
    active: '/',
    description: 'A cinematic AI launch operating system that turns one offer brief into a website story, pricing ladder, outreach motion, and conversion dashboard.',
    content: `<section class="hero cinematic-hero" data-parallax-scene>
      <div class="hero-noise" aria-hidden="true"></div>
      <div class="container hero-grid premium-hero-grid">
        <div class="hero-copy reveal">
          <p class="eyebrow glow-label">AI Launch Operating System</p>
          <h1><span class="text-gradient">From offer idea</span> to sellable launch motion.</h1>
          <p class="hero-subtitle">UltraLaunch AI turns one rough brief into premium positioning, pricing, landing copy, outreach scripts, content angles, support flows, usage tracking, and a revenue-ready dashboard.</p>
          <div class="hero-actions">
            <a class="btn magnetic" href="/register">Generate my free kit</a>
            <a class="btn btn-secondary magnetic" href="/product">Explore product</a>
            <a class="btn btn-ghost" href="/watch-demo.html">Watch walkthrough</a>
          </div>
          <div class="trust-row premium-trust" aria-label="Product proof points">
            <span>No-card free workspace</span>
            <span>Stripe-ready billing</span>
            <span>$199 concierge sprint</span>
            <span>No fake revenue claims</span>
          </div>
        </div>
        <div class="hero-stage reveal" aria-label="Premium product visual">
          ${productVisual()}
        </div>
      </div>
    </section>

    <section class="section brand-strip-section">
      <div class="container logo-strip premium-strip reveal" aria-label="Target customers">
        <span>Solo founders</span><span>AI agencies</span><span>Consultants</span><span>Shopify operators</span><span>Product marketers</span><span>Sales teams</span>
      </div>
    </section>

    <section class="section story-section">
      <div class="container narrative-grid">
        <div class="sticky-copy reveal">
          <p class="eyebrow">The story</p>
          <h2>Most teams do not need another AI text box. They need a launch command center.</h2>
          <p>UltraLaunch AI connects strategy, copy, sales, pricing, subscriptions, support, and analytics into one premium acquisition workflow.</p>
        </div>
        <div class="story-stack">
          ${storyPanel('01', 'Problem', 'Vague offers, unclear buyers, no pricing confidence, and a blank outbound motion slow down first revenue.', 'danger')}
          ${storyPanel('02', 'Solution', 'One brief becomes ICP, promise, landing copy, social content, email, DM, sales script, and 24-hour action plan.', 'primary')}
          ${storyPanel('03', 'Monetization', 'The free kit proves value, subscriptions scale usage, and the $199 sprint creates the fastest realistic first-customer path.', 'success')}
        </div>
      </div>
    </section>

    <section class="section product-reveal cinematic-cut" id="product-reveal">
      <div class="container">
        ${sectionHeader('Product reveal', 'The launch kit is the product.', 'Every output is designed to move a buyer from idea to conversation, not to create generic copy.')}
        <div class="showcase-grid">
          <article class="showcase-card reveal"><span>01</span><h3>Offer intelligence</h3><p>ICP, pains, buying trigger, disqualifiers, positioning, and a one-line promise.</p></article>
          <article class="showcase-card reveal"><span>02</span><h3>Conversion layer</h3><p>Hero copy, pricing ladder, FAQ, objections, CTA, and trust architecture.</p></article>
          <article class="showcase-card reveal"><span>03</span><h3>Sales motion</h3><p>Cold email, founder DM, follow-up, discovery script, close, and 24-hour war room.</p></article>
        </div>
      </div>
    </section>

    <section class="section benefits-section">
      <div class="container split premium-split">
        <div class="reveal">
          <p class="eyebrow">Why customers buy</p>
          <h2>Premium output without weeks of brand, copy, and sales ops work.</h2>
          <p class="muted-text">Built for buyers who care about speed, clarity, and a concrete next sales action.</p>
          <a class="text-link" href="/demo">Inspect the sample kit →</a>
        </div>
        <div class="card-grid three">
          ${featureCard('First-customer speed', 'The workflow points every section toward demos, replies, paid pilots, or stronger objections.')}
          ${featureCard('Subscription-ready', 'Plan limits, checkout, portal, webhooks, usage events, and admin metrics are already wired.')}
          ${featureCard('Concierge upsell', 'A clear $199 implementation sprint gives visitors a high-intent purchase path before subscriptions scale.')}
        </div>
      </div>
    </section>

    <section class="section social-proof-section muted">
      <div class="container">
        ${sectionHeader('Trust architecture', 'Designed for real proof — never fabricated traction.', 'These slots are intentionally labeled until real customer results exist.')}
        <div class="proof-grid">
          ${proofCard('Customer result slot', 'Reserved for the first verified paid sprint outcome. No fake testimonials shown.')}
          ${proofCard('Press / community slot', 'Prepared for launch posts, Product Hunt mentions, or founder community feedback.')}
          ${proofCard('Metric slot', 'Track real visitors, signups, kits, checkout starts, paid orders, and sprint conversion.')}
        </div>
      </div>
    </section>

    <section class="section pricing-teaser">
      <div class="container split premium-split">
        <div class="reveal"><p class="eyebrow">Pricing</p><h2>Free to try. Paid when launch volume or urgency appears.</h2><p class="muted-text">Use the free plan for activation, monthly plans for repeat use, and the sprint for immediate implementation help.</p></div>
        <div class="price-ladder reveal"><div><strong>$0</strong><span>Free audit</span></div><div><strong>$19+</strong><span>SaaS plans</span></div><div><strong>$199</strong><span>Concierge sprint</span></div></div>
      </div>
    </section>`,
  });
}

function productVisual() {
  return `<div class="product-orbit" data-tilt>
    <div class="orbit-ring ring-a"></div><div class="orbit-ring ring-b"></div><div class="floating-chip chip-a">ICP</div><div class="floating-chip chip-b">Pricing</div><div class="floating-chip chip-c">Outreach</div>
    <div class="device-shell">
      <div class="device-top"><span></span><span></span><span></span><strong>Launch Kit OS</strong></div>
      <div class="device-body">
        <div class="ai-pulse"><span></span></div>
        <h3>AI retention audit for Shopify brands</h3>
        <div class="command-line"><em></em><span>Generate buyer, offer, pricing, page, scripts...</span></div>
        <div class="visual-grid">
          <div><strong>24h</strong><small>War room</small></div>
          <div><strong>12+</strong><small>Assets</small></div>
          <div><strong>$199</strong><small>Sprint</small></div>
        </div>
        <div class="timeline-mini"><i style="width:32%"></i><i style="width:62%"></i><i style="width:88%"></i></div>
      </div>
    </div>
  </div>`;
}

function storyPanel(number, title, body, tone = 'primary') {
  return `<article class="story-panel reveal ${tone}"><span>${e(number)}</span><div><h3>${e(title)}</h3><p>${e(body)}</p></div></article>`;
}

function proofCard(title, body) {
  return `<article class="proof-card reveal"><span class="placeholder-tag">Verified-data slot</span><h3>${e(title)}</h3><p>${e(body)}</p></article>`;
}

function productPage(req) {
  return renderPage(req, {
    title: 'Product Experience',
    active: '/product',
    description: 'Explore the premium UltraLaunch AI product experience, launch kit workflow, plan variants, concierge sprint, and account flow.',
    content: `<section class="page-hero product-hero"><div class="container hero-grid premium-hero-grid"><div class="reveal"><p class="eyebrow">Product experience</p><h1>The AI launch workspace built like a premium operating system.</h1><p>One interface for strategy, conversion copy, pricing, sales scripts, subscriptions, support, and analytics.</p><div class="hero-actions"><a class="btn magnetic" href="/register">Start free</a><a class="btn btn-secondary" href="/demo">View sample output</a></div></div><div class="hero-stage">${productVisual()}</div></div></section>
    <section class="section"><div class="container product-detail-grid"><div class="product-gallery reveal"><div class="gallery-main">${productVisual()}</div><div class="gallery-thumbs"><span>Dashboard</span><span>Launch kit</span><span>Agents</span><span>Trust</span></div></div><div class="product-info reveal"><p class="eyebrow">UltraLaunch AI</p><h2>Launch Kit OS</h2><p class="product-price">Free / $19 / $49 / $149 / $199 sprint</p><p>Choose the plan that matches your launch volume. Use the concierge sprint when speed and execution support matter more than self-serve usage.</p><div class="variant-grid"><a class="variant" href="/register"><strong>Free</strong><span>3 kits/mo</span></a><a class="variant" href="/pricing"><strong>Pro</strong><span>150 kits/mo</span></a><a class="variant highlighted" href="/pilot"><strong>Sprint</strong><span>$199 one-time</span></a></div><div class="quantity-row"><span>Seats</span><button type="button">−</button><strong>1</strong><button type="button">+</button></div><a class="btn magnetic" href="/register">Create workspace</a><a class="btn btn-secondary" href="/pilot">Buy concierge sprint</a></div></div></section>
    <section class="section muted"><div class="container"><div class="card-grid three">${featureCard('AI Command Center', 'One central chat/orchestrator creates plans, selects agents, queues tasks, and requests approvals before critical action.')}${featureCard('Massive AI workforce', '50+ role-based agents coordinate launch, growth, sales, engineering, operations, trust, commerce, creative, and computer-control planning.')}${featureCard('MCP marketplace', 'Integrations for GitHub, Shopify, Stripe, Google, Slack, CRMs, social, databases, cloud, and analytics are prepared with permissions and auth states.')}${featureCard('Immediate delivery', 'Self-serve launch kits are generated immediately after signup. Sprint delivery is arranged after payment and intake.')}${featureCard('Trust center', 'Customers can see AI action history, permissions, memory, connected-account readiness, export controls, and deletion actions.')}${featureCard('Account and billing', 'Users manage subscriptions through Stripe Checkout and Customer Portal once Stripe is configured.')}${featureCard('Prepared for reviews', 'Review, press, and results components are ready for real proof after first customers exist.')}</div></div></section>
    <section class="section"><div class="container faq-list"><details open><summary>Is this a SaaS product or service?</summary><p>Both. The SaaS generates launch kits; the $199 sprint is a productized service upsell for implementation speed.</p></details><details><summary>Can this support future 3D assets?</summary><p>Yes. The current CSS product visual is lightweight, and the layout is ready for a future GLB/GLTF model embed.</p></details><details><summary>Are reviews real?</summary><p>No fake reviews are displayed. Placeholder slots are marked until verified customer data exists.</p></details></div></section>`,
  });
}

function featuresPage(req) {
  return renderPage(req, {
    title: 'Features',
    active: '/features',
    description: 'Premium AI launch features: launch kit generation, subscriptions, usage tracking, support, admin analytics, and conversion assets.',
    content: `<section class="page-hero premium-page"><div class="container"><p class="eyebrow">Feature system</p><h1>Every feature exists to move a buyer closer to a paid conversation.</h1><p>Strategy, copy, sales, billing, support, and analytics in one conversion-grade operating layer.</p></div></section>
    <section class="section"><div class="container feature-matrix">
      ${featureCard('Launch Kit AI', 'Generate ICP, offer, pricing, landing-page copy, outreach scripts, SEO briefs, video ideas, ecommerce angles, and a 24-hour execution plan.')}
      ${featureCard('Premium demo layer', 'A public sample kit and walkthrough page let visitors understand the output before they create an account.')}
      ${featureCard('Accounts and auth', 'Secure registration, login, session cookies, password hashing, CSRF protection, and user-specific dashboards.')}
      ${featureCard('Usage economics', 'Plan-based monthly kit limits, usage events, dashboard progress, and upgrade prompts make value and cost visible.')}
      ${featureCard('Stripe revenue engine', 'Checkout, subscription webhooks, one-time sprint orders, Customer Portal, upgrade, downgrade, and cancellation handling.')}
      ${featureCard('AI Command Center', 'A central AI chat turns business goals into orchestrator runs, selected agents, task queues, parallel groups, approvals, and audit logs.')}
      ${featureCard('Admin cockpit', 'Monitor signups, visits, launch kits, paid users, paid orders, pilot leads, support tickets, AI approvals, automation rules, and readiness checks.')}
      ${featureCard('AI agents and memory', '50+ role-based agents remember useful launch context, queue tasks, show KPIs, and keep logs tied to user permissions.')}
      ${featureCard('MCP integrations', 'GitHub, Shopify, Stripe, Google, Slack, CRMs, social platforms, databases, cloud, and analytics connectors are architected with auth and permissions.')}
      ${featureCard('Automation engine', 'Triggers, conditions, AI actions, schedules, draft-only rules, proactive signals, and human approval gates prepare the product for background workers.')}
      ${featureCard('Trust center', 'Customers can inspect permissions, action history, connected-account readiness, memory controls, privacy export, kill switch, and deletion options.')}
      ${featureCard('Knowledge base', 'Projects, files, notes, URLs, PDFs, documents, screenshots, database references, and cloud-storage references become company memory.')}
      ${featureCard('Customer support', 'Public contact form, logged-in support tickets, and admin status management for fast response.')}
      ${featureCard('First-party analytics', 'Page views and product events are stored in SQLite without third-party tracking scripts.')}
      ${featureCard('Security baseline', 'Environment variables for secrets, no hard-coded API keys, input validation, rate limiting, permission control, and verified Stripe webhooks.')}
    </div></section>
    <section class="section muted"><div class="container narrative-grid"><div class="sticky-copy reveal"><p class="eyebrow">Interaction design</p><h2>Premium motion, but not at the expense of speed.</h2><p>Scroll reveals, parallax depth, magnetic buttons, reduced-motion support, and lightweight CSS visuals create a cinematic feel without heavy 3D payloads.</p></div><div class="story-stack">${storyPanel('01','Reveal','Sections enter with subtle opacity and lift — no chaotic animation.','primary')}${storyPanel('02','Depth','Product cards respond to cursor movement and scroll position for a high-end tech feel.','success')}${storyPanel('03','Fallback','Reduced-motion users and weaker devices keep a stable, accessible experience.','primary')}</div></div></section>`,
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
    description: 'Simple, conversion-ready UltraLaunch AI pricing with Free, Starter, Pro, Business, and a one-time concierge sprint.',
    content: `<section class="page-hero pricing-hero premium-page"><div class="container"><p class="eyebrow">Pricing architecture</p><h1>Start free. Upgrade when velocity matters.</h1><p>Clear monthly plans for repeat launch volume, plus a one-time concierge sprint for teams that need a sharper offer and outreach motion now.</p>${flashHtml(message)}</div></section>
    <section class="section"><div class="container">${pricingCards(req)}</div></section>
    <section class="section muted"><div class="container sprint-banner reveal"><div><span class="placeholder-tag">Fastest first-revenue path</span><h2>${e(pilotOffer.name)} · ${money(pilotOffer.price)} one-time</h2><p>${e(pilotOffer.description)}</p><ul><li>Refined launch kit</li><li>Landing-page hero and pricing critique</li><li>First 25 outreach messages prepared</li></ul></div><a class="btn btn-light magnetic" href="/pilot">Buy or request fit check</a></div></section>
    <section class="section"><div class="container split premium-split"><div class="reveal"><p class="eyebrow">Billing flow</p><h2>Subscription operations are already wired.</h2><p>Stripe Checkout, webhooks, one-time orders, Customer Portal, upgrades, downgrades, and cancellations are technically prepared. Real payments start only after you add your own Stripe secrets.</p></div><div class="card reveal"><h3>Usage rule</h3><p>Each generated launch kit counts as one usage unit. Support, page visits, billing actions, and admin events do not reduce the allowance.</p><a class="text-link" href="/product">Review product experience →</a></div></div></section>`,
  });
}

function pilotPage(req, { message = '', error = '' } = {}) {
  const checkoutForm = req.user
    ? `<form method="post" action="/billing/checkout-pilot">${csrf(req)}<button class="btn magnetic" type="submit">Buy ${money(pilotOffer.price)} sprint</button></form>`
    : `<a class="btn magnetic" href="/register">Create account to buy sprint</a>`;
  return renderPage(req, {
    title: 'Concierge Launch Sprint',
    active: '/pilot',
    description: 'A $199 founder-led sprint to refine one launch kit and prepare first-customer outreach.',
    content: `<section class="page-hero pilot-hero premium-page"><div class="container hero-grid premium-hero-grid"><div class="reveal"><p class="eyebrow">Concierge sprint</p><h1>When the offer needs to sell this week, do not leave the output untouched.</h1><p>${e(pilotOffer.description)} No fake guarantees, no ad spend, no vague consulting — only launch assets and outbound preparation you can execute immediately.</p>${flashHtml(message, 'success')}${flashHtml(error, 'error')}<div class="hero-actions">${checkoutForm}<a class="btn btn-secondary" href="#request">Request fit check</a></div></div><div class="hero-stage">${productVisual()}</div></div></section>
    <section class="section"><div class="container"><div class="deliverable-rail">${pilotOffer.deliverables.map((item, index) => `<article class="rail-card reveal"><span>${String(index + 1).padStart(2, '0')}</span><h3>${e(item)}</h3><p>Designed to create a concrete next selling action within 24 hours.</p></article>`).join('')}</div></div></section>
    <section class="section muted"><div class="container steps premium-steps"><div class="reveal"><span>01</span><h3>Generate the free kit</h3><p>Create the first draft in the dashboard and expose the buyer, offer, pricing, and outreach path.</p></div><div class="reveal"><span>02</span><h3>Refine with sprint</h3><p>We tighten one offer, prepare the first outreach batch, and clarify the sales ask.</p></div><div class="reveal"><span>03</span><h3>Convert or learn</h3><p>You send the messages, measure replies, and either close a customer or update the offer from real objections.</p></div></div></section>
    <section class="section" id="request"><div class="container form-layout"><form class="card form-card premium-form reveal" method="post" action="/pilot/request">${csrf(req)}<div><p class="eyebrow">Fit check</p><h2>Request a pilot review</h2><p class="muted-text">Use this if you want us to review fit before buying, or if Stripe is not configured yet.</p></div><label>Name<input name="name" required maxlength="80" value="${e(req.user?.name || '')}"></label><label>Email<input type="email" name="email" required maxlength="120" value="${e(req.user?.email || '')}"></label><label>Company<input name="company" maxlength="120" placeholder="Company or project"></label><label>Website<input name="website" maxlength="200" placeholder="Optional"></label><label>What are you trying to sell?<textarea name="offer" required maxlength="1200" rows="5" placeholder="Describe the offer, buyer, and current obstacle."></textarea></label><div class="form-grid two"><label>Urgency<select name="urgency"><option>Need first customer this week</option><option>Launching in 30 days</option><option>Testing positioning</option><option>Agency/client workflow</option></select></label><label>Budget comfort<select name="budget"><option>Ready for $199 sprint</option><option>Need free kit first</option><option>Considering subscription only</option><option>Not sure yet</option></select></label></div><button class="btn magnetic" type="submit">Request fit check</button></form><aside class="card side-card premium-side reveal"><h2>Who should buy?</h2><ul><li>You can act on outreach within 24–48 hours.</li><li>You own the offer or buying decision.</li><li>You want a paid pilot or subscription-ready funnel.</li><li>You understand revenue is not guaranteed.</li></ul>${checkoutForm}</aside></div></section>`,
  });
}

function aboutPage(req) {
  return renderPage(req, {
    title: 'About',
    active: '/about',
    description: 'UltraLaunch AI is a premium AI launch operating system focused on first-customer speed without fake traction claims.',
    content: `<section class="page-hero premium-page"><div class="container"><p class="eyebrow">About UltraLaunch</p><h1>Built for founders who sell before they scale.</h1><p>UltraLaunch AI productizes the virtual enterprise idea into a focused commercial system: generate the launch assets, track the workflow, charge through Stripe, and move to real conversations.</p></div></section>
    <section class="section"><div class="container narrative-grid"><div class="sticky-copy reveal"><p class="eyebrow">Brand principles</p><h2>Premium, honest, conversion-first.</h2><p>No fake reviews, no fake revenue, no hidden spend. The website is engineered to earn trust before it asks for payment.</p></div><div class="story-stack">${storyPanel('01','Clarity','Every page answers why a buyer should act now.','primary')}${storyPanel('02','Speed','The product compresses brand, copy, and sales prep into one launch workflow.','success')}${storyPanel('03','Proof','The architecture is ready for real testimonials and metrics after customers exist.','primary')}</div></div></section>`,
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
        <div class="card"><p class="eyebrow">AI Operating System</p><h2>Command, agents, automations, trust</h2><p>Your launch workspace now includes a central AI command center, orchestrator, permissioned agents, memory, integrations, files, approvals, and logs.</p><div class="mini-link-grid"><a href="/command">Command</a><a href="/agents">Agents</a><a href="/security">Security</a><a href="/integrations">Integrations</a><a href="/files">Files</a><a href="/tasks">Tasks</a></div></div>
        <div class="card"><p class="eyebrow">Money-first next step</p><h2>${e(pilotOffer.name)}</h2><p>${e(pilotOffer.description)}</p><form method="post" action="/billing/checkout-pilot">${csrf(req)}<button class="btn btn-secondary" type="submit">Buy ${money(pilotOffer.price)} sprint</button></form><a class="text-link" href="/pilot">Review offer →</a></div>
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

function sampleKitPage(req, { result }) {
  const sections = [
    ['Executive summary', result.executiveSummary],
    ['Target customer', result.targetCustomer],
    ['Positioning', result.positioning],
    ['Offer and pricing', result.offerAndPricing],
    ['Landing page copy', result.landingPage],
    ['Outreach pack', result.outreach],
    ['Social and SEO content', result.content],
    ['Sales script', result.salesScript],
    ['E-commerce mode', result.ecommerce],
    ['24-hour war room', result.warRoom],
    ['Launch checklist', result.launchChecklist],
  ].filter(([, body]) => body);

  return renderPage(req, {
    title: 'Sample AI launch kit',
    active: '/demo',
    description: 'Preview a generated UltraLaunch AI launch kit before creating an account.',
    content: `<section class="dashboard-hero"><div class="container dashboard-head"><div><p class="eyebrow">Sample output</p><h1>See what a launch kit looks like.</h1><p>This example uses a Shopify retention audit offer. Create a free account to generate a custom kit for your own offer.</p></div><div class="button-row"><a class="btn" href="/register">Generate mine</a><a class="btn btn-secondary" href="/pilot">Buy $199 sprint</a></div></div></section>
    <section class="section"><div class="container kit-layout"><aside class="card"><h2>What to notice</h2><ol><li>The output connects offer, pricing, copy, outreach, and sales.</li><li>It avoids fake proof and pushes real customer conversations.</li><li>The paid sprint turns this into an execution-ready first outreach batch.</li></ol><a class="text-link" href="/register">Create free account →</a></aside><article class="kit-document">${sections.map(([title, body]) => renderSection(title, body)).join('')}</article></div></section>`,
  });
}

function agentsPage(req, { workspace, message = '', error = '' }) {
  return renderPage(req, {
    title: 'AI Workforce',
    active: '/agents',
    footerCta: false,
    description: 'Permissioned AI agents for launch orchestration, growth, trust, operations, and computer-control task planning.',
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">AI Workforce</p><h1>${workspace.agents.length}+ specialist agents. One orchestrated AI company.</h1><p>Agents have roles, goals, tools, permissions, memory scopes, tasks, KPIs, logs, and approval rules. Critical computer-control actions remain approval-gated.</p></div><div class="button-row"><a class="btn btn-secondary" href="/command">Command center</a><a class="btn btn-secondary" href="/marketplace">Marketplace</a></div></div></section>
    <section class="section"><div class="container stack">${flashHtml(message, 'success')}${flashHtml(error, 'error')}
      <div class="agent-grid">${workspace.agents.map((agent) => `<article class="agent-card reveal"><span class="placeholder-tag">${e(agent.role)}</span><h2>${e(agent.name)}</h2><p>${e(agent.goal)}</p><div class="agent-meta"><strong>Tools</strong><span>${agent.tools.map(e).join(' · ')}</span></div><div class="agent-meta"><strong>Permissions</strong><span>${agent.permissions.map(e).join(' · ')}</span></div><div class="agent-meta"><strong>KPIs</strong><span>${agent.kpis.map(e).join(' · ')}</span></div></article>`).join('')}</div>
      <div class="dashboard-grid"><form class="card form-card premium-form" method="post" action="/agents/tasks">${csrf(req)}<div><p class="eyebrow">Queue task</p><h2>Create an approval-gated agent task</h2><p class="muted-text">Use this for browser research, document processing, file export, terminal planning, or sales automation. Nothing critical executes without approval.</p></div><label>Agent<select name="agentKey">${workspace.agents.map((agent) => `<option value="${e(agent.key)}">${e(agent.name)}</option>`).join('')}</select></label><label>Task title<input name="title" required maxlength="180" placeholder="Research 20 Shopify retention leads and prepare outreach plan"></label><div class="form-grid two"><label>Priority<select name="priority"><option>normal</option><option>high</option><option>urgent</option><option>low</option></select></label><label>Approval<select name="requiresApproval"><option value="yes">Require human approval</option><option value="no">Safe draft-only task</option></select></label></div><button class="btn" type="submit">Queue agent task</button></form><aside class="card"><h2>AI memory snapshot</h2>${workspace.memories.length ? `<ul class="ticket-list">${workspace.memories.map((memory) => `<li><strong>${e(memory.memory_key)}</strong><span>${e(memory.memory_value)}</span></li>`).join('')}</ul>` : '<p>No memory yet. Generate a launch kit to teach the workspace your niche and tone.</p>'}</aside></div>
      <div class="dashboard-grid"><form class="card form-card premium-form" method="post" action="/employees">${csrf(req)}<div><p class="eyebrow">AI Employees</p><h2>Create a custom virtual employee</h2><p class="muted-text">The platform creates role, goals, tools, memory, permissions, schedule, KPIs, and tasks. Keep critical permissions approval-gated.</p></div><label>Name<input name="name" required maxlength="120" placeholder="Marketing Mitarbeiter AI"></label><label>Role<input name="role" required maxlength="240" placeholder="Owns weekly campaign execution"></label><label>Goals<textarea name="goals" required rows="4" maxlength="1200" placeholder="Generate campaign ideas, prepare content, monitor results, request approvals."></textarea></label><label>Schedule<input name="schedule" maxlength="300" placeholder="Every Monday morning"></label><button class="btn" type="submit">Create AI employee</button></form><aside class="card table-card"><h2>Your AI employees</h2>${workspace.employees.length ? table(['Name','Role','Schedule','Status'], workspace.employees.map((employee) => [employee.name, employee.role, employee.schedule || '—', employee.status])) : '<p>No custom employees yet.</p>'}</aside></div>
      <div class="admin-grid"><div class="card table-card"><h2>Task queue</h2>${workspace.tasks.length ? workspace.tasks.map((task) => `<form class="ticket-admin" method="post" action="/agents/tasks/${task.id}/status">${csrf(req)}<div><strong>${e(task.title)}</strong><p>${e(task.agent_key)} · ${e(task.priority)} · ${task.requires_approval ? 'approval required' : 'draft-only'}</p><span>${e(task.status)} · ${formatDate(task.created_at)}</span></div><select name="status"><option>approved</option><option>rejected</option><option>completed</option></select><button class="btn btn-small" type="submit">Update</button></form>`).join('') : '<p>No tasks queued yet.</p>'}</div><div class="card table-card"><h2>Recent AI actions</h2>${workspace.logs.length ? `<ul class="ticket-list">${workspace.logs.slice(0, 12).map((log) => `<li><strong>${e(log.summary)}</strong><span>${e(log.agent_key)} · ${e(log.status)} · ${formatDate(log.created_at)}</span></li>`).join('')}</ul>` : '<p>No AI actions logged yet.</p>'}</div></div>
    </div></section>`,
  });
}

function automationsPage(req, { rules, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Automation Engine',
    active: '/automations',
    footerCta: false,
    description: 'Create triggers, conditions, actions, AI steps, and human approval workflows for UltraLaunch AI.',
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">Automation engine</p><h1>Triggers, conditions, AI actions, human approval.</h1><p>Automate the repeatable parts of launch operations without losing control over critical actions.</p></div><a class="btn btn-secondary" href="/agents">AI agents</a></div></section>
    <section class="section"><div class="container stack">${flashHtml(message, 'success')}${flashHtml(error, 'error')}<div class="automation-flow"><span>TRIGGER</span><em>→</em><span>AI</span><em>→</em><span>ACTION</span><em>→</em><span>HUMAN APPROVAL</span><em>→</em><span>COMPLETE</span></div></div><div class="container dashboard-grid"><form class="card form-card premium-form" method="post" action="/automations">${csrf(req)}<div><p class="eyebrow">New rule</p><h2>Create automation</h2></div><label>Name<input name="name" required maxlength="120" placeholder="High-intent pilot lead follow-up"></label><label>Trigger<select name="triggerType"><option value="launch_kit_generated">Launch kit generated</option><option value="pilot_request_submitted">Pilot request submitted</option><option value="support_ticket_created">Support ticket created</option><option value="weekly_schedule">Weekly schedule</option><option value="manual">Manual</option></select></label><label>Condition<textarea name="conditionText" required rows="3" maxlength="500" placeholder="If user is Free plan and generated first kit"></textarea></label><label>Action<textarea name="actionText" required rows="4" maxlength="700" placeholder="Prepare follow-up checklist and sprint CTA for approval"></textarea></label><label>Approval<select name="requiresApproval"><option value="yes">Human approval required</option><option value="no">Auto draft only</option></select></label><button class="btn" type="submit">Create rule</button></form><aside class="stack"><div class="card"><h2>Safety model</h2><ul><li>Drafting can be automated.</li><li>External account actions require connected accounts.</li><li>Terminal, file deletion, and purchases require explicit approval.</li></ul></div><div class="card"><h2>Performance</h2><p>Rules are stored as lightweight records today. They are ready for background workers or queue processing when deployed.</p></div></aside></div><div class="container"><div class="card table-card"><h2>Rules</h2>${rules.length ? rules.map((rule) => `<form class="ticket-admin" method="post" action="/automations/${rule.id}/toggle">${csrf(req)}<div><strong>${e(rule.name)}</strong><p>${e(rule.trigger_type)} → ${e(rule.action_text)}</p><span>${rule.is_enabled ? 'enabled' : 'disabled'} · ${rule.requires_approval ? 'approval required' : 'draft-only'} · ${formatDate(rule.created_at)}</span></div><button class="btn btn-small" type="submit">${rule.is_enabled ? 'Disable' : 'Enable'}</button></form>`).join('') : '<p>No rules yet.</p>'}</div></div></section>`,
  });
}

function trustCenterPage(req, { snapshot, permissions, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Trust Center',
    active: '/trust',
    footerCta: false,
    description: 'Trust center with permissions, AI action history, memory controls, connected accounts, privacy export, and audit logs.',
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">Trust center</p><h1>See what your AI did. Control what it can do next.</h1><p>Permissions, memory, action history, connected-account readiness, exports, and deletion controls are visible by default.</p></div><a class="btn btn-secondary" href="/trust/export.json">Export my data</a></div></section>
    <section class="section"><div class="container stack">${flashHtml(message, 'success')}${flashHtml(error, 'error')}
      <div class="trust-grid">${permissions.map((permission) => {
        const grant = snapshot.permissions.find((item) => item.permission_key === permission.key) || { status: permission.defaultStatus };
        return `<article class="permission-card ${permission.risk}"><span class="status-pill">${e(permission.risk)}</span><h3>${e(permission.name)}</h3><p>${e(permission.description)}</p><form method="post" action="/trust/permissions/${permission.key}">${csrf(req)}<select name="status"><option ${grant.status === 'granted' ? 'selected' : ''}>granted</option><option ${grant.status === 'limited' ? 'selected' : ''}>limited</option><option ${grant.status === 'approval_required' ? 'selected' : ''}>approval_required</option><option ${grant.status === 'revoked' ? 'selected' : ''}>revoked</option></select><button class="btn btn-small" type="submit">Save</button></form></article>`;
      }).join('')}</div>
      <div class="admin-grid"><div class="card table-card"><h2>AI memory</h2>${snapshot.memories.length ? snapshot.memories.map((memory) => `<form class="ticket-admin" method="post" action="/trust/memories/${memory.id}/delete">${csrf(req)}<div><strong>${e(memory.memory_key)}</strong><p>${e(memory.memory_value)}</p><span>${e(memory.source)} · confidence ${e(memory.confidence)} · ${formatDate(memory.updated_at)}</span></div><button class="btn btn-small" type="submit">Delete</button></form>`).join('') : '<p>No AI memories stored yet.</p>'}</div><div class="card table-card"><h2>Connected accounts</h2>${snapshot.connectedAccounts.length ? table(['Provider','Status','Scopes','Updated'], snapshot.connectedAccounts.map((account) => [account.provider, account.status, account.scopes || '—', formatDate(account.updated_at)])) : '<p>No external accounts connected. Stripe keys stay in environment variables, not in chat or database.</p>'}</div></div>
      <div class="admin-grid"><div class="card table-card"><h2>Session security</h2>${snapshot.sessions.length ? table(['Session','IP','User agent','Expires'], snapshot.sessions.map((session) => [session.id, session.ip || 'unknown', session.user_agent || 'unknown', formatDate(session.expires_at)])) : '<p>No active sessions found.</p>'}</div><div class="card"><h2>Critical-action policy</h2><ul><li>Browser/app/file/terminal/document/screenshot automation is planned as tasks first.</li><li>Connected accounts, purchases, file deletion, and terminal actions require explicit human approval.</li><li>Every permission change and AI action is written to the audit log.</li></ul></div></div>
      <div class="card table-card"><h2>Action explainers / approvals</h2>${snapshot.approvals.length ? snapshot.approvals.map((approval) => approvalCard(req, approval, '/trust')).join('') : '<p>No approval-gated actions yet. Critical computer, payment, file, browser, and connected-account actions will appear here before execution.</p>'}</div>
      <div class="card table-card"><h2>AI action history</h2>${snapshot.logs.length ? table(['Agent','Action','Status','Risk','Summary','Time'], snapshot.logs.map((log) => [log.agent_key, log.action_type, log.status, log.risk_level, log.summary, formatDate(log.created_at)])) : '<p>No actions logged yet.</p>'}</div>
    </div></section>`,
  });
}

function safeJsonList(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function commandNav(snapshot, current = '/command') {
  return `<div class="command-nav">${snapshot.nav.map(([label, href]) => `<a class="${href === current ? 'active' : ''}" href="${href}">${e(label)}</a>`).join('')}</div>`;
}

function commandCenterPage(req, { snapshot, message = '', error = '' }) {
  const latestRun = snapshot.runs[0] ? JSON.parse(snapshot.runs[0].plan_json) : null;
  return renderPage(req, {
    title: 'AI Command Center',
    active: '/command',
    footerCta: false,
    description: 'Central AI Command Center with chat, orchestrator, agents, tasks, approvals, integrations, memory, analytics, and security.',
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">AI Command Center</p><h1>Control the business from one AI operating layer.</h1><p>Chat with the orchestrator. It selects agents, creates tasks, maps dependencies, and requests approval before critical actions.</p></div><a class="btn btn-secondary" href="/security">Security center</a></div></section>
    <section class="section"><div class="container stack">${commandNav(snapshot, '/command')}${flashHtml(message, 'success')}${flashHtml(error, 'error')}
      <div class="command-grid"><form class="card form-card command-chat" method="post" action="/command/chat">${csrf(req)}<div><p class="eyebrow">AI Chat + Orchestrator</p><h2>Tell the platform the outcome.</h2><p class="muted-text">Examples: “Analysiere meine Verkäufe”, “Optimiere meinen Shopify-Shop”, “Erstelle eine Marketingkampagne”, or “Führe diese Aufgabe auf meinem Computer aus”.</p></div><textarea name="prompt" required rows="6" maxlength="1600" placeholder="Was soll dein AI Operating System erledigen?"></textarea><button class="btn" type="submit">Orchestrate with AI</button></form>
        <aside class="stack"><div class="card"><h2>Operating status</h2><div class="metric-grid mini">${metric('Agents', snapshot.agents.length)}${metric('Tasks', snapshot.tasks.length)}${metric('Approvals', snapshot.approvals.filter((a) => a.status === 'pending').length)}${metric('Kill switch', snapshot.killSwitch)}</div></div><div class="card"><h2>Autopilot signals</h2>${snapshot.signals.length ? `<ul class="ticket-list">${snapshot.signals.map((signal) => `<li><strong>${e(signal.title)}</strong><span>${e(signal.severity)} · ${e(signal.recommended_action)}</span></li>`).join('')}</ul>` : '<p>No active signals.</p>'}</div></aside></div>
      <div class="admin-grid"><div class="card table-card"><h2>Recent orchestrator runs</h2>${snapshot.runs.length ? snapshot.runs.map((run) => `<article class="run-card"><strong>${e(run.user_goal)}</strong><span>${e(run.status)} · ${formatDate(run.created_at)}</span></article>`).join('') : '<p>No command runs yet.</p>'}</div><div class="card table-card"><h2>Last plan</h2>${latestRun ? `<p><strong>Mode:</strong> ${e(latestRun.mode)}</p><p><strong>Goal:</strong> ${e(latestRun.goalType)}</p><p><strong>Safety:</strong> approval required for critical actions.</p><ol>${latestRun.steps.slice(0, 8).map((step) => `<li>${e(step.agentKey)} → ${e(step.title)}</li>`).join('')}</ol>` : '<p>Ask the AI Command Center to create the first plan.</p>'}</div></div>
      <div class="admin-grid"><div class="card table-card"><h2>Task queue</h2>${table(['Agent','Task','Status','Priority','Approval'], snapshot.tasks.map((task) => [task.agent_key, task.title, task.status, task.priority, task.requires_approval ? 'required' : 'draft']))}</div><div class="card table-card"><h2>Pending approvals</h2>${snapshot.approvals.length ? snapshot.approvals.map((approval) => approvalCard(req, approval, '/command')).join('') : '<p>No approvals yet.</p>'}</div></div>
    </div></section>`,
  });
}

function approvalCard(req, approval, returnTo = '/security') {
  return `<form class="approval-card" method="post" action="/approvals/${approval.id}/decision">${csrf(req)}<input type="hidden" name="returnTo" value="${e(returnTo)}"><div><span class="status-pill">${e(approval.risk_level)}</span><h3>${e(approval.what)}</h3><p><strong>Why:</strong> ${e(approval.why)}</p><p><strong>Data used:</strong> ${e(approval.data_used)}</p><p><strong>Tool:</strong> ${e(approval.tool)} · <strong>Expected:</strong> ${e(approval.expected_result)}</p><small>${e(approval.agent_key)} · ${e(approval.status)} · ${formatDate(approval.created_at)}</small></div><div class="button-row"><button class="btn btn-small" name="decision" value="approve" type="submit">Approve</button><button class="btn btn-small btn-secondary" name="decision" value="deny" type="submit">Deny</button></div></form>`;
}

function tasksPage(req, { snapshot, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Tasks',
    active: '/tasks',
    footerCta: false,
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">Tasks + Scheduling</p><h1>Agent work, approvals, schedules, and AI employees.</h1><p>Every delegated task remains visible and critical actions wait for human approval.</p></div><a class="btn btn-secondary" href="/command">Command center</a></div></section>
    <section class="section"><div class="container stack">${flashHtml(message, 'success')}${flashHtml(error, 'error')}
      <div class="admin-grid"><div class="card table-card"><h2>Agent tasks</h2>${table(['Agent','Title','Status','Priority','Created'], snapshot.tasks.map((task) => [task.agent_key, task.title, task.status, task.priority, formatDate(task.created_at)]))}</div><div class="card table-card"><h2>Approvals</h2>${snapshot.approvals.length ? snapshot.approvals.map((approval) => approvalCard(req, approval, '/tasks')).join('') : '<p>No approvals yet.</p>'}</div></div>
      <div class="admin-grid"><div class="card table-card"><h2>Schedules</h2>${table(['Name','Cadence','Agent','Approval','Next'], snapshot.schedules.map((job) => [job.name, job.cadence, job.agent_key, job.requires_approval ? 'yes' : 'no', job.next_run_hint || '—']))}</div><div class="card table-card"><h2>AI employees</h2>${table(['Name','Role','Schedule','Status'], snapshot.employees.map((employee) => [employee.name, employee.role, employee.schedule || '—', employee.status]))}</div></div>
    </div></section>`,
  });
}

function integrationsPage(req, { snapshot, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Integrations',
    active: '/integrations',
    footerCta: false,
    description: 'MCP-style integration marketplace with OAuth/API readiness, permissions, tool definitions, logging, rate-limit notes, disconnect, and reconnect states.',
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">MCP / Connector Marketplace</p><h1>Install integrations safely before agents use them.</h1><p>Every connector shows data, actions, permissions, auth model, rate-limit handling, and current connection state. Prepared does not mean authenticated.</p></div><a class="btn btn-secondary" href="/marketplace">Agent marketplace</a></div></section>
    <section class="section"><div class="container stack">${flashHtml(message, 'success')}${flashHtml(error, 'error')}
      <div class="integration-grid">${snapshot.connections.map((item) => {
        const connection = item.connection;
        const status = connection?.status || 'not_connected';
        return `<article class="integration-card"><span class="status-pill">${e(status)}</span><h2>${e(item.name)}</h2><p>${e(item.description)}</p><div class="agent-meta"><strong>Permissions</strong><span>${item.permissions.map(e).join(' · ')}</span></div><div class="agent-meta"><strong>Auth</strong><span>${e(item.authScopes.join(', '))}</span></div><div class="agent-meta"><strong>Tools</strong><span>${item.tools.map(e).join(' · ')}</span></div><p class="muted-text">${e(item.errorHandling)} ${connection?.error_message ? `Last check: ${e(connection.error_message)}` : ''}</p><div class="button-row"><form class="install-form" method="post" action="/integrations/${item.key}/install">${csrf(req)}<div class="permission-picker">${item.permissions.map((permission) => `<label><input type="checkbox" name="permissions" value="${e(permission)}" checked> ${e(permission)}</label>`).join('')}</div><button class="btn btn-small" type="submit">Install / prepare</button></form><form method="post" action="/integrations/${item.key}/test">${csrf(req)}<button class="btn btn-small btn-secondary" type="submit">Test</button></form><form method="post" action="/integrations/${item.key}/disconnect">${csrf(req)}<button class="btn btn-small btn-secondary" type="submit">Disable</button></form></div></article>`;
      }).join('')}</div>
    </div></section>`,
  });
}

function projectsPage(req, { snapshot, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Projects',
    active: '/projects',
    footerCta: false,
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">Projects</p><h1>Project memory for AI companies and teams.</h1><p>Group launch kits, knowledge sources, tasks, AI employees, automations, and decisions into durable project context.</p></div><a class="btn btn-secondary" href="/files">Knowledge base</a></div></section>
    <section class="section"><div class="container dashboard-grid">${flashHtml(message, 'success')}${flashHtml(error, 'error')}<form class="card form-card" method="post" action="/projects">${csrf(req)}<h2>Create project</h2><label>Name<input name="name" required maxlength="120" placeholder="Shopify growth system"></label><label>Description<textarea name="description" rows="5" maxlength="800" placeholder="Goal, business unit, customer segment, or project scope"></textarea></label><button class="btn" type="submit">Create project</button></form><aside class="card table-card"><h2>Projects</h2>${table(['Name','Status','Updated'], snapshot.projects.map((project) => [project.name, project.status, formatDate(project.updated_at)]))}</aside></div></section>`,
  });
}

function filesPage(req, { snapshot, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Files and Knowledge Base',
    active: '/files',
    footerCta: false,
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">Files + Knowledge Base</p><h1>Give agents company context without leaking secrets.</h1><p>Index notes, URLs, documents, PDFs, screenshots, databases, and cloud-storage references. Vector search and file uploads are prepared for future storage.</p></div><a class="btn btn-secondary" href="/memory">Memory</a></div></section>
    <section class="section"><div class="container dashboard-grid">${flashHtml(message, 'success')}${flashHtml(error, 'error')}<form class="card form-card" method="post" action="/files/sources">${csrf(req)}<h2>Add knowledge source</h2><label>Project<select name="projectId"><option value="">No project</option>${snapshot.projects.map((project) => `<option value="${project.id}">${e(project.name)}</option>`).join('')}</select></label><label>Type<select name="sourceType"><option value="note">Note</option><option value="url">Website URL</option><option value="pdf">PDF reference</option><option value="document">Document</option><option value="screenshot">Screenshot reference</option><option value="database">Database reference</option><option value="cloud_storage">Cloud storage reference</option></select></label><label>Name<input name="name" required maxlength="140"></label><label>Source URI<input name="sourceUri" maxlength="500" placeholder="https://, drive://, file name, or database label"></label><label>Text / notes<textarea name="content" rows="7" maxlength="8000"></textarea></label><button class="btn" type="submit">Index source</button></form><aside class="card table-card"><h2>Indexed sources</h2>${table(['Name','Type','Status','Updated'], snapshot.sources.map((source) => [source.name, source.source_type, source.status, formatDate(source.updated_at)]))}</aside></div></section>`,
  });
}

function memoryPage(req, { snapshot, message = '', error = '' }) {
  return renderPage(req, {
    title: 'AI Memory',
    active: '/memory',
    footerCta: false,
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">AI Memory</p><h1>Short-term, long-term, project, customer, agent, and preference memory.</h1><p>Users can inspect, add, edit through replacement, export, and delete memory from the Trust Center.</p></div><a class="btn btn-secondary" href="/trust">Delete / export controls</a></div></section>
    <section class="section"><div class="container dashboard-grid">${flashHtml(message, 'success')}${flashHtml(error, 'error')}<form class="card form-card" method="post" action="/memory">${csrf(req)}<h2>Add memory</h2><label>Type<select name="memoryType">${snapshot.types.map((type) => `<option value="${e(type)}">${e(type)}</option>`).join('')}</select></label><label>Key<input name="key" required maxlength="80" placeholder="brand_voice"></label><label>Value<textarea name="value" required rows="6" maxlength="1200" placeholder="What should the AI remember?"></textarea></label><button class="btn" type="submit">Save memory</button></form><aside class="card table-card"><h2>Memory records</h2>${table(['Key','Value','Source','Updated'], snapshot.memories.map((memory) => [memory.memory_key, memory.memory_value, memory.source, formatDate(memory.updated_at)]))}</aside></div></section>`,
  });
}

function securityPage(req, { snapshot, message = '', error = '' }) {
  return renderPage(req, {
    title: 'Security Center',
    active: '/security',
    footerCta: false,
    description: 'Security center with kill switch, approvals, permission manager, session management, audit logs, diagnostics, and data controls.',
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">Security + Trust</p><h1>One kill switch. Full action explainers. No hidden control.</h1><p>Before critical actions the user sees WHAT, WHY, DATA USED, TOOL, EXPECTED RESULT, and RISK — then approves or denies.</p></div><form method="post" action="/security/kill-switch">${csrf(req)}<input type="hidden" name="state" value="${snapshot.killSwitch === 'on' ? 'off' : 'on'}"><button class="btn ${snapshot.killSwitch === 'on' ? 'btn-secondary' : ''}" type="submit">${snapshot.killSwitch === 'on' ? 'Turn kill switch off' : 'STOP all active AI actions'}</button></form></div></section>
    <section class="section"><div class="container stack">${flashHtml(message, 'success')}${flashHtml(error, 'error')}<div class="metric-grid">${metric('Kill switch', snapshot.killSwitch)}${metric('Pending approvals', snapshot.approvals.filter((approval) => approval.status === 'pending').length)}${metric('Permissions', snapshot.permissions.length)}${metric('Sessions', snapshot.sessions.length)}</div>
      <div class="card table-card"><h2>Action explainers / approvals</h2>${snapshot.approvals.length ? snapshot.approvals.map((approval) => approvalCard(req, approval, '/security')).join('') : '<p>No approval-gated actions yet.</p>'}</div>
      <div class="admin-grid"><div class="card table-card"><h2>Permission manager</h2>${table(['Permission','Status','Risk','Description'], snapshot.permissions.map((p) => [p.name || p.permission_key, p.status, p.risk || '—', p.description || '—']))}</div><div class="card table-card"><h2>Self diagnostics</h2>${table(['Check','Value','Status','Action'], snapshot.diagnostics.map((item) => [item.name, item.value, item.status, item.action]))}</div></div>
      <div class="admin-grid"><div class="card table-card"><h2>Sessions</h2>${table(['ID','IP','User agent','Expires'], snapshot.sessions.map((session) => [session.id, session.ip || 'unknown', session.user_agent || 'unknown', formatDate(session.expires_at)]))}</div><div class="card table-card"><h2>Recent audit logs</h2>${table(['Agent','Action','Status','Risk','Time'], snapshot.logs.map((log) => [log.agent_key, log.action_type, log.status, log.risk_level, formatDate(log.created_at)]))}</div></div>
    </div></section>`,
  });
}

function analyticsPage(req, { snapshot }) {
  return renderPage(req, {
    title: 'AI Analytics',
    active: '/analytics',
    footerCta: false,
    content: `<section class="dashboard-hero premium-page"><div class="container"><p class="eyebrow">AI Analytics + Self Diagnostics</p><h1>Business Autopilot signals from first-party data.</h1><p>Monitor sales, marketing, support, tasks, approvals, errors, costs, failed tasks, agent quality, and API health as integrations become available.</p></div></section>
    <section class="section"><div class="container stack"><div class="admin-grid"><div class="card table-card"><h2>Usage</h2>${table(['Event','Events','Units'], snapshot.usage.map((row) => [row.event_type, row.events, row.units]))}</div><div class="card table-card"><h2>Product events</h2>${table(['Event','Count'], snapshot.productEvents.map((row) => [row.event_name, row.events]))}</div></div><div class="admin-grid"><div class="card table-card"><h2>Tasks by status</h2>${table(['Status','Count'], snapshot.tasksByStatus.map((row) => [row.status, row.n]))}</div><div class="card table-card"><h2>Approvals by status</h2>${table(['Status','Count'], snapshot.approvalsByStatus.map((row) => [row.status, row.n]))}</div></div><div class="card table-card"><h2>Autopilot signals</h2>${table(['Type','Severity','Title','Recommended action'], snapshot.signals.map((signal) => [signal.signal_type, signal.severity, signal.title, signal.recommended_action]))}</div></div></section>`,
  });
}

function marketplacePage(req, { snapshot }) {
  return renderPage(req, {
    title: 'Agent Marketplace',
    active: '/marketplace',
    footerCta: false,
    content: `<section class="dashboard-hero premium-page"><div class="container dashboard-head"><div><p class="eyebrow">AI Agent Marketplace</p><h1>First-party, custom, and future third-party AI employees.</h1><p>Every agent lists tools, permissions, version, price, and security information. Reviews are only shown when real.</p></div><a class="btn btn-secondary" href="/integrations">Integration marketplace</a></div></section>
    <section class="section"><div class="container stack"><div class="agent-grid marketplace-grid">${snapshot.agents.map((agent) => `<article class="agent-card"><span class="placeholder-tag">${e(agent.department)} · ${e(agent.version)}</span><h2>${e(agent.name)}</h2><p>${e(agent.description)}</p><div class="agent-meta"><strong>Tools</strong><span>${agent.tools.map(e).join(' · ')}</span></div><div class="agent-meta"><strong>Permissions</strong><span>${e(agent.security)}</span></div><div class="agent-meta"><strong>Price</strong><span>${e(agent.price)} · ${e(agent.reviews)}</span></div></article>`).join('')}</div></div></section>`,
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
      <div class="card billing-actions"><div><h2>${e(pilotOffer.name)}</h2><p>${e(pilotOffer.description)}</p></div><form method="post" action="/billing/checkout-pilot">${csrf(req)}<button class="btn" type="submit">Buy ${money(pilotOffer.price)} sprint</button></form></div>
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

function adminPage(req, { metrics, users, tickets, events, pilotRequests = [], orders = [], message = '' }) {
  return renderPage(req, {
    title: 'Admin',
    active: '/admin',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container"><p class="eyebrow">Admin</p><h1>Operating cockpit</h1><p>Monitor activation, usage, support, and subscription readiness.</p>${flashHtml(message, 'success')}</div></section>
    <section class="section"><div class="container stack">
      <div class="metric-grid">
        ${metric('Users', metrics.users)}${metric('Paid users', metrics.paidUsers)}${metric('Revenue', money((metrics.paidRevenueCents || 0) / 100))}${metric('Paid orders', metrics.paidOrders)}${metric('Pilot leads', metrics.pilotRequests)}${metric('Launch kits', metrics.launchKits)}${metric('AI actions', metrics.aiActions)}${metric('Orchestrations', metrics.orchestratorRuns)}${metric('Approvals', metrics.pendingApprovals)}${metric('Automations', metrics.automationRules)}${metric('Integrations', metrics.integrationsPrepared)}${metric('Knowledge', metrics.knowledgeSources)}${metric('Visits today', metrics.visitsToday)}${metric('Open tickets', metrics.openTickets)}
      </div>
      <div class="admin-actions"><a class="btn" href="/admin/launch">Launch readiness</a><a class="btn btn-secondary" href="/admin/pilot-requests.csv">Export pilot leads</a><a class="btn btn-secondary" href="/admin/contacts.csv">Export contacts</a></div>
      <div class="admin-grid">
        <div class="card table-card"><h2>Latest users</h2>${table(['Name','Email','Plan','Role','Created'], users.map((u) => [u.name, u.email, `${u.plan} / ${u.subscription_status}`, u.role, formatDate(u.created_at)]))}</div>
        <div class="card table-card"><h2>Open support</h2>${tickets.length ? tickets.map((ticket) => `<form class="ticket-admin" method="post" action="/admin/tickets/${ticket.id}/status">${csrf(req)}<div><strong>${e(ticket.subject)}</strong><p>${e(ticket.message)}</p><span>${e(ticket.email)} · ${formatDate(ticket.created_at)}</span></div><select name="status"><option ${ticket.status === 'open' ? 'selected' : ''}>open</option><option ${ticket.status === 'waiting' ? 'selected' : ''}>waiting</option><option ${ticket.status === 'closed' ? 'selected' : ''}>closed</option></select><button class="btn btn-small" type="submit">Update</button></form>`).join('') : '<p>No open tickets.</p>'}</div>
      </div>
      <div class="admin-grid">
        <div class="card table-card"><h2>Pilot requests</h2>${pilotRequests.length ? pilotRequests.map((lead) => `<form class="ticket-admin" method="post" action="/admin/pilot-requests/${lead.id}/status">${csrf(req)}<div><strong>${e(lead.name)} · ${e(lead.company || 'No company')}</strong><p>${e(lead.offer)}</p><span>${e(lead.email)} · ${e(lead.urgency)} · ${e(lead.budget)} · ${formatDate(lead.created_at)}</span></div><select name="status"><option ${lead.status === 'new' ? 'selected' : ''}>new</option><option ${lead.status === 'contacted' ? 'selected' : ''}>contacted</option><option ${lead.status === 'qualified' ? 'selected' : ''}>qualified</option><option ${lead.status === 'won' ? 'selected' : ''}>won</option><option ${lead.status === 'lost' ? 'selected' : ''}>lost</option></select><button class="btn btn-small" type="submit">Update</button></form>`).join('') : '<p>No pilot requests yet.</p>'}</div>
        <div class="card table-card"><h2>Paid sprint orders</h2>${table(['Email','Product','Amount','Status','Time'], orders.map((order) => [order.email, order.product_key, money(order.amount / 100), order.status, formatDate(order.created_at)]))}</div>
      </div>
      <div class="card table-card"><h2>Latest analytics events</h2>${table(['Event','Path','User','Time'], events.map((event) => [event.event_name, event.path || '—', event.user_id || 'anonymous', formatDate(event.created_at)]))}</div>
    </div></section>`,
  });
}

function launchStatusPage(req, { status }) {
  return renderPage(req, {
    title: 'Launch readiness',
    active: '/admin',
    footerCta: false,
    content: `<section class="dashboard-hero"><div class="container dashboard-head"><div><p class="eyebrow">Launch control</p><h1>${status.ready ? 'Ready for paid launch' : 'Manual setup still required'}</h1><p>${status.requiredPassed}/${status.requiredTotal} required launch checks passed. Secrets are masked and never displayed.</p></div><a class="btn btn-secondary" href="/admin">Back to admin</a></div></section>
    <section class="section"><div class="container stack">
      <div class="card"><h2>Next manual actions</h2>${status.nextManualActions.length ? `<ol>${status.nextManualActions.map((item) => `<li>${e(item)}</li>`).join('')}</ol>` : '<p>All required environment checks passed. Run Stripe test checkout, publish the URL, and start outreach.</p>'}</div>
      <div class="card-grid two-col">${status.checks.map((item) => `<article class="card status-card ${item.ok ? 'ok' : item.severity === 'required' ? 'missing' : 'recommended'}"><span class="status-pill">${item.ok ? 'Ready' : item.severity === 'required' ? 'Missing' : item.severity}</span><h3>${e(item.name)}</h3><p>${e(item.detail)}</p>${!item.ok && item.action ? `<p><strong>Action:</strong> ${e(item.action)}</p>` : ''}</article>`).join('')}</div>
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
  const plan = planKey === 'pilot' ? pilotOffer : getPlan(planKey);
  return renderPage(req, {
    title: 'Stripe setup required',
    active: '/pricing',
    footerCta: false,
    content: `<section class="page-hero"><div class="container"><p class="eyebrow">Manual setup required</p><h1>Stripe is technically implemented. Add keys to accept real payments.</h1><p>You selected <strong>${e(plan.name)}</strong>. Checkout cannot redirect until the one-time Stripe configuration is complete.</p></div></section>
    <section class="section"><div class="container form-layout"><div class="card"><h2>One-time manual step</h2><ol><li>Create or open your Stripe account.</li><li>Run <code>npm run stripe:setup</code> locally after setting <code>STRIPE_SECRET_KEY</code>.</li><li>Copy the generated price IDs into <code>STRIPE_PRICE_STARTER</code>, <code>STRIPE_PRICE_PRO</code>, <code>STRIPE_PRICE_BUSINESS</code>, and <code>STRIPE_PRICE_PILOT</code>.</li><li>Create a webhook endpoint for <code>/webhooks/stripe</code> and set <code>STRIPE_WEBHOOK_SECRET</code>.</li><li>Restart the app and click checkout again.</li></ol><p>No fake payment or bypass has been performed.</p></div><div class="card"><h2>Test mode checklist</h2><ul><li>Use Stripe test keys first.</li><li>Complete Checkout with Stripe test cards.</li><li>Verify webhook updates the user plan.</li><li>Use Customer Portal for upgrade, downgrade, and cancellation.</li></ul><a class="btn btn-secondary" href="/billing">Back to billing</a></div></div></section>`,
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
  productPage,
  featuresPage,
  pricingPage,
  pilotPage,
  aboutPage,
  useCasesPage,
  faqPage,
  contactPage,
  authPage,
  dashboardPage,
  kitPage,
  sampleKitPage,
  commandCenterPage,
  tasksPage,
  integrationsPage,
  projectsPage,
  filesPage,
  memoryPage,
  securityPage,
  analyticsPage,
  marketplacePage,
  agentsPage,
  automationsPage,
  trustCenterPage,
  billingPage,
  supportPage,
  adminPage,
  launchStatusPage,
  stripeConfigPage,
  errorPage,
};

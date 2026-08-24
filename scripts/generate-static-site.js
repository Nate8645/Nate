'use strict';

const fs = require('fs');
const path = require('path');
const views = require('../src/views');
const { buildFallbackKit } = require('../src/ai');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public', 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

function reqFor(route) {
  return { path: route, originalUrl: route, user: null, csrfToken: '' };
}

function staticNotice() {
  return `<section class="section static-preview-notice"><div class="container"><div class="card"><p class="eyebrow">Static browser preview</p><h2>Marketing pages are public here. Account, dashboard, AI generation, billing, and trust controls require the Node app.</h2><p>This GitHub Pages build is generated from the same views for easy mobile/browser review. It does not fake live authentication, payments, connectors, or data actions.</p></div></div></section>`;
}

function absolutizeStaticLinks(html) {
  return html
    .replace('<link rel="stylesheet" href="/app.css">', `<style>\n${css}\n</style>`)
    .replace('<script src="/app.js" defer></script>', `<script>\n${js}\n</script>`)
    .replace('<main id="main">', `<main id="main">\n${staticNotice()}`)
    .replaceAll('href="/"', 'href="/Nate/"')
    .replaceAll('href="/product"', 'href="/Nate/product/"')
    .replaceAll('href="/features"', 'href="/Nate/features/"')
    .replaceAll('href="/trust-center"', 'href="/Nate/trust-center/"')
    .replaceAll('href="/privacy"', 'href="/Nate/privacy/"')
    .replaceAll('href="/terms"', 'href="/Nate/terms/"')
    .replaceAll('href="/subprocessors"', 'href="/Nate/subprocessors/"')
    .replaceAll('href="/about"', 'href="/Nate/about/"')
    .replaceAll('href="/pricing"', 'href="/Nate/pricing/"')
    .replaceAll('href="/demo"', 'href="/Nate/demo/"')
    .replaceAll('href="/pilot"', 'href="/Nate/pilot/"')
    .replaceAll('href="/use-cases"', 'href="/Nate/use-cases/"')
    .replaceAll('href="/faq"', 'href="/Nate/faq/"')
    .replaceAll('href="/contact"', 'href="/Nate/contact/"')
    .replaceAll('href="/register"', 'href="/Nate/register/"')
    .replaceAll('href="/login"', 'href="/Nate/login/"')
    .replaceAll('href="/og-card.svg"', 'href="/Nate/og-card.svg"')
    .replaceAll('content="http://localhost:3000/', 'content="https://nate8645.github.io/Nate/')
    .replaceAll('href="http://localhost:3000/', 'href="https://nate8645.github.io/Nate/');
}

function writePage(route, html) {
  const relative = route === '/' ? '' : route.replace(/^\//, '');
  const dir = path.join(root, 'docs', relative);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), absolutizeStaticLinks(html));
}

const sampleResult = buildFallbackKit({
  businessName: 'RetentionPilot',
  industry: 'Shopify retention analytics',
  audience: 'Shopify founders with repeat purchase problems',
  offer: 'AI audit that identifies retention leaks and writes lifecycle campaigns',
  goal: 'Get first paying customer',
  tone: 'Direct and premium',
  ecommerce: 'yes',
});

const pages = [
  ['/', (req) => views.heroPage(req)],
  ['/product', (req) => views.productPage(req)],
  ['/features', (req) => views.featuresPage(req)],
  ['/trust-center', (req) => views.publicTrustPage(req)],
  ['/privacy', (req) => views.privacyPage(req)],
  ['/terms', (req) => views.termsPage(req)],
  ['/subprocessors', (req) => views.subprocessorsPage(req)],
  ['/about', (req) => views.aboutPage(req)],
  ['/pricing', (req) => views.pricingPage(req)],
  ['/demo', (req) => views.sampleKitPage(req, { result: sampleResult })],
  ['/pilot', (req) => views.pilotPage(req)],
  ['/use-cases', (req) => views.useCasesPage(req)],
  ['/faq', (req) => views.faqPage(req)],
  ['/contact', (req) => views.contactPage(req)],
  ['/register', (req) => views.errorPage(req, { status: 200, title: 'Static preview only', message: 'Registration requires the live Node app. This page exists so public preview CTAs do not lead to a 404.' })],
  ['/login', (req) => views.errorPage(req, { status: 200, title: 'Static preview only', message: 'Login requires the live Node app. This page exists so public preview CTAs do not lead to a 404.' })],
];

fs.rmSync(path.join(root, 'docs'), { recursive: true, force: true });
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', '.nojekyll'), '');

for (const [route, render] of pages) {
  writePage(route, render(reqFor(route)));
}

fs.copyFileSync(path.join(root, 'public', 'og-card.svg'), path.join(root, 'docs', 'og-card.svg'));
fs.writeFileSync(path.join(root, 'public', 'static-website-preview.html'), absolutizeStaticLinks(views.heroPage(reqFor('/'))));
console.log(`Generated ${pages.length} static pages in docs/ and public/static-website-preview.html`);

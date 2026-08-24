# UltraLaunch AI SaaS

UltraLaunch AI is a working AI-SaaS MVP built to commercialize the repository's existing **Ultra Enterprise OS** idea into a sellable product: an AI launch operator that turns a rough business idea into a complete launch kit.

It includes:

- Professional responsive marketing website
- Pricing pages with Free, Starter, Pro, and Business tiers
- Public demo launch kit at `/demo` to show value before signup
- $199 Concierge Launch Sprint checkout/request funnel for the fastest first-revenue path
- Admin launch-readiness checklist at `/admin/launch`
- User registration, login, secure sessions, and user accounts
- Dashboard with AI launch-kit generation
- SQLite database persistence
- Usage tracking and plan limits
- Stripe Checkout, subscriptions, webhooks, customer portal, upgrade, downgrade, and cancellation flow
- Admin area with analytics, users, tickets, product events, AI actions, approvals, and automation metrics
- Central AI Command Center with AI chat, deterministic orchestrator, task creation, approvals, projects, files, analytics, and security navigation
- Massive AI Workforce architecture with 50+ specialist agents, custom AI employees, roles, goals, tools, permissions, memory scopes, KPIs, logs, and approval rules
- MCP-style Integration Marketplace for GitHub, Shopify, Stripe, Google, Slack, Notion, CRMs, social platforms, databases, cloud, analytics, and more; prepared integrations clearly remain unauthenticated until official OAuth/API credentials are added
- Trust/Security Center with permission controls, action explainers, kill switch, session visibility, AI action history, memory deletion, connected-account readiness, and JSON data export
- Automation Engine with triggers, conditions, actions, schedules, proactive autopilot signals, and human-approval gates
- Knowledge Base / Files / Projects layer for notes, URLs, PDFs, documents, screenshots, databases, and cloud-storage references
- Computer Permission Matrix with per-agent ALLOW / ASK / DENY rules
- Desktop + Browser AI planner with action explainers before critical work
- Mobile and Voice Command Center readiness for iPhone approval flows and future STT/TTS/realtime AI
- Customer support contact and ticket flow
- Public Trust Center, Privacy Policy, and Terms pages with transparent AI action, data, permission, pricing, and support explanations
- GitHub Skills & Plugin Integration audit dashboard at `/developer-tools`, mapping Claude skills/agents/commands into least-privilege UltraLaunch AI agent playbooks without blind execution
- SEO assets: sitemap, robots, metadata
- Security baseline: password hashing, CSRF, rate limits, verified webhooks, env-based secrets

## Product decision

The existing repo was a Claude/AI "virtual enterprise OS" plugin. Instead of discarding it, this MVP productizes that positioning as a SaaS that helps founders, agencies, consultants, and ecommerce operators generate launch assets fast enough to pursue a first paying customer within 24 hours.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

The first registered user becomes admin automatically.

## AI mode

The product works without an external API key using the built-in **offline Launch Intelligence Engine**. To use an OpenAI-compatible LLM, set:

```env
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

If the external provider fails, the app falls back to the offline engine and records the provider used for each launch kit.

## Stripe setup

No Stripe secrets are committed. To accept real payments:

1. Create/open your Stripe account and complete any required identity, tax, bank, and 2FA steps.
2. Put your Stripe secret key in `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. Run:
   ```bash
   npm run stripe:setup
   ```
4. Copy the printed price IDs into:
   ```env
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_BUSINESS=price_...
   STRIPE_PRICE_PILOT=price_...
   ```
5. Create a Stripe webhook endpoint:
   ```text
   https://YOUR_DOMAIN/webhooks/stripe
   ```
6. Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
7. Copy the webhook signing secret into:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
8. Restart the app and test checkout in Stripe test mode before going live.

## Test and quality gates

```bash
npm test
npm run lint
npm run launch:check
```

`npm run launch:check` intentionally exits non-zero until production secrets, Stripe prices, webhook secret, and HTTPS `APP_URL` are configured.

## Deployment

The app is a standard Node/Express server and must be deployed with persistent storage for `DATABASE_PATH` or replaced with a managed SQL database before scaling.

Recommended fastest options:

- Render/Railway/Fly.io: deploy Node service + persistent disk for SQLite
- VPS: Docker or systemd with a persistent `data/` directory
- Production hardening: set `SESSION_SECRET`, Stripe keys, `APP_URL`, backups, and HTTPS

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for a production checklist.

## Go-to-market assets

- [`go-to-market/24h-war-room.md`](./go-to-market/24h-war-room.md)
- [`go-to-market/customer-acquisition.md`](./go-to-market/customer-acquisition.md)
- [`go-to-market/content-pack.md`](./go-to-market/content-pack.md)
- [`go-to-market/sales-playbook.md`](./go-to-market/sales-playbook.md)
- [`go-to-market/revenue-sprint-assets.md`](./go-to-market/revenue-sprint-assets.md)
- [`go-to-market/lead-sources.csv`](./go-to-market/lead-sources.csv)

## Original plugin

The original plugin remains in [`ultra-enterprise-os/`](./ultra-enterprise-os/). This SaaS app is added at the repository root and does not remove the existing work. The current integration audit lives in [`GITHUB_SKILLS_INTEGRATION_AUDIT.md`](./GITHUB_SKILLS_INTEGRATION_AUDIT.md) and is also visible inside the authenticated app at `/developer-tools`.

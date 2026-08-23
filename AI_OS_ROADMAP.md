# UltraLaunch AI Operating System Expansion Roadmap

This repo is being extended step-by-step. The existing SaaS, Stripe preparation, launch kits, auth, dashboard, admin, videos, and trust features must stay intact.

## Current business foundation

UltraLaunch AI already includes:

- Premium public website, pricing, demo, pilot funnel, auth, dashboard, launch-kit generator, billing routes, admin, support, analytics, launch readiness, and videos.
- AI workforce/trust foundation: agents, automation rules, permission grants, memory, action logs, connected-account readiness, data export, and approval-gated computer-control planning.
- AI Operating System foundation: Command Center, orchestrator, 50+ agent catalog, integrations marketplace, projects/files/knowledge base, memory, security center, task queue, custom AI employees, analytics, autopilot signals, marketplace, and self diagnostics.

## Expansion priorities implemented in this phase

1. **Computer Permission Matrix**
   - Route: `/permissions`
   - Per-agent permission decisions: `ALLOW`, `ASK`, `DENY`.
   - Covers read, write, execute, browser, files, network, applications, payments, desktop, terminal, memory, knowledge base, voice, and connected accounts.

2. **Desktop + Browser AI Planner**
   - Route: `/computer`
   - Creates approval-gated action explainers for browser, desktop, file, terminal, document, screenshot, and payment actions.
   - Every critical action exposes WHAT, WHY, DATA USED, TOOL, EXPECTED RESULT, and RISK.
   - No hidden desktop control, no captcha bypass, no 2FA bypass, no purchases without approval.

3. **Visual Automation Builder Steps**
   - Adds `automation_steps` persistence.
   - Route: `/automations`
   - Each automation can now contain multiple visual workflow steps: trigger, AI, condition, action, human approval, complete.
   - Stored separately from rules so future background workers can execute safe steps without rewriting the system.

4. **Mobile Command Center**
   - Route: `/mobile`
   - Mobile-first surface for chat, tasks, approvals, notifications, analytics, agents, security, and voice readiness.
   - Designed for quick iPhone approval/denial flows.

5. **Voice Command Center**
   - Route: `/voice`
   - Prepared voice intents for sales reports, marketing agents, daily summaries, task checks, and security checks.
   - Explicitly states no microphone is active yet.
   - Future STT/TTS/realtime AI must reuse the same orchestrator and approval system.

6. **Billing Entitlement Model**
   - Plans now model AI credits, agent seats, and premium integrations in addition to launch-kit limits.
   - Billing page explains subscriptions, usage, credits, agent seats, premium connectors, and enterprise controls without initiating payments unless the user explicitly uses Stripe Checkout.

## Next highest-value improvements

1. Real OAuth provider flows for the first integrations: Stripe, GitHub, Shopify, Google Drive.
2. Background job runner for safe scheduled jobs and automation steps.
3. File upload pipeline with persistent object storage and optional vector index.
4. Real 2FA enrollment and recovery-code flow.
5. Team accounts, organization tenants, and role-based access control.
6. Encrypted external credential store for production integrations.
7. Mobile push/in-app notifications for pending approvals.
8. Voice STT/TTS adapter wired to `/voice` with no permission bypass.
9. Agent quality scoring from task outcomes and approval decisions.
10. Production observability: error logs, uptime checks, cost tracking, queue health, webhook health.

## Safety principles

- Do not fabricate integrations, customers, payments, reviews, revenue, or proof.
- Do not bypass captcha, 2FA, security controls, banking setup, or legal confirmations.
- Secrets stay in environment variables or future encrypted provider storage, never in chat or source code.
- Critical browser, desktop, file, terminal, payment, and connected-account actions require explicit human approval.
- The kill switch must remain visible and able to pause active AI tasks.

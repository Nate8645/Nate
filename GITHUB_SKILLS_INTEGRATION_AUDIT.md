# GitHub Skills & Plugin Integration Audit

Date: 2026-08-24
Branch: `arena/01a02ec0-nate`

This audit records the result of the repository-wide extension scan for the UltraLaunch AI SaaS. The goal was not to blindly install anything, but to inspect each existing skill/plugin/agent/command/tool surface for purpose, dependencies, permissions, APIs, architecture fit, safety, and business value.

## Scan scope

Inspected categories:

- Claude plugin marketplace metadata in `.claude-plugin/marketplace.json`
- Claude settings in `.claude/settings.json`
- Claude skills in `.claude/skills/*/SKILL.md`
- Claude agents in `.claude/agents/*.md`
- Claude slash commands in `.claude/commands/*.md`
- Installable plugin package mirror in `ultra-enterprise-os/`
- npm scripts and local quality gates in `package.json`
- GitHub Actions workflow directory
- MCP-related files/configuration indicators
- Existing SaaS integration marketplace, permission model, agents, security center, and command center code

## Integration decision policy

1. Instruction assets are useful as playbooks and agent source knowledge, but they do not become unrestricted runtime automation.
2. External tools require official credentials and least-privilege scopes before live execution.
3. Critical actions remain approval-gated with WHAT, WHY, DATA USED, TOOL, EXPECTED RESULT, and RISK.
4. Secrets stay in environment variables or future encrypted secret storage, never in code or chat.
5. No MCP server is claimed as live unless an actual server/configuration is present and tested.

## Found extensions and compatibility

| Asset | Type | Decision | Notes |
|---|---|---|---|
| `.claude-plugin/marketplace.json` | Claude marketplace | Documented / surfaced | Preserved as developer inventory. Not used by the SaaS runtime to auto-install anything. |
| `.claude/settings.json` | Claude settings | Fixed | Marketplace repo was corrected from the stale owner value to `Nate8645/Nate`. |
| `.claude/skills/cod/SKILL.md` | Claude skill | Integrated as adapter | Mapped to Developer, QA, Security, Docs quality gates: inspect → implement → test → review. |
| `.claude/skills/ultra-enterprise-os/SKILL.md` | Claude skill | Integrated as adapter | Mapped to AI Command Center orchestration and AI Company role decomposition. |
| `.claude/agents/*.md` | Claude agent instructions | Integrated as adapter | 10 role templates mapped to UltraLaunch AI agents with least-privilege web-app capabilities. |
| `.claude/commands/ultra*.md` | Claude commands | Adapter only | Slash commands remain Claude Code assets; the SaaS displays and reuses them as playbooks, not direct browser executable commands. |
| `ultra-enterprise-os/` | Plugin package mirror | Integrated/documented | README install source corrected; org chart and manifests preserved. |
| `package.json` scripts | Developer tools | Integrated runtime | `npm run lint`, `npm test`, and `npm run launch:check` remain local gates. Stripe setup scripts require secrets. |
| `.github/workflows` | CI workflows | Not present | CI was not reintroduced because earlier pushes failed without workflow permission. |
| MCP configs | MCP | Not present | No concrete MCP server config exists in this branch. Existing SaaS integration catalog remains prepared, not claimed live. |

## INTEGRIERT

Implemented in this change:

- New runtime repository audit module: `src/repository-intelligence.js`
  - Reads Claude marketplace/plugin/skill/agent/command assets.
  - Reads npm scripts.
  - Reports MCP and workflow state honestly.
  - Produces dependency, permission, API, compatibility, risk, and business-value summaries.
- New authenticated Developer Tools surface: `/developer-tools`
  - Shows scan counts, integration policy, least-privilege agent bindings, extension inventory, environment variables, and compatibility issues.
- Command navigation now includes `Dev Tools`.
- Existing plugin configuration was corrected to the active GitHub source: `Nate8645/Nate`.
- Plugin package README install command was corrected to `Nate8645/Nate`.
- Public premium trust experience was expanded:
  - `/trust-center`
  - `/privacy`
  - `/terms`
  - trust-first homepage sections
  - AI Action Center preview
  - transparent critical-action explainer copy
  - footer Trust links

## KOMPATIBILITÄTSPROBLEME

- Claude slash commands are not browser-app runtime commands. They require Claude Code. UltraLaunch AI therefore uses them as documented playbooks and visible quality gates.
- Claude agents can have powerful Claude Code tools such as Bash/Edit/Write/WebSearch/WebFetch. In the SaaS, these are reduced to planning, task creation, and approval-gated actions unless official connectors are added.
- No MCP server configuration is present. The product cannot honestly claim live MCP connectivity yet.
- GitHub Actions workflows are absent because repository workflow permissions previously blocked pushes that included workflow files.
- External connectors such as GitHub, Shopify, Google, Slack, and CRM remain prepared until official OAuth/API credentials are configured.

## NICHT VERWENDBAR

Nothing useful was discarded permanently, but the following were not activated as live runtime integrations:

- MCP servers: not usable because no concrete MCP config/server exists in the branch.
- GitHub Actions CI: not reintroduced until GitHub workflow permissions are available.
- Direct browser execution of `/ultra`, `/ultra-team`, `/ultra-review`: not usable inside the SaaS without a separate Claude Code command bridge.
- Any plugin/agent behavior requiring customer secrets: not usable until credentials are stored through approved environment variables or future encrypted secret storage.

## BENÖTIGTE ZUGÄNGE

For future live integrations, the owner must connect/provide through secure deployment settings only:

- GitHub OAuth App or GitHub App credentials for repository actions.
- Shopify Partner/App credentials for store workflows.
- Stripe account, KYC, price IDs, webhook endpoint, and webhook secret for live payments.
- Google OAuth credentials for Drive/Gmail/Calendar flows.
- Provider-specific credentials for Slack/Notion/CRM/cloud/analytics integrations if enabled.

## BENÖTIGTE ENVIRONMENT VARIABLES

Existing/required for current app or future connectors:

- `SESSION_SECRET`
- `APP_URL`
- `SUPPORT_EMAIL`
- `OPENAI_API_KEY` and optional `OPENAI_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`
- `STRIPE_PRICE_PILOT`
- Future: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`
- Future: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`
- Future: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## NEUE FUNKTIONEN

- `/developer-tools` authenticated GitHub Skills & Plugin audit dashboard.
- Runtime repository extension inventory with dependency/permission/API/risk/value metadata.
- Least-privilege mapping from repo skills/agents/commands to UltraLaunch AI agents.
- Public Trust Center explaining security, privacy, permissions, data controls, activity logs, AI transparency, human control, support, pricing, terms, privacy policy, and no-fake-proof policy.
- Homepage trust-first messaging and AI Action Center examples.
- Sitemap entries for trust/legal pages.

## Retest checklist

- `npm run lint`
- `npm test`
- Smoke-check public routes: `/`, `/product`, `/trust-center`, `/privacy`, `/terms`, `/pricing`, `/demo`, `/health`
- Smoke-check authenticated routes after registration/login: `/command`, `/developer-tools`, `/security`, `/permissions`, `/trust`
- Re-run `npm run launch:check || true`; missing production secrets are expected until manual production setup is complete.

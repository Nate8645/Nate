# UltraLaunch AI — What to do now

I prepared everything that does **not** require your private accounts, API keys, bank/KYC, or social logins.

## Already prepared

- Working SaaS app
- Landing page
- `/demo` public sample launch kit
- `/pilot` $199 Concierge Launch Sprint funnel
- Free registration/login
- Dashboard and AI launch-kit generation
- Usage tracking
- Admin analytics
- Admin launch readiness page: `/admin/launch`
- Contact and pilot lead capture
- Stripe subscription and one-time payment code
- Stripe setup automation: `npm run stripe:setup`
- Deployment files for Render, Railway, Docker, and Docker Compose
- Sales copy, DMs, emails, video scripts, lead-source CSV

## Do not send me these in chat

Never paste these into chat:

- Stripe secret key
- Stripe webhook secret
- OpenAI key
- passwords
- 2FA codes
- bank details

## Step 1 — Local env is prepared

I can generate safe defaults with:

```bash
npm run env:prepare
```

This creates `.env` locally and leaves Stripe/OpenAI keys blank.

## Step 2 — Deploy

Choose one platform:

### Fast option A: Render

1. Create a new Render Blueprint from this repo/branch.
2. Render will read `render.yaml`.
3. Set these secrets in Render:
   - `APP_URL`
   - `ADMIN_EMAILS`
   - `SUPPORT_EMAIL`
   - `STRIPE_SECRET_KEY`
   - later: price IDs and webhook secret

### Fast option B: Railway

1. Create new Railway project from this repo/branch.
2. Railway reads `railway.json`.
3. Add the environment variables listed below.

### Fast option C: Docker/VPS

```bash
npm run env:prepare
# add your Stripe/domain values into .env
npm start
```

Or:

```bash
docker compose up --build
```

## Step 3 — Required environment variables

Set these yourself in the hosting platform:

```env
NODE_ENV=production
HOST=0.0.0.0
APP_URL=https://your-domain.com
APP_NAME=UltraLaunch AI
SESSION_SECRET=<generated_secret>
DATABASE_PATH=data/ultralaunch.sqlite
ADMIN_EMAILS=your@email.com
SUPPORT_EMAIL=your@email.com
```

Generate `SESSION_SECRET`:

```bash
openssl rand -hex 32
```

## Step 4 — Stripe setup

Set this in your hosting platform or local `.env`:

```env
STRIPE_SECRET_KEY=<your_stripe_test_secret_key>
```

Then run:

```bash
npm run stripe:setup
```

Copy the printed values into your environment:

```env
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_PILOT=price_...
```

## Step 5 — Stripe webhook

Create a Stripe webhook endpoint:

```text
https://your-domain.com/webhooks/stripe
```

Enable events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Copy webhook signing secret into your environment:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 6 — Test launch readiness

Run:

```bash
npm run launch:check
npm test
```

Also check in browser:

```text
/demo
/pilot
/pricing
/register
/dashboard
/admin
/admin/launch
```

## Step 7 — First customer sprint

Use:

```text
go-to-market/revenue-sprint-assets.md
```

Today’s target:

- publish 1 LinkedIn post
- publish 1 X/Twitter thread
- send 50 personalized DMs
- send 25 emails only where appropriate/allowed
- send people to `/pilot` or `/demo`

Best CTA:

```text
Send me one offer. I’ll generate a launch kit and show you the fastest path to a paid customer. If useful, the $199 sprint refines it and prepares your first 25 outreach messages.
```

## What to tell the agent after you do the secret steps

Send only this, not the keys:

```text
Deployment platform: Render/Railway/Fly/VPS/other
Domain: https://...
Stripe secret set: yes/no
Stripe price IDs set: yes/no
Stripe webhook created: yes/no
Stripe webhook secret set: yes/no
Admin email: your@email.com
Support email: your@email.com
```

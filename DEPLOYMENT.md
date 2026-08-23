# UltraLaunch AI Deployment Checklist

## 1. Environment variables

Required for production:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
APP_URL=https://your-domain.com
APP_NAME=UltraLaunch AI
SESSION_SECRET=generate_a_64_character_random_secret
DATABASE_PATH=/app/data/ultralaunch.sqlite
ADMIN_EMAILS=founder@your-domain.com
```

Optional but recommended:

```env
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
SUPPORT_EMAIL=support@your-domain.com
```

Stripe payment variables:

```env
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_webhook_signing_secret>
STRIPE_PRICE_STARTER=<starter_price_id>
STRIPE_PRICE_PRO=<pro_price_id>
STRIPE_PRICE_BUSINESS=<business_price_id>
```

## 2. Persistent database

The MVP uses SQLite through Node's built-in `node:sqlite` module.

For a launch-day MVP, deploy with a persistent disk mounted at the directory in `DATABASE_PATH`.

Before scaling beyond MVP traffic, migrate to Postgres or another managed database and keep the schema concepts:

- users
- sessions
- launch_kits
- usage_events
- analytics_events
- support_tickets
- stripe_events

## 3. Stripe one-time manual steps

These cannot and should not be bypassed:

1. Create/open Stripe account.
2. Complete identity verification, bank details, tax settings, and 2FA.
3. Add `STRIPE_SECRET_KEY` in deployment secrets.
4. Run `npm run stripe:setup` once to create products and prices.
5. Add printed price IDs to deployment secrets.
6. Add webhook endpoint: `https://your-domain.com/webhooks/stripe`.
7. Add webhook secret to deployment secrets.
8. Test with Stripe test mode.
9. Switch to live keys only after the full checkout test passes.

## 4. Smoke test before launch

Run locally and in production:

- Home page loads on desktop and mobile widths.
- Register first admin user.
- Log out and log in again.
- Generate a launch kit.
- Verify dashboard usage count increments.
- Download launch kit JSON.
- Open support ticket.
- Visit admin page and see metrics/tickets.
- Start paid checkout in Stripe test mode.
- Complete test subscription.
- Confirm webhook changes plan and status.
- Open Stripe Customer Portal.
- Upgrade/downgrade/cancel in portal.
- Confirm user status updates after webhook.

## 5. Security launch checks

- `SESSION_SECRET` is set and never committed.
- `.env` is not committed.
- Stripe webhook signature verification is enabled.
- Passwords are hashed with PBKDF2.
- Auth forms include CSRF tokens.
- Auth, contact, checkout, support, and AI routes have rate limits.
- Admin access is limited to first user and `ADMIN_EMAILS`.
- No fake testimonials, fake revenue, or fake customers are shown.
- Backups exist for the SQLite file.

## 6. Fast deployment commands

Docker:

```bash
docker build -t ultralaunch-ai .
docker run --env-file .env -p 3000:3000 -v $(pwd)/data:/app/data ultralaunch-ai
```

Plain Node:

```bash
npm ci --omit=dev
NODE_ENV=production npm start
```

## 7. Post-launch monitoring

Track daily:

- Visitors
- Signups
- Generated launch kits
- Checkout starts
- Paid subscriptions
- Support tickets
- Activation rate: signup → first kit
- Conversion rate: first kit → paid plan
- Churn/cancellation reasons

Largest likely early bottleneck: qualified traffic. Prioritize direct outreach and demos before paid ads.

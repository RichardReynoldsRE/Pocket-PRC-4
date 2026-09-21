# Stripe Sub-Chat Changelog

## 2026-03-24 — Sprint 1-2: Stripe Foundation + Billing Backend

### Completed

1. **`server/src/lib/stripe.js`** — Stripe SDK service library
   - Initialized Stripe with `STRIPE_SECRET_KEY`
   - Helper functions: `createCustomer`, `createSetupIntent`, `createSubscription`, `updateSubscription`, `cancelSubscription`, `resumeSubscription`, `createPortalSession`, `constructWebhookEvent`, `getUpcomingInvoice`, `listInvoices`, `attachPaymentMethod`, `retrieveSubscription`, `retrieveInvoice`
   - All named exports, follows existing lib pattern (r2.js)

2. **`server/src/routes/billing.js`** — Agent subscription endpoints (all behind `verifyToken`)
   - `POST /setup-intent` — Creates Stripe Customer (if not exists) + SetupIntent, returns clientSecret + customerId
   - `POST /create-subscription` — Attaches payment method, creates multi-item subscription (base + seat add-on), 14-day trial, stores in DB
   - `GET /subscription` — Returns current subscription with team join + active member count
   - `POST /update-plan` — Upgrades with immediate proration, downgrades without proration
   - `POST /update-seats` — Adding seats: immediate proration. Removing: no proration (takes effect at period end)
   - `POST /cancel` — Default: cancel_at_period_end=true. Optional immediate cancellation
   - `POST /resume` — Removes cancel_at_period_end
   - `POST /update-payment-method` — Creates new SetupIntent for card update
   - `GET /invoices` — Paginated payment history from local DB
   - `GET /upcoming-invoice` — Preview next charge via Stripe API
   - Price ID mapping via env vars (STRIPE_PRICE_SOLO_MONTHLY, etc.)

3. **`server/src/routes/webhooks.js`** — Stripe webhook handler
   - Uses raw body (NOT json parsed) — critical for signature verification
   - Returns 200 immediately, processes async
   - Handles: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`
   - All handlers re-fetch from Stripe (don't rely solely on event data)
   - Upserts for subscription records, ON CONFLICT for payment_history
   - TODO placeholders for Resend email notifications

4. **`server/src/middleware/subscription.js`** — Feature gating middleware
   - `requireActiveSubscription` — Checks for active/trialing subscription (user's own or team's). Returns 402 if none. Attaches req.subscription. Super_admin bypasses.
   - `requirePlanTier(...tiers)` — Checks plan tier is in allowed list. Returns 403 if not.
   - `checkReadOnly` — Expired/canceled: allows GET, blocks POST/PUT/DELETE with 402. Active/trialing: allows all.

5. **Updated `server/src/index.js`**
   - Added imports for billingRoutes and webhookRoutes
   - Added `express.raw({ type: 'application/json' })` on `/api/webhooks/stripe` BEFORE `express.json()` — critical for Stripe signature verification
   - Registered routes: `/api/billing` and `/api/webhooks`

### Decisions Made
- Webhook returns 200 immediately then processes async to avoid Stripe timeouts
- Subscription lookup checks both user's direct subscription and their team's subscription (covers solo + team scenarios)
- ON CONFLICT upserts in webhook handlers prevent duplicate records from race conditions between billing routes and webhooks
- Solo plan has no seat item; team/large_team always create seat item (even with qty 0) so the item ID exists for later seat updates
- Graceful handling of Stripe's "no upcoming invoice" error during trial periods

### Ready for Next Phase
- All Sprint 1-2 Stripe tasks complete
- Billing routes ready for frontend integration (Sprint 3)
- Feature gating middleware ready to be applied to existing routes (Sprint 4)
- Webhook endpoint ready for Stripe CLI testing: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

# Builder Sub-Chat Changelog

## 2026-03-24 — Sprint 1: Foundation

### Task 1: Migration `004_subscriptions.sql`
- Created `subscriptions` table with all specified columns: id (UUID PK), user_id (FK users, CASCADE), team_id (FK teams, SET NULL), stripe_customer_id, stripe_subscription_id (UNIQUE), plan_tier (solo/team/large_team), billing_interval (monthly/annual), seat_count (default 1), status with all 8 valid states (default 'trialing'), trial_ends_at, current_period_start, current_period_end, cancel_at_period_end (default false), canceled_at, created_at, updated_at
- Created `payment_history` table with: id (UUID PK), subscription_id (FK subscriptions, SET NULL), stripe_invoice_id (UNIQUE), stripe_payment_intent_id, amount_cents, currency (default 'usd'), status, description, invoice_pdf_url, period_start, period_end, created_at
- Added indexes on: user_id, team_id, stripe_customer_id, stripe_subscription_id, status for subscriptions; subscription_id for payment_history

### Task 2: Migration `005_vendors.sql`
- Created `vendors` table with: id (UUID PK), name, company_name, email, phone, category (title/mortgage/insurance/inspection/other), logo_url, website, notes, is_active (default true), stripe_customer_id, created_at, updated_at
- Created `vendor_slots` table with: id (UUID PK), team_id (FK teams, nullable — NULL = platform default, CASCADE), vendor_id (FK vendors, CASCADE), slot_type (title_lead/rate_request/general_ad), position (default 0), is_active (default true), created_at, updated_at, UNIQUE(team_id, slot_type, position)
- Created `vendor_subscriptions` table with: id (UUID PK), vendor_id (FK vendors, CASCADE), stripe_subscription_id (UNIQUE), billing_interval, amount_cents, status (active/past_due/canceled/incomplete/unpaid), current_period_start, current_period_end, cancel_at_period_end (default false), created_at, updated_at
- Created `vendor_payment_history` table with: id (UUID PK), vendor_subscription_id (FK vendor_subscriptions, SET NULL), vendor_id (FK vendors, CASCADE), stripe_invoice_id (UNIQUE), amount_cents, currency (default 'usd'), status, description, invoice_pdf_url, period_start, period_end, created_at
- Added indexes on: is_active + stripe_customer_id for vendors; team_id + vendor_id for vendor_slots; vendor_id for vendor_subscriptions; vendor_id for vendor_payment_history

### Task 3: `shared/subscriptionTiers.js`
- Exported `TIERS` object with solo, team, large_team definitions (all prices in cents)
- Solo: $10/mo ($100/yr), 1 seat, 1 max, no extra seats
- Team: $25/mo ($250/yr), 3 included, 10 max, $5/mo ($50/yr) per extra seat
- Large Team: $50/mo ($500/yr), 10 included, 99 max, $3/mo ($30/yr) per extra seat
- Exported `TIER_IDS` array for iteration
- Exported helpers: `getTier(id)`, `calculateMonthlyCost(tierId, seatCount)`, `calculateAnnualCost(tierId, seatCount)`

### Task 4: Updated `.env.example`
- Added Stripe section with 12 price env vars (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 6 base plan prices, 4 seat add-on prices)
- Added `VITE_STRIPE_PUBLISHABLE_KEY` to client section

### Task 5: Installed `stripe` package
- Ran `npm install stripe` in server directory — added to dependencies

### Task 6: Created this changelog

# Pocket PRC 4 — PM Changelog

## 2026-03-24

### Pricing Plan Finalized
- Solo: $10/mo | $100/yr
- Team: $25/mo base, 3 seats included, +$5/seat | $250/yr
- Large Team: $50/mo base, 10 seats included, +$3/seat | $500/yr
- Team White Label: $2,500/yr + $1,000 setup
- Full White Label: $5,000/yr + $2,000 setup
- 14-day free trial, read-only on expiry
- Prorations: upgrades immediate, downgrades at period end
- Vendor billing: custom per-vendor pricing, monthly or annual
- White-label vendor billing: default = client handles externally; optional Stripe Connect add-on (5-10% platform fee)

### Implementation Plan Approved
- Plan file: `~/.claude/plans/serialized-meandering-bentley.md`
- 22 new files, 9 modified files, 6 sprints
- Fully embedded Stripe Elements (no redirect)
- Custom per-vendor pricing (no standard rate)

### Execution Model
- PM chat (this chat) coordinates
- Builder sub-chat: database, server routes, middleware
- Stripe sub-chat: Stripe SDK, webhooks, billing logic, Elements frontend
- Each sub-chat maintains its own changelog

### Decisions Made
- Capacitor (not Expo) for app distribution
- Custom billing UI (not Stripe hosted portal)
- Start Stripe with personal SSN, switch to Henosis business entity later
- Stripe Connect for white-label vendor billing is future phase

### Sub-Chat Status
| Sub-Chat | Status | Current Task |
|----------|--------|-------------|
| Builder  | Sprint 1 DONE | Migrations, tiers, env vars, stripe package |
| Stripe   | Sprint 1-2 DONE | SDK lib, billing routes, webhooks, middleware, index.js |

### Sprint 1 Complete — Foundation
- 004_subscriptions.sql + 005_vendors.sql migrations created
- shared/subscriptionTiers.js with tier definitions + cost calculators
- .env.example updated with all Stripe vars
- stripe package installed in server

### Sprint 2 Complete — Subscription Backend
- server/src/lib/stripe.js — 12 Stripe helper functions
- server/src/routes/billing.js — 10 subscription endpoints
- server/src/routes/webhooks.js — 6 event handlers with upserts
- server/src/middleware/subscription.js — 3 gating middlewares
- server/src/index.js — raw body + route registration

### Up Next
- Sprint 3: Subscription Frontend (client API, contexts, billing pages, Stripe Elements)
- Sprint 4: Feature Gating (apply middleware to existing routes, client-side gating)
- Sprint 5: Vendor Backend (vendor routes, refactor leads.js + rateRequest.js)
- Sprint 6: Vendor Frontend (vendor management UI in admin)

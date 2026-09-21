# Pocket PRC Pricing Plan

## Tiers

### Solo — $10/mo | $100/yr
- 1 agent
- 3 vendor ad spots (Pocket PRC controls)
- 14-day free trial

### Team — $25/mo | $250/yr
- 3 seats included
- $5/seat after 3 ($50/seat annually)
- Up to 10 seats max
- Roles: owner, transaction coordinator, teammates
- 14-day free trial

### Large Team — $50/mo | $500/yr
- 10 seats included
- $3/seat after 10 ($30/seat annually)
- Up to 99 seats max
- 14-day free trial

### Team White Label — $2,500/yr + $1,000 setup
- 10-99 agents
- Custom branding within the main Pocket PRC app (multi-tenant)
- Choose and manage their own vendors
- $500 one-time vendor setup fee (per vendor slot)
- $250 per vendor change
- Support via TacoHelp

### Full White Label — $5,000/yr + $2,000 setup
- Own standalone app in App Store / Play Store
- Unlimited agents (up to 200 included)
- $20/agent/yr over 200
- Full custom branding, icon, app name
- Choose and manage their own vendors, charge their own vendors
- Super Admin retains support access
- Support via TacoHelp

## Proration Policy

- **Upgrades (tier or seats):** Immediate, prorated for remaining billing period (Stripe default)
- **Downgrades (tier or seats):** Take effect at end of current billing period, no partial refunds
- **Seat removal:** Active until end of billing period, then drops off
- **Annual ↔ Monthly:** Annual→monthly takes effect at annual renewal. Monthly→annual is immediate with prorated credit.
- **Free trial → Paid:** 14-day trial. Non-conversion drops to read-only (data preserved).

## Vendor Billing

### Default (all white-label tiers)
- White-label clients manage which vendors appear in their app
- Vendor setup ($500) and vendor change ($250) fees cover Pocket PRC's configuration work
- Client collects from their own vendors however they choose (outside the platform)

### Optional Add-On: Automated Vendor Billing (Stripe Connect)
- White-label client onboards to Stripe Connect as a connected account
- They set vendor pricing, vendors pay through the platform
- Pocket PRC takes a 5-10% platform fee on vendor payments
- Client gets a dashboard showing vendor payment status
- Fully automated recurring billing — no manual invoicing

### Solo/Team/Large Team vendor billing
- Pocket PRC controls the 3 vendor ad spots
- Pocket PRC invoices vendors directly via Stripe

## Billing Systems Needed

- **Stripe Subscriptions** — agent/team subscription billing
- **Stripe Invoicing** — vendor billing for Solo/Team/Large Team (Pocket PRC collects)
- **Stripe Connect** — optional add-on for white-label clients to collect from their own vendors

## App Distribution

- **Android:** Google Play Store ($25 one-time dev account), signed release AAB
- **iOS:** Apple App Store ($99/yr dev account), requires Mac + Xcode for builds
- **Build pipeline:** Capacitor + Fastlane + GitHub Actions (macOS runner for iOS)
- **White-label builds:** Separate app IDs, branding, icons per client — automated via build pipeline

## Notes

- PRC checklist is Maine KW-specific currently
- Vendor ad system needs invoicing + autopayment
- TacoHelp integrated for support (generic + white-label)

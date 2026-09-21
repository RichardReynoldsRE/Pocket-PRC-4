-- Vendor billing and ad slot tables

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    category VARCHAR(20) NOT NULL CHECK (category IN ('title', 'mortgage', 'insurance', 'inspection', 'other')),
    logo_url TEXT,
    website VARCHAR(500),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('title_lead', 'rate_request', 'general_ad')),
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, slot_type, position)
);

CREATE TABLE IF NOT EXISTS vendor_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    billing_interval VARCHAR(10) NOT NULL CHECK (billing_interval IN ('monthly', 'annual')),
    amount_cents INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
    )),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_subscription_id UUID REFERENCES vendor_subscriptions(id) ON DELETE SET NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(30) NOT NULL,
    description TEXT,
    invoice_pdf_url TEXT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_stripe_customer ON vendors(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_slots_team ON vendor_slots(team_id);
CREATE INDEX IF NOT EXISTS idx_vendor_slots_vendor ON vendor_slots(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_vendor ON vendor_subscriptions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payment_history_vendor ON vendor_payment_history(vendor_id);

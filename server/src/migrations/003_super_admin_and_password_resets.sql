-- Add super_admin role and password reset tokens

-- 1. Drop existing role CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add new CHECK constraint with super_admin
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'owner', 'team_lead', 'agent', 'transaction_coordinator', 'isa'));

-- 3. Promote the seed admin to super_admin (preserves team-scoped owners)
UPDATE users SET role = 'super_admin'
  WHERE email = 'admin@pocketprc.com' AND role = 'owner';

-- 4. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

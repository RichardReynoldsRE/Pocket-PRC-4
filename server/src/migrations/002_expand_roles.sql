-- Expand role system: admin → owner, add transaction_coordinator and isa

-- Drop the old CHECK constraint first (allows 'admin', 'team_lead', 'agent')
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Rename existing admin users to owner
UPDATE users SET role = 'owner' WHERE role = 'admin';

-- Add new CHECK constraint with expanded roles
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'team_lead', 'agent', 'transaction_coordinator', 'isa'));

export const ROLES = {
  OWNER: 'owner',
  TEAM_LEAD: 'team_lead',
  AGENT: 'agent',
  TRANSACTION_COORDINATOR: 'transaction_coordinator',
  ISA: 'isa',
};

export const ROLE_HIERARCHY = {
  owner: 5,
  team_lead: 4,
  agent: 3,
  transaction_coordinator: 2,
  isa: 1,
};

export function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

export const ROLE_LABELS = {
  owner: 'Owner',
  team_lead: 'Team Lead',
  agent: 'Agent',
  transaction_coordinator: 'Transaction Coordinator',
  isa: 'ISA',
};

export const ROLES = {
  ADMIN: 'admin',
  TEAM_LEAD: 'team_lead',
  AGENT: 'agent',
};

export const ROLE_HIERARCHY = {
  admin: 3,
  team_lead: 2,
  agent: 1,
};

export function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

export const ROLE_LABELS = {
  admin: 'Admin',
  team_lead: 'Team Lead',
  agent: 'Agent',
};

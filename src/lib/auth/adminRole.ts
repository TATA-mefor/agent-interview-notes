// ============================================================
// Track C: Agent Testing Admin Roles
// ============================================================
// Two roles only: admin / viewer.
// No external auth provider. No OAuth. No NextAuth.

export const ADMIN_ROLES = ['admin', 'viewer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_ADMIN: AdminRole = 'admin';
export const ADMIN_ROLE_VIEWER: AdminRole = 'viewer';

export function isValidAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole);
}

export function normalizeAdminRole(value: unknown): AdminRole {
  if (isValidAdminRole(value)) return value;
  return ADMIN_ROLE_VIEWER; // default: least privilege
}

// ── Permission helpers ──

export function canReadAgentTesting(role: AdminRole | null): boolean {
  return role === 'admin' || role === 'viewer';
}

export function canWriteAgentTesting(role: AdminRole | null): boolean {
  return role === 'admin';
}

export function canApproveAgentTesting(role: AdminRole | null): boolean {
  return role === 'admin';
}

// ============================================================
// Track C: Agent Testing Feature Flags
// ============================================================
// AGENT_TESTING_ENABLED:
//   true  → /api/agent-testing/* and /admin/agent-testing/* functional
//   false → /api/agent-testing/* returns 503, /admin/agent-testing/* shows disabled
//
// Does NOT affect: /admin/login, /api/admin/login, /api/admin/logout,
// /api/admin/session, or normal project pages.

export function isAgentTestingEnabled(): boolean {
  const raw = process.env.AGENT_TESTING_ENABLED;

  if (raw === undefined || raw === null || raw === '') {
    // Default: enabled in development, disabled in production
    return process.env.NODE_ENV !== 'production';
  }

  return raw === 'true' || raw === '1';
}

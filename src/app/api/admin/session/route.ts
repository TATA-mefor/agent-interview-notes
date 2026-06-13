// GET /api/admin/session
// Returns current session state. 401 if not authenticated.

import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/adminAuth';
import { isAgentTestingEnabled } from '@/lib/config/agentTestingFeatureFlags';

export async function GET() {
  const ctx = getAuthContext();

  if (!ctx.authenticated || !ctx.role) {
    return NextResponse.json(
      { data: { authenticated: false, agentTestingEnabled: isAgentTestingEnabled() } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    data: {
      authenticated: true,
      role: ctx.role,
      agentTestingEnabled: isAgentTestingEnabled(),
    },
  });
}

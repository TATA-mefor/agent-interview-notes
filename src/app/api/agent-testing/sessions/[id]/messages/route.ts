// GET /api/agent-testing/sessions/[id]/messages — list messages

import { NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
} from '@/lib/auth/adminAuth';
import * as service from '@/lib/services/agentTestingService';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = requireAdminSession();
  if ('error' in auth) return auth.error;
  const feature = requireAgentTestingRole(auth.role);
  if ('error' in feature) return feature.error;

  const result = await service.listAgentTestingMessages(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations });
}

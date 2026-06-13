// POST /api/agent-testing/sessions/[id]/round — run one round

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
  requireWriteRole,
} from '@/lib/auth/adminAuth';
import * as service from '@/lib/services/agentTestingService';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireAdminSession();
  if ('error' in auth) return auth.error;
  const feature = requireAgentTestingRole(auth.role);
  if ('error' in feature) return feature.error;
  const write = requireWriteRole(auth.role);
  if ('error' in write) return write.error;

  const result = await service.runAgentTestingRound(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations });
}

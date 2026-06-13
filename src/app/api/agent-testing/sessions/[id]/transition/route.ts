// POST /api/agent-testing/sessions/[id]/transition — transition session status

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
  requireWriteRole,
} from '@/lib/auth/adminAuth';
import * as service from '@/lib/services/agentTestingService';

const VALID_TARGET_STATUSES = new Set([
  'running', 'waiting_for_evidence', 'waiting_for_approval',
  'blocked', 'completed', 'cancelled', 'failed',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireAdminSession();
  if ('error' in auth) return auth.error;
  const feature = requireAgentTestingRole(auth.role);
  if ('error' in feature) return feature.error;
  const write = requireWriteRole(auth.role);
  if ('error' in write) return write.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const status = typeof body.status === 'string' ? body.status : '';
  if (!VALID_TARGET_STATUSES.has(status)) {
    return NextResponse.json({
      error: `Invalid target status: "${status}".`,
      validStatuses: [...VALID_TARGET_STATUSES],
    }, { status: 400 });
  }

  const result = await service.transitionAgentTestingSession(params.id, status);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations });
}

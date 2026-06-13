// POST /api/agent-testing/sessions/[id]/blackboard — write blackboard patch

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
  requireWriteRole,
} from '@/lib/auth/adminAuth';
import * as service from '@/lib/services/agentTestingService';

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

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be a JSON object (patch).' }, { status: 400 });
  }

  const result = await service.writeAgentTestingBlackboard(params.id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations });
}

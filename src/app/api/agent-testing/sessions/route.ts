// GET /api/agent-testing/sessions — list sessions
// POST /api/agent-testing/sessions — create session

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
  requireWriteRole,
} from '@/lib/auth/adminAuth';
import * as service from '@/lib/services/agentTestingService';

export async function GET(_request: NextRequest) {
  const auth = requireAdminSession();
  if ('error' in auth) return auth.error;
  const feature = requireAgentTestingRole(auth.role);
  if ('error' in feature) return feature.error;

  const result = await service.listAgentTestingSessions();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations });
}

export async function POST(request: NextRequest) {
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

  const targetSystemName = typeof body.targetSystemName === 'string' ? body.targetSystemName.trim() : '';
  if (!targetSystemName) {
    return NextResponse.json({ error: 'targetSystemName is required.' }, { status: 400 });
  }

  const runId = typeof body.runId === 'string' ? body.runId : undefined;
  const result = await service.createAgentTestingSession({ targetSystemName, runId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations }, { status: 201 });
}

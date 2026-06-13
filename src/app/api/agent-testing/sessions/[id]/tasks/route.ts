// GET  /api/agent-testing/sessions/[id]/tasks — list tasks
// POST /api/agent-testing/sessions/[id]/tasks — create task

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
  requireWriteRole,
} from '@/lib/auth/adminAuth';
import * as service from '@/lib/services/agentTestingService';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireAdminSession();
  if ('error' in auth) return auth.error;
  const feature = requireAgentTestingRole(auth.role);
  if ('error' in feature) return feature.error;

  const result = await service.listAgentTestingTasks(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations });
}

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

  const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo.trim() : '';
  const taskType = typeof body.taskType === 'string' ? body.taskType.trim() : '';
  const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
  const expectedOutput = typeof body.expectedOutput === 'string' ? body.expectedOutput.trim() : '';
  const priority = typeof body.priority === 'string' ? body.priority : undefined;

  if (!assignedTo || !taskType || !goal || !expectedOutput) {
    return NextResponse.json({
      error: 'assignedTo, taskType, goal, and expectedOutput are required.',
    }, { status: 400 });
  }

  const result = await service.createAgentTestingTask(params.id, {
    assignedTo, taskType, goal, expectedOutput, priority,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ data: result.data, limitations: result.limitations }, { status: 201 });
}

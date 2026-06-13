// GET /api/agent-testing/sessions/[id] — get session detail (DTO)

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
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

  const result = await service.getAgentTestingSession(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const session = result.data;
  const blackboardSummary = service.buildBlackboardSummary(
    session.blackboard as unknown as Record<string, unknown>,
  );

  // DTO: session metadata + tasks/messages + blackboardSummary (not full blackboard)
  return NextResponse.json({
    data: {
      id: session.id,
      runId: session.runId,
      targetSystemName: session.targetSystemName,
      status: session.status,
      agents: session.agents,
      tasks: session.tasks,
      messages: session.messages,
      auditEventIds: session.auditEventIds,
      limitations: session.limitations,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      blackboardSummary,
    },
    limitations: result.limitations,
  });
}

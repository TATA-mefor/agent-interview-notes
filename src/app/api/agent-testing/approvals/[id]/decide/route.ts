// POST /api/agent-testing/approvals/[id]/decide
// Records a human approval decision (approve / reject / request_more_evidence).
// Track C: no DB persistence, no MCP execution, no LLM, no command.
// Requires admin role. Viewer → 403. Unauthenticated → 401.
// Feature disabled → 503.

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  requireAgentTestingRole,
  requireApprovalRole,
} from '@/lib/auth/adminAuth';
import {
  isValidApprovalDecision,
  processApprovalDecision,
  type ApprovalDecisionValue,
} from '@/lib/services/agentTestingApprovalRuntime';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const approvalId = params.id;

  // ── Auth gates ──

  const sessionResult = requireAdminSession();
  if ('error' in sessionResult) return sessionResult.error;

  const featureResult = requireAgentTestingRole(sessionResult.role);
  if ('error' in featureResult) return featureResult.error;

  const writeResult = requireApprovalRole(sessionResult.role);
  if ('error' in writeResult) return writeResult.error;

  // ── Parse body ──

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  // ── Validate decision ──

  const decision = body.decision;
  if (!isValidApprovalDecision(decision)) {
    return NextResponse.json(
      {
        error: 'Invalid decision.',
        validDecisions: ['approved', 'rejected', 'request_more_evidence'],
      },
      { status: 400 },
    );
  }

  const reason = typeof body.reason === 'string' ? body.reason : '';
  if (reason.length === 0) {
    return NextResponse.json(
      { error: 'Reason is required.' },
      { status: 400 },
    );
  }

  // ── Process decision (no DB, no MCP, no LLM, no command) ──

  const result = processApprovalDecision({
    approvalRequestId: approvalId,
    decision: decision as ApprovalDecisionValue,
    reason,
    decidedBy: sessionResult.role,
  });

  return NextResponse.json({
    data: {
      approvalRequestId: result.approvalRequestId,
      decision: result.decision,
      status: result.status,
      auditDraft: result.auditDraft,
      limitations: result.limitations,
    },
  });
}

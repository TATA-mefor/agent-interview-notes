import type {
  ControlledExecutionPlan,
  ControlledExecutionRequest,
} from './controlledExecutionTypes';
import {
  buildControlledExecutionRequestAuditDraft,
} from './controlledExecutionAuditMapping';
import {
  evaluateControlledExecutionSafety,
} from './executionSafetyPolicy';

function baseSteps(request: ControlledExecutionRequest): string[] {
  return [
    `Review controlled ${request.kind} request metadata and target summary.`,
    'Evaluate approval policy before any future execution path.',
    'Confirm no live command, HTTP request, browser action, MCP tool, database operation, or filesystem access occurs in Phase 18.',
    'Prepare evidence boundaries: simulated output can only become inconclusive or not_run evidence draft, never pass evidence.',
    'Prepare audit boundaries: store summary-only audit drafts and avoid full sensitive inputs.',
  ];
}

export function buildDryRunExecutionPlan(
  request: ControlledExecutionRequest
): ControlledExecutionPlan {
  const safety = evaluateControlledExecutionSafety(request);
  const steps = [
    ...baseSteps(request),
    ...(safety.forbidden
      ? ['Stop at policy explanation because the request is forbidden. Do not simulate action execution.']
      : []),
    ...(safety.requiresHumanApproval
      ? ['Stop at approval_pending until a later Human-in-the-Loop runtime approves the action.']
      : []),
    ...(safety.allowedForSimulation
      ? ['A deterministic simulated result may be generated, but it remains non-execution and non-pass evidence.']
      : ['Do not generate simulated completion for this request under the current mode or risk state.']),
    'If a later phase enables live execution, require explicit approval, audit persistence, evidence references, and environment scoping first.',
  ];

  return {
    id: `plan-${request.id}`,
    requestId: request.id,
    runId: request.runId,
    kind: request.kind,
    mode: request.mode,
    steps,
    approvalRequired: safety.requiresHumanApproval,
    forbidden: safety.forbidden,
    riskLevel: safety.risk,
    requiredEvidence: [
      ...request.evidenceToProduce,
      ...safety.approvalPolicyOutput.requiredEvidenceBeforeApproval,
    ],
    auditEventDrafts: [
      buildControlledExecutionRequestAuditDraft(safety.request),
    ],
    limitations: [
      ...safety.limitations,
      'Dry-run plan is a planning artifact only and is not execution.',
      'No real result or real system evidence is produced by this planner.',
    ],
  };
}

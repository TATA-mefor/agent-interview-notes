import {
  normalizeEvidence,
} from '../evidence';
import type {
  ControlledExecutionFailureKind,
  ControlledExecutionRequest,
  ControlledExecutionResult,
  ControlledExecutionStatus,
} from './controlledExecutionTypes';
import {
  buildControlledExecutionRequestAuditDraft,
  buildControlledExecutionResultAuditDraft,
} from './controlledExecutionAuditMapping';
import {
  mapControlledExecutionResultToRawEvidenceDraft,
} from './controlledExecutionEvidenceMapping';
import {
  evaluateControlledExecutionSafety,
} from './executionSafetyPolicy';

function blockedStatusForSafety(status: ControlledExecutionStatus): ControlledExecutionStatus {
  if (status === 'forbidden' || status === 'approval_pending' || status === 'blocked') {
    return status;
  }

  return 'not_executed';
}

function failureKindForStatus(status: ControlledExecutionStatus): ControlledExecutionFailureKind {
  if (status === 'forbidden') {
    return 'policy_forbidden';
  }

  if (status === 'approval_pending') {
    return 'approval_required';
  }

  if (status === 'blocked' || status === 'not_executed') {
    return 'simulation_blocked';
  }

  return 'none';
}

export function simulateControlledExecution(
  request: ControlledExecutionRequest
): ControlledExecutionResult {
  const safety = evaluateControlledExecutionSafety(request);
  const canSimulate = safety.allowedForSimulation;
  const status: ControlledExecutionStatus = canSimulate
    ? 'simulated_completed'
    : blockedStatusForSafety(safety.status);
  const result: ControlledExecutionResult = {
    id: `result-${request.id}`,
    requestId: request.id,
    runId: request.runId,
    kind: request.kind,
    status,
    simulated: canSimulate,
    outputSummary: canSimulate
      ? `Simulated controlled ${request.kind} result for ${request.target}. No real action was executed; this is not pass evidence.`
      : `Controlled ${request.kind} simulation was not executed: ${safety.reason}`,
    failureKind: canSimulate ? 'none' : failureKindForStatus(status),
    producedEvidenceIds: [],
    requestAuditDraft: buildControlledExecutionRequestAuditDraft(safety.request),
    limitations: [
      ...safety.limitations,
      'simulateControlledExecution is deterministic and never performs live execution.',
      'Simulated completion is not real MCP output, not real evidence, and not a system test pass.',
      ...(canSimulate ? [] : ['No simulated action completion was produced because policy or mode blocked it.']),
    ],
  };
  const rawEvidenceDraft = mapControlledExecutionResultToRawEvidenceDraft(result);
  const normalizedEvidencePreview = normalizeEvidence(rawEvidenceDraft).evidence;
  const resultWithDrafts: ControlledExecutionResult = {
    ...result,
    rawEvidenceDraft,
    resultAuditDraft: buildControlledExecutionResultAuditDraft(result),
    normalizedEvidencePreview,
  };

  return resultWithDrafts;
}

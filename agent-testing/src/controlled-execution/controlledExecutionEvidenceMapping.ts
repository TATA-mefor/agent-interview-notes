import type {
  EvidenceResult,
  MarkdownString,
} from '../types';
import type {
  RawEvidenceInput,
} from '../evidence';
import type {
  ControlledExecutionResult,
  ControlledExecutionStatus,
} from './controlledExecutionTypes';

function rawResultForControlledExecution(status: ControlledExecutionStatus): EvidenceResult {
  if (status === 'forbidden' || status === 'approval_pending' || status === 'blocked' || status === 'not_executed') {
    return 'not_run';
  }

  return 'inconclusive';
}

function recommendationForControlledExecution(result: ControlledExecutionResult): MarkdownString {
  if (result.status === 'simulated_completed') {
    return 'Use this only as a simulated controlled-execution draft; collect real execution evidence before making a pass/fail test claim.';
  }

  if (result.status === 'approval_pending') {
    return 'Resolve human approval and collect real execution evidence in a later phase before treating this as system evidence.';
  }

  if (result.status === 'forbidden') {
    return 'Do not execute this action unless a later policy explicitly changes the forbidden boundary.';
  }

  return 'Treat this as a planning or blocked-execution artifact, not system-under-test evidence.';
}

export function mapControlledExecutionResultToRawEvidenceDraft(
  result: ControlledExecutionResult
): RawEvidenceInput {
  return {
    id: `EV-CONTROLLED-${result.requestId}`.toUpperCase(),
    testScope: `${result.kind} controlled execution boundary`,
    executionMethod: `Controlled ${result.kind} ${result.simulated ? 'simulation' : 'dry-run/block'} draft`,
    executorType: 'mcp_tool',
    rawResult: rawResultForControlledExecution(result.status),
    evidenceSource: `controlled-execution:${result.requestId}`,
    evidenceSummary: result.outputSummary,
    observedAt: '',
    environment: {
      name: 'not_executed',
      notes: 'Controlled execution draft did not run against a real environment.',
    },
    severity: 'none',
    recommendation: recommendationForControlledExecution(result),
    confidence: 'low',
    limitations: [
      ...result.limitations,
      'Raw evidence draft is derived from controlled execution planning/simulation only.',
      'Simulated controlled execution is never mapped to pass by default.',
      'Approval, policy, tool, or simulation failure is not treated as a system-under-test failure.',
      'No real evidence was persisted or produced.',
    ],
    metadata: {
      toolName: `controlled_${result.kind}`,
      rawEvidenceRef: `controlled-execution:${result.requestId}`,
      controlledExecutionRequestId: result.requestId,
      controlledExecutionResultId: result.id,
      controlledExecutionStatus: result.status,
      controlledExecutionFailureKind: result.failureKind,
      simulated: result.simulated,
    },
  };
}

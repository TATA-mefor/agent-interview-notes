import type {
  AuditEventInput,
  AuditEventOutcome,
} from '../audit';
import type {
  McpCapability,
  McpToolResult as LegacyMcpToolResult,
} from '../types';
import type {
  ControlledExecutionRequest,
  ControlledExecutionResult,
  ControlledExecutionStatus,
} from './controlledExecutionTypes';
import {
  evaluateControlledExecutionSafety,
} from './executionSafetyPolicy';

function mcpCapabilityForRequest(request: ControlledExecutionRequest): McpCapability {
  if (request.kind === 'command') {
    return 'terminal_command';
  }

  if (request.kind === 'http_api') {
    return 'http_api';
  }

  if (request.kind === 'browser') {
    return 'browser_automation';
  }

  return 'filesystem_repository';
}

function outcomeForStatus(status: ControlledExecutionStatus): AuditEventOutcome {
  if (status === 'simulated_completed' || status === 'dry_run_ready' || status === 'approval_not_required') {
    return 'success';
  }

  if (status === 'approval_pending') {
    return 'pending';
  }

  if (status === 'forbidden') {
    return 'forbidden';
  }

  if (status === 'blocked' || status === 'not_executed') {
    return 'blocked';
  }

  return 'not_applicable';
}

function legacyMcpResultForControlledResult(result: ControlledExecutionResult): LegacyMcpToolResult {
  if (result.status === 'simulated_completed') {
    return 'success';
  }

  if (result.status === 'blocked' || result.status === 'approval_pending' || result.status === 'forbidden') {
    return 'blocked';
  }

  if (result.failureKind === 'simulation_failure') {
    return 'tool_failed';
  }

  return 'blocked';
}

export function buildControlledExecutionRequestAuditDraft(
  request: ControlledExecutionRequest
): AuditEventInput {
  const safety = evaluateControlledExecutionSafety(request);

  return {
    id: `audit-${request.runId}-controlled-request-${request.id}`,
    runId: request.runId,
    traceId: `${request.runId}-controlled-${request.id}`,
    eventType: 'mcp_requested',
    actor: {
      agentRole: request.requestedByAgent,
      mcpCapability: mcpCapabilityForRequest(request),
    },
    outcome: outcomeForStatus(safety.status),
    summary: `Controlled execution request draft for ${request.kind}: ${safety.status}.`,
    inputSummary: request.inputSummary,
    outputSummary: request.expectedOutput,
    issues: safety.policyViolations,
    limitations: [
      ...safety.limitations,
      'Audit event is a draft only and was not persisted.',
      'Controlled execution audit draft stores summaries only, not full sensitive inputs.',
    ],
    policyRef: {
      approvalRequestId: safety.approvalPolicyOutput.request.id,
      approvalStatus: safety.approvalPolicyOutput.status,
      approvalRiskLevel: safety.approvalPolicyOutput.riskAssessment.riskLevel,
      approvalActionType: safety.approvalPolicyOutput.request.actionType,
      policyViolations: safety.policyViolations,
      requiresHumanApproval: safety.requiresHumanApproval,
    },
    mcpRef: {
      capability: mcpCapabilityForRequest(request),
      permissionLevel: request.permissionLevel,
      sideEffectLevel: request.sideEffectLevel,
    },
    privacyLevel: request.touchesSensitiveData ? 'sensitive_summary' : 'internal_summary',
    createdAt: '',
  };
}

export function buildControlledExecutionResultAuditDraft(
  result: ControlledExecutionResult
): AuditEventInput {
  return {
    id: `audit-${result.runId}-controlled-result-${result.id}`,
    runId: result.runId,
    traceId: `${result.runId}-controlled-${result.requestId}`,
    eventType: result.status === 'simulated_completed' ? 'mcp_completed' : 'mcp_failed',
    actor: {
      mcpCapability: result.kind === 'command'
        ? 'terminal_command'
        : result.kind === 'http_api'
          ? 'http_api'
          : result.kind === 'browser'
            ? 'browser_automation'
            : 'filesystem_repository',
    },
    outcome: outcomeForStatus(result.status),
    summary: `Controlled execution result draft for ${result.kind}: ${result.status}.`,
    outputSummary: result.outputSummary,
    issues: result.failureKind === 'none'
      ? []
      : [`Controlled execution failure kind: ${result.failureKind}.`],
    limitations: [
      ...result.limitations,
      'Audit event is a draft only and was not persisted.',
      'Simulated controlled execution result is not real MCP execution and does not prove a system test passed.',
    ],
    artifactRefs: {
      evidenceIds: result.producedEvidenceIds,
      sourceRefs: [],
    },
    mcpRef: {
      capability: result.kind === 'command'
        ? 'terminal_command'
        : result.kind === 'http_api'
          ? 'http_api'
          : result.kind === 'browser'
            ? 'browser_automation'
            : 'filesystem_repository',
      result: legacyMcpResultForControlledResult(result),
    },
    privacyLevel: 'internal_summary',
    createdAt: '',
  };
}

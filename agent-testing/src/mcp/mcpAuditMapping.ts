import type {
  McpToolResult as LegacyMcpToolResult,
} from '../types';
import type {
  AuditEventInput,
  AuditEventOutcome,
} from '../audit';
import type {
  McpToolRequest,
} from './mcpToolRequest';
import type {
  McpToolResult,
} from './mcpToolResult';

function legacyResultForMcp(result: McpToolResult): LegacyMcpToolResult {
  if (result.status === 'success') {
    return 'success';
  }

  if (result.failureKind === 'environment_failure') {
    return 'environment_failed';
  }

  if (result.failureKind === 'system_under_test_failure') {
    return 'system_failed';
  }

  if (['blocked_by_approval', 'forbidden', 'not_executed'].includes(result.status)) {
    return 'blocked';
  }

  return 'tool_failed';
}

function outcomeForResult(result: McpToolResult): AuditEventOutcome {
  if (result.status === 'success') {
    return 'success';
  }

  if (result.status === 'forbidden') {
    return 'forbidden';
  }

  if (result.status === 'blocked_by_approval' || result.status === 'not_executed') {
    return 'blocked';
  }

  if (result.status === 'inconclusive') {
    return 'inconclusive';
  }

  return 'failure';
}

export function buildMcpRequestAuditEventDraft(
  request: McpToolRequest
): AuditEventInput {
  return {
    id: `audit-${request.runId}-mcp-request-${request.id}`,
    runId: request.runId,
    traceId: `${request.runId}-mcp-${request.id}`,
    eventType: 'mcp_requested',
    actor: {
      agentRole: request.requestedByAgent,
      mcpCapability: request.adapterKind,
    },
    outcome: request.status === 'forbidden'
      ? 'forbidden'
      : request.status === 'approval_pending'
        ? 'pending'
        : 'not_applicable',
    summary: `MCP request draft for ${request.adapterKind}/${request.toolName}.`,
    inputSummary: request.inputSummary,
    outputSummary: request.expectedOutput,
    issues: request.status === 'forbidden'
      ? ['MCP request is forbidden by policy state.']
      : [],
    limitations: [
      ...request.limitations,
      'Audit event is a draft only and was not persisted.',
      'Full sensitive MCP input is not stored in the audit draft.',
    ],
    policyRef: {
      approvalRequestId: request.approvalRequestId,
      approvalStatus: request.status === 'approval_pending'
        ? 'pending'
        : request.status === 'forbidden'
          ? 'forbidden'
          : undefined,
      approvalActionType: 'mcp_tool_call',
      policyViolations: [],
      requiresHumanApproval: request.status === 'approval_pending',
    },
    mcpRef: {
      capability: request.adapterKind,
      permissionLevel: request.permissionLevel,
      sideEffectLevel: request.sideEffectLevel,
    },
    privacyLevel: request.touchesSensitiveData ? 'sensitive_summary' : 'internal_summary',
    createdAt: '',
  };
}

export function buildMcpResultAuditEventDraft(
  result: McpToolResult
): AuditEventInput {
  return {
    id: `audit-${result.runId}-mcp-result-${result.id}`,
    runId: result.runId,
    traceId: `${result.runId}-mcp-${result.requestId}`,
    eventType: result.status === 'success' ? 'mcp_completed' : 'mcp_failed',
    actor: {
      mcpCapability: result.adapterKind,
    },
    outcome: outcomeForResult(result),
    summary: `MCP result draft for ${result.adapterKind}/${result.toolName}: ${result.status}.`,
    outputSummary: result.outputSummary,
    issues: result.failureKind === 'system_under_test_failure'
      ? ['MCP result indicates a system-under-test failure candidate.']
      : result.failureKind === 'unknown'
        ? ['MCP result failure kind is unknown or not applicable.']
        : [`MCP failure kind: ${result.failureKind}`],
    limitations: [
      ...result.limitations,
      'Audit event is a draft only and was not persisted.',
      'MCP result draft does not prove a test passed unless later normalized evidence supports that claim.',
    ],
    artifactRefs: {
      evidenceIds: result.producedEvidenceIds,
      sourceRefs: result.rawEvidenceRef ? [result.rawEvidenceRef] : [],
    },
    mcpRef: {
      capability: result.adapterKind,
      result: legacyResultForMcp(result),
    },
    privacyLevel: 'internal_summary',
    createdAt: result.completedAt,
  };
}

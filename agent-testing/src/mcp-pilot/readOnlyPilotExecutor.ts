import type {
  MarkdownString,
} from '../types';
import {
  normalizeEvidence,
} from '../evidence';
import {
  buildMcpRequestAuditEventDraft,
  buildMcpResultAuditEventDraft,
  buildNotExecutedMcpToolResult,
  evaluateMcpToolRequestApproval,
  mapMcpResultToRawEvidenceDraft,
  type McpToolRequest,
  type McpToolResult,
} from '../mcp';
import {
  executeReadDatabaseQuerySnapshot,
  executeReadFixtureFile,
  executeReadGitDiffSnapshot,
  executeReadHttpResponseSnapshot,
  executeReadLogExcerptSnapshot,
  executeReadScreenshotMetadataSnapshot,
} from './readOnlyPilotAdapters';
import type {
  ReadOnlyPilotAdapterKind,
  ReadOnlyPilotExecutionInput,
  ReadOnlyPilotExecutionOutput,
  ReadOnlyPilotSnapshot,
  ReadOnlyPilotToolName,
} from './readOnlyPilotTypes';

const ALLOWED_ADAPTERS: ReadOnlyPilotAdapterKind[] = [
  'filesystem_repository',
  'git',
  'http_api',
  'database',
  'log_monitoring',
  'screenshot_attachment',
];

const ALLOWED_TOOLS: ReadOnlyPilotToolName[] = [
  'read_fixture_file',
  'read_git_diff_snapshot',
  'read_http_response_snapshot',
  'read_database_query_snapshot',
  'read_log_excerpt_snapshot',
  'read_screenshot_metadata_snapshot',
];

function isAllowedAdapter(value: string): value is ReadOnlyPilotAdapterKind {
  return ALLOWED_ADAPTERS.includes(value as ReadOnlyPilotAdapterKind);
}

function isAllowedTool(value: string): value is ReadOnlyPilotToolName {
  return ALLOWED_TOOLS.includes(value as ReadOnlyPilotToolName);
}

function blockedResult(request: McpToolRequest, reason: MarkdownString): McpToolResult {
  return {
    ...buildNotExecutedMcpToolResult(request, reason),
    outputSummary: reason,
  };
}

function forbiddenRequest(request: McpToolRequest): McpToolRequest {
  return {
    ...request,
    status: 'forbidden',
  };
}

function readOnlyBoundaryViolation(request: McpToolRequest): MarkdownString | undefined {
  if (!isAllowedAdapter(request.adapterKind)) {
    return `Adapter ${request.adapterKind} is outside the Phase 17 read-only pilot allowlist.`;
  }

  if (!isAllowedTool(request.toolName)) {
    return `Tool ${request.toolName} is outside the Phase 17 read-only pilot allowlist.`;
  }

  if (request.permissionLevel !== 'READ_ONLY') {
    return 'Read-only pilot requires READ_ONLY permission.';
  }

  if (request.sideEffectLevel !== 'NONE') {
    return 'Read-only pilot requires sideEffectLevel NONE.';
  }

  if (
    request.executesCommand ||
    request.modifiesDatabase ||
    request.writesToFilesystem ||
    request.modifiesDeployment ||
    request.isDestructive
  ) {
    return 'Read-only pilot forbids command execution, database mutation, filesystem writes, deployment mutation, and destructive actions.';
  }

  if (request.isProduction && request.touchesSensitiveData) {
    return 'Read-only pilot forbids production sensitive-data access.';
  }

  return undefined;
}

function executeAllowedRead(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  if (request.toolName === 'read_fixture_file') {
    return executeReadFixtureFile(request, snapshot);
  }

  if (request.toolName === 'read_git_diff_snapshot') {
    return executeReadGitDiffSnapshot(request, snapshot);
  }

  if (request.toolName === 'read_http_response_snapshot') {
    return executeReadHttpResponseSnapshot(request, snapshot);
  }

  if (request.toolName === 'read_database_query_snapshot') {
    return executeReadDatabaseQuerySnapshot(request, snapshot);
  }

  if (request.toolName === 'read_log_excerpt_snapshot') {
    return executeReadLogExcerptSnapshot(request, snapshot);
  }

  return executeReadScreenshotMetadataSnapshot(request, snapshot);
}

export function runReadOnlyMcpPilot(
  input: ReadOnlyPilotExecutionInput
): ReadOnlyPilotExecutionOutput {
  const approvalEvaluation = input.options.requireApprovalGate
    ? evaluateMcpToolRequestApproval(input.request)
    : {
      request: {
        ...input.request,
        status: 'approval_not_required' as const,
      },
      approvalPolicyOutput: evaluateMcpToolRequestApproval(input.request).approvalPolicyOutput,
      status: 'approval_not_required' as const,
      requiresHumanApproval: false,
      allowedForFutureExecution: true,
      forbidden: false,
      reason: 'Approval gate was disabled by pilot options; request remains limited to in-memory read-only pilot execution.',
      limitations: [
        'Approval gate bypass is only a pilot option and does not permit real MCP execution.',
      ],
    };
  const request = approvalEvaluation.request;
  const warnings: MarkdownString[] = [];
  let result: McpToolResult;

  if (approvalEvaluation.status === 'forbidden') {
    result = buildNotExecutedMcpToolResult(request, approvalEvaluation.reason);
    warnings.push('Approval policy forbids this request; pilot adapter was not called.');
  } else if (approvalEvaluation.status === 'approval_pending') {
    result = buildNotExecutedMcpToolResult(request, approvalEvaluation.reason);
    warnings.push('Request requires approval; pilot adapter was not called.');
  } else {
    const boundaryViolation = readOnlyBoundaryViolation(request);
    const isMediumRisk = approvalEvaluation.approvalPolicyOutput.riskAssessment.riskLevel === 'MEDIUM';

    if (isMediumRisk && !input.options.allowMediumRiskRead) {
      result = blockedResult(
        forbiddenRequest(request),
        'Medium-risk read was blocked by pilot options.'
      );
      warnings.push('Medium-risk read-only request was blocked by pilot configuration.');
    } else if (boundaryViolation) {
      result = blockedResult(forbiddenRequest(request), boundaryViolation);
      warnings.push(boundaryViolation);
    } else {
      result = executeAllowedRead(request, input.snapshot);
    }
  }

  const rawEvidenceDraft = input.options.mapResultToEvidenceDraft
    ? mapMcpResultToRawEvidenceDraft(result)
    : undefined;
  const requestAuditDraft = input.options.mapResultToAuditDraft
    ? buildMcpRequestAuditEventDraft(request)
    : undefined;
  const resultAuditDraft = input.options.mapResultToAuditDraft
    ? buildMcpResultAuditEventDraft(result)
    : undefined;
  const normalizedEvidencePreview = rawEvidenceDraft && input.options.normalizeEvidencePreview
    ? normalizeEvidence(rawEvidenceDraft).evidence
    : undefined;

  return {
    request,
    approvalEvaluation,
    result,
    rawEvidenceDraft,
    requestAuditDraft,
    resultAuditDraft,
    normalizedEvidencePreview,
    warnings,
    limitations: [
      ...input.snapshot.limitations,
      ...approvalEvaluation.limitations,
      ...result.limitations,
      'Read-only MCP pilot uses only provided in-memory snapshot data.',
      'Pilot execution is not real MCP execution and does not access real environments.',
      'Pilot result and normalized preview are not persisted and are not final test evidence.',
    ],
  };
}

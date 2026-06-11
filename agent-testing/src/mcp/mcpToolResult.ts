import type {
  EvidenceId,
  IsoDateTimeString,
  MarkdownString,
  SourceReference,
} from '../types';
import type {
  McpAdapterKind,
} from './mcpAdapterContracts';
import type {
  McpToolRequest,
} from './mcpToolRequest';

export type McpToolResultStatus =
  | 'not_executed'
  | 'success'
  | 'failed'
  | 'blocked_by_approval'
  | 'forbidden'
  | 'timeout'
  | 'inconclusive';

export type McpToolFailureKind =
  | 'tool_failure'
  | 'approval_blocked'
  | 'policy_forbidden'
  | 'environment_failure'
  | 'system_under_test_failure'
  | 'permission_denied'
  | 'timeout'
  | 'unknown';

export interface McpToolResult {
  id: MarkdownString;
  requestId: MarkdownString;
  runId: MarkdownString;
  adapterKind: McpAdapterKind;
  serverName: MarkdownString;
  toolName: MarkdownString;
  status: McpToolResultStatus;
  failureKind: McpToolFailureKind;
  outputSummary: MarkdownString;
  rawEvidenceRef?: SourceReference;
  producedEvidenceIds: EvidenceId[];
  startedAt: IsoDateTimeString;
  completedAt: IsoDateTimeString;
  limitations: MarkdownString[];
}

export function buildNotExecutedMcpToolResult(
  request: McpToolRequest,
  reason: MarkdownString
): McpToolResult {
  const forbidden = request.status === 'forbidden';
  const blockedByApproval = request.status === 'approval_pending' ||
    request.status === 'rejected';

  return {
    id: `mcp-result-${request.id}`,
    requestId: request.id,
    runId: request.runId,
    adapterKind: request.adapterKind,
    serverName: request.serverName,
    toolName: request.toolName,
    status: forbidden
      ? 'forbidden'
      : blockedByApproval
        ? 'blocked_by_approval'
        : 'not_executed',
    failureKind: forbidden
      ? 'policy_forbidden'
      : blockedByApproval
        ? 'approval_blocked'
        : 'unknown',
    outputSummary: reason,
    rawEvidenceRef: undefined,
    producedEvidenceIds: [],
    startedAt: '',
    completedAt: '',
    limitations: [
      'No MCP tool was executed.',
      'Not-executed MCP result does not produce real evidence.',
      reason,
    ],
  };
}

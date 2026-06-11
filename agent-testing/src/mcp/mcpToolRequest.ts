import type {
  AgentRole,
  MarkdownString,
  McpPermissionLevel,
  McpSideEffectLevel,
} from '../types';
import type {
  McpAdapterKind,
} from './mcpAdapterContracts';

export type McpToolRequestStatus =
  | 'draft'
  | 'approval_not_required'
  | 'approval_pending'
  | 'approved'
  | 'rejected'
  | 'forbidden'
  | 'ready_for_future_execution'
  | 'not_executed';

export interface McpToolRequest {
  id: MarkdownString;
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  adapterKind: McpAdapterKind;
  serverName: MarkdownString;
  toolName: MarkdownString;
  purpose: MarkdownString;
  inputSummary: MarkdownString;
  expectedOutput: MarkdownString;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  environment: MarkdownString;
  isProduction: boolean;
  isDestructive: boolean;
  touchesSensitiveData: boolean;
  modifiesDeployment: boolean;
  modifiesDatabase: boolean;
  executesCommand: boolean;
  callsExternalService: boolean;
  writesToFilesystem: boolean;
  requiresNetwork: boolean;
  evidenceToProduce: MarkdownString[];
  approvalRequestId?: MarkdownString;
  status: McpToolRequestStatus;
  limitations: MarkdownString[];
}

export type CreateMcpToolRequestInput = Omit<
  Partial<McpToolRequest>,
  'runId' | 'requestedByAgent' | 'adapterKind' | 'serverName' | 'toolName' | 'purpose' | 'inputSummary' | 'expectedOutput' | 'permissionLevel' | 'sideEffectLevel'
> & {
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  adapterKind: McpAdapterKind;
  serverName: MarkdownString;
  toolName: MarkdownString;
  purpose: MarkdownString;
  inputSummary: MarkdownString;
  expectedOutput: MarkdownString;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
};

function sanitizeIdPart(value: MarkdownString): MarkdownString {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'unknown';
}

export function createMcpToolRequest(
  input: CreateMcpToolRequestInput
): McpToolRequest {
  const id = input.id ??
    `mcp-request-${sanitizeIdPart(input.runId)}-${sanitizeIdPart(input.adapterKind)}-${sanitizeIdPart(input.toolName)}`;

  return {
    id,
    runId: input.runId,
    requestedByAgent: input.requestedByAgent,
    adapterKind: input.adapterKind,
    serverName: input.serverName,
    toolName: input.toolName,
    purpose: input.purpose,
    inputSummary: input.inputSummary,
    expectedOutput: input.expectedOutput,
    permissionLevel: input.permissionLevel,
    sideEffectLevel: input.sideEffectLevel,
    environment: input.environment ?? 'unknown',
    isProduction: input.isProduction ?? false,
    isDestructive: input.isDestructive ?? false,
    touchesSensitiveData: input.touchesSensitiveData ?? false,
    modifiesDeployment: input.modifiesDeployment ?? false,
    modifiesDatabase: input.modifiesDatabase ?? false,
    executesCommand: input.executesCommand ?? input.adapterKind === 'terminal_command',
    callsExternalService: input.callsExternalService ??
      ['browser_automation', 'http_api', 'log_monitoring'].includes(input.adapterKind),
    writesToFilesystem: input.writesToFilesystem ??
      (input.adapterKind === 'screenshot_attachment' || input.sideEffectLevel === 'LOCAL_WRITE'),
    requiresNetwork: input.requiresNetwork ??
      ['browser_automation', 'http_api', 'log_monitoring'].includes(input.adapterKind),
    evidenceToProduce: input.evidenceToProduce ?? [`${input.adapterKind} tool output summary`],
    approvalRequestId: input.approvalRequestId,
    status: input.status ?? 'draft',
    limitations: [
      ...(input.limitations ?? []),
      'MCP tool request is a draft contract only; no adapter or tool was called.',
      'Request metadata must pass approval, audit, and future adapter boundaries before execution.',
    ],
  };
}

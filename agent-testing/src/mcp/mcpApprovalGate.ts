import type {
  MarkdownString,
} from '../types';
import {
  evaluateApprovalPolicy,
  type ApprovalActionType,
  type ApprovalPolicyOutput,
} from '../approval';
import type {
  McpToolRequest,
  McpToolRequestStatus,
} from './mcpToolRequest';

export interface McpToolApprovalEvaluation {
  request: McpToolRequest;
  approvalPolicyOutput: ApprovalPolicyOutput;
  status: McpToolRequestStatus;
  requiresHumanApproval: boolean;
  allowedForFutureExecution: boolean;
  forbidden: boolean;
  reason: MarkdownString;
  limitations: MarkdownString[];
}

function actionTypeForRequest(request: McpToolRequest): ApprovalActionType {
  if (request.adapterKind === 'terminal_command') {
    return 'terminal_command';
  }

  if (request.adapterKind === 'browser_automation') {
    return 'browser_automation';
  }

  if (request.adapterKind === 'http_api') {
    return 'http_api_call';
  }

  if (request.adapterKind === 'database') {
    return 'database_operation';
  }

  if (request.adapterKind === 'git') {
    return 'git_operation';
  }

  if (request.adapterKind === 'log_monitoring') {
    return 'log_access';
  }

  if (request.writesToFilesystem || request.adapterKind === 'screenshot_attachment') {
    return 'filesystem_write';
  }

  return 'mcp_tool_call';
}

function statusFromApproval(output: ApprovalPolicyOutput): McpToolRequestStatus {
  if (output.status === 'forbidden') {
    return 'forbidden';
  }

  if (output.status === 'rejected') {
    return 'rejected';
  }

  if (output.status === 'approved') {
    return 'ready_for_future_execution';
  }

  if (output.status === 'pending') {
    return 'approval_pending';
  }

  if (output.requiresHumanApproval) {
    return 'approval_pending';
  }

  return 'approval_not_required';
}

export function evaluateMcpToolRequestApproval(
  request: McpToolRequest
): McpToolApprovalEvaluation {
  const approvalPolicyOutput = evaluateApprovalPolicy({
    id: request.approvalRequestId ?? request.id,
    runId: request.runId,
    requestedByAgent: request.requestedByAgent,
    actionType: actionTypeForRequest(request),
    target: `${request.serverName}:${request.toolName}`,
    purpose: request.purpose,
    permissionLevel: request.permissionLevel,
    sideEffectLevel: request.sideEffectLevel,
    environment: request.environment,
    isProduction: request.isProduction,
    isDestructive: request.isDestructive,
    touchesSensitiveData: request.touchesSensitiveData,
    modifiesDeployment: request.modifiesDeployment,
    modifiesDatabase: request.modifiesDatabase,
    executesCommand: request.executesCommand,
    callsExternalService: request.callsExternalService,
    writesToFilesystem: request.writesToFilesystem,
    requiresNetwork: request.requiresNetwork,
    inputSummary: request.inputSummary,
    expectedOutput: request.expectedOutput,
    evidenceToProduce: request.evidenceToProduce,
  });
  const status = statusFromApproval(approvalPolicyOutput);
  const forbidden = status === 'forbidden';
  const allowedForFutureExecution = status === 'approval_not_required' ||
    status === 'ready_for_future_execution';

  return {
    request: {
      ...request,
      approvalRequestId: approvalPolicyOutput.request.id,
      status,
    },
    approvalPolicyOutput,
    status,
    requiresHumanApproval: approvalPolicyOutput.requiresHumanApproval,
    allowedForFutureExecution,
    forbidden,
    reason: forbidden
      ? 'MCP tool request is forbidden by approval policy.'
      : allowedForFutureExecution
        ? 'MCP tool request passed the approval gate for future execution only.'
        : 'MCP tool request is not ready for execution.',
    limitations: [
      'Approval gate only evaluates request metadata and does not execute MCP tools.',
      'ready_for_future_execution is not execution and does not create evidence by itself.',
      ...approvalPolicyOutput.limitations,
    ],
  };
}

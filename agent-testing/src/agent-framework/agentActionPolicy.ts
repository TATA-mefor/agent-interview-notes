import type {
  AgentRole,
  MarkdownString,
  McpCapability,
  McpPermissionLevel,
  McpSideEffectLevel,
  SkillName,
} from '../types';
import {
  evaluateApprovalPolicy,
  type ApprovalActionType,
  type ApprovalPolicyOutput,
  type ApprovalRiskLevel,
} from '../approval';

export interface AgentActionRequest {
  id: MarkdownString;
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  actionType: ApprovalActionType;
  skillName?: SkillName;
  mcpCapability?: McpCapability;
  purpose: MarkdownString;
  inputSummary: MarkdownString;
  expectedOutput: MarkdownString;
  riskLevel: ApprovalRiskLevel;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  requiresApproval: boolean;
  limitations: MarkdownString[];
}

export interface AgentActionDecision {
  request: AgentActionRequest;
  allowed: boolean;
  requiresApproval: boolean;
  reason: MarkdownString;
  approvalPolicyOutput: ApprovalPolicyOutput;
  limitations: MarkdownString[];
}

function isSkillOnlyLowRisk(request: AgentActionRequest): boolean {
  return request.actionType === 'skill_execution' &&
    request.permissionLevel === 'READ_ONLY' &&
    request.sideEffectLevel === 'NONE' &&
    request.riskLevel === 'LOW';
}

export function evaluateAgentActionRequest(
  request: AgentActionRequest
): AgentActionDecision {
  const approvalPolicyOutput = evaluateApprovalPolicy({
    id: request.id,
    runId: request.runId,
    requestedByAgent: request.requestedByAgent,
    actionType: request.actionType,
    target: request.mcpCapability ?? request.skillName ?? request.actionType,
    purpose: request.purpose,
    permissionLevel: request.permissionLevel,
    sideEffectLevel: request.sideEffectLevel,
    inputSummary: request.inputSummary,
    expectedOutput: request.expectedOutput,
    evidenceToProduce: request.skillName
      ? [`${request.skillName} structured output`]
      : request.mcpCapability
        ? [`future ${request.mcpCapability} evidence reference`]
        : [],
    executesCommand: request.mcpCapability === 'terminal_command' || request.actionType === 'terminal_command',
    callsExternalService: ['http_api', 'browser_automation'].includes(request.mcpCapability ?? '') ||
      ['http_api_call', 'browser_automation'].includes(request.actionType),
    modifiesDatabase: request.mcpCapability === 'database' &&
      request.sideEffectLevel !== 'NONE',
    writesToFilesystem: request.actionType === 'filesystem_write' ||
      (request.mcpCapability === 'filesystem_repository' && request.sideEffectLevel !== 'NONE'),
    requiresNetwork: ['http_api', 'browser_automation', 'log_monitoring'].includes(request.mcpCapability ?? ''),
  });
  const policyRisk = approvalPolicyOutput.riskAssessment.riskLevel;
  const requiresApproval = request.requiresApproval ||
    approvalPolicyOutput.requiresHumanApproval ||
    request.riskLevel === 'HIGH';
  const forbidden = policyRisk === 'FORBIDDEN' || request.riskLevel === 'FORBIDDEN';
  const allowed = !forbidden && (!requiresApproval || isSkillOnlyLowRisk(request));

  return {
    request: {
      ...request,
      requiresApproval,
    },
    allowed,
    requiresApproval,
    reason: forbidden
      ? 'Agent action is forbidden and must not execute.'
      : requiresApproval
        ? 'Agent action requires approval before any future execution.'
        : 'Agent action is allowed as a metadata decision only; no action was executed.',
    approvalPolicyOutput,
    limitations: [
      ...request.limitations,
      'Agent action policy only evaluates metadata and never executes the action.',
      'Future MCP requests must pass approval, audit, and adapter boundaries before execution.',
    ],
  };
}

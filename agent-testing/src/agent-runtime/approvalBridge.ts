import type {
  AgentRuntimeRole,
} from './agentRuntimeTypes';
import type {
  McpPermissionLevel,
  McpSideEffectLevel,
} from '../types';
import {
  evaluateApprovalPolicy,
  type ApprovalActionType,
  type ApprovalRiskLevel,
  type ApprovalStatus,
} from '../approval';

export interface AgentRuntimeApprovalBridgeRequest {
  id?: string;
  sessionId: string;
  traceId: string;
  requestedByAgent: AgentRuntimeRole;
  actionType: ApprovalActionType;
  target: string;
  purpose: string;
  permissionLevel: string;
  sideEffectLevel: string;
  riskLevel?: ApprovalRiskLevel;
  inputSummary: string;
  expectedOutput: string;
  evidenceToProduce?: string;
  isProduction?: boolean;
  isDestructive?: boolean;
  touchesSensitiveData?: boolean;
  modifiesDeployment?: boolean;
  modifiesDatabase?: boolean;
  executesCommand?: boolean;
  callsExternalService?: boolean;
  writesToFilesystem?: boolean;
  requiresNetwork?: boolean;
  environment?: string;
  notes?: string;
}

export interface AgentRuntimeApprovalBridgeResult {
  id: string;
  sessionId: string;
  traceId: string;
  requestedByAgent: AgentRuntimeRole;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  requiresHumanApproval: boolean;
  forbidden: boolean;
  reason: string;
  requiredApproverRole?: string;
  requiredEvidenceBeforeApproval: string[];
  policyViolations: string[];
  limitations: string[];
}

function mapActionType(actionType: string): ApprovalActionType {
  const validTypes: ApprovalActionType[] = [
    'skill_execution',
    'mcp_tool_call',
    'terminal_command',
    'http_api_call',
    'browser_automation',
    'database_operation',
    'filesystem_write',
    'git_operation',
    'log_access',
    'report_generation',
    'release_decision',
    'environment_change',
    'deployment_change',
    'data_deletion',
    'unknown',
  ];

  return validTypes.includes(actionType as ApprovalActionType)
    ? (actionType as ApprovalActionType)
    : 'unknown';
}

export function evaluateAgentRuntimeApproval(
  request: AgentRuntimeApprovalBridgeRequest
): AgentRuntimeApprovalBridgeResult {
  const policyOutput = evaluateApprovalPolicy({
    id: request.id ?? `approval-${request.sessionId}-${request.traceId}`,
    runId: request.sessionId,
    requestedByAgent: request.requestedByAgent,
    actionType: mapActionType(request.actionType),
    target: request.target,
    purpose: request.purpose,
    permissionLevel: request.permissionLevel as McpPermissionLevel,
    sideEffectLevel: request.sideEffectLevel as McpSideEffectLevel,
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
    evidenceToProduce: request.evidenceToProduce ? [request.evidenceToProduce] : undefined,
    notes: request.notes ? [request.notes] : undefined,
  });

  return {
    id: policyOutput.request.id,
    sessionId: request.sessionId,
    traceId: request.traceId,
    requestedByAgent: request.requestedByAgent,
    status: policyOutput.status,
    riskLevel: policyOutput.riskAssessment.riskLevel,
    requiresHumanApproval: policyOutput.requiresHumanApproval,
    forbidden: policyOutput.riskAssessment.isForbidden,
    reason: policyOutput.reason,
    requiredApproverRole: policyOutput.requiredApproverRole,
    requiredEvidenceBeforeApproval: policyOutput.requiredEvidenceBeforeApproval ?? [],
    policyViolations: policyOutput.policyViolations ?? [],
    limitations: policyOutput.limitations,
  };
}

export interface ApprovalBridgeSummary {
  id: string;
  sessionId: string;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  requiresHumanApproval: boolean;
  forbidden: boolean;
  reason: string;
  policyViolationCount: number;
  limitationCount: number;
}

export function summarizeApprovalBridgeResult(
  result: AgentRuntimeApprovalBridgeResult
): ApprovalBridgeSummary {
  return {
    id: result.id,
    sessionId: result.sessionId,
    status: result.status,
    riskLevel: result.riskLevel,
    requiresHumanApproval: result.requiresHumanApproval,
    forbidden: result.forbidden,
    reason: result.reason,
    policyViolationCount: result.policyViolations.length,
    limitationCount: result.limitations.length,
  };
}

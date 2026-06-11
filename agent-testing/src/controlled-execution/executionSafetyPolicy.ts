import type {
  ApprovalActionType,
} from '../approval';
import {
  evaluateApprovalPolicy,
} from '../approval';
import type {
  MarkdownString,
} from '../types';
import type {
  ControlledExecutionRequest,
  ControlledExecutionRisk,
  ControlledExecutionSafetyEvaluation,
  ControlledExecutionStatus,
} from './controlledExecutionTypes';

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function actionTypeForControlledExecution(request: ControlledExecutionRequest): ApprovalActionType {
  if (request.kind === 'command') {
    return 'terminal_command';
  }

  if (request.kind === 'http_api') {
    return 'http_api_call';
  }

  if (request.kind === 'browser') {
    return 'browser_automation';
  }

  return 'unknown';
}

function riskFromApproval(risk: string): ControlledExecutionRisk {
  if (risk === 'LOW') {
    return 'low';
  }

  if (risk === 'MEDIUM') {
    return 'medium';
  }

  if (risk === 'HIGH') {
    return 'high';
  }

  return 'forbidden';
}

function statusForSafety(
  request: ControlledExecutionRequest,
  risk: ControlledExecutionRisk,
  approvalStatus: string
): ControlledExecutionStatus {
  if (request.mode === 'future_live_disabled') {
    return 'blocked';
  }

  if (risk === 'forbidden' || approvalStatus === 'forbidden') {
    return 'forbidden';
  }

  if (risk === 'high' || approvalStatus === 'pending') {
    return 'approval_pending';
  }

  return 'approval_not_required';
}

function boundaryViolations(request: ControlledExecutionRequest): MarkdownString[] {
  const violations: MarkdownString[] = [];
  const target = `${request.target} ${request.inputSummary}`.toLowerCase();

  if (request.mode === 'future_live_disabled') {
    violations.push('Future live execution is disabled in Phase 18.');
  }

  if (request.isProduction && request.isDestructive) {
    violations.push('Production destructive controlled execution is forbidden.');
  }

  if (request.executesCommand) {
    violations.push('Command execution is never performed in Phase 18 and remains approval-gated.');
  }

  if (request.executesCommand && [
    'rm -rf',
    'del /s',
    'format',
    'drop database',
    'truncate',
    'delete from',
    'shutdown',
    'reboot',
    'curl | sh',
    'wget | sh',
  ].some((pattern) => target.includes(pattern))) {
    violations.push('Dangerous command pattern is forbidden.');
  }

  if (request.callsExternalService && request.sideEffectLevel === 'EXTERNAL_CALL' && request.permissionLevel !== 'READ_ONLY') {
    violations.push('External API or browser write-style execution is high risk and must remain gated.');
  }

  if (request.modifiesDatabase) {
    violations.push(request.isProduction
      ? 'Production database mutation is forbidden.'
      : 'Database mutation is high risk and cannot be simulated as real execution.');
  }

  if (request.modifiesDeployment) {
    violations.push(request.isProduction
      ? 'Production deployment mutation is forbidden.'
      : 'Deployment mutation is high risk and cannot be simulated as real execution.');
  }

  if (request.kind === 'browser' && /submit|upload|type|click/.test(target)) {
    violations.push('Interactive browser actions are high risk and cannot be executed in Phase 18.');
  }

  return uniqueList(violations);
}

export function evaluateControlledExecutionSafety(
  request: ControlledExecutionRequest
): ControlledExecutionSafetyEvaluation {
  const approvalPolicyOutput = evaluateApprovalPolicy({
    id: request.approvalRequestId ?? request.id,
    runId: request.runId,
    requestedByAgent: request.requestedByAgent,
    actionType: actionTypeForControlledExecution(request),
    target: request.target,
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
  const approvalRisk = riskFromApproval(approvalPolicyOutput.riskAssessment.riskLevel);
  const boundaryIssues = boundaryViolations(request);
  const forcedForbidden = request.isProduction && (
    request.isDestructive ||
    request.modifiesDatabase ||
    request.modifiesDeployment
  );
  const risk: ControlledExecutionRisk = forcedForbidden
    ? 'forbidden'
    : approvalRisk;
  const status = statusForSafety(request, risk, approvalPolicyOutput.status);
  const forbidden = status === 'forbidden';
  const requiresHumanApproval = status === 'approval_pending' || approvalPolicyOutput.requiresHumanApproval;
  const allowedForDryRun = status !== 'blocked';
  const allowedForSimulation = request.mode === 'simulated' &&
    (risk === 'low' || risk === 'medium') &&
    status === 'approval_not_required';

  return {
    request: {
      ...request,
      approvalRequestId: approvalPolicyOutput.request.id,
      status,
    },
    approvalPolicyOutput,
    risk,
    status,
    allowedForDryRun,
    allowedForSimulation,
    allowedForFutureLiveExecution: false,
    requiresHumanApproval,
    forbidden,
    reason: request.mode === 'future_live_disabled'
      ? 'Future live execution is disabled in this phase; only contracts, plans, and simulations are allowed.'
      : forbidden
        ? 'Controlled execution request is forbidden by deterministic safety policy.'
        : requiresHumanApproval
          ? 'Controlled execution request requires approval before any future live execution and cannot be simulated as completed.'
          : allowedForSimulation
            ? 'Controlled execution request may produce a deterministic simulated result only.'
            : 'Controlled execution request may produce a dry-run plan only.',
    policyViolations: uniqueList([
      ...approvalPolicyOutput.policyViolations,
      ...boundaryIssues.filter((issue) =>
        issue.toLowerCase().includes('forbidden') ||
        status === 'forbidden'
      ),
    ]),
    limitations: uniqueList([
      ...request.limitations,
      ...approvalPolicyOutput.limitations,
      ...boundaryIssues,
      'Safety evaluation is deterministic and metadata-only.',
      'No command, HTTP request, browser action, MCP tool, database operation, filesystem access, or LLM call was performed.',
      'allowedForFutureLiveExecution is always false in Phase 18.',
    ]),
  };
}

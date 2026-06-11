import type {
  AgentRole,
  EvidenceId,
  MarkdownString,
  McpPermissionLevel,
  McpSideEffectLevel,
  SystemTestEvidence,
} from '../types';
import type {
  ApprovalPolicyOutput,
} from '../approval';
import type {
  AuditEventInput,
} from '../audit';
import type {
  RawEvidenceInput,
} from '../evidence';

export type ControlledExecutionKind =
  | 'command'
  | 'http_api'
  | 'browser'
  | 'unknown';

export type ControlledExecutionMode =
  | 'dry_run'
  | 'simulated'
  | 'future_live_disabled';

export type ControlledExecutionStatus =
  | 'draft'
  | 'approval_not_required'
  | 'approval_pending'
  | 'forbidden'
  | 'dry_run_ready'
  | 'simulated_completed'
  | 'blocked'
  | 'not_executed';

export type ControlledExecutionRisk =
  | 'low'
  | 'medium'
  | 'high'
  | 'forbidden';

export type ControlledExecutionFailureKind =
  | 'none'
  | 'policy_forbidden'
  | 'approval_required'
  | 'simulation_blocked'
  | 'simulation_failure'
  | 'unknown';

export interface ControlledExecutionRequest {
  id: MarkdownString;
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  kind: ControlledExecutionKind;
  mode: ControlledExecutionMode;
  purpose: MarkdownString;
  target: MarkdownString;
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
  status: ControlledExecutionStatus;
  limitations: MarkdownString[];
}

export interface ControlledExecutionSafetyEvaluation {
  request: ControlledExecutionRequest;
  approvalPolicyOutput: ApprovalPolicyOutput;
  risk: ControlledExecutionRisk;
  status: ControlledExecutionStatus;
  allowedForDryRun: boolean;
  allowedForSimulation: boolean;
  allowedForFutureLiveExecution: boolean;
  requiresHumanApproval: boolean;
  forbidden: boolean;
  reason: MarkdownString;
  policyViolations: MarkdownString[];
  limitations: MarkdownString[];
}

export interface ControlledExecutionPlan {
  id: MarkdownString;
  requestId: MarkdownString;
  runId: MarkdownString;
  kind: ControlledExecutionKind;
  mode: ControlledExecutionMode;
  steps: MarkdownString[];
  approvalRequired: boolean;
  forbidden: boolean;
  riskLevel: ControlledExecutionRisk;
  requiredEvidence: MarkdownString[];
  auditEventDrafts: AuditEventInput[];
  limitations: MarkdownString[];
}

export interface ControlledExecutionResult {
  id: MarkdownString;
  requestId: MarkdownString;
  runId: MarkdownString;
  kind: ControlledExecutionKind;
  status: ControlledExecutionStatus;
  simulated: boolean;
  outputSummary: MarkdownString;
  failureKind: ControlledExecutionFailureKind;
  producedEvidenceIds: EvidenceId[];
  rawEvidenceDraft?: RawEvidenceInput;
  requestAuditDraft?: AuditEventInput;
  resultAuditDraft?: AuditEventInput;
  normalizedEvidencePreview?: SystemTestEvidence;
  limitations: MarkdownString[];
}

export interface CreateControlledExecutionRequestInput extends Partial<ControlledExecutionRequest> {
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  kind: ControlledExecutionKind;
  mode: ControlledExecutionMode;
  purpose: MarkdownString;
  target: MarkdownString;
  inputSummary: MarkdownString;
  expectedOutput: MarkdownString;
}

export function sanitizeControlledExecutionIdPart(value: MarkdownString): MarkdownString {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'unknown';
}

export function createControlledExecutionRequest(
  input: CreateControlledExecutionRequestInput
): ControlledExecutionRequest {
  const id = input.id ??
    `controlled-${sanitizeControlledExecutionIdPart(input.runId)}-${sanitizeControlledExecutionIdPart(input.kind)}-${sanitizeControlledExecutionIdPart(input.target)}`;

  return {
    id,
    runId: input.runId,
    requestedByAgent: input.requestedByAgent,
    kind: input.kind,
    mode: input.mode,
    purpose: input.purpose,
    target: input.target,
    inputSummary: input.inputSummary,
    expectedOutput: input.expectedOutput,
    permissionLevel: input.permissionLevel ?? 'READ_ONLY',
    sideEffectLevel: input.sideEffectLevel ?? 'NONE',
    environment: input.environment ?? 'unknown',
    isProduction: input.isProduction ?? false,
    isDestructive: input.isDestructive ?? false,
    touchesSensitiveData: input.touchesSensitiveData ?? false,
    modifiesDeployment: input.modifiesDeployment ?? false,
    modifiesDatabase: input.modifiesDatabase ?? false,
    executesCommand: input.executesCommand ?? input.kind === 'command',
    callsExternalService: input.callsExternalService ?? (input.kind === 'http_api' || input.kind === 'browser'),
    writesToFilesystem: input.writesToFilesystem ?? false,
    requiresNetwork: input.requiresNetwork ?? (input.kind === 'http_api' || input.kind === 'browser'),
    evidenceToProduce: input.evidenceToProduce ?? [`${input.kind} controlled execution draft`],
    approvalRequestId: input.approvalRequestId,
    status: input.status ?? 'draft',
    limitations: [
      ...(input.limitations ?? []),
      'Controlled execution request is a contract only and does not execute the target action.',
    ],
  };
}

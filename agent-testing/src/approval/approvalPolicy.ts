import type {
  AgentRole,
  IsoDateTimeString,
  MarkdownString,
  McpPermissionLevel,
  McpSideEffectLevel,
} from '../types';

export type ApprovalActionType =
  | 'skill_execution'
  | 'mcp_tool_call'
  | 'terminal_command'
  | 'http_api_call'
  | 'browser_automation'
  | 'database_operation'
  | 'filesystem_write'
  | 'git_operation'
  | 'log_access'
  | 'report_generation'
  | 'release_decision'
  | 'environment_change'
  | 'deployment_change'
  | 'data_deletion'
  | 'unknown';

export type ApprovalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FORBIDDEN';

export type ApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'forbidden';

export type ApprovalDecisionValue =
  | 'approve'
  | 'reject'
  | 'request_more_evidence'
  | 'forbid';

export type RequiredApproverRole =
  | 'test_lead'
  | 'ops_owner'
  | 'project_owner'
  | 'security_owner'
  | 'data_owner';

export interface ApprovalRequest {
  id: MarkdownString;
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  actionType: ApprovalActionType;
  target: MarkdownString;
  purpose: MarkdownString;
  riskLevel: ApprovalRiskLevel;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  inputSummary: MarkdownString;
  expectedOutput: MarkdownString;
  evidenceToProduce: MarkdownString[];
  requiresApproval: boolean;
  status: ApprovalStatus;
  createdAt: IsoDateTimeString;
  limitations: MarkdownString[];
}

export interface ApprovalDecision {
  id: MarkdownString;
  approvalRequestId: MarkdownString;
  decision: ApprovalDecisionValue;
  decidedBy: MarkdownString;
  reason: MarkdownString;
  conditions: MarkdownString[];
  decidedAt: IsoDateTimeString;
  limitations: MarkdownString[];
}

export interface ApprovalPolicyInput {
  id?: MarkdownString;
  runId: MarkdownString;
  requestedByAgent: AgentRole;
  actionType: ApprovalActionType;
  target: MarkdownString;
  purpose: MarkdownString;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  environment?: MarkdownString;
  isProduction?: boolean;
  isDestructive?: boolean;
  touchesSensitiveData?: boolean;
  modifiesDeployment?: boolean;
  modifiesDatabase?: boolean;
  executesCommand?: boolean;
  callsExternalService?: boolean;
  writesToFilesystem?: boolean;
  requiresNetwork?: boolean;
  inputSummary?: MarkdownString;
  expectedOutput?: MarkdownString;
  evidenceToProduce?: MarkdownString[];
  notes?: MarkdownString[];
}

export interface ApprovalRiskAssessment {
  riskLevel: ApprovalRiskLevel;
  riskReasons: MarkdownString[];
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  isForbidden: boolean;
  requiresHumanApproval: boolean;
  recommendedStatus: ApprovalStatus;
  limitations: MarkdownString[];
}

export interface ApprovalPolicyOutput {
  request: ApprovalRequest;
  riskAssessment: ApprovalRiskAssessment;
  requiresHumanApproval: boolean;
  status: ApprovalStatus;
  reason: MarkdownString;
  requiredApproverRole?: RequiredApproverRole;
  requiredEvidenceBeforeApproval: MarkdownString[];
  policyViolations: MarkdownString[];
  limitations: MarkdownString[];
}

const PURE_ACTION_TYPES: ApprovalActionType[] = [
  'skill_execution',
  'report_generation',
  'release_decision',
];

const HIGH_RISK_ACTION_TYPES: ApprovalActionType[] = [
  'terminal_command',
  'http_api_call',
  'browser_automation',
  'database_operation',
  'filesystem_write',
  'git_operation',
  'environment_change',
  'deployment_change',
  'data_deletion',
];

const DANGEROUS_COMMAND_PATTERNS = [
  'rm -rf',
  'del /s',
  'format',
  'drop database',
  'truncate',
];

const FORBIDDEN_SECRET_PATTERNS = [
  'raw secret',
  'plain secret',
  'api key',
  'private key',
  'access token',
  'credential',
  'password',
  '密钥',
  '凭证',
  '密码',
];

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function textIncludesAny(text: MarkdownString, patterns: MarkdownString[]): boolean {
  const normalized = text.toLowerCase();

  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function textCorpus(input: ApprovalPolicyInput): MarkdownString {
  return [
    input.actionType,
    input.target,
    input.purpose,
    input.environment,
    input.inputSummary,
    input.expectedOutput,
    ...(input.evidenceToProduce ?? []),
    ...(input.notes ?? []),
  ].filter(Boolean).join(' ');
}

function isInsideAgentTesting(input: ApprovalPolicyInput): boolean {
  const target = input.target.replace(/\\/g, '/').toLowerCase();

  return target.includes('agent-testing/');
}

function hasDeleteOrDestructivePurpose(input: ApprovalPolicyInput): boolean {
  const corpus = textCorpus(input);

  return input.isDestructive === true ||
    input.actionType === 'data_deletion' ||
    textIncludesAny(corpus, [
      'delete file',
      'delete directory',
      'remove file',
      'remove directory',
      'destroy',
      'wipe',
      'purge',
      '删除',
      '清空',
      '销毁',
    ]);
}

function hasDangerousCommand(input: ApprovalPolicyInput): boolean {
  const corpus = textCorpus(input);
  const hasDeleteFrom = corpus.toLowerCase().includes('delete from');
  const appearsTestScoped = textIncludesAny(corpus, [
    'test',
    'sandbox',
    'fixture',
    'staging',
    '测试',
  ]);

  return textIncludesAny(corpus, DANGEROUS_COMMAND_PATTERNS) ||
    (hasDeleteFrom && !appearsTestScoped);
}

function hasSensitiveSecretAccess(input: ApprovalPolicyInput): boolean {
  return textIncludesAny(textCorpus(input), FORBIDDEN_SECRET_PATTERNS);
}

export function isForbiddenAction(input: ApprovalPolicyInput): boolean {
  if (input.permissionLevel === 'PRODUCTION_FORBIDDEN' && input.isProduction) {
    return true;
  }

  if (input.sideEffectLevel === 'DESTRUCTIVE') {
    return true;
  }

  if (input.isProduction && (input.actionType === 'data_deletion' || input.modifiesDatabase)) {
    return true;
  }

  if (input.isProduction && input.modifiesDeployment) {
    return true;
  }

  if (input.isProduction && hasDeleteOrDestructivePurpose(input)) {
    return true;
  }

  if (input.isProduction && input.permissionLevel === 'WRITE_DANGEROUS') {
    return true;
  }

  if (hasDangerousCommand(input)) {
    return true;
  }

  if (hasDeleteOrDestructivePurpose(input) && !textIncludesAny(textCorpus(input), ['test sandbox', 'fixture cleanup'])) {
    return true;
  }

  if (input.touchesSensitiveData && hasSensitiveSecretAccess(input)) {
    return true;
  }

  return false;
}

function forbiddenViolations(input: ApprovalPolicyInput): MarkdownString[] {
  const violations: MarkdownString[] = [];

  if (input.permissionLevel === 'PRODUCTION_FORBIDDEN' && input.isProduction) {
    violations.push('Action uses PRODUCTION_FORBIDDEN permission against a production target.');
  }

  if (input.sideEffectLevel === 'DESTRUCTIVE') {
    violations.push('DESTRUCTIVE side effects are forbidden in this phase.');
  }

  if (input.isProduction && input.actionType === 'data_deletion') {
    violations.push('Production data deletion is forbidden.');
  }

  if (input.isProduction && input.modifiesDatabase) {
    violations.push('Production database write or mutation is forbidden.');
  }

  if (input.isProduction && input.modifiesDeployment) {
    violations.push('Production deployment mutation is forbidden.');
  }

  if (input.isProduction && input.permissionLevel === 'WRITE_DANGEROUS') {
    violations.push('WRITE_DANGEROUS permission is forbidden against production.');
  }

  if (hasDangerousCommand(input)) {
    violations.push('Dangerous command or unsafe SQL mutation pattern is forbidden.');
  }

  if (hasDeleteOrDestructivePurpose(input) && input.sideEffectLevel !== 'DESTRUCTIVE') {
    violations.push('Deletion or destructive action is forbidden unless a later phase defines a safe sandbox policy.');
  }

  if (input.touchesSensitiveData && hasSensitiveSecretAccess(input)) {
    violations.push('Reading or exposing raw secrets, credentials, tokens, or passwords is forbidden.');
  }

  return uniqueList(violations);
}

export function requiresHumanApproval(assessment: ApprovalRiskAssessment): boolean {
  return assessment.requiresHumanApproval;
}

function requiredApproverRole(input: ApprovalPolicyInput, riskLevel: ApprovalRiskLevel): RequiredApproverRole | undefined {
  if (riskLevel !== 'HIGH') {
    return undefined;
  }

  if (input.modifiesDeployment || input.actionType === 'deployment_change' || input.actionType === 'environment_change') {
    return 'ops_owner';
  }

  if (input.modifiesDatabase || input.actionType === 'database_operation' || input.actionType === 'data_deletion') {
    return 'data_owner';
  }

  if (input.touchesSensitiveData) {
    return 'security_owner';
  }

  if (input.actionType === 'release_decision') {
    return 'project_owner';
  }

  return 'test_lead';
}

function highRiskEvidenceRequirements(input: ApprovalPolicyInput): MarkdownString[] {
  if (isForbiddenAction(input)) {
    return [];
  }

  const requirements = [
    'target environment confirmation',
    'expected side effect summary',
    'approver identity',
    'audit trace id',
  ];

  if (input.executesCommand || input.actionType === 'terminal_command') {
    requirements.push('command preview');
  }

  if (
    input.modifiesDatabase ||
    input.modifiesDeployment ||
    input.writesToFilesystem ||
    input.sideEffectLevel === 'TEST_ENV_WRITE'
  ) {
    requirements.push('rollback plan');
    requirements.push('test data confirmation');
  }

  if (input.callsExternalService || input.requiresNetwork || input.sideEffectLevel === 'EXTERNAL_CALL') {
    requirements.push('external endpoint and network scope confirmation');
  }

  if (input.touchesSensitiveData) {
    requirements.push('sensitive data handling and redaction plan');
  }

  return uniqueList(requirements);
}

function isLowRiskPureAction(input: ApprovalPolicyInput): boolean {
  return PURE_ACTION_TYPES.includes(input.actionType) &&
    input.permissionLevel === 'READ_ONLY' &&
    input.sideEffectLevel === 'NONE' &&
    !input.isProduction &&
    !input.isDestructive &&
    !input.touchesSensitiveData &&
    !input.modifiesDeployment &&
    !input.modifiesDatabase &&
    !input.executesCommand &&
    !input.callsExternalService &&
    !input.writesToFilesystem &&
    !input.requiresNetwork;
}

export function assessActionRisk(input: ApprovalPolicyInput): ApprovalRiskAssessment {
  const riskReasons: MarkdownString[] = [];
  const limitations: MarkdownString[] = [
    'Approval risk assessment is deterministic and only uses provided action metadata.',
    'No action was executed and no real approval was requested.',
  ];

  if (isForbiddenAction(input)) {
    riskReasons.push(...forbiddenViolations(input));

    return {
      riskLevel: 'FORBIDDEN',
      riskReasons: uniqueList(riskReasons),
      permissionLevel: input.permissionLevel,
      sideEffectLevel: input.sideEffectLevel,
      isForbidden: true,
      requiresHumanApproval: false,
      recommendedStatus: 'forbidden',
      limitations,
    };
  }

  if (isLowRiskPureAction(input)) {
    riskReasons.push('Internal deterministic action with read-only permission and no side effects.');

    return {
      riskLevel: 'LOW',
      riskReasons,
      permissionLevel: input.permissionLevel,
      sideEffectLevel: input.sideEffectLevel,
      isForbidden: false,
      requiresHumanApproval: false,
      recommendedStatus: 'not_required',
      limitations,
    };
  }

  if (input.permissionLevel === 'WRITE_DANGEROUS') {
    riskReasons.push('WRITE_DANGEROUS permission can modify data, service, deployment, or environment state.');
  }

  if (input.sideEffectLevel === 'TEST_ENV_WRITE') {
    riskReasons.push('Action writes to a declared test environment.');
  }

  if (input.executesCommand || input.actionType === 'terminal_command' || input.permissionLevel === 'EXECUTE_LIMITED') {
    riskReasons.push('Action may execute a command or controlled external procedure.');
  }

  if (input.modifiesDatabase || input.actionType === 'database_operation') {
    riskReasons.push('Action may write or mutate database state.');
  }

  if (input.modifiesDeployment || input.actionType === 'deployment_change' || input.actionType === 'environment_change') {
    riskReasons.push('Action may modify deployment, configuration, or environment state.');
  }

  if (input.writesToFilesystem || input.actionType === 'filesystem_write') {
    riskReasons.push(isInsideAgentTesting(input)
      ? 'Action writes local artifacts inside agent-testing.'
      : 'Action writes to filesystem outside agent-testing.');
  }

  if (input.callsExternalService || input.requiresNetwork || input.sideEffectLevel === 'EXTERNAL_CALL') {
    riskReasons.push('Action calls an external service, network endpoint, or browser target.');
  }

  if (input.touchesSensitiveData) {
    riskReasons.push('Action touches sensitive data and may require redaction or restricted handling.');
  }

  const isHigh = HIGH_RISK_ACTION_TYPES.includes(input.actionType) ||
    input.permissionLevel === 'WRITE_DANGEROUS' ||
    input.sideEffectLevel === 'TEST_ENV_WRITE' ||
    input.modifiesDatabase ||
    input.modifiesDeployment ||
    input.executesCommand ||
    (input.writesToFilesystem && !isInsideAgentTesting(input)) ||
    (input.callsExternalService && input.sideEffectLevel !== 'NONE') ||
    (input.touchesSensitiveData && !textIncludesAny(textCorpus(input), ['redacted', 'summary', '摘要', '脱敏']));

  if (isHigh) {
    return {
      riskLevel: 'HIGH',
      riskReasons: uniqueList(riskReasons.length > 0 ? riskReasons : ['High-risk action requires human approval by policy.']),
      permissionLevel: input.permissionLevel,
      sideEffectLevel: input.sideEffectLevel,
      isForbidden: false,
      requiresHumanApproval: true,
      recommendedStatus: 'pending',
      limitations,
    };
  }

  if (input.permissionLevel === 'READ_ONLY') {
    riskReasons.push('Read-only action may inspect local files, diffs, logs, or test environment resources.');
  }

  if (input.permissionLevel === 'WRITE_LIMITED' || input.sideEffectLevel === 'LOCAL_WRITE') {
    riskReasons.push('Limited local write is allowed only for approved artifacts and remains configurable.');
  }

  if (input.actionType === 'log_access') {
    riskReasons.push('Log access can expose sensitive summaries and may be configurable for approval.');
  }

  return {
    riskLevel: 'MEDIUM',
    riskReasons: uniqueList(riskReasons.length > 0 ? riskReasons : ['Action is not pure LOW risk and does not meet HIGH or FORBIDDEN rules.']),
    permissionLevel: input.permissionLevel,
    sideEffectLevel: input.sideEffectLevel,
    isForbidden: false,
    requiresHumanApproval: false,
    recommendedStatus: 'not_required',
    limitations: [
      ...limitations,
      'MEDIUM actions are not approval-required by default in this phase, but policy can be configured later.',
    ],
  };
}

export function buildApprovalRequest(
  input: ApprovalPolicyInput,
  assessment: ApprovalRiskAssessment
): ApprovalRequest {
  const id = input.id ?? `approval-${input.runId}-${input.actionType}-${assessment.riskLevel}`;

  return {
    id,
    runId: input.runId,
    requestedByAgent: input.requestedByAgent,
    actionType: input.actionType,
    target: input.target,
    purpose: input.purpose,
    riskLevel: assessment.riskLevel,
    permissionLevel: input.permissionLevel,
    sideEffectLevel: input.sideEffectLevel,
    inputSummary: input.inputSummary ?? 'No input summary provided.',
    expectedOutput: input.expectedOutput ?? 'No expected output provided.',
    evidenceToProduce: input.evidenceToProduce ?? [],
    requiresApproval: assessment.requiresHumanApproval,
    status: assessment.recommendedStatus,
    createdAt: '',
    limitations: [
      ...assessment.limitations,
      'ApprovalRequest is a contract object only; it was not persisted and no notification was sent.',
    ],
  };
}

export function evaluateApprovalPolicy(
  input: ApprovalPolicyInput
): ApprovalPolicyOutput {
  const riskAssessment = assessActionRisk(input);
  const request = buildApprovalRequest(input, riskAssessment);
  const policyViolations = riskAssessment.isForbidden ? forbiddenViolations(input) : [];
  const requiredEvidenceBeforeApproval = riskAssessment.riskLevel === 'HIGH'
    ? highRiskEvidenceRequirements(input)
    : [];
  const reason = riskAssessment.isForbidden
    ? 'Action is forbidden by deterministic approval policy.'
    : riskAssessment.requiresHumanApproval
      ? 'Action requires Human-in-the-Loop approval before execution.'
      : riskAssessment.riskLevel === 'LOW'
        ? 'Action is low risk and does not require approval.'
        : 'Action is medium risk; approval is configurable in a later policy phase and is not required by default here.';

  return {
    request,
    riskAssessment,
    requiresHumanApproval: requiresHumanApproval(riskAssessment),
    status: riskAssessment.recommendedStatus,
    reason,
    requiredApproverRole: requiredApproverRole(input, riskAssessment.riskLevel),
    requiredEvidenceBeforeApproval,
    policyViolations,
    limitations: [
      ...riskAssessment.limitations,
      'Policy evaluation did not execute the action, call MCP, call LLM, access network, or request real human approval.',
      ...(policyViolations.length > 0
        ? ['Forbidden actions are rejected directly; no additional evidence request is generated.']
        : []),
    ],
  };
}

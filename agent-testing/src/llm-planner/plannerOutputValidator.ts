import type {
  AgentProfile,
  AgentRuntimeSkillName,
} from '../agent-runtime/agentProfileTypes';
import type {
  AgentTaskType,
  SharedBlackboardKey,
} from '../agent-runtime/agentRuntimeTypes';
import type {
  LlmPlannerActionType,
  LlmPlannerInput,
  LlmPlannerOutput,
  LlmPlannerRiskLevel,
  LlmPlannerValidationIssue,
  LlmPlannerValidationResult,
} from './llmPlannerTypes';

const LEGAL_ACTION_TYPES: readonly LlmPlannerActionType[] = [
  'create_task',
  'invoke_skill',
  'request_mcp',
  'request_controlled_execution',
  'ask_for_evidence',
  'write_blackboard_note',
  'summarize_session',
  'no_op',
];

const LEGAL_RISK_LEVELS: readonly LlmPlannerRiskLevel[] = [
  'low',
  'medium',
  'high',
  'forbidden',
];

const LEGAL_BLACKBOARD_KEYS: readonly SharedBlackboardKey[] = [
  'sessionId',
  'requirements',
  'context',
  'acceptancePoints',
  'testCases',
  'rawEvidence',
  'normalizedEvidence',
  'severityClassifications',
  'defects',
  'defectAnalyses',
  'regressionSuggestions',
  'opsChecklist',
  'releaseRecommendation',
  'report',
  'approvalRequests',
  'auditEvents',
  'observabilityMetrics',
  'mcpRequests',
  'mcpResults',
  'controlledExecutionRequests',
  'controlledExecutionResults',
  'unknowns',
  'limitations',
];

const SECRET_PATTERNS = [
  /api[_ -]?key/i,
  /access[_ -]?token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /bearer\s+[A-Za-z0-9._~+/=-]+/i,
  /private[_ -]?key/i,
  /凭证/,
  /密钥/,
  /密码/,
  /令牌/,
];

const PASS_CLAIM_PATTERNS = [
  /\bpassed\b/i,
  /\bpass evidence\b/i,
  /\bmark(?:ed)?\s+pass\b/i,
  /\bset\s+.*\bpass\b/i,
  /测试通过/,
  /标记为通过/,
];

function issue(field: string, message: string): LlmPlannerValidationIssue {
  return { field, message };
}

function hasSensitiveText(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function hasPassClaim(text: string): boolean {
  return PASS_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function taskTypeAllowed(
  profile: AgentProfile,
  taskType: AgentTaskType | undefined
): boolean {
  return taskType !== undefined && profile.allowedTaskTypes.includes(taskType);
}

function skillAllowed(
  profile: AgentProfile,
  skillName: AgentRuntimeSkillName | undefined
): boolean {
  return skillName !== undefined && profile.allowedSkills.includes(skillName);
}

export function validateLlmPlannerOutput(
  input: LlmPlannerInput,
  output: LlmPlannerOutput,
  profile: AgentProfile
): LlmPlannerValidationResult {
  const issues: LlmPlannerValidationIssue[] = [];
  const warnings: string[] = [];
  const limitations: string[] = [
    'M4 planner validation is deterministic and validates metadata only.',
    'Validation does not execute planner proposals, call LLM, call MCP, invoke skills, or inspect external systems.',
  ];

  if (output.sessionId !== input.sessionId) {
    issues.push(issue('sessionId', 'Planner output sessionId must match planner input sessionId.'));
  }

  if (output.traceId !== input.traceId) {
    issues.push(issue('traceId', 'Planner output traceId must match planner input traceId.'));
  }

  if (output.agentRole !== input.agentRole || output.agentRole !== profile.role) {
    issues.push(issue('agentRole', 'Planner output agentRole must match both planner input and profile role.'));
  }

  if (output.mode !== 'fake_deterministic') {
    issues.push(issue('mode', 'M4 only accepts fake_deterministic planner output.'));
  }

  if (output.confidence < 0 || output.confidence > 1 || Number.isNaN(output.confidence)) {
    issues.push(issue('confidence', 'Planner output confidence must be between 0 and 1.'));
  }

  if (!LEGAL_ACTION_TYPES.includes(output.actionType)) {
    issues.push(issue('actionType', `Unsupported planner action type: ${String(output.actionType)}.`));
  }

  if (!LEGAL_RISK_LEVELS.includes(output.riskLevel)) {
    issues.push(issue('riskLevel', `Unsupported planner risk level: ${String(output.riskLevel)}.`));
  }

  if (output.actionType === 'create_task' && !output.targetTaskType) {
    issues.push(issue('targetTaskType', 'create_task action requires targetTaskType.'));
  }

  if (output.targetTaskType && !taskTypeAllowed(profile, output.targetTaskType)) {
    issues.push(issue('targetTaskType', `Agent ${profile.role} is not allowed to create or target task ${output.targetTaskType}.`));
  }

  if (output.actionType === 'invoke_skill' && !output.targetSkillName) {
    issues.push(issue('targetSkillName', 'invoke_skill action requires targetSkillName.'));
  }

  if (output.targetSkillName && !skillAllowed(profile, output.targetSkillName)) {
    issues.push(issue('targetSkillName', `Agent ${profile.role} is not allowed to invoke skill ${output.targetSkillName}.`));
  }

  if (output.actionType === 'request_mcp' && !profile.canRequestMcp) {
    issues.push(issue('actionType', `Agent ${profile.role} is not allowed to request MCP.`));
  }

  if (output.actionType === 'request_mcp' && !output.targetMcpCapability) {
    issues.push(issue('targetMcpCapability', 'request_mcp action requires targetMcpCapability.'));
  }

  if (output.targetMcpCapability && !input.availableMcpCapabilities.includes(output.targetMcpCapability)) {
    issues.push(issue('targetMcpCapability', `MCP capability ${output.targetMcpCapability} is not available in planner input.`));
  }

  if (output.actionType === 'request_controlled_execution' && !profile.canRequestControlledExecution) {
    issues.push(issue('actionType', `Agent ${profile.role} is not allowed to request controlled execution.`));
  }

  if (output.riskLevel === 'high' && !output.requiresApproval) {
    issues.push(issue('requiresApproval', 'High-risk planner output must require approval.'));
  }

  if (output.riskLevel === 'forbidden') {
    issues.push(issue('riskLevel', 'Forbidden planner output is invalid and must be rejected.'));
  }

  for (const [index, ref] of output.inputRefs.entries()) {
    if (!LEGAL_BLACKBOARD_KEYS.includes(ref.key)) {
      issues.push(issue(`inputRefs[${index}].key`, `Input ref key ${String(ref.key)} is not a legal SharedBlackboardKey.`));
    }
  }

  if (output.reason.trim().length === 0) {
    issues.push(issue('reason', 'Planner output reason must not be empty.'));
  }

  const textToValidate = [
    output.reason,
    output.expectedOutput,
    output.proposedBlackboardNote,
    output.proposedTaskGoal,
  ].filter((item): item is string => Boolean(item)).join('\n');

  if (hasSensitiveText(textToValidate)) {
    issues.push(issue('reason', 'Planner output must not include obvious secrets, tokens, passwords, bearer credentials, or private keys.'));
  }

  if (hasPassClaim(textToValidate)) {
    issues.push(issue('reason', 'Planner output must not claim or create pass evidence; planner reasoning is not evidence.'));
  }

  if (output.requiresApproval && output.riskLevel === 'low') {
    warnings.push('Low-risk planner output requested approval; mapper will conservatively keep approval_required.');
  }

  if (output.actionType === 'write_blackboard_note') {
    warnings.push('write_blackboard_note remains a draft only in M4 and must not mutate SharedBlackboard.');
  }

  if (output.actionType === 'invoke_skill') {
    warnings.push('invoke_skill is a proposal only; M4 does not call SkillRouter.');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    limitations,
  };
}

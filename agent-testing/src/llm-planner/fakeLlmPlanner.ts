import type {
  AgentProfile,
  AgentRuntimeSkillName,
} from '../agent-runtime/agentProfileTypes';
import type {
  AgentTask,
  AgentTaskType,
  SharedBlackboard,
} from '../agent-runtime/agentRuntimeTypes';
import type {
  BlackboardEvidenceSummary,
} from '../agent-runtime/evidenceCollector';
import {
  collectEvidenceFromBlackboard,
  summarizeEvidenceGaps,
} from '../agent-runtime/evidenceCollector';
import {
  summarizeSharedBlackboard,
} from '../agent-runtime/sharedBlackboard';
import type {
  LlmPlannerActionType,
  LlmPlannerInput,
  LlmPlannerMode,
  LlmPlannerOutput,
  LlmPlannerRiskLevel,
} from './llmPlannerTypes';

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';
const FAKE_PLANNER_LIMITATION =
  'M4 fake deterministic planner; no real LLM provider invoked.';

export interface FakeLlmPlannerOptions {
  preferEvidenceGapClosure?: boolean;
  preferLowRiskActions?: boolean;
  now?: string;
}

export interface CreateLlmPlannerInputRequest {
  sessionId: string;
  traceId: string;
  agentProfile: AgentProfile;
  task?: AgentTask;
  blackboard: SharedBlackboard;
  evidenceSummary?: BlackboardEvidenceSummary;
  mode?: LlmPlannerMode;
  limitations?: string[];
}

function stableId(parts: readonly string[]): string {
  return parts
    .join('-')
    .replace(/[^0-9A-Za-z_-]+/g, '-')
    .replace(/-+/g, '-');
}

function summarizeTask(task: AgentTask | undefined): string {
  if (!task) {
    return 'No active task supplied.';
  }

  return [
    `taskId=${task.id}`,
    `taskType=${task.taskType}`,
    `status=${task.status}`,
    `priority=${task.priority}`,
    `requiresApproval=${task.requiresApproval}`,
    `inputRefs=${task.inputRefs.map((ref) => ref.key).join(',') || 'none'}`,
    `expectedOutput=${task.expectedOutput.slice(0, 180) || 'not provided'}`,
  ].join('; ');
}

function summarizeAgentProfile(profile: AgentProfile): string {
  return [
    `role=${profile.role}`,
    `displayName=${profile.displayName}`,
    `allowedSkills=${profile.allowedSkills.join(',')}`,
    `allowedTaskTypes=${profile.allowedTaskTypes.join(',')}`,
    `canRequestMcp=${profile.canRequestMcp}`,
    `canRequestControlledExecution=${profile.canRequestControlledExecution}`,
  ].join('; ');
}

function summarizeBlackboard(blackboard: SharedBlackboard): string {
  const summary = summarizeSharedBlackboard(blackboard);

  return [
    `sessionId=${summary.sessionId}`,
    `acceptancePoints=${summary.acceptancePointCount}`,
    `testCases=${summary.testCaseCount}`,
    `rawEvidence=${summary.rawEvidenceCount}`,
    `normalizedEvidence=${summary.normalizedEvidenceCount}`,
    `severity=${summary.severityCount}`,
    `defects=${summary.defectCount}`,
    `regressions=${summary.regressionCount}`,
    `opsChecklist=${summary.opsChecklistCount}`,
    `unknowns=${summary.unknownCount}`,
    `limitations=${summary.limitationCount}`,
  ].join('; ');
}

function summarizeEvidence(summary: BlackboardEvidenceSummary): string {
  const gaps = summarizeEvidenceGaps(summary.gaps);

  return [
    `evidence gaps total=${gaps.total}`,
    `open=${gaps.open}`,
    `partiallyCovered=${gaps.partiallyCovered}`,
    `covered=${gaps.covered}`,
    `noEvidenceTestCases=${summary.noEvidenceTestCaseCount}`,
    `weakEvidence=${summary.weakEvidenceCount}`,
    `inconclusiveEvidence=${summary.inconclusiveEvidenceCount}`,
    `conflicts=${summary.conflictCount}`,
    `reasons=${Object.entries(gaps.byReason)
      .map(([reason, count]) => `${reason}:${count}`)
      .join(',') || 'none'}`,
  ].join('; ');
}

function inferAvailableMcpCapabilities(profile: AgentProfile): string[] {
  return profile.canRequestMcp ? ['read_only_snapshot'] : [];
}

export function createLlmPlannerInput(
  request: CreateLlmPlannerInputRequest
): LlmPlannerInput {
  const evidenceSummary = request.evidenceSummary ?? collectEvidenceFromBlackboard(request.blackboard);

  return {
    id: stableId([
      'llm-planner-input',
      request.sessionId,
      request.traceId,
      request.agentProfile.role,
      request.task?.id ?? 'no-task',
    ]),
    sessionId: request.sessionId,
    traceId: request.traceId,
    mode: request.mode ?? 'fake_deterministic',
    agentRole: request.agentProfile.role,
    taskId: request.task?.id,
    taskType: request.task?.taskType,
    agentProfileSummary: summarizeAgentProfile(request.agentProfile),
    taskSummary: summarizeTask(request.task),
    blackboardSummary: summarizeBlackboard(request.blackboard),
    availableSkills: [...request.agentProfile.allowedSkills],
    availableTaskTypes: [...request.agentProfile.allowedTaskTypes],
    availableMcpCapabilities: inferAvailableMcpCapabilities(request.agentProfile),
    evidenceGapSummary: summarizeEvidence(evidenceSummary),
    constraints: [
      ...request.agentProfile.limitations,
      ...(request.task?.limitations ?? []),
      'Planner input is summary-only and excludes raw evidence, full reports, files, logs, secrets, and requirements text.',
    ],
    limitations: [
      ...(request.limitations ?? []),
      FAKE_PLANNER_LIMITATION,
      'createLlmPlannerInput only derives in-memory summaries from supplied profile, task, blackboard, and optional evidence summary.',
    ],
  };
}

function hasOpenEvidenceGap(input: LlmPlannerInput): boolean {
  const openMatch = input.evidenceGapSummary.match(/\bopen=(\d+)/i);

  if (openMatch) {
    return Number(openMatch[1]) > 0;
  }

  return /open gap|missing evidence|no linked evidence|weak evidence|inconclusive/i.test(input.evidenceGapSummary);
}

function hasTaskType(input: LlmPlannerInput, taskType: AgentTaskType): boolean {
  return input.availableTaskTypes.includes(taskType);
}

function hasSkill(input: LlmPlannerInput, skillName: AgentRuntimeSkillName): boolean {
  return input.availableSkills.includes(skillName);
}

function createOutput(params: {
  input: LlmPlannerInput;
  actionType: LlmPlannerActionType;
  reason: string;
  expectedOutput: string;
  riskLevel: LlmPlannerRiskLevel;
  requiresApproval: boolean;
  targetTaskType?: AgentTaskType;
  targetSkillName?: AgentRuntimeSkillName;
  targetMcpCapability?: string;
  proposedTaskGoal?: string;
  proposedBlackboardNote?: string;
  confidence?: number;
  warnings?: string[];
  limitations?: string[];
}): LlmPlannerOutput {
  const now = DEFAULT_NOW;

  return {
    id: stableId([
      'llm-planner-output',
      params.input.sessionId,
      params.input.traceId,
      params.input.agentRole,
      params.actionType,
      now,
    ]),
    sessionId: params.input.sessionId,
    traceId: params.input.traceId,
    mode: 'fake_deterministic',
    agentRole: params.input.agentRole,
    actionType: params.actionType,
    targetTaskType: params.targetTaskType,
    targetSkillName: params.targetSkillName,
    targetMcpCapability: params.targetMcpCapability,
    reason: params.reason,
    expectedOutput: params.expectedOutput,
    riskLevel: params.riskLevel,
    requiresApproval: params.requiresApproval,
    inputRefs: [
      { key: 'unknowns', summary: 'Evidence gap and limitation summary only.' },
      { key: 'limitations', summary: 'Planner boundary constraints.' },
    ],
    proposedBlackboardNote: params.proposedBlackboardNote,
    proposedTaskGoal: params.proposedTaskGoal,
    confidence: params.confidence ?? 0.72,
    warnings: params.warnings ?? [],
    limitations: [
      FAKE_PLANNER_LIMITATION,
      'Planner output is an action proposal only; it does not execute skills, MCP, commands, tests, or blackboard writes.',
      ...(params.limitations ?? []),
    ],
  };
}

export function runFakeLlmPlanner(
  input: LlmPlannerInput,
  options: FakeLlmPlannerOptions = {}
): LlmPlannerOutput {
  const preferEvidenceGapClosure = options.preferEvidenceGapClosure ?? true;

  if (input.taskType === 'request_controlled_execution') {
    return createOutput({
      input,
      actionType: 'request_controlled_execution',
      reason: 'The current task asks for controlled execution, so the fake planner can only propose an approval-gated controlled execution draft.',
      expectedOutput: 'Controlled execution request draft; no command, HTTP, browser, database, or filesystem action is executed.',
      riskLevel: 'high',
      requiresApproval: true,
      proposedBlackboardNote: 'Controlled execution request requires approval and remains a proposal in M4.',
      confidence: 0.82,
    });
  }

  if (
    preferEvidenceGapClosure &&
    hasOpenEvidenceGap(input) &&
    hasTaskType(input, 'review_evidence_gap')
  ) {
    return createOutput({
      input,
      actionType: 'create_task',
      targetTaskType: 'review_evidence_gap',
      reason: 'Open evidence gaps are present and this agent is allowed to create an evidence-gap review task.',
      expectedOutput: 'Pending task draft for reviewing evidence gaps; no evidence is created by planner reasoning.',
      riskLevel: 'low',
      requiresApproval: false,
      proposedTaskGoal: 'Review open evidence gaps and request real execution evidence where needed.',
      confidence: 0.78,
    });
  }

  if (input.agentRole === 'test_lead' && input.taskType === 'summarize_session') {
    if (hasSkill(input, 'report_generation')) {
      return createOutput({
        input,
        actionType: 'invoke_skill',
        targetSkillName: 'report_generation',
        reason: 'The Test Lead summarize_session task can be advanced by proposing the report_generation skill.',
        expectedOutput: 'Skill invocation proposal for report generation; no SkillRouter call is performed in M4.',
        riskLevel: 'low',
        requiresApproval: false,
        confidence: 0.76,
      });
    }

    if (hasSkill(input, 'release_recommendation')) {
      return createOutput({
        input,
        actionType: 'invoke_skill',
        targetSkillName: 'release_recommendation',
        reason: 'The Test Lead summarize_session task can be advanced by proposing release_recommendation when report generation is unavailable.',
        expectedOutput: 'Skill invocation proposal for advisory release recommendation; no SkillRouter call is performed in M4.',
        riskLevel: 'low',
        requiresApproval: false,
        confidence: 0.72,
      });
    }
  }

  if (
    input.agentRole === 'ops_check' &&
    hasOpenEvidenceGap(input) &&
    input.availableMcpCapabilities.includes('read_only_snapshot')
  ) {
    return createOutput({
      input,
      actionType: 'request_mcp',
      targetMcpCapability: 'read_only_snapshot',
      reason: 'The Ops Check agent can propose a read-only snapshot to help close an evidence gap, but M4 does not call MCP.',
      expectedOutput: 'Approval-gated read-only MCP request draft for future evidence collection.',
      riskLevel: 'medium',
      requiresApproval: true,
      confidence: 0.7,
      warnings: ['Read-only MCP remains a request draft and is conservatively approval-gated in M4.'],
    });
  }

  return createOutput({
    input,
    actionType: 'no_op',
    reason: 'No deterministic planner rule matched the supplied summary-only input.',
    expectedOutput: 'No action proposed.',
    riskLevel: 'low',
    requiresApproval: false,
    proposedBlackboardNote: 'No planner action proposed by M4 fake deterministic planner.',
    confidence: options.preferLowRiskActions === false ? 0.5 : 0.64,
  });
}

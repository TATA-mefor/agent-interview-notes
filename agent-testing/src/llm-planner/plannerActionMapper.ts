import type {
  AgentProfile,
} from '../agent-runtime/agentProfileTypes';
import type {
  AgentRuntimeRole,
  AgentTask,
  AgentTaskType,
} from '../agent-runtime/agentRuntimeTypes';
import {
  createAgentTask,
} from '../agent-runtime/agentTaskQueue';
import type {
  LlmPlannerActionProposal,
  LlmPlannerInput,
  LlmPlannerOutput,
  LlmPlannerProposalStatus,
} from './llmPlannerTypes';
import {
  validateLlmPlannerOutput,
} from './plannerOutputValidator';

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

export interface MapPlannerOutputToActionProposalRequest {
  input: LlmPlannerInput;
  output: LlmPlannerOutput;
  profile: AgentProfile;
  now?: string;
}

export interface PlannerProposalSummary {
  id: string;
  sessionId: string;
  traceId: string;
  status: LlmPlannerProposalStatus;
  actionType: LlmPlannerOutput['actionType'];
  approvalRequired: boolean;
  targetTaskType?: AgentTaskType;
  targetSkillName?: LlmPlannerOutput['targetSkillName'];
  targetMcpCapability?: string;
  warningCount: number;
  limitationCount: number;
}

function stableId(parts: readonly string[]): string {
  return parts
    .join('-')
    .replace(/[^0-9A-Za-z_-]+/g, '-')
    .replace(/-+/g, '-');
}

function inferAssignedRole(taskType: AgentTaskType, fallback: AgentRuntimeRole): AgentRuntimeRole {
  switch (taskType) {
    case 'extract_acceptance':
      return 'product_acceptance';
    case 'generate_test_cases':
    case 'suggest_regression':
      return 'test_design';
    case 'generate_ops_checklist':
      return 'ops_check';
    case 'analyze_defect':
      return 'developer_analysis';
    case 'recommend_release':
    case 'generate_report':
    case 'summarize_session':
    case 'review_evidence_gap':
      return 'test_lead';
    default:
      return fallback;
  }
}

function statusForOutput(output: LlmPlannerOutput, valid: boolean): LlmPlannerProposalStatus {
  if (!valid || output.riskLevel === 'forbidden') {
    return 'rejected';
  }

  if (output.requiresApproval || output.riskLevel === 'high') {
    return 'needs_approval';
  }

  return 'accepted';
}

export function mapPlannerOutputToTaskDraft(
  input: LlmPlannerInput,
  output: LlmPlannerOutput,
  profile: AgentProfile,
  now: string = DEFAULT_NOW
): AgentTask | undefined {
  if (output.actionType !== 'create_task' || !output.targetTaskType) {
    return undefined;
  }

  if (!profile.allowedTaskTypes.includes(output.targetTaskType)) {
    return undefined;
  }

  return createAgentTask({
    id: stableId([
      'planner-task-draft',
      input.sessionId,
      input.traceId,
      output.targetTaskType,
    ]),
    sessionId: input.sessionId,
    traceId: input.traceId,
    assignedTo: inferAssignedRole(output.targetTaskType, output.agentRole),
    createdBy: output.agentRole,
    taskType: output.targetTaskType,
    goal: output.proposedTaskGoal ?? `Planner proposed ${output.targetTaskType}.`,
    inputRefs: output.inputRefs,
    expectedOutput: output.expectedOutput,
    priority: output.riskLevel === 'high' ? 'high' : 'normal',
    requiresApproval: output.requiresApproval,
    now,
    limitations: [
      'Planner-created task draft; not inserted into session by M4.',
      'Task draft was mapped from validated planner output only; it was not executed.',
      ...output.limitations,
    ],
  });
}

export function mapPlannerOutputToActionProposal(
  request: MapPlannerOutputToActionProposalRequest
): LlmPlannerActionProposal {
  const validation = validateLlmPlannerOutput(
    request.input,
    request.output,
    request.profile
  );
  const status = statusForOutput(request.output, validation.valid);
  const mappedTaskDraft = status === 'accepted' || status === 'needs_approval'
    ? mapPlannerOutputToTaskDraft(
        request.input,
        request.output,
        request.profile,
        request.now ?? DEFAULT_NOW
      )
    : undefined;
  const approvalRequired = request.output.requiresApproval ||
    request.output.riskLevel === 'high' ||
    status === 'needs_approval';

  return {
    id: stableId([
      'planner-action-proposal',
      request.input.sessionId,
      request.input.traceId,
      request.output.actionType,
    ]),
    sessionId: request.input.sessionId,
    traceId: request.input.traceId,
    agentRole: request.output.agentRole,
    status,
    actionType: request.output.actionType,
    targetTaskType: request.output.targetTaskType,
    targetSkillName: request.output.targetSkillName,
    targetMcpCapability: request.output.targetMcpCapability,
    mappedTaskDraft,
    blackboardNoteDraft: request.output.actionType === 'write_blackboard_note'
      ? request.output.proposedBlackboardNote
      : undefined,
    approvalRequired,
    approvalReason: approvalRequired
      ? `Planner proposal is ${request.output.riskLevel} risk or explicitly requires approval.`
      : undefined,
    validation,
    warnings: [
      ...request.output.warnings,
      ...validation.warnings,
      ...(status === 'unsupported'
        ? [`Planner action ${request.output.actionType} is not executed or mapped to runtime mutation in M4.`]
        : []),
    ],
    limitations: [
      ...request.output.limitations,
      ...validation.limitations,
      'M4 mapper returns proposals and drafts only; it does not invoke skills, call MCP, write blackboard, mutate session, or execute tests.',
      ...(status === 'rejected'
        ? ['Rejected planner proposal was not mapped to executable work.']
        : []),
    ],
  };
}

export function summarizePlannerProposal(
  proposal: LlmPlannerActionProposal
): PlannerProposalSummary {
  return {
    id: proposal.id,
    sessionId: proposal.sessionId,
    traceId: proposal.traceId,
    status: proposal.status,
    actionType: proposal.actionType,
    approvalRequired: proposal.approvalRequired,
    targetTaskType: proposal.targetTaskType,
    targetSkillName: proposal.targetSkillName,
    targetMcpCapability: proposal.targetMcpCapability,
    warningCount: proposal.warnings.length,
    limitationCount: proposal.limitations.length,
  };
}

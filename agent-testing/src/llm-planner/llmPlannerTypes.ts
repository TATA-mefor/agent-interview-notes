import type {
  AgentRuntimeSkillName,
} from '../agent-runtime/agentProfileTypes';
import type {
  AgentRuntimeRole,
  AgentTask,
  AgentTaskType,
  BlackboardRef,
} from '../agent-runtime/agentRuntimeTypes';

export type LlmPlannerMode =
  | 'fake_deterministic'
  | 'future_real_llm_disabled';

export type LlmPlannerActionType =
  | 'create_task'
  | 'invoke_skill'
  | 'request_mcp'
  | 'request_controlled_execution'
  | 'ask_for_evidence'
  | 'write_blackboard_note'
  | 'summarize_session'
  | 'no_op';

export type LlmPlannerRiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'forbidden';

export interface LlmPlannerInput {
  id: string;
  sessionId: string;
  traceId: string;

  mode: LlmPlannerMode;

  agentRole: AgentRuntimeRole;
  taskId?: string;
  taskType?: AgentTaskType;

  agentProfileSummary: string;
  taskSummary: string;
  blackboardSummary: string;

  availableSkills: AgentRuntimeSkillName[];
  availableTaskTypes: AgentTaskType[];
  availableMcpCapabilities: string[];

  evidenceGapSummary: string;
  constraints: string[];
  limitations: string[];
}

export interface LlmPlannerOutput {
  id: string;
  sessionId: string;
  traceId: string;

  mode: LlmPlannerMode;

  agentRole: AgentRuntimeRole;

  actionType: LlmPlannerActionType;

  targetTaskType?: AgentTaskType;
  targetSkillName?: AgentRuntimeSkillName;
  targetMcpCapability?: string;

  reason: string;
  expectedOutput: string;

  riskLevel: LlmPlannerRiskLevel;
  requiresApproval: boolean;

  inputRefs: BlackboardRef[];

  proposedBlackboardNote?: string;
  proposedTaskGoal?: string;

  confidence: number;

  warnings: string[];
  limitations: string[];
}

export interface LlmPlannerValidationIssue {
  field: string;
  message: string;
}

export interface LlmPlannerValidationResult {
  valid: boolean;
  issues: LlmPlannerValidationIssue[];
  warnings: string[];
  limitations: string[];
}

export type LlmPlannerProposalStatus =
  | 'accepted'
  | 'needs_approval'
  | 'rejected'
  | 'unsupported';

export interface LlmPlannerActionProposal {
  id: string;
  sessionId: string;
  traceId: string;

  agentRole: AgentRuntimeRole;

  status: LlmPlannerProposalStatus;
  actionType: LlmPlannerActionType;

  targetTaskType?: AgentTaskType;
  targetSkillName?: AgentRuntimeSkillName;
  targetMcpCapability?: string;

  mappedTaskDraft?: AgentTask;
  blackboardNoteDraft?: string;

  approvalRequired: boolean;
  approvalReason?: string;

  validation: LlmPlannerValidationResult;

  warnings: string[];
  limitations: string[];
}

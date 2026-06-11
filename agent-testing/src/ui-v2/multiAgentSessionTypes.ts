import type {
  AgentRuntimeRole,
  AgentSessionStatus,
  AgentTaskStatus,
  AgentTaskPriority,
  AgentMessageType,
  AgentTaskType,
} from '../agent-runtime/agentRuntimeTypes';
import type {
  EvidenceGapReason,
  EvidenceGapStatus,
} from '../agent-runtime/evidenceCollector';

export type AgentUiTone = 'default' | 'muted' | 'info' | 'success' | 'warning' | 'danger';

export interface AgentStatusBadge {
  label: string;
  tone: AgentUiTone;
}

export interface AgentRuntimeOverviewViewModel {
  sessionId: string;
  runId: string;
  targetSystemName: string;
  status: AgentSessionStatus;
  statusBadge: AgentStatusBadge;
  agentCount: number;
  taskCount: number;
  messageCount: number;
  auditEventCount: number;
  limitations: string[];
}

export interface AgentProfileCardViewModel {
  role: AgentRuntimeRole;
  displayName: string;
  capabilitySummary: string;
  allowedSkills: string[];
  allowedTaskTypes: string[];
  canRequestMcp: boolean;
  canRequestControlledExecution: boolean;
  taskCount: number;
  completedTaskCount: number;
  limitations: string[];
}

export interface AgentTaskQueueRow {
  id: string;
  assignedTo: AgentRuntimeRole;
  taskType: AgentTaskType;
  goal: string;
  status: AgentTaskStatus;
  priority: AgentTaskPriority;
  requiresApproval: boolean;
  statusBadge: AgentStatusBadge;
  priorityBadge: AgentStatusBadge;
  inputSummary: string;
  expectedOutput: string;
  completedAt?: string;
  limitations: string[];
}

export interface AgentMessageTimelineItem {
  id: string;
  fromAgent: AgentRuntimeRole;
  toAgent: AgentRuntimeRole | 'broadcast';
  messageType: AgentMessageType;
  summary: string;
  relatedTaskId?: string;
  createdAt: string;
  limitations: string[];
}

export interface SharedBlackboardSummaryViewModel {
  sessionId: string;
  acceptancePointCount: number;
  testCaseCount: number;
  rawEvidenceCount: number;
  normalizedEvidenceCount: number;
  severityCount: number;
  defectCount: number;
  regressionCount: number;
  opsChecklistCount: number;
  approvalRequestCount: number;
  auditEventCount: number;
  unknownCount: number;
  limitationCount: number;
}

export interface AgentEvidenceGapRow {
  id: string;
  testCaseId?: string;
  reason: EvidenceGapReason;
  status: EvidenceGapStatus;
  statusBadge: AgentStatusBadge;
  summary: string;
  recommendedAction: string;
  severityHint?: string;
  limitations: string[];
}

export interface AgentApprovalRow {
  id: string;
  agentRole: AgentRuntimeRole;
  actionType: string;
  status: string;
  riskLevel: string;
  requiresHumanApproval: boolean;
  forbidden: boolean;
  statusBadge: AgentStatusBadge;
  reason: string;
  policyViolationCount: number;
  limitations: string[];
}

export interface MultiAgentSessionViewModel {
  overview: AgentRuntimeOverviewViewModel;
  agentProfiles: AgentProfileCardViewModel[];
  taskQueue: AgentTaskQueueRow[];
  messageTimeline: AgentMessageTimelineItem[];
  blackboardSummary: SharedBlackboardSummaryViewModel;
  evidenceGaps: AgentEvidenceGapRow[];
  approvals: AgentApprovalRow[];
  warnings: string[];
  limitations: string[];
}

import type {
  AgentSession,
  AgentTask,
  AgentMessage,
  AgentTaskStatus,
  AgentSessionStatus,
  AgentTaskPriority,
  AgentRuntimeRole,
} from '../agent-runtime/agentRuntimeTypes';
import type {
  AgentProfile,
} from '../agent-runtime/agentProfileTypes';
import type {
  EvidenceGap,
} from '../agent-runtime/evidenceCollector';
import type {
  AgentRuntimeApprovalBridgeResult,
} from '../agent-runtime/approvalBridge';
import {
  summarizeSharedBlackboard,
} from '../agent-runtime/sharedBlackboard';
import {
  summarizeAgentMessages,
} from '../agent-runtime/agentMessageBus';
import {
  collectEvidenceFromBlackboard,
} from '../agent-runtime/evidenceCollector';
import type {
  AgentUiTone,
  AgentStatusBadge,
  AgentRuntimeOverviewViewModel,
  AgentProfileCardViewModel,
  AgentTaskQueueRow,
  AgentMessageTimelineItem,
  SharedBlackboardSummaryViewModel,
  AgentEvidenceGapRow,
  AgentApprovalRow,
  MultiAgentSessionViewModel,
} from './multiAgentSessionTypes';

function sessionStatusBadge(status: AgentSessionStatus): AgentStatusBadge {
  switch (status) {
    case 'draft':
      return { label: 'Draft', tone: 'muted' };
    case 'running':
      return { label: 'Running', tone: 'info' };
    case 'waiting_for_evidence':
      return { label: 'Waiting for Evidence', tone: 'warning' };
    case 'waiting_for_approval':
      return { label: 'Waiting for Approval', tone: 'warning' };
    case 'blocked':
      return { label: 'Blocked', tone: 'danger' };
    case 'completed':
      return { label: 'Completed', tone: 'success' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'muted' };
    case 'failed':
      return { label: 'Failed', tone: 'danger' };
    default:
      return { label: status, tone: 'default' };
  }
}

function taskStatusBadge(status: AgentTaskStatus): AgentStatusBadge {
  switch (status) {
    case 'pending':
      return { label: 'Pending', tone: 'muted' };
    case 'assigned':
      return { label: 'Assigned', tone: 'info' };
    case 'running':
      return { label: 'Running', tone: 'info' };
    case 'blocked':
      return { label: 'Blocked', tone: 'warning' };
    case 'completed':
      return { label: 'Completed', tone: 'success' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'muted' };
    case 'failed':
      return { label: 'Failed', tone: 'danger' };
    case 'refused':
      return { label: 'Refused', tone: 'danger' };
    default:
      return { label: status, tone: 'default' };
  }
}

function priorityBadge(priority: AgentTaskPriority): AgentStatusBadge {
  switch (priority) {
    case 'critical':
      return { label: 'Critical', tone: 'danger' };
    case 'high':
      return { label: 'High', tone: 'warning' };
    case 'normal':
      return { label: 'Normal', tone: 'info' };
    case 'low':
      return { label: 'Low', tone: 'muted' };
    default:
      return { label: priority, tone: 'default' };
  }
}

function evidenceGapStatusBadge(status: string): AgentStatusBadge {
  switch (status) {
    case 'open':
      return { label: 'Open', tone: 'danger' };
    case 'partially_covered':
      return { label: 'Partially Covered', tone: 'warning' };
    case 'covered':
      return { label: 'Covered', tone: 'success' };
    default:
      return { label: status, tone: 'muted' };
  }
}

function approvalStatusBadge(forbidden: boolean, requiresApproval: boolean): AgentStatusBadge {
  if (forbidden) {
    return { label: 'Forbidden', tone: 'danger' };
  }
  if (requiresApproval) {
    return { label: 'Pending Approval', tone: 'warning' };
  }
  return { label: 'Accepted', tone: 'success' };
}

function capabilitySummary(profile: AgentProfile): string {
  const levels = Object.entries(profile.capabilities)
    .filter(([, value]) => value && value !== 'none')
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');

  return levels || 'no capabilities';
}

function countTasksForAgent(tasks: readonly AgentTask[], role: AgentRuntimeRole): { total: number; completed: number } {
  const agentTasks = tasks.filter((task) => task.assignedTo === role);

  return {
    total: agentTasks.length,
    completed: agentTasks.filter((task) => task.status === 'completed').length,
  };
}

export function mapAgentSessionToViewModel(session: AgentSession): AgentRuntimeOverviewViewModel {
  return {
    sessionId: session.id,
    runId: session.runId,
    targetSystemName: session.targetSystemName,
    status: session.status,
    statusBadge: sessionStatusBadge(session.status),
    agentCount: session.agents.length,
    taskCount: session.tasks.length,
    messageCount: session.messages.length,
    auditEventCount: session.auditEventIds.length,
    limitations: [...session.limitations],
  };
}

export function mapAgentProfilesToCards(
  profiles: readonly AgentProfile[],
  tasks: readonly AgentTask[]
): AgentProfileCardViewModel[] {
  return profiles.map((profile) => {
    const counts = countTasksForAgent(tasks, profile.role);

    return {
      role: profile.role,
      displayName: profile.displayName,
      capabilitySummary: capabilitySummary(profile),
      allowedSkills: [...profile.allowedSkills],
      allowedTaskTypes: [...profile.allowedTaskTypes],
      canRequestMcp: profile.canRequestMcp,
      canRequestControlledExecution: profile.canRequestControlledExecution,
      taskCount: counts.total,
      completedTaskCount: counts.completed,
      limitations: [...profile.limitations],
    };
  });
}

export function mapAgentTasksToRows(tasks: readonly AgentTask[]): AgentTaskQueueRow[] {
  return tasks.map((task) => ({
    id: task.id,
    assignedTo: task.assignedTo,
    taskType: task.taskType,
    goal: task.goal,
    status: task.status,
    priority: task.priority,
    requiresApproval: task.requiresApproval,
    statusBadge: taskStatusBadge(task.status),
    priorityBadge: priorityBadge(task.priority),
    inputSummary: task.inputRefs.map((ref) => ref.key).join(', '),
    expectedOutput: task.expectedOutput,
    completedAt: task.completedAt,
    limitations: [...task.limitations],
  }));
}

export function mapAgentMessagesToTimeline(messages: readonly AgentMessage[]): AgentMessageTimelineItem[] {
  return messages.map((msg) => ({
    id: msg.id,
    fromAgent: msg.fromAgent,
    toAgent: msg.toAgent,
    messageType: msg.messageType,
    summary: msg.summary,
    relatedTaskId: msg.relatedTaskId,
    createdAt: msg.createdAt,
    limitations: [...msg.limitations],
  }));
}

export function mapSharedBlackboardToSummary(
  session: AgentSession
): SharedBlackboardSummaryViewModel {
  const summary = summarizeSharedBlackboard(session.blackboard);

  return {
    sessionId: summary.sessionId,
    acceptancePointCount: summary.acceptancePointCount,
    testCaseCount: summary.testCaseCount,
    rawEvidenceCount: summary.rawEvidenceCount,
    normalizedEvidenceCount: summary.normalizedEvidenceCount,
    severityCount: summary.severityCount,
    defectCount: summary.defectCount,
    regressionCount: summary.regressionCount,
    opsChecklistCount: summary.opsChecklistCount,
    approvalRequestCount: summary.approvalRequestCount,
    auditEventCount: summary.auditEventCount,
    unknownCount: summary.unknownCount,
    limitationCount: summary.limitationCount,
  };
}

export function mapEvidenceGapsToRows(gaps: readonly EvidenceGap[]): AgentEvidenceGapRow[] {
  return gaps.slice(0, 30).map((gap) => ({
    id: gap.id,
    testCaseId: gap.testCaseId,
    reason: gap.reason,
    status: gap.status,
    statusBadge: evidenceGapStatusBadge(gap.status),
    summary: gap.summary,
    recommendedAction: gap.recommendedAction,
    severityHint: gap.severityHint,
    limitations: [...gap.limitations],
  }));
}

export function mapApprovalDraftsToRows(
  approvals: readonly AgentRuntimeApprovalBridgeResult[]
): AgentApprovalRow[] {
  return approvals.map((approval) => ({
    id: approval.id,
    agentRole: approval.requestedByAgent,
    actionType: 'mcp_tool_call',
    status: approval.status,
    riskLevel: approval.riskLevel,
    requiresHumanApproval: approval.requiresHumanApproval,
    forbidden: approval.forbidden,
    statusBadge: approvalStatusBadge(approval.forbidden, approval.requiresHumanApproval),
    reason: approval.reason,
    policyViolationCount: approval.policyViolations.length,
    limitations: [...approval.limitations],
  }));
}

export interface BuildMultiAgentSessionViewModelInput {
  session: AgentSession;
  profiles: readonly AgentProfile[];
  evidenceGaps?: EvidenceGap[];
  approvals?: AgentRuntimeApprovalBridgeResult[];
  warnings?: string[];
  limitations?: string[];
}

export function buildMultiAgentSessionViewModel(
  input: BuildMultiAgentSessionViewModelInput
): MultiAgentSessionViewModel {
  const evidenceSummary = collectEvidenceFromBlackboard(input.session.blackboard);
  const messageSummary = summarizeAgentMessages(input.session.messages);

  return {
    overview: mapAgentSessionToViewModel(input.session),
    agentProfiles: mapAgentProfilesToCards(input.profiles, input.session.tasks),
    taskQueue: mapAgentTasksToRows(input.session.tasks),
    messageTimeline: mapAgentMessagesToTimeline(input.session.messages),
    blackboardSummary: mapSharedBlackboardToSummary(input.session),
    evidenceGaps: mapEvidenceGapsToRows(input.evidenceGaps ?? evidenceSummary.gaps),
    approvals: mapApprovalDraftsToRows(input.approvals ?? []),
    warnings: [
      ...(input.warnings ?? []),
      ...evidenceSummary.warnings,
      ...messageSummary.limitations,
    ],
    limitations: [
      ...(input.limitations ?? []),
      'UI view model is derived from in-memory runtime objects only; it does not call MCP, LLM, or execute tests.',
      'Task completed status means only that the runtime step finished — it does not mean the system under test passed.',
      'Evidence gaps tagged as warning or danger require real execution evidence before pass claims are valid.',
      'Agent reasoning and simulated output should not be treated as pass evidence.',
    ],
  };
}

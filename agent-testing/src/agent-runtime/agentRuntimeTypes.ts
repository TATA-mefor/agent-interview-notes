export type AgentRuntimeRole =
  | 'test_lead'
  | 'product_acceptance'
  | 'test_design'
  | 'developer_analysis'
  | 'ops_check'
  | 'user_representative';

export type AgentSessionStatus =
  | 'draft'
  | 'running'
  | 'waiting_for_evidence'
  | 'waiting_for_approval'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface AgentSessionStatusTransition {
  from: AgentSessionStatus;
  to: AgentSessionStatus;
  reason: string;
}

export const AGENT_SESSION_ALLOWED_TRANSITIONS: readonly AgentSessionStatusTransition[] = [
  {
    from: 'draft',
    to: 'running',
    reason: 'A drafted session can start once initial scope and agents are available.',
  },
  {
    from: 'running',
    to: 'waiting_for_evidence',
    reason: 'A running session can pause when required evidence is missing.',
  },
  {
    from: 'running',
    to: 'waiting_for_approval',
    reason: 'A running session can pause when an approval-gated action is required.',
  },
  {
    from: 'running',
    to: 'blocked',
    reason: 'A running session can become blocked by release, evidence, tool, or policy constraints.',
  },
  {
    from: 'running',
    to: 'completed',
    reason: 'A running session can complete after all required tasks are finished or explicitly bounded.',
  },
  {
    from: 'waiting_for_evidence',
    to: 'running',
    reason: 'A session waiting for evidence can resume after evidence is supplied.',
  },
  {
    from: 'waiting_for_evidence',
    to: 'blocked',
    reason: 'A session waiting for evidence can become blocked if evidence cannot be obtained.',
  },
  {
    from: 'waiting_for_approval',
    to: 'running',
    reason: 'A session waiting for approval can resume after the required approval decision is available.',
  },
  {
    from: 'waiting_for_approval',
    to: 'blocked',
    reason: 'A session waiting for approval can become blocked when approval is denied or unavailable.',
  },
  {
    from: 'blocked',
    to: 'running',
    reason: 'A blocked session can resume after the blocking condition is resolved.',
  },
  {
    from: 'running',
    to: 'failed',
    reason: 'A running session can fail when an unrecoverable runtime or contract error is recorded.',
  },
  {
    from: 'running',
    to: 'cancelled',
    reason: 'A running session can be cancelled by an external controller or future human decision.',
  },
];

export type AgentMessageType =
  | 'task_assignment'
  | 'task_result'
  | 'evidence_request'
  | 'approval_request'
  | 'risk_warning'
  | 'reflection_note'
  | 'report_update'
  | 'blocked_notice';

export type AgentTaskType =
  | 'build_context'
  | 'extract_acceptance'
  | 'generate_test_cases'
  | 'generate_ops_checklist'
  | 'normalize_evidence'
  | 'classify_severity'
  | 'analyze_defect'
  | 'suggest_regression'
  | 'recommend_release'
  | 'generate_report'
  | 'request_mcp_read'
  | 'request_controlled_execution'
  | 'review_evidence_gap'
  | 'summarize_session';

export type AgentTaskStatus =
  | 'pending'
  | 'assigned'
  | 'running'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'refused';

export type AgentTaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SharedBlackboard {
  sessionId: string;

  requirements?: unknown;
  context?: unknown;
  acceptancePoints?: unknown[];
  testCases?: unknown[];

  rawEvidence?: unknown[];
  normalizedEvidence?: unknown[];
  severityClassifications?: unknown[];

  defects?: unknown[];
  defectAnalyses?: unknown[];
  regressionSuggestions?: unknown[];
  opsChecklist?: unknown[];

  releaseRecommendation?: unknown;
  report?: unknown;

  approvalRequests?: unknown[];
  auditEvents?: unknown[];
  observabilityMetrics?: unknown;

  mcpRequests?: unknown[];
  mcpResults?: unknown[];

  controlledExecutionRequests?: unknown[];
  controlledExecutionResults?: unknown[];

  unknowns?: string[];
  limitations?: string[];
}

export type SharedBlackboardKey = keyof SharedBlackboard;

export interface BlackboardRef {
  key: SharedBlackboardKey;
  id?: string;
  summary?: string;
}

export interface AgentArtifactRef {
  id: string;
  kind:
    | 'acceptance_point'
    | 'test_case'
    | 'evidence'
    | 'severity'
    | 'defect'
    | 'regression'
    | 'approval'
    | 'audit'
    | 'report'
    | 'mcp_request'
    | 'mcp_result'
    | 'controlled_execution'
    | 'blackboard'
    | 'unknown';
  summary?: string;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  traceId: string;

  fromAgent: AgentRuntimeRole;
  toAgent: AgentRuntimeRole | 'broadcast';

  messageType: AgentMessageType;
  summary: string;

  payloadRef?: BlackboardRef;
  artifacts?: AgentArtifactRef[];

  relatedTaskId?: string;
  relatedEvidenceIds?: string[];
  relatedTestCaseIds?: string[];

  createdAt: string;
  limitations: string[];
}

export interface AgentTask {
  id: string;
  sessionId: string;
  traceId: string;

  assignedTo: AgentRuntimeRole;
  createdBy: AgentRuntimeRole;

  taskType: AgentTaskType;
  goal: string;

  inputRefs: BlackboardRef[];
  expectedOutput: string;

  status: AgentTaskStatus;
  priority: AgentTaskPriority;

  requiresApproval: boolean;
  relatedEvidenceIds: string[];
  relatedTestCaseIds: string[];

  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  limitations: string[];
}

export interface AgentSession {
  id: string;
  runId: string;
  targetSystemName: string;

  status: AgentSessionStatus;

  agents: AgentRuntimeRole[];
  tasks: AgentTask[];
  messages: AgentMessage[];

  blackboard: SharedBlackboard;

  auditEventIds: string[];

  createdAt: string;
  updatedAt: string;

  limitations: string[];
}

export interface AgentTaskBlackboardContract {
  taskType: AgentTaskType;
  reads: SharedBlackboardKey[];
  writes: SharedBlackboardKey[];
}

export const AGENT_TASK_BLACKBOARD_CONTRACTS: readonly AgentTaskBlackboardContract[] = [
  {
    taskType: 'build_context',
    reads: ['requirements'],
    writes: ['context', 'unknowns'],
  },
  {
    taskType: 'extract_acceptance',
    reads: ['requirements', 'context'],
    writes: ['acceptancePoints', 'unknowns'],
  },
  {
    taskType: 'generate_test_cases',
    reads: ['acceptancePoints', 'context'],
    writes: ['testCases', 'unknowns'],
  },
  {
    taskType: 'generate_ops_checklist',
    reads: ['context', 'testCases'],
    writes: ['opsChecklist', 'unknowns'],
  },
  {
    taskType: 'normalize_evidence',
    reads: ['rawEvidence', 'testCases'],
    writes: ['normalizedEvidence', 'unknowns'],
  },
  {
    taskType: 'classify_severity',
    reads: ['normalizedEvidence', 'testCases'],
    writes: ['severityClassifications', 'unknowns'],
  },
  {
    taskType: 'analyze_defect',
    reads: ['normalizedEvidence', 'severityClassifications', 'defects'],
    writes: ['defectAnalyses', 'unknowns'],
  },
  {
    taskType: 'suggest_regression',
    reads: ['defectAnalyses', 'severityClassifications', 'testCases'],
    writes: ['regressionSuggestions', 'unknowns'],
  },
  {
    taskType: 'recommend_release',
    reads: [
      'testCases',
      'normalizedEvidence',
      'severityClassifications',
      'defects',
      'defectAnalyses',
      'regressionSuggestions',
      'opsChecklist',
      'unknowns',
    ],
    writes: ['releaseRecommendation', 'limitations'],
  },
  {
    taskType: 'generate_report',
    reads: [
      'context',
      'acceptancePoints',
      'testCases',
      'normalizedEvidence',
      'severityClassifications',
      'defectAnalyses',
      'regressionSuggestions',
      'opsChecklist',
      'releaseRecommendation',
    ],
    writes: ['report', 'limitations'],
  },
  {
    taskType: 'request_mcp_read',
    reads: ['context', 'unknowns'],
    writes: ['mcpRequests', 'mcpResults', 'rawEvidence', 'auditEvents'],
  },
  {
    taskType: 'request_controlled_execution',
    reads: ['context', 'testCases', 'approvalRequests'],
    writes: ['controlledExecutionRequests', 'controlledExecutionResults', 'rawEvidence', 'auditEvents'],
  },
  {
    taskType: 'review_evidence_gap',
    reads: ['testCases', 'normalizedEvidence', 'unknowns'],
    writes: ['unknowns', 'limitations'],
  },
  {
    taskType: 'summarize_session',
    reads: ['report', 'releaseRecommendation', 'auditEvents', 'observabilityMetrics'],
    writes: ['report', 'limitations'],
  },
];

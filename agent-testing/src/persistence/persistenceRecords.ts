import type {
  AgentRole,
  ConfidenceScore,
  DefectId,
  DefectStatus,
  EvidenceExecutorType,
  EvidenceId,
  EvidenceResult,
  EvidenceStrength,
  IsoDateTimeString,
  MarkdownString,
  McpPermissionLevel,
  McpSideEffectLevel,
  ReleaseRecommendation,
  Severity,
  SourceReference,
  TestCaseId,
} from '../types';
import type {
  ApprovalActionType,
  ApprovalDecisionValue,
  ApprovalRiskLevel,
  ApprovalStatus,
} from '../approval';
import type {
  AuditEventOutcome,
  AuditEventType,
  AuditPrivacyLevel,
  ObservabilityMetrics,
} from '../audit';
import type {
  ControlledExecutionFailureKind,
  ControlledExecutionKind,
  ControlledExecutionMode,
  ControlledExecutionRisk,
  ControlledExecutionStatus,
} from '../controlled-execution';
import type {
  McpAdapterKind,
  McpToolFailureKind,
  McpToolRequestStatus,
  McpToolResultStatus,
} from '../mcp';
import type {
  AgentMemoryKind,
  AgentMemoryScope,
  AgentMemorySensitivity,
  AgentPlanStatus,
  AgentReflectionPromptType,
  AgentTaskStatus,
} from '../agent-framework';
import type {
  PersistenceDataBoundary,
  PersistenceRecordBase,
  PersistenceSensitivityLevel,
} from './persistenceTypes';

export interface TestRunRecord extends PersistenceRecordBase {
  kind: 'test_run';
  targetSystemName: MarkdownString;
  targetSystemType: MarkdownString;
  scopeSummary: MarkdownString;
  environmentSummary: MarkdownString;
  startedAt: IsoDateTimeString;
  completedAt?: IsoDateTimeString;
  summary: MarkdownString;
}

export interface AgentTraceRecord extends PersistenceRecordBase {
  kind: 'agent_trace';
  traceId: MarkdownString;
  step: MarkdownString;
  skillName?: MarkdownString;
  success: boolean;
  inputSummary: MarkdownString;
  outputSummary: MarkdownString;
  issueSummaries: MarkdownString[];
}

export interface AcceptancePointRecord extends PersistenceRecordBase {
  kind: 'acceptance_point';
  acceptancePointId: MarkdownString;
  descriptionSummary: MarkdownString;
  priority: MarkdownString;
  relatedTestCaseIds: TestCaseId[];
}

export interface TestCaseRecord extends PersistenceRecordBase {
  kind: 'test_case';
  testCaseId: TestCaseId;
  title: MarkdownString;
  scopeSummary: MarkdownString;
  priority: MarkdownString;
  requiredEvidenceSummary: MarkdownString[];
  relatedAcceptancePointIds: MarkdownString[];
}

export interface EvidenceRecord extends PersistenceRecordBase {
  kind: 'evidence';
  testCaseId?: TestCaseId;
  executorType: EvidenceExecutorType;
  result: EvidenceResult;
  strength: EvidenceStrength;
  sourceSummary: MarkdownString;
  evidenceSummary: MarkdownString;
  rawEvidenceRef?: SourceReference;
  relatedMcpResultId?: MarkdownString;
  relatedControlledExecutionResultId?: MarkdownString;
}

export interface SeverityClassificationRecord extends PersistenceRecordBase {
  kind: 'severity_classification';
  severity: Severity;
  reasonSummary: MarkdownString;
  blockingRelease: boolean;
  requiresRegression: boolean;
  relatedEvidenceIds: EvidenceId[];
  relatedDefectIds: DefectId[];
}

export interface DefectRecord extends PersistenceRecordBase {
  kind: 'defect';
  defectId: DefectId;
  testCaseId?: TestCaseId;
  title: MarkdownString;
  severity: Severity;
  defectStatus: DefectStatus;
  relatedEvidenceIds: EvidenceId[];
  recommendationSummary: MarkdownString;
}

export interface DefectAnalysisRecord extends PersistenceRecordBase {
  kind: 'defect_analysis';
  defectId?: DefectId;
  suspectedLayer: MarkdownString;
  causeSummary: MarkdownString;
  fixSuggestionSummary: MarkdownString;
  confidence: ConfidenceScore;
  relatedEvidenceIds: EvidenceId[];
  relatedDefectIds: DefectId[];
}

export interface RegressionSuggestionRecord extends PersistenceRecordBase {
  kind: 'regression_suggestion';
  suggestionId: MarkdownString;
  scopeCategory: MarkdownString;
  priority: MarkdownString;
  reasonSummary: MarkdownString;
  requiredEvidenceSummary: MarkdownString[];
  relatedTestCaseIds: TestCaseId[];
  relatedDefectIds: DefectId[];
}

export interface ReleaseRecommendationRecord extends PersistenceRecordBase {
  kind: 'release_recommendation';
  recommendation: ReleaseRecommendation;
  reason: MarkdownString;
  blockingFactorIds: MarkdownString[];
  evidenceGapIds: MarkdownString[];
  confidence: ConfidenceScore;
  relatedEvidenceIds: EvidenceId[];
}

export interface ReportRecord extends PersistenceRecordBase {
  kind: 'report';
  title: MarkdownString;
  markdownSummary: MarkdownString;
  markdownRef?: SourceReference;
  sections: MarkdownString[];
  relatedEvidenceIds: EvidenceId[];
  relatedDefectIds: DefectId[];
  relatedReleaseRecommendationId?: MarkdownString;
  warnings: MarkdownString[];
}

export interface ApprovalRequestRecord extends PersistenceRecordBase {
  kind: 'approval_request';
  approvalRequestId: MarkdownString;
  requestedByAgent: AgentRole;
  actionType: ApprovalActionType;
  targetSummary: MarkdownString;
  purposeSummary: MarkdownString;
  riskLevel: ApprovalRiskLevel;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  approvalStatus: ApprovalStatus;
  requiresApproval: boolean;
  relatedAuditEventIds: MarkdownString[];
}

export interface ApprovalDecisionRecord extends PersistenceRecordBase {
  kind: 'approval_decision';
  approvalDecisionId: MarkdownString;
  approvalRequestId: MarkdownString;
  decision: ApprovalDecisionValue;
  decidedBy: MarkdownString;
  reasonSummary: MarkdownString;
  conditions: MarkdownString[];
  decidedAt: IsoDateTimeString;
  relatedAuditEventIds: MarkdownString[];
}

export interface AuditEventRecord extends PersistenceRecordBase {
  kind: 'audit_event';
  eventType: AuditEventType | MarkdownString;
  outcome: AuditEventOutcome | MarkdownString;
  actorSummary: MarkdownString;
  inputSummary: MarkdownString;
  outputSummary: MarkdownString;
  relatedEvidenceIds: EvidenceId[];
  relatedApprovalRequestId?: MarkdownString;
  relatedMcpRequestId?: MarkdownString;
  relatedControlledExecutionRequestId?: MarkdownString;
  privacyLevel: AuditPrivacyLevel;
}

export interface ObservabilitySnapshotRecord extends PersistenceRecordBase {
  kind: 'observability_snapshot';
  metricsSummary: Partial<ObservabilityMetrics>;
  sourceAuditEventIds: MarkdownString[];
  generatedFromSummary: MarkdownString;
}

export interface McpToolRequestRecord extends PersistenceRecordBase {
  kind: 'mcp_tool_request';
  mcpRequestId: MarkdownString;
  adapterKind: McpAdapterKind | MarkdownString;
  toolName: MarkdownString;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  approvalStatus: ApprovalStatus | McpToolRequestStatus | MarkdownString;
  inputSummary: MarkdownString;
  expectedOutputSummary: MarkdownString;
  relatedApprovalRequestId?: MarkdownString;
  relatedAuditEventIds: MarkdownString[];
}

export interface McpToolResultRecord extends PersistenceRecordBase {
  kind: 'mcp_tool_result';
  mcpResultId: MarkdownString;
  mcpRequestId: MarkdownString;
  adapterKind: McpAdapterKind | MarkdownString;
  toolName: MarkdownString;
  resultStatus: McpToolResultStatus | MarkdownString;
  failureKind?: McpToolFailureKind | MarkdownString;
  outputSummary: MarkdownString;
  rawEvidenceRef?: SourceReference;
  producedEvidenceIds: EvidenceId[];
  relatedAuditEventIds: MarkdownString[];
}

export interface ControlledExecutionRequestRecord extends PersistenceRecordBase {
  kind: 'controlled_execution_request';
  controlledExecutionRequestId: MarkdownString;
  executionKind: ControlledExecutionKind;
  mode: ControlledExecutionMode;
  risk: ControlledExecutionRisk;
  approvalStatus: ApprovalStatus | ControlledExecutionStatus | MarkdownString;
  purposeSummary: MarkdownString;
  targetSummary: MarkdownString;
  relatedApprovalRequestId?: MarkdownString;
  relatedAuditEventIds: MarkdownString[];
}

export interface ControlledExecutionPlanRecord extends PersistenceRecordBase {
  kind: 'controlled_execution_plan';
  controlledExecutionPlanId: MarkdownString;
  controlledExecutionRequestId: MarkdownString;
  executionKind: ControlledExecutionKind;
  mode: ControlledExecutionMode;
  risk: ControlledExecutionRisk;
  dryRunPlanSummary: MarkdownString[];
  approvalRequired: boolean;
  relatedAuditEventIds: MarkdownString[];
}

export interface ControlledExecutionResultRecord extends PersistenceRecordBase {
  kind: 'controlled_execution_result';
  controlledExecutionResultId: MarkdownString;
  controlledExecutionRequestId: MarkdownString;
  executionKind: ControlledExecutionKind;
  mode: ControlledExecutionMode;
  simulated: boolean;
  simulatedStatus: ControlledExecutionStatus;
  failureKind: ControlledExecutionFailureKind;
  outputSummary: MarkdownString;
  evidenceDraftRef?: SourceReference;
  auditDraftRef?: SourceReference;
  producedEvidenceIds: EvidenceId[];
  relatedAuditEventIds: MarkdownString[];
}

export interface AgentMemoryRecord extends PersistenceRecordBase {
  kind: 'agent_memory';
  memoryId: MarkdownString;
  scope: AgentMemoryScope;
  memoryKind: AgentMemoryKind;
  ownerAgent: AgentRole;
  summary: MarkdownString;
  memorySensitivity: AgentMemorySensitivity;
  relatedEvidenceIds: EvidenceId[];
  relatedTestCaseIds: TestCaseId[];
  relatedDefectIds: DefectId[];
}

export interface AgentPlanRecord extends PersistenceRecordBase {
  kind: 'agent_plan';
  planId: MarkdownString;
  goalSummary: MarkdownString;
  planStatus: AgentPlanStatus;
  stepSummaries: MarkdownString[];
  relatedEvidenceIds: EvidenceId[];
  relatedTestCaseIds: TestCaseId[];
  relatedDefectIds: DefectId[];
}

export interface AgentReflectionRecord extends PersistenceRecordBase {
  kind: 'agent_reflection';
  reflectionId: MarkdownString;
  agentRole: AgentRole;
  promptType: AgentReflectionPromptType;
  summary: MarkdownString;
  findingSummaries: MarkdownString[];
  recommendedActionSummaries: MarkdownString[];
  relatedEvidenceIds: EvidenceId[];
  relatedTestCaseIds: TestCaseId[];
}

export interface AgentTaskRecord extends PersistenceRecordBase {
  kind: 'agent_task';
  taskId: MarkdownString;
  assignedTo: AgentRole;
  goalSummary: MarkdownString;
  inputRefs: SourceReference[];
  expectedOutputSummary: MarkdownString;
  taskStatus: AgentTaskStatus;
  requiresApproval: boolean;
  relatedEvidenceIds: EvidenceId[];
  relatedTestCaseIds: TestCaseId[];
  relatedDefectIds: DefectId[];
}

export interface UnknownPersistenceRecord extends PersistenceRecordBase {
  kind: 'unknown';
  summary: MarkdownString;
  relatedRecordIds: MarkdownString[];
}

export type AgentTestingPersistenceRecord =
  | TestRunRecord
  | AgentTraceRecord
  | AcceptancePointRecord
  | TestCaseRecord
  | EvidenceRecord
  | SeverityClassificationRecord
  | DefectRecord
  | DefectAnalysisRecord
  | RegressionSuggestionRecord
  | ReleaseRecommendationRecord
  | ReportRecord
  | ApprovalRequestRecord
  | ApprovalDecisionRecord
  | AuditEventRecord
  | ObservabilitySnapshotRecord
  | McpToolRequestRecord
  | McpToolResultRecord
  | ControlledExecutionRequestRecord
  | ControlledExecutionPlanRecord
  | ControlledExecutionResultRecord
  | AgentMemoryRecord
  | AgentPlanRecord
  | AgentReflectionRecord
  | AgentTaskRecord
  | UnknownPersistenceRecord;

export interface PersistenceRecordBoundaryDefaults {
  sensitivity: PersistenceSensitivityLevel;
  dataBoundary: PersistenceDataBoundary;
}

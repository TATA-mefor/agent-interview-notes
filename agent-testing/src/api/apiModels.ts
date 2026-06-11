import type {
  ApprovalPolicyInput,
  ApprovalPolicyOutput,
  ApprovalRequest,
} from '../approval';
import type {
  AuditEventType,
  AuditTrailOutput,
  ObservabilityMetrics,
} from '../audit';
import type {
  EvidenceId,
  EvidenceResult,
  EvidenceStrength,
  MarkdownString,
  ReleaseRecommendation,
  SystemTestEvidence,
} from '../types';
import type {
  RawEvidenceInput,
} from '../evidence';
import type {
  TestLeadOrchestrationInput,
  TestLeadOrchestrationOptions,
} from '../orchestration';
import type {
  AgentTestingPersistenceSnapshot,
  PersistenceValidationResult,
} from '../persistence';
import type {
  ReportSectionSummary,
} from '../report';
import type {
  AgentTestingApiListResponse,
} from './apiTypes';

export interface CreateAgentTestingRunRequest {
  runId?: MarkdownString;
  targetSystemName: MarkdownString;
  targetSystemType: MarkdownString;
  systemDescription: MarkdownString;
  requirementsText: MarkdownString;
  modules?: MarkdownString[];
  contextSources?: MarkdownString[];
  knownConstraints?: MarkdownString[];
  opsProfile?: TestLeadOrchestrationInput['opsProfile'];
  rawEvidence?: RawEvidenceInput[];
  existingDefects?: TestLeadOrchestrationInput['existingDefects'];
  notes?: MarkdownString[];
  options?: TestLeadOrchestrationOptions;
}

export interface AgentTestingRunDto {
  runId: MarkdownString;
  targetSystemName: MarkdownString;
  targetSystemType: MarkdownString;
  summary: MarkdownString;
  testCaseCount: number;
  acceptancePointCount: number;
  evidenceCount: number;
  defectAnalysisCount: number;
  opsChecklistCount: number;
  unknownCount: number;
  limitationCount: number;
  releaseRecommendation?: ReleaseRecommendation;
  releaseReason?: MarkdownString;
  traceId: MarkdownString;
  evidenceIds: EvidenceId[];
  approvalRequestIds: MarkdownString[];
  auditEventIds: MarkdownString[];
  reportId?: MarkdownString;
  snapshotRecordCount: number;
  validationValid: boolean;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface CreateAgentTestingRunResponse {
  run: AgentTestingRunDto;
}

export interface GetAgentTestingRunResponse {
  run: AgentTestingRunDto;
}

export type ListAgentTestingRunsResponse = AgentTestingApiListResponse<AgentTestingRunDto>;

export interface EvidenceApiDto {
  id: EvidenceId;
  testCaseId?: MarkdownString;
  testScope: MarkdownString;
  executorType: SystemTestEvidence['executorType'];
  result: EvidenceResult;
  strength: EvidenceStrength;
  sourceSummary: MarkdownString;
  evidenceSummary: MarkdownString;
  severity: SystemTestEvidence['severity'];
  confidence: SystemTestEvidence['confidence'];
  limitations: MarkdownString[];
}

export interface SubmitEvidenceRequest {
  evidence: RawEvidenceInput[];
  notes?: MarkdownString[];
}

export interface SubmitEvidenceResponse {
  runId: MarkdownString;
  evidence: EvidenceApiDto[];
  warnings: MarkdownString[];
  normalizationIssues: MarkdownString[];
}

export type ListEvidenceResponse = AgentTestingApiListResponse<EvidenceApiDto>;

export interface ApprovalApiDto {
  approvalRequestId: MarkdownString;
  runId: MarkdownString;
  actionType: ApprovalRequest['actionType'];
  riskLevel: ApprovalRequest['riskLevel'];
  status: ApprovalRequest['status'];
  requiresHumanApproval: boolean;
  reason: MarkdownString;
  requiredApproverRole?: ApprovalPolicyOutput['requiredApproverRole'];
  policyViolations: MarkdownString[];
  limitations: MarkdownString[];
}

export interface EvaluateApprovalRequest {
  policyInput: ApprovalPolicyInput;
}

export interface EvaluateApprovalResponse {
  approval: ApprovalApiDto;
}

export type ListApprovalRequestsResponse = AgentTestingApiListResponse<ApprovalApiDto>;

export interface AuditEventApiDto {
  id: MarkdownString;
  runId: MarkdownString;
  traceId: MarkdownString;
  eventType: AuditEventType;
  outcome: MarkdownString;
  summary: MarkdownString;
  privacyLevel: MarkdownString;
  redactionApplied: boolean;
}

export interface AuditTrailApiDto {
  runId: MarkdownString;
  eventCount: number;
  redactedEventCount: number;
  policyViolationCount: number;
  pendingApprovalCount: number;
  forbiddenActionCount: number;
  evidenceIds: EvidenceId[];
  traceIds: MarkdownString[];
  events: AuditEventApiDto[];
  limitations: MarkdownString[];
}

export interface GetAuditTrailResponse {
  auditTrail: AuditTrailApiDto;
}

export interface ObservabilityMetricsApiDto {
  runCount: number;
  eventCount: number;
  evidenceCreatedCount: number;
  approvalRequiredCount: number;
  approvalPendingCount: number;
  approvalForbiddenCount: number;
  reportGeneratedCount: number;
  unknownRecordedCount: number;
  redactedEventCount: number;
  byEventType: Partial<ObservabilityMetrics['byEventType']>;
  byOutcome: Partial<ObservabilityMetrics['byOutcome']>;
  severityDistribution: ObservabilityMetrics['severityDistribution'];
  releaseRecommendationDistribution: ObservabilityMetrics['releaseRecommendationDistribution'];
  limitations: MarkdownString[];
}

export interface GetObservabilityMetricsResponse {
  metrics: ObservabilityMetricsApiDto;
}

export interface ReportApiDto {
  reportId: MarkdownString;
  markdownSummary: MarkdownString;
  markdown?: MarkdownString;
  sections: ReportSectionSummary[];
  warnings: MarkdownString[];
  missingInputs: MarkdownString[];
  relatedEvidenceIds: EvidenceId[];
  limitations: MarkdownString[];
}

export interface GenerateReportRequest {
  title?: MarkdownString;
  includeMarkdown?: boolean;
  notes?: MarkdownString[];
}

export interface GenerateReportResponse {
  report: ReportApiDto;
}

export interface GetReportResponse {
  report: ReportApiDto;
}

export interface PersistenceSnapshotApiDto {
  runId?: MarkdownString;
  runSummary?: MarkdownString;
  recordCount: number;
  relationshipCount: number;
  recordKinds: Record<MarkdownString, number>;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface GetPersistenceSnapshotResponse {
  snapshot: PersistenceSnapshotApiDto;
}

export interface ValidatePersistenceSnapshotResponse {
  snapshot: PersistenceSnapshotApiDto;
  validation: {
    valid: boolean;
    issueCount: number;
    errorCount: number;
    warningCount: number;
    issues: PersistenceValidationResult['issues'];
    warnings: MarkdownString[];
    limitations: MarkdownString[];
  };
}

export interface SmallNoteApiDemoResult {
  createRun: CreateAgentTestingRunResponse | undefined;
  getRun: GetAgentTestingRunResponse | undefined;
  observability: GetObservabilityMetricsResponse | undefined;
  snapshot: GetPersistenceSnapshotResponse | undefined;
  validation: ValidatePersistenceSnapshotResponse | undefined;
  report: GenerateReportResponse | undefined;
  summary: MarkdownString;
  limitations: MarkdownString[];
}

export type InternalSnapshot = AgentTestingPersistenceSnapshot;
export type InternalAuditTrail = AuditTrailOutput;

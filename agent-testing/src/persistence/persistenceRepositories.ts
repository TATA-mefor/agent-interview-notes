import type {
  MarkdownString,
} from '../types';
import type {
  PersistenceRelationship,
} from './persistenceRelationships';
import type {
  AgentTestingPersistenceRecord,
  ApprovalDecisionRecord,
  ApprovalRequestRecord,
  AuditEventRecord,
  ControlledExecutionPlanRecord,
  ControlledExecutionRequestRecord,
  ControlledExecutionResultRecord,
  EvidenceRecord,
  McpToolRequestRecord,
  McpToolResultRecord,
  ReportRecord,
  TestRunRecord,
} from './persistenceRecords';

export interface AgentTestingRunRepository {
  save(record: TestRunRecord): Promise<TestRunRecord>;
  findById(id: MarkdownString): Promise<TestRunRecord | undefined>;
  findByRunId(runId: MarkdownString): Promise<TestRunRecord | undefined>;
  listByRunId(runId: MarkdownString): Promise<TestRunRecord[]>;
  archive(id: MarkdownString): Promise<void>;
}

export interface AgentTestingEvidenceRepository {
  save(record: EvidenceRecord): Promise<EvidenceRecord>;
  findById(id: MarkdownString): Promise<EvidenceRecord | undefined>;
  findByRunId(runId: MarkdownString): Promise<EvidenceRecord[]>;
  listByRunId(runId: MarkdownString): Promise<EvidenceRecord[]>;
  archive(id: MarkdownString): Promise<void>;
}

export interface AgentTestingAuditRepository {
  save(record: AuditEventRecord): Promise<AuditEventRecord>;
  saveRelationship(relationship: PersistenceRelationship): Promise<PersistenceRelationship>;
  findById(id: MarkdownString): Promise<AuditEventRecord | undefined>;
  findByRunId(runId: MarkdownString): Promise<AuditEventRecord[]>;
  listByRunId(runId: MarkdownString): Promise<AuditEventRecord[]>;
  archive(id: MarkdownString): Promise<void>;
}

export interface AgentTestingApprovalRepository {
  saveRequest(record: ApprovalRequestRecord): Promise<ApprovalRequestRecord>;
  saveDecision(record: ApprovalDecisionRecord): Promise<ApprovalDecisionRecord>;
  findById(id: MarkdownString): Promise<ApprovalRequestRecord | ApprovalDecisionRecord | undefined>;
  findByRunId(runId: MarkdownString): Promise<Array<ApprovalRequestRecord | ApprovalDecisionRecord>>;
  listByRunId(runId: MarkdownString): Promise<Array<ApprovalRequestRecord | ApprovalDecisionRecord>>;
  archive(id: MarkdownString): Promise<void>;
}

export interface AgentTestingReportRepository {
  save(record: ReportRecord): Promise<ReportRecord>;
  findById(id: MarkdownString): Promise<ReportRecord | undefined>;
  findByRunId(runId: MarkdownString): Promise<ReportRecord[]>;
  listByRunId(runId: MarkdownString): Promise<ReportRecord[]>;
  archive(id: MarkdownString): Promise<void>;
}

export interface AgentTestingExecutionRepository {
  saveMcpRequest(record: McpToolRequestRecord): Promise<McpToolRequestRecord>;
  saveMcpResult(record: McpToolResultRecord): Promise<McpToolResultRecord>;
  saveControlledRequest(record: ControlledExecutionRequestRecord): Promise<ControlledExecutionRequestRecord>;
  saveControlledPlan(record: ControlledExecutionPlanRecord): Promise<ControlledExecutionPlanRecord>;
  saveControlledResult(record: ControlledExecutionResultRecord): Promise<ControlledExecutionResultRecord>;
  findById(id: MarkdownString): Promise<AgentTestingPersistenceRecord | undefined>;
  findByRunId(runId: MarkdownString): Promise<AgentTestingPersistenceRecord[]>;
  listByRunId(runId: MarkdownString): Promise<AgentTestingPersistenceRecord[]>;
  archive(id: MarkdownString): Promise<void>;
}

export interface AgentTestingPersistenceUnitOfWork {
  runs: AgentTestingRunRepository;
  evidence: AgentTestingEvidenceRepository;
  audit: AgentTestingAuditRepository;
  approval: AgentTestingApprovalRepository;
  reports: AgentTestingReportRepository;
  execution: AgentTestingExecutionRepository;
  saveRecord(record: AgentTestingPersistenceRecord): Promise<AgentTestingPersistenceRecord>;
  saveRelationship(relationship: PersistenceRelationship): Promise<PersistenceRelationship>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

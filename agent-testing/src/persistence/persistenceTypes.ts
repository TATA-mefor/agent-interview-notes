import type {
  AgentRole,
  IsoDateTimeString,
  MarkdownString,
  SourceReference,
} from '../types';

export type PersistenceRecordKind =
  | 'test_run'
  | 'agent_trace'
  | 'test_case'
  | 'acceptance_point'
  | 'evidence'
  | 'severity_classification'
  | 'defect'
  | 'defect_analysis'
  | 'regression_suggestion'
  | 'release_recommendation'
  | 'report'
  | 'approval_request'
  | 'approval_decision'
  | 'audit_event'
  | 'observability_snapshot'
  | 'mcp_tool_request'
  | 'mcp_tool_result'
  | 'controlled_execution_request'
  | 'controlled_execution_plan'
  | 'controlled_execution_result'
  | 'agent_memory'
  | 'agent_plan'
  | 'agent_reflection'
  | 'agent_task'
  | 'unknown';

export type PersistenceRecordStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'archived'
  | 'deleted_logical'
  | 'unknown';

export type PersistenceSensitivityLevel =
  | 'public'
  | 'internal'
  | 'sensitive_summary'
  | 'secret_redacted'
  | 'restricted';

export type PersistenceDataBoundary =
  | 'summary_only'
  | 'reference_only'
  | 'redacted_content'
  | 'structured_non_secret'
  | 'forbidden_raw_secret';

export interface PersistenceRecordSource {
  sourceRef?: SourceReference;
  agentRole?: AgentRole;
  skillName?: MarkdownString;
  mcpRequestId?: MarkdownString;
  controlledExecutionRequestId?: MarkdownString;
  auditEventId?: MarkdownString;
  notes?: MarkdownString[];
}

export interface PersistenceRecordBase {
  id: MarkdownString;
  kind: PersistenceRecordKind;
  runId: MarkdownString;
  status: PersistenceRecordStatus;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  createdBy: AgentRole | MarkdownString;
  sensitivity: PersistenceSensitivityLevel;
  dataBoundary: PersistenceDataBoundary;
  source: PersistenceRecordSource;
  limitations: MarkdownString[];
}

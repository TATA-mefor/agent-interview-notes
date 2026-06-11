import type {
  MarkdownString,
  SystemTestEvidence,
} from '../types';
import type {
  AuditEventInput,
} from '../audit';
import type {
  RawEvidenceInput,
} from '../evidence';
import type {
  McpAdapterKind,
  McpToolApprovalEvaluation,
  McpToolRequest,
  McpToolResult,
} from '../mcp';

export type ReadOnlyPilotAdapterKind = Extract<
  McpAdapterKind,
  | 'filesystem_repository'
  | 'git'
  | 'http_api'
  | 'database'
  | 'log_monitoring'
  | 'screenshot_attachment'
>;

export type ReadOnlyPilotToolName =
  | 'read_fixture_file'
  | 'read_git_diff_snapshot'
  | 'read_http_response_snapshot'
  | 'read_database_query_snapshot'
  | 'read_log_excerpt_snapshot'
  | 'read_screenshot_metadata_snapshot';

export interface ReadOnlyPilotSnapshotEntry {
  key: MarkdownString;
  summary: MarkdownString;
  detail?: MarkdownString;
  limitations: MarkdownString[];
}

export interface ReadOnlyPilotSnapshot {
  id: MarkdownString;
  name: MarkdownString;
  description: MarkdownString;
  files: ReadOnlyPilotSnapshotEntry[];
  gitDiffs: ReadOnlyPilotSnapshotEntry[];
  httpResponses: ReadOnlyPilotSnapshotEntry[];
  databaseRows: ReadOnlyPilotSnapshotEntry[];
  logExcerpts: ReadOnlyPilotSnapshotEntry[];
  screenshotMetadata: ReadOnlyPilotSnapshotEntry[];
  limitations: MarkdownString[];
}

export interface ReadOnlyPilotExecutionOptions {
  allowMediumRiskRead: boolean;
  requireApprovalGate: boolean;
  mapResultToEvidenceDraft: boolean;
  mapResultToAuditDraft: boolean;
  normalizeEvidencePreview?: boolean;
}

export interface ReadOnlyPilotExecutionInput {
  request: McpToolRequest;
  snapshot: ReadOnlyPilotSnapshot;
  options: ReadOnlyPilotExecutionOptions;
}

export interface ReadOnlyPilotExecutionOutput {
  request: McpToolRequest;
  approvalEvaluation: McpToolApprovalEvaluation;
  result: McpToolResult;
  rawEvidenceDraft?: RawEvidenceInput;
  requestAuditDraft?: AuditEventInput;
  resultAuditDraft?: AuditEventInput;
  normalizedEvidencePreview?: SystemTestEvidence;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface ReadOnlyPilotScenarioSummary {
  totalRequests: number;
  executedFakeReads: number;
  forbiddenRequests: number;
  approvalBlockedRequests: number;
  evidenceDraftsProduced: number;
  auditDraftsProduced: number;
}

export interface ReadOnlyPilotScenarioResult {
  snapshot: ReadOnlyPilotSnapshot;
  requests: McpToolRequest[];
  outputs: ReadOnlyPilotExecutionOutput[];
  summary: ReadOnlyPilotScenarioSummary;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

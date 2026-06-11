import type {
  MarkdownString,
} from '../types';

export type AgentTestingUiStatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

export interface AgentTestingUiBadge {
  label: MarkdownString;
  tone: AgentTestingUiStatusTone;
  title: MarkdownString;
}

export interface AgentTestingSummaryCard {
  label: MarkdownString;
  value: MarkdownString | number;
  tone: AgentTestingUiStatusTone;
  description: MarkdownString;
}

export interface AgentTestingRunOverviewViewModel {
  runId: MarkdownString;
  targetSystemName: MarkdownString;
  targetSystemType: MarkdownString;
  statusBadge: AgentTestingUiBadge;
  releaseBadge: AgentTestingUiBadge;
  summaryCards: AgentTestingSummaryCard[];
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingEvidenceRow {
  id: MarkdownString;
  testCaseId: MarkdownString;
  source: MarkdownString;
  executor: MarkdownString;
  result: MarkdownString;
  strength: MarkdownString;
  summary: MarkdownString;
  badge: AgentTestingUiBadge;
}

export interface AgentTestingApprovalRow {
  id: MarkdownString;
  actionType: MarkdownString;
  riskLevel: MarkdownString;
  status: MarkdownString;
  requiresApproval: boolean;
  reason: MarkdownString;
  badge: AgentTestingUiBadge;
}

export interface AgentTestingAuditTimelineItem {
  id: MarkdownString;
  eventType: MarkdownString;
  outcome: MarkdownString;
  actor: MarkdownString;
  summary: MarkdownString;
  timestamp: MarkdownString;
  badge: AgentTestingUiBadge;
}

export interface AgentTestingObservabilityViewModel {
  summaryCards: AgentTestingSummaryCard[];
  eventCounts: Record<MarkdownString, number>;
  severityDistribution: Record<MarkdownString, number>;
  approvalCounts: Record<MarkdownString, number>;
  mcpCounts: Record<MarkdownString, number>;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingReportSectionViewModel {
  name: MarkdownString;
  itemCount: number;
  hasWarnings: boolean;
}

export interface AgentTestingReportViewModel {
  title: MarkdownString;
  markdown: MarkdownString;
  sections: AgentTestingReportSectionViewModel[];
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingPersistenceViewModel {
  recordCount: number;
  relationshipCount: number;
  validationPassed: boolean;
  issues: MarkdownString[];
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingReleasePanelViewModel {
  badge: AgentTestingUiBadge;
  reason?: MarkdownString;
  blockingFactors: MarkdownString[];
  evidenceGaps: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingDemoShellViewModel {
  overview: AgentTestingRunOverviewViewModel;
  evidenceRows: AgentTestingEvidenceRow[];
  approvalRows: AgentTestingApprovalRow[];
  auditTimeline: AgentTestingAuditTimelineItem[];
  observability: AgentTestingObservabilityViewModel;
  report: AgentTestingReportViewModel;
  persistence: AgentTestingPersistenceViewModel;
  release: AgentTestingReleasePanelViewModel;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

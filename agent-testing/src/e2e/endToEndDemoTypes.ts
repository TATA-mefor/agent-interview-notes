import type {
  ApprovalPolicyOutput,
} from '../approval';
import type {
  AuditTrailOutput,
  ObservabilityMetrics,
} from '../audit';
import type {
  SmallNoteApiDemoResult,
} from '../api';
import type {
  ControlledExecutionPlan,
  ControlledExecutionRequest,
  ControlledExecutionResult,
  ControlledExecutionRisk,
  ControlledExecutionSafetyEvaluation,
} from '../controlled-execution';
import type {
  OfflineScenarioFixture,
  OfflineScenarioValidationResult,
} from '../examples';
import type {
  ReadOnlyPilotScenarioResult,
} from '../mcp-pilot';
import type {
  AgentTestingPersistenceSnapshot,
  PersistenceValidationResult,
} from '../persistence';
import type {
  MarkdownReportOutput,
} from '../report';
import type {
  AgentTestingDemoShellViewModel,
} from '../ui';
import type {
  MarkdownString,
} from '../types';

export type EndToEndDemoStatus =
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'inconclusive';

export type EndToEndDemoStageName =
  | 'fixture_loaded'
  | 'offline_scenario_validated'
  | 'api_demo_created'
  | 'ui_view_model_built'
  | 'read_only_mcp_pilot_run'
  | 'controlled_execution_boundary_checked'
  | 'approval_policy_evaluated'
  | 'audit_trail_built'
  | 'observability_metrics_built'
  | 'persistence_snapshot_built'
  | 'persistence_snapshot_validated'
  | 'report_preview_built'
  | 'summary_built';

export interface EndToEndDemoStageResult {
  stage: EndToEndDemoStageName;
  success: boolean;
  summary: MarkdownString;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface EndToEndDemoArtifactRefs {
  runId: MarkdownString;
  reportId?: MarkdownString;
  evidenceIds: MarkdownString[];
  auditEventIds: MarkdownString[];
  approvalRequestIds: MarkdownString[];
  persistenceRecordIds: MarkdownString[];
  uiSections: MarkdownString[];
  limitations: MarkdownString[];
}

export type EndToEndControlledExecutionPreviewKind =
  | 'safe_command_dry_run'
  | 'api_get_simulated'
  | 'forbidden_destructive';

export interface EndToEndControlledExecutionPreview {
  kind: EndToEndControlledExecutionPreviewKind;
  request: ControlledExecutionRequest;
  plan: ControlledExecutionPlan;
  safety: ControlledExecutionSafetyEvaluation;
  result?: ControlledExecutionResult;
  safetyCategory: ControlledExecutionRisk;
  simulated: boolean;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export type EndToEndApprovalPreviewLabel =
  | 'LOW'
  | 'HIGH'
  | 'FORBIDDEN';

export interface EndToEndApprovalPreview {
  label: EndToEndApprovalPreviewLabel;
  riskCategory: ApprovalPolicyOutput['riskAssessment']['riskLevel'];
  policyOutput: ApprovalPolicyOutput;
  expectedBoundary: MarkdownString;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface EndToEndDemoResult {
  id: MarkdownString;
  status: EndToEndDemoStatus;
  summary: MarkdownString;
  fixture: OfflineScenarioFixture;
  stages: EndToEndDemoStageResult[];
  offlineScenarioValidation: OfflineScenarioValidationResult;
  apiDemo: SmallNoteApiDemoResult;
  uiViewModel: AgentTestingDemoShellViewModel;
  readOnlyMcpPilot: ReadOnlyPilotScenarioResult;
  controlledExecutionPreview: EndToEndControlledExecutionPreview[];
  approvalPreview: EndToEndApprovalPreview[];
  auditPreview: AuditTrailOutput;
  observabilityPreview: ObservabilityMetrics;
  persistenceSnapshot: AgentTestingPersistenceSnapshot;
  persistenceValidation: PersistenceValidationResult;
  reportPreview?: MarkdownReportOutput;
  artifactRefs: EndToEndDemoArtifactRefs;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

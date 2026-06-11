export type IsoDateTimeString = string;
export type MarkdownString = string;
export type EvidenceId = string;
export type TestCaseId = string;
export type DefectId = string;
export type ConfidenceScore = 'low' | 'medium' | 'high';
export type SourceReference = string;
export type NonEmptyString = string;

export type AgentRole =
  | 'test_lead'
  | 'product_acceptance'
  | 'test_design'
  | 'developer_analysis'
  | 'ops_check'
  | 'user_representative';

export interface AgentRoleContract {
  role: AgentRole;
  responsibility: MarkdownString;
  input: MarkdownString;
  output: MarkdownString;
  boundary: MarkdownString;
}

export type AcceptancePriority = 'must' | 'should' | 'could';
export type AmbiguityLevel = 'low' | 'medium' | 'high';

export interface AcceptancePoint {
  id: NonEmptyString;
  source: SourceReference;
  description: MarkdownString;
  businessValue: MarkdownString;
  relatedModule: NonEmptyString;
  ambiguityLevel: AmbiguityLevel;
  questions: MarkdownString[];
  priority: AcceptancePriority;
}

export type TestPriority = 'high' | 'medium' | 'low';

export interface TestCaseStep {
  order: number;
  action: MarkdownString;
  expectedResult?: MarkdownString;
  evidenceHint?: MarkdownString;
}

export interface SystemTestCase {
  id: TestCaseId;
  title: NonEmptyString;
  scope: NonEmptyString;
  sourceRequirement: SourceReference;
  preconditions: MarkdownString[];
  steps: TestCaseStep[];
  expectedResult: MarkdownString;
  priority: TestPriority;
  requiredEvidence: MarkdownString[];
  ownerAgent: AgentRole;
  tags: string[];
}

export type EvidenceResult =
  | 'pass'
  | 'fail'
  | 'blocked'
  | 'not_run'
  | 'inconclusive';

export type EvidenceExecutorType =
  | 'human'
  | 'script'
  | 'api'
  | 'browser'
  | 'log_review'
  | 'config_review'
  | 'mcp_tool'
  | 'skill'
  | 'agent_reasoning';

export type EvidenceStrength = 'weak' | 'medium' | 'strong';

export interface TestEnvironment {
  name: NonEmptyString;
  url?: string;
  version?: string;
  commit?: string;
  database?: string;
  browser?: string;
  device?: string;
  network?: string;
  notes?: MarkdownString;
}

export type Severity = 'P0' | 'P1' | 'P2' | 'P3' | 'none' | 'unknown';

export interface SystemTestEvidence {
  id: EvidenceId;
  testCaseId?: TestCaseId;
  testScope: NonEmptyString;
  executionMethod: MarkdownString;
  /*
   * agent_reasoning is analysis-only evidence. It can explain or interpret
   * observations, but it cannot independently prove a test passed.
   */
  executorType: EvidenceExecutorType;
  result: EvidenceResult;
  evidenceSource: SourceReference;
  evidenceSummary: MarkdownString;
  command?: MarkdownString;
  apiRequest?: MarkdownString;
  apiResponse?: MarkdownString;
  logs?: MarkdownString[];
  screenshotPaths: string[];
  attachmentPaths: string[];
  observedAt: IsoDateTimeString;
  environment: TestEnvironment;
  severity: Severity;
  recommendation?: MarkdownString;
  confidence: ConfidenceScore;
  limitations: MarkdownString[];
  strength: EvidenceStrength;
}

export interface SeverityRule {
  severity: Severity;
  definition: MarkdownString;
  judgmentConditions: MarkdownString[];
  examples: MarkdownString[];
  blocksRelease: boolean;
  regressionRequired: boolean;
  minimumEvidenceStrength: EvidenceStrength;
}

/*
 * SeverityClassification is a structured rationale only. Phase 2 does not
 * implement classification logic or allow weak evidence to become a pass.
 */
export interface SeverityClassification {
  severity: Severity;
  reason: MarkdownString;
  blockingRelease: boolean;
  requiresRegression: boolean;
  minimumEvidenceStrength: EvidenceStrength;
  limitations: MarkdownString[];
}

export type DefectStatus =
  | 'open'
  | 'fixed'
  | 'wont_fix'
  | 'needs_evidence'
  | 'duplicate';

export type SuspectedLayer =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'auth'
  | 'permission'
  | 'deployment'
  | 'configuration'
  | 'network'
  | 'third_party'
  | 'unknown';

export interface DefectFinding {
  id: DefectId;
  testCaseId: TestCaseId;
  title: NonEmptyString;
  actualResult: MarkdownString;
  expectedResult: MarkdownString;
  severity: Severity;
  affectedArea: NonEmptyString;
  suspectedLayer: SuspectedLayer;
  evidenceIds: EvidenceId[];
  recommendation: MarkdownString;
  status: DefectStatus;
}

export type SkillName =
  | 'context_building'
  | 'acceptance_extraction'
  | 'test_case_generation'
  | 'evidence_normalization'
  | 'severity_classification'
  | 'ops_checklist'
  | 'defect_analysis'
  | 'report_generation'
  | 'regression_suggestion'
  | 'release_recommendation'
  | 'approval_policy'
  | 'audit_trail'
  | 'read_only_mcp_pilot'
  | 'controlled_execution';

export type SkillRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FORBIDDEN_IN_MVP';

/*
 * Skill contracts describe deterministic or testable internal capabilities.
 * They do not execute system tests or upgrade missing evidence into proof.
 */
export interface SkillContract {
  name: SkillName;
  responsibility: MarkdownString;
  input: MarkdownString;
  output: MarkdownString;
  evidenceProduced: MarkdownString;
  evidenceRequired: MarkdownString;
  riskLevel: SkillRiskLevel;
  boundary: MarkdownString;
  offlineTestStrategy: MarkdownString;
}

export interface SkillInvocation {
  id: NonEmptyString;
  skillName: SkillName;
  invokedByAgent: AgentRole;
  inputSummary: MarkdownString;
  outputSummary: MarkdownString;
  evidenceProduced: EvidenceId[];
  evidenceRequired: MarkdownString[];
  riskLevel: SkillRiskLevel;
  limitations: MarkdownString[];
  createdAt: IsoDateTimeString;
}

export type McpCapability =
  | 'filesystem_repository'
  | 'git'
  | 'terminal_command'
  | 'browser_automation'
  | 'http_api'
  | 'database'
  | 'log_monitoring'
  | 'screenshot_attachment';

export type McpPermissionLevel =
  | 'READ_ONLY'
  | 'WRITE_LIMITED'
  | 'EXECUTE_LIMITED'
  | 'WRITE_DANGEROUS'
  | 'PRODUCTION_FORBIDDEN';

export type McpSideEffectLevel =
  | 'NONE'
  | 'LOCAL_WRITE'
  | 'TEST_ENV_WRITE'
  | 'EXTERNAL_CALL'
  | 'DESTRUCTIVE';

export type McpToolResult =
  | 'success'
  | 'tool_failed'
  | 'environment_failed'
  | 'system_failed'
  | 'blocked';

/*
 * MCP contracts describe permissioned external access. They are records for
 * future adapters, not active MCP integration.
 */
export interface McpToolContract {
  capability: McpCapability;
  typicalTools: MarkdownString[];
  input: MarkdownString;
  output: MarkdownString;
  evidenceProduced: MarkdownString;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  boundary: MarkdownString;
  mvpStatus: MarkdownString;
}

export interface McpToolInvocation {
  id: NonEmptyString;
  serverName: NonEmptyString;
  toolName: NonEmptyString;
  invokedByAgent: AgentRole;
  purpose: MarkdownString;
  inputSummary: MarkdownString;
  outputSummary: MarkdownString;
  rawEvidenceRef?: SourceReference;
  permissionLevel: McpPermissionLevel;
  sideEffectLevel: McpSideEffectLevel;
  result: McpToolResult;
  limitations: MarkdownString[];
  createdAt: IsoDateTimeString;
}

export type ReleaseRecommendation =
  | 'approved'
  | 'approved_with_risks'
  | 'blocked'
  | 'inconclusive';

export interface ReportSummary {
  totalCases: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  inconclusive: number;
  narrative: MarkdownString;
}

export interface OpsRisk {
  id: NonEmptyString;
  area: NonEmptyString;
  description: MarkdownString;
  severity: Severity;
  evidenceIds: EvidenceId[];
  recommendation: MarkdownString;
  status: 'open' | 'accepted' | 'mitigated' | 'needs_evidence';
}

export interface UnknownItem {
  id: NonEmptyString;
  area: NonEmptyString;
  description: MarkdownString;
  missingEvidence: MarkdownString[];
  impact: MarkdownString;
  ownerAgent: AgentRole;
}

/*
 * Reports are derived artifacts. Approval still requires real evidence for
 * the tested scope, not agent reasoning alone.
 */
export interface SystemTestReport {
  id: NonEmptyString;
  title: NonEmptyString;
  targetSystem: NonEmptyString;
  testScope: MarkdownString;
  contextSources: SourceReference[];
  summary: ReportSummary;
  cases: SystemTestCase[];
  evidence: SystemTestEvidence[];
  defects: DefectFinding[];
  opsRisks: OpsRisk[];
  unknowns: UnknownItem[];
  releaseRecommendation: ReleaseRecommendation;
  generatedAt: IsoDateTimeString;
}

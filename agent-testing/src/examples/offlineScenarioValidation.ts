import type {
  MarkdownString,
  ReleaseRecommendation,
  Severity,
  SystemTestEvidence,
} from '../types';
import {
  runTestLeadOrchestration,
  type TestLeadOrchestrationInput,
  type TestLeadOrchestrationOutput,
} from '../orchestration';
import {
  smallNoteSystemFixture,
} from './smallNoteSystemFixture';

export interface OfflineScenarioExpectedCharacteristics {
  minimumAcceptancePoints?: number;
  minimumTestCases?: number;
  minimumEvidence?: number;
  expectedSeverityValues?: Severity[];
  expectedReleaseRecommendation?: ReleaseRecommendation;
  requiresDowngradedAgentReasoning?: boolean;
  requiresPermissionRisk?: boolean;
  requiresOpsRisk?: boolean;
  requiresReport?: boolean;
  requiresAuditDrafts?: boolean;
}

export interface OfflineScenarioFixture {
  id: MarkdownString;
  name: MarkdownString;
  description: MarkdownString;
  input: TestLeadOrchestrationInput;
  expectedCharacteristics: OfflineScenarioExpectedCharacteristics;
}

export interface OfflineScenarioCheck {
  name: MarkdownString;
  passed: boolean;
  expected: MarkdownString;
  actual: MarkdownString;
  message: MarkdownString;
}

export interface OfflineScenarioValidationResult {
  scenarioId: MarkdownString;
  scenarioName: MarkdownString;
  success: boolean;
  summary: MarkdownString;
  checks: OfflineScenarioCheck[];
  orchestration: TestLeadOrchestrationOutput;
  limitations: MarkdownString[];
}

function check(params: OfflineScenarioCheck): OfflineScenarioCheck {
  return params;
}

function includesRiskText(text: MarkdownString): boolean {
  const normalized = text.toLowerCase();

  return [
    'permission',
    'private',
    'unauthorized',
    'authorization',
    'privacy',
    '权限',
    '私密',
    '越权',
  ].some((keyword) => normalized.includes(keyword));
}

function includesOpsText(text: MarkdownString): boolean {
  const normalized = text.toLowerCase();

  return [
    'backup',
    'restore',
    'deployment',
    'logging',
    'database',
    'multi-user',
    'concurrent',
    '备份',
    '恢复',
    '部署',
    '日志',
    '数据库',
  ].some((keyword) => normalized.includes(keyword));
}

function evidenceText(evidence: SystemTestEvidence): MarkdownString {
  return [
    evidence.id,
    evidence.testScope,
    evidence.executionMethod,
    evidence.evidenceSource,
    evidence.evidenceSummary,
    evidence.recommendation,
    ...evidence.limitations,
  ].filter(Boolean).join(' ');
}

function collectSeverityValues(
  orchestration: TestLeadOrchestrationOutput
): Severity[] {
  return Array.from(new Set(orchestration.severityClassifications.map((item) =>
    item.classification.severity
  )));
}

function hasDowngradedAgentReasoning(
  orchestration: TestLeadOrchestrationOutput
): boolean {
  return orchestration.normalizedEvidence.some((item) =>
    item.executorType === 'agent_reasoning' &&
    item.result === 'inconclusive' &&
    item.strength === 'weak' &&
    item.limitations.some((limitation) =>
      limitation.toLowerCase().includes('agent reasoning cannot independently prove')
    )
  );
}

function hasPermissionRisk(
  orchestration: TestLeadOrchestrationOutput
): boolean {
  const releaseText = [
    ...(orchestration.releaseRecommendation?.blockingFactors.map((item) =>
      `${item.title} ${item.reason}`
    ) ?? []),
    ...(orchestration.releaseRecommendation?.riskSummary ?? []),
  ].join(' ');
  const defectText = orchestration.defectAnalyses.map((item) =>
    `${item.possibleCause} ${item.fixSuggestion} ${item.regressionSuggestion} ${item.relatedRisks.join(' ')}`
  ).join(' ');
  const evidenceRisk = orchestration.normalizedEvidence.some((item) =>
    item.result === 'fail' && includesRiskText(evidenceText(item))
  );

  return evidenceRisk || includesRiskText(releaseText) || includesRiskText(defectText);
}

function hasOpsRisk(
  orchestration: TestLeadOrchestrationOutput
): boolean {
  const opsChecklistRisk = orchestration.opsChecklist.some((item) =>
    item.blockingIfFailed && includesOpsText(`${item.title} ${item.category} ${item.relatedRisk}`)
  );
  const releaseOpsRisk = orchestration.releaseRecommendation?.blockingFactors.some((item) =>
    ['ops_risk', 'data_safety', 'deployment'].includes(item.type) ||
    includesOpsText(`${item.title} ${item.reason}`)
  ) ?? false;
  const evidenceOpsRisk = orchestration.normalizedEvidence.some((item) =>
    item.result !== 'pass' && includesOpsText(evidenceText(item))
  );

  return opsChecklistRisk || releaseOpsRisk || evidenceOpsRisk;
}

function noNoEvidenceCaseMarkedPass(
  fixture: OfflineScenarioFixture,
  orchestration: TestLeadOrchestrationOutput
): boolean {
  const rawPassCount = (fixture.input.rawEvidence ?? []).filter((item) =>
    item.rawResult === true ||
    (typeof item.rawResult === 'string' && ['pass', 'passed', 'success', 'ok'].includes(item.rawResult.toLowerCase()))
  ).length;
  const rawAgentReasoningPassCount = (fixture.input.rawEvidence ?? []).filter((item) =>
    item.executorType === 'agent_reasoning' &&
    (item.rawResult === true ||
      (typeof item.rawResult === 'string' && ['pass', 'passed', 'success', 'ok'].includes(item.rawResult.toLowerCase())))
  ).length;
  const allowedPassCount = rawPassCount - rawAgentReasoningPassCount;
  const normalizedPassCount = orchestration.normalizedEvidence.filter((item) =>
    item.result === 'pass'
  ).length;
  const agentReasoningPassCount = orchestration.normalizedEvidence.filter((item) =>
    item.executorType === 'agent_reasoning' && item.result === 'pass'
  ).length;

  return normalizedPassCount <= allowedPassCount && agentReasoningPassCount === 0;
}

function addMinimumCheck(
  checks: OfflineScenarioCheck[],
  name: MarkdownString,
  actual: number,
  expected: number | undefined
): void {
  if (expected === undefined) {
    return;
  }

  checks.push(check({
    name,
    passed: actual >= expected,
    expected: `>= ${expected}`,
    actual: String(actual),
    message: actual >= expected
      ? `${name} met the expected minimum.`
      : `${name} did not meet the expected minimum.`,
  }));
}

function addBooleanCheck(
  checks: OfflineScenarioCheck[],
  name: MarkdownString,
  actual: boolean,
  expectedEnabled: boolean | undefined,
  expectedMessage: MarkdownString
): void {
  if (!expectedEnabled) {
    return;
  }

  checks.push(check({
    name,
    passed: actual,
    expected: expectedMessage,
    actual: actual ? 'present' : 'missing',
    message: actual
      ? `${name} was found.`
      : `${name} was not found.`,
  }));
}

export function validateOfflineScenario(
  fixture: OfflineScenarioFixture
): OfflineScenarioValidationResult {
  if (!fixture?.id || !fixture.name || !fixture.input) {
    throw new Error('Offline scenario fixture is missing id, name, or input.');
  }

  const orchestration = runTestLeadOrchestration(fixture.input);
  const expected = fixture.expectedCharacteristics;
  const checks: OfflineScenarioCheck[] = [];

  addMinimumCheck(
    checks,
    'acceptance points',
    orchestration.acceptancePoints.length,
    expected.minimumAcceptancePoints
  );
  addMinimumCheck(
    checks,
    'test cases',
    orchestration.testCases.length,
    expected.minimumTestCases
  );
  addMinimumCheck(
    checks,
    'normalized evidence',
    orchestration.normalizedEvidence.length,
    expected.minimumEvidence
  );

  if (expected.expectedSeverityValues?.length) {
    const actualSeverities = collectSeverityValues(orchestration);
    const missing = expected.expectedSeverityValues.filter((severity) =>
      !actualSeverities.includes(severity)
    );

    checks.push(check({
      name: 'expected severity values',
      passed: missing.length === 0,
      expected: expected.expectedSeverityValues.join(', '),
      actual: actualSeverities.join(', ') || 'none',
      message: missing.length === 0
        ? 'Expected severity values were present.'
        : `Missing expected severity value(s): ${missing.join(', ')}.`,
    }));
  }

  if (expected.expectedReleaseRecommendation) {
    const actualRecommendation = orchestration.releaseRecommendation?.recommendation;

    checks.push(check({
      name: 'release recommendation',
      passed: actualRecommendation === expected.expectedReleaseRecommendation,
      expected: expected.expectedReleaseRecommendation,
      actual: actualRecommendation ?? 'missing',
      message: actualRecommendation === expected.expectedReleaseRecommendation
        ? 'Release recommendation matched the expected value.'
        : 'Release recommendation did not match the expected value.',
    }));
  }

  addBooleanCheck(
    checks,
    'downgraded agent reasoning evidence',
    hasDowngradedAgentReasoning(orchestration),
    expected.requiresDowngradedAgentReasoning,
    'agent_reasoning + pass is downgraded to inconclusive weak evidence'
  );
  addBooleanCheck(
    checks,
    'permission or private data risk',
    hasPermissionRisk(orchestration),
    expected.requiresPermissionRisk,
    'permission/private-data risk appears in evidence, defect analysis, or release factors'
  );
  addBooleanCheck(
    checks,
    'ops risk',
    hasOpsRisk(orchestration),
    expected.requiresOpsRisk,
    'ops risk appears in checklist, evidence, or release factors'
  );
  addBooleanCheck(
    checks,
    'markdown report',
    Boolean(orchestration.report?.markdown),
    expected.requiresReport,
    'report markdown is returned in memory'
  );
  addBooleanCheck(
    checks,
    'audit event drafts',
    orchestration.auditEventDrafts.length > 0,
    expected.requiresAuditDrafts,
    'auditEventDrafts are present as in-memory drafts'
  );

  checks.push(check({
    name: 'trace entries',
    passed: orchestration.trace.length > 0,
    expected: 'trace entries for deterministic orchestration steps',
    actual: `${orchestration.trace.length} trace entr${orchestration.trace.length === 1 ? 'y' : 'ies'}`,
    message: orchestration.trace.length > 0
      ? 'Trace entries were generated.'
      : 'No trace entries were generated.',
  }));

  checks.push(check({
    name: 'no no-evidence pass synthesis',
    passed: noNoEvidenceCaseMarkedPass(fixture, orchestration),
    expected: 'normalized pass evidence does not exceed provided non-agent pass inputs',
    actual: `${orchestration.normalizedEvidence.filter((item) => item.result === 'pass').length} normalized pass evidence item(s)`,
    message: noNoEvidenceCaseMarkedPass(fixture, orchestration)
      ? 'Validation did not find synthesized pass evidence.'
      : 'Validation found more pass evidence than the fixture can support.',
  }));

  const success = checks.every((item) => item.passed);
  const failedCount = checks.filter((item) => !item.passed).length;

  return {
    scenarioId: fixture.id,
    scenarioName: fixture.name,
    success,
    summary: success
      ? `Offline scenario ${fixture.id} passed ${checks.length} validation check(s).`
      : `Offline scenario ${fixture.id} failed ${failedCount} of ${checks.length} validation check(s).`,
    checks,
    orchestration,
    limitations: [
      'Offline scenario validation is deterministic and only evaluates provided fixture input.',
      'Validation does not connect to a real system, read files, write files, execute commands, call MCP, call LLMs, or persist audit events.',
      'Validation output and generated report markdown are not real system test results.',
      ...orchestration.limitations,
    ],
  };
}

export function validateSmallNoteSystemScenario(): OfflineScenarioValidationResult {
  return validateOfflineScenario(smallNoteSystemFixture);
}

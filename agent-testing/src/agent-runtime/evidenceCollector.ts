import type {
  EvidenceResult,
  EvidenceStrength,
  SystemTestCase,
  SystemTestEvidence,
} from '../types';
import type {
  ReleaseRecommendationOutput,
} from '../release';
import type {
  SharedBlackboard,
} from './agentRuntimeTypes';

export type EvidenceGapReason =
  | 'missing_evidence'
  | 'weak_evidence'
  | 'inconclusive_evidence'
  | 'agent_reasoning_only'
  | 'simulated_or_placeholder_only'
  | 'conflicting_evidence'
  | 'missing_test_case_link'
  | 'missing_required_artifact'
  | 'unknown';

export type EvidenceGapStatus =
  | 'open'
  | 'partially_covered'
  | 'covered'
  | 'not_applicable';

export interface EvidenceGap {
  id: string;
  sessionId: string;
  testCaseId?: string;
  relatedEvidenceIds: string[];
  reason: EvidenceGapReason;
  status: EvidenceGapStatus;
  summary: string;
  recommendedAction: string;
  severityHint?: string;
  limitations: string[];
}

export type EvidenceCoverageStatus =
  | 'no_evidence'
  | 'weak_only'
  | 'inconclusive'
  | 'covered'
  | 'conflicting'
  | 'unknown';

export interface TestCaseEvidenceCoverage {
  testCaseId: string;
  evidenceIds: string[];
  status: EvidenceCoverageStatus;
  summary: string;
  limitations: string[];
}

export interface BlackboardEvidenceSummary {
  sessionId: string;
  testCaseCount: number;
  evidenceCount: number;
  normalizedEvidenceCount: number;
  noEvidenceTestCaseCount: number;
  weakEvidenceCount: number;
  inconclusiveEvidenceCount: number;
  simulatedOrPlaceholderEvidenceCount: number;
  conflictCount: number;
  coverage: TestCaseEvidenceCoverage[];
  gaps: EvidenceGap[];
  warnings: string[];
  limitations: string[];
}

export interface NoEvidenceNoPassIssue {
  testCaseId?: string;
  evidenceId?: string;
  message: string;
}

export interface NoEvidenceNoPassResult {
  valid: boolean;
  issues: NoEvidenceNoPassIssue[];
  warnings: string[];
  limitations: string[];
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function stringField(value: unknown, field: string): string | undefined {
  const record = asRecord(value);
  const fieldValue = record[field];

  return typeof fieldValue === 'string' && fieldValue.trim().length > 0
    ? fieldValue
    : undefined;
}

function stringArrayField(value: unknown, field: string): string[] {
  const record = asRecord(value);
  const fieldValue = record[field];

  return Array.isArray(fieldValue)
    ? fieldValue.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function evidenceId(value: unknown): string {
  return stringField(value, 'id') ?? 'unknown-evidence';
}

function evidenceTestCaseId(value: unknown): string | undefined {
  return stringField(value, 'testCaseId');
}

function evidenceResult(value: unknown): EvidenceResult | undefined {
  const result = stringField(value, 'result');

  if (
    result === 'pass' ||
    result === 'fail' ||
    result === 'blocked' ||
    result === 'not_run' ||
    result === 'inconclusive'
  ) {
    return result;
  }

  const rawResult = stringField(value, 'rawResult');

  if (
    rawResult === 'pass' ||
    rawResult === 'fail' ||
    rawResult === 'blocked' ||
    rawResult === 'not_run' ||
    rawResult === 'inconclusive'
  ) {
    return rawResult;
  }

  return undefined;
}

function evidenceStrength(value: unknown): EvidenceStrength | undefined {
  const strength = stringField(value, 'strength');

  return strength === 'weak' || strength === 'medium' || strength === 'strong'
    ? strength
    : undefined;
}

function evidenceExecutorType(value: unknown): string | undefined {
  return stringField(value, 'executorType');
}

function evidenceCorpus(value: unknown): string {
  return [
    stringField(value, 'id'),
    stringField(value, 'testCaseId'),
    stringField(value, 'testScope'),
    stringField(value, 'executionMethod'),
    stringField(value, 'executorType'),
    stringField(value, 'evidenceSource'),
    stringField(value, 'evidenceSummary'),
    stringField(value, 'recommendation'),
    stringField(value, 'rawResult'),
    ...stringArrayField(value, 'limitations'),
  ].filter(Boolean).join(' ').toLowerCase();
}

function isAgentReasoningEvidence(value: unknown): boolean {
  return evidenceExecutorType(value) === 'agent_reasoning' ||
    evidenceCorpus(value).includes('agent_reasoning');
}

function isSimulatedOrPlaceholderEvidence(value: unknown): boolean {
  const corpus = evidenceCorpus(value);

  return (
    corpus.includes('simulated') ||
    corpus.includes('simulation') ||
    corpus.includes('placeholder') ||
    corpus.includes('draft')
  );
}

function isWeakEvidence(value: unknown): boolean {
  return evidenceStrength(value) === 'weak' || isAgentReasoningEvidence(value);
}

function isInconclusiveEvidence(value: unknown): boolean {
  const result = evidenceResult(value);

  return result === 'inconclusive' || result === 'not_run';
}

function caseId(value: unknown): string {
  return stringField(value, 'id') ?? 'unknown-test-case';
}

function evidenceForCase(evidence: unknown[], testCaseId: string): unknown[] {
  return evidence.filter((item) => evidenceTestCaseId(item) === testCaseId);
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function buildGap(params: {
  sessionId: string;
  testCaseId?: string;
  relatedEvidenceIds?: string[];
  reason: EvidenceGapReason;
  status?: EvidenceGapStatus;
  summary: string;
  recommendedAction: string;
  severityHint?: string;
  limitations?: string[];
}): EvidenceGap {
  const scope = params.testCaseId ?? params.relatedEvidenceIds?.join('-') ?? params.reason;

  return {
    id: `EG-${params.reason.toUpperCase().replace(/_/g, '-')}-${scope.replace(/[^A-Za-z0-9-]+/g, '-')}`,
    sessionId: params.sessionId,
    testCaseId: params.testCaseId,
    relatedEvidenceIds: params.relatedEvidenceIds ?? [],
    reason: params.reason,
    status: params.status ?? 'open',
    summary: params.summary,
    recommendedAction: params.recommendedAction,
    severityHint: params.severityHint,
    limitations: params.limitations ?? [],
  };
}

function inferCoverageStatus(related: unknown[]): EvidenceCoverageStatus {
  if (related.length === 0) {
    return 'no_evidence';
  }

  const results = uniqueList(related.map(evidenceResult).filter((item): item is EvidenceResult => Boolean(item)));

  if (
    results.some((result) => result === 'pass') &&
    results.some((result) => result === 'fail' || result === 'blocked')
  ) {
    return 'conflicting';
  }

  if (related.every(isWeakEvidence)) {
    return 'weak_only';
  }

  if (related.some(isInconclusiveEvidence)) {
    return 'inconclusive';
  }

  if (related.some((item) => {
    const result = evidenceResult(item);
    const strength = evidenceStrength(item);

    return (
      (result === 'pass' || result === 'fail' || result === 'blocked') &&
      (strength === 'medium' || strength === 'strong') &&
      !isAgentReasoningEvidence(item) &&
      !isSimulatedOrPlaceholderEvidence(item)
    );
  })) {
    return 'covered';
  }

  return 'unknown';
}

function coverageSummary(testCaseId: string, related: unknown[], status: EvidenceCoverageStatus): string {
  if (status === 'no_evidence') {
    return `Test case ${testCaseId} has no linked evidence.`;
  }

  if (status === 'weak_only') {
    return `Test case ${testCaseId} has only weak or analysis-only evidence.`;
  }

  if (status === 'inconclusive') {
    return `Test case ${testCaseId} has inconclusive or not_run evidence.`;
  }

  if (status === 'conflicting') {
    return `Test case ${testCaseId} has conflicting pass and fail or blocked evidence.`;
  }

  if (status === 'covered') {
    return `Test case ${testCaseId} has linked execution evidence.`;
  }

  return `Test case ${testCaseId} evidence coverage is unknown from blackboard shape.`;
}

function buildCoverage(
  testCases: unknown[],
  normalizedEvidence: unknown[]
): TestCaseEvidenceCoverage[] {
  return testCases.map((testCase) => {
    const id = caseId(testCase);
    const related = evidenceForCase(normalizedEvidence, id);
    const status = inferCoverageStatus(related);

    return {
      testCaseId: id,
      evidenceIds: related.map(evidenceId),
      status,
      summary: coverageSummary(id, related, status),
      limitations: status === 'covered'
        ? []
        : ['Coverage is derived from blackboard evidence links only; no live system was inspected.'],
    };
  });
}

function gapsForCoverage(
  sessionId: string,
  coverage: TestCaseEvidenceCoverage[]
): EvidenceGap[] {
  return coverage.flatMap((item) => {
    if (item.status === 'covered') {
      return [];
    }

    if (item.status === 'no_evidence') {
      return [buildGap({
        sessionId,
        testCaseId: item.testCaseId,
        reason: 'missing_evidence',
        summary: `Evidence gap: test case ${item.testCaseId} has no linked evidence.`,
        recommendedAction: 'Collect real execution evidence before claiming this test case passed.',
      })];
    }

    if (item.status === 'weak_only') {
      return [buildGap({
        sessionId,
        testCaseId: item.testCaseId,
        relatedEvidenceIds: item.evidenceIds,
        reason: 'weak_evidence',
        status: 'partially_covered',
        summary: `Weak evidence: test case ${item.testCaseId} only has weak or analysis-only evidence.`,
        recommendedAction: 'Collect medium-or-strong human, browser, API, script, log, config, or MCP-referenced evidence.',
      })];
    }

    if (item.status === 'inconclusive') {
      return [buildGap({
        sessionId,
        testCaseId: item.testCaseId,
        relatedEvidenceIds: item.evidenceIds,
        reason: 'inconclusive_evidence',
        status: 'partially_covered',
        summary: `Inconclusive evidence: test case ${item.testCaseId} includes inconclusive or not_run evidence.`,
        recommendedAction: 'Resolve the inconclusive or not_run result with fresh execution evidence.',
      })];
    }

    if (item.status === 'conflicting') {
      return [buildGap({
        sessionId,
        testCaseId: item.testCaseId,
        relatedEvidenceIds: item.evidenceIds,
        reason: 'conflicting_evidence',
        summary: `Conflicting evidence: test case ${item.testCaseId} has pass and fail or blocked evidence.`,
        recommendedAction: 'Triage conflicting evidence and preserve the failing or blocked signal until resolved.',
        severityHint: 'unknown',
      })];
    }

    return [buildGap({
      sessionId,
      testCaseId: item.testCaseId,
      relatedEvidenceIds: item.evidenceIds,
      reason: 'unknown',
      summary: `Evidence coverage for test case ${item.testCaseId} cannot be classified from blackboard data.`,
      recommendedAction: 'Normalize evidence and ensure each evidence record has result, strength, source, and testCaseId.',
    })];
  });
}

function gapsForEvidenceRecords(
  sessionId: string,
  evidence: unknown[]
): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  for (const item of evidence) {
    const id = evidenceId(item);
    const testCaseId = evidenceTestCaseId(item);

    if (!testCaseId) {
      gaps.push(buildGap({
        sessionId,
        relatedEvidenceIds: [id],
        reason: 'missing_test_case_link',
        summary: `Evidence gap: evidence ${id} has no linked testCaseId.`,
        recommendedAction: 'Link evidence to a planned test case or mark it as scope-level evidence explicitly.',
      }));
    }

    if (isInconclusiveEvidence(item)) {
      gaps.push(buildGap({
        sessionId,
        testCaseId,
        relatedEvidenceIds: [id],
        reason: 'inconclusive_evidence',
        status: 'partially_covered',
        summary: `Inconclusive evidence: ${id} is ${evidenceResult(item) ?? 'unknown'}.`,
        recommendedAction: 'Collect resolved evidence before using it for release approval.',
      }));
    }

    if (isAgentReasoningEvidence(item)) {
      gaps.push(buildGap({
        sessionId,
        testCaseId,
        relatedEvidenceIds: [id],
        reason: 'agent_reasoning_only',
        status: 'partially_covered',
        summary: `Weak evidence: ${id} is agent_reasoning_only and cannot support pass.`,
        recommendedAction: 'Replace or supplement with execution evidence from human, browser, API, script, log, config, or approved MCP output.',
      }));
    }

    if (isSimulatedOrPlaceholderEvidence(item)) {
      gaps.push(buildGap({
        sessionId,
        testCaseId,
        relatedEvidenceIds: [id],
        reason: 'simulated_or_placeholder_only',
        summary: `Simulated evidence: ${id} is placeholder, simulated, or draft and must not be treated as real execution evidence.`,
        recommendedAction: 'Collect real evidence before claiming product behavior.',
      }));
    }

    if (isWeakEvidence(item)) {
      gaps.push(buildGap({
        sessionId,
        testCaseId,
        relatedEvidenceIds: [id],
        reason: 'weak_evidence',
        status: 'partially_covered',
        summary: `Weak evidence: ${id} has weak strength or analysis-only source.`,
        recommendedAction: 'Collect medium-or-strong evidence for release-relevant assertions.',
      }));
    }
  }

  return gaps;
}

export function detectEvidenceGaps(
  blackboard: SharedBlackboard
): EvidenceGap[] {
  if (!blackboard || typeof blackboard !== 'object') {
    throw new Error('SharedBlackboard is required for evidence gap detection.');
  }

  const testCases = arrayOf<SystemTestCase>(blackboard.testCases);
  const normalizedEvidence = arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence);
  const rawEvidence = arrayOf<unknown>(blackboard.rawEvidence);
  const evidence = normalizedEvidence.length > 0 ? normalizedEvidence : rawEvidence;
  const coverage = buildCoverage(testCases, evidence);
  const gaps = [
    ...gapsForCoverage(blackboard.sessionId, coverage),
    ...gapsForEvidenceRecords(blackboard.sessionId, evidence),
  ];

  return uniqueList(gaps.map((gap) => JSON.stringify(gap))).map(
    (gap) => JSON.parse(gap) as EvidenceGap
  );
}

export function collectEvidenceFromBlackboard(
  blackboard: SharedBlackboard
): BlackboardEvidenceSummary {
  if (!blackboard || typeof blackboard !== 'object') {
    throw new Error('SharedBlackboard is required for evidence collection.');
  }

  const testCases = arrayOf<SystemTestCase>(blackboard.testCases);
  const rawEvidence = arrayOf<unknown>(blackboard.rawEvidence);
  const normalizedEvidence = arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence);
  const evidence = normalizedEvidence.length > 0 ? normalizedEvidence : rawEvidence;
  const coverage = buildCoverage(testCases, evidence);
  const gaps = detectEvidenceGaps(blackboard);
  const conflictCount = coverage.filter((item) => item.status === 'conflicting').length;
  const noEvidenceTestCaseCount = coverage.filter((item) => item.status === 'no_evidence').length;
  const weakEvidenceCount = evidence.filter(isWeakEvidence).length;
  const inconclusiveEvidenceCount = evidence.filter(isInconclusiveEvidence).length;
  const simulatedOrPlaceholderEvidenceCount = evidence.filter(isSimulatedOrPlaceholderEvidence).length;
  const warnings = [
    noEvidenceTestCaseCount > 0
      ? `${noEvidenceTestCaseCount} test case(s) have no linked evidence.`
      : undefined,
    weakEvidenceCount > 0
      ? `${weakEvidenceCount} evidence item(s) are weak or analysis-only.`
      : undefined,
    inconclusiveEvidenceCount > 0
      ? `${inconclusiveEvidenceCount} evidence item(s) are inconclusive or not_run.`
      : undefined,
    simulatedOrPlaceholderEvidenceCount > 0
      ? `${simulatedOrPlaceholderEvidenceCount} evidence item(s) look simulated, placeholder, or draft.`
      : undefined,
    conflictCount > 0
      ? `${conflictCount} test case(s) have conflicting evidence.`
      : undefined,
  ].filter((item): item is string => Boolean(item));

  return {
    sessionId: blackboard.sessionId,
    testCaseCount: testCases.length,
    evidenceCount: rawEvidence.length,
    normalizedEvidenceCount: normalizedEvidence.length,
    noEvidenceTestCaseCount,
    weakEvidenceCount,
    inconclusiveEvidenceCount,
    simulatedOrPlaceholderEvidenceCount,
    conflictCount,
    coverage,
    gaps,
    warnings,
    limitations: [
      'M3 evidence summary is best-effort and derived only from in-memory SharedBlackboard fields.',
      'Evidence collector does not execute tests, read files, inspect logs, call MCP, call LLM, or access live systems.',
      'Missing evidence, weak evidence, agent reasoning, simulated output, and placeholder output are not treated as pass.',
    ],
  };
}

export function summarizeEvidenceGaps(
  gaps: readonly EvidenceGap[]
): {
  total: number;
  open: number;
  partiallyCovered: number;
  covered: number;
  byReason: Record<string, number>;
  limitations: string[];
} {
  const byReason: Record<string, number> = {};

  for (const gap of gaps) {
    byReason[gap.reason] = (byReason[gap.reason] ?? 0) + 1;
  }

  return {
    total: gaps.length,
    open: gaps.filter((gap) => gap.status === 'open').length,
    partiallyCovered: gaps.filter((gap) => gap.status === 'partially_covered').length,
    covered: gaps.filter((gap) => gap.status === 'covered').length,
    byReason,
    limitations: [
      'Evidence gap summary is derived from gap metadata only and does not inspect external evidence.',
    ],
  };
}

function releaseRecommendationText(blackboard: SharedBlackboard): string {
  const recommendation = blackboard.releaseRecommendation as ReleaseRecommendationOutput | undefined;

  if (!recommendation || typeof recommendation !== 'object') {
    return '';
  }

  return [
    recommendation.recommendation,
    recommendation.reason,
    ...recommendation.riskSummary,
    ...recommendation.evidenceGaps,
    ...recommendation.limitations,
  ].join(' ').toLowerCase();
}

function reportText(blackboard: SharedBlackboard): string {
  return typeof blackboard.report === 'string' ? blackboard.report.toLowerCase() : '';
}

function hasPassClaimForCase(text: string, testCaseId: string): boolean {
  if (!text.includes(testCaseId.toLowerCase())) {
    return false;
  }

  return (
    text.includes(' pass') ||
    text.includes(': pass') ||
    text.includes('| pass') ||
    text.includes('passed')
  );
}

export function enforceNoEvidenceNoPass(
  blackboard: SharedBlackboard
): NoEvidenceNoPassResult {
  const summary = collectEvidenceFromBlackboard(blackboard);
  const text = [releaseRecommendationText(blackboard), reportText(blackboard)].join(' ');
  const issues: NoEvidenceNoPassIssue[] = [];

  for (const coverage of summary.coverage) {
    if (coverage.status !== 'no_evidence') {
      continue;
    }

    if (hasPassClaimForCase(text, coverage.testCaseId)) {
      issues.push({
        testCaseId: coverage.testCaseId,
        message: `Test case ${coverage.testCaseId} has no linked evidence but report or release text appears to imply pass.`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings: issues.map((issue) => issue.message),
    limitations: [
      'No-evidence-no-pass check is conservative and only inspects blackboard report and release recommendation text.',
      'If no explicit pass claim is found, missing evidence still remains an evidence gap.',
    ],
  };
}

export function buildEvidenceAwareBlackboardNotes(
  blackboard: SharedBlackboard
): string[] {
  const summary = collectEvidenceFromBlackboard(blackboard);
  const safetyCheck = enforceNoEvidenceNoPass(blackboard);

  return uniqueList([
    ...summary.gaps.map((gap) => gap.summary),
    ...safetyCheck.issues.map((issue) => issue.message),
  ]).slice(0, 50);
}

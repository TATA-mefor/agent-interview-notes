import type {
  ConfidenceScore,
  DefectFinding,
  MarkdownString,
  ReleaseRecommendation,
  Severity,
  SeverityClassification,
  SystemTestCase,
  SystemTestEvidence,
  TestCaseId,
  UnknownItem,
} from '../types';
import type {
  OpsChecklistItem,
} from '../ops';
import type {
  RegressionSuggestionItem,
} from '../regression';
import type {
  SeverityClassificationOutput,
} from '../severity';

export interface ReleaseRecommendationInput {
  testCases?: SystemTestCase[];
  evidence?: SystemTestEvidence[];
  severityClassifications?: Array<SeverityClassification | SeverityClassificationOutput>;
  defects?: DefectFinding[];
  opsChecklist?: OpsChecklistItem[];
  regressionSuggestions?: RegressionSuggestionItem[];
  unknowns?: Array<UnknownItem | MarkdownString>;
  limitations?: MarkdownString[];
  manualOverride?: MarkdownString | {
    recommendation?: ReleaseRecommendationValue;
    reason?: MarkdownString;
    approvedBy?: MarkdownString;
    notes?: MarkdownString[];
  };
  notes?: MarkdownString[];
}

export type ReleaseRecommendationValue = ReleaseRecommendation;

export type ReleaseBlockingFactorType =
  | 'severity'
  | 'defect'
  | 'ops_risk'
  | 'evidence'
  | 'unknown'
  | 'data_safety'
  | 'security'
  | 'deployment';

export interface ReleaseBlockingFactor {
  id: MarkdownString;
  type: ReleaseBlockingFactorType;
  title: MarkdownString;
  reason: MarkdownString;
  relatedEvidenceIds: string[];
  relatedDefectIds: string[];
  relatedTestCaseIds: TestCaseId[];
  severity: Severity;
  requiredAction: MarkdownString;
}

export interface ReleaseInputSummary {
  testCaseCount: number;
  evidenceCount: number;
  severityCount: number;
  defectCount: number;
  openDefectCount: number;
  opsChecklistCount: number;
  releaseBlockingOpsCount: number;
  regressionSuggestionCount: number;
  unknownCount: number;
  limitationCount: number;
}

export interface ReleaseRecommendationOutput {
  recommendation: ReleaseRecommendationValue;
  reason: MarkdownString;
  blockingFactors: ReleaseBlockingFactor[];
  riskSummary: MarkdownString[];
  requiredActions: MarkdownString[];
  evidenceGaps: MarkdownString[];
  confidence: ConfidenceScore;
  limitations: MarkdownString[];
}

type ClassifiedSeverity = SeverityClassification & {
  reason: MarkdownString;
};

const CRITICAL_KEYWORDS = [
  'permission bypass',
  'privilege escalation',
  'private data',
  'data leak',
  'data loss',
  'backup failure',
  'restore failure',
  'deployment unavailable',
  'service unavailable',
  'core deployment',
  'overwrite',
  'concurrent',
  'multi-user',
  'unauthorized',
  '权限绕过',
  '越权',
  '私密数据',
  '数据泄露',
  '数据丢失',
  '备份失败',
  '恢复失败',
  '部署不可访问',
  '覆盖',
  '并发',
];

const CORE_KEYWORDS = [
  'core',
  'critical',
  'login',
  'auth',
  'permission',
  'private',
  'data',
  'backup',
  'restore',
  'deploy',
  'deployment',
  'multi-user',
  'concurrent',
  '核心',
  '登录',
  '权限',
  '私密',
  '数据',
  '备份',
  '恢复',
  '部署',
  '多人',
  '并发',
];

function list<T>(items: T[] | undefined): T[] {
  return items ?? [];
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function getClassification(
  item: SeverityClassification | SeverityClassificationOutput
): ClassifiedSeverity {
  if ('classification' in item) {
    return {
      ...item.classification,
      reason: item.reason,
    };
  }

  return {
    ...item,
    reason: item.reason,
  };
}

function normalizeUnknown(item: UnknownItem | MarkdownString): MarkdownString {
  if (typeof item === 'string') {
    return item;
  }

  return `${item.area}: ${item.description}. Missing evidence: ${item.missingEvidence.join(', ') || 'not provided'}. Impact: ${item.impact}`;
}

function textIncludesAny(text: MarkdownString, keywords: MarkdownString[]): boolean {
  const normalized = text.toLowerCase();

  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function corpusForTestCase(testCase: SystemTestCase): MarkdownString {
  return [
    testCase.id,
    testCase.title,
    testCase.scope,
    testCase.sourceRequirement,
    testCase.expectedResult,
    testCase.priority,
    testCase.tags.join(' '),
    testCase.requiredEvidence.join(' '),
  ].join(' ');
}

function corpusForEvidence(evidence: SystemTestEvidence): MarkdownString {
  return [
    evidence.id,
    evidence.testCaseId,
    evidence.testScope,
    evidence.executionMethod,
    evidence.evidenceSummary,
    evidence.evidenceSource,
    evidence.recommendation,
    evidence.limitations.join(' '),
    evidence.logs?.join(' '),
  ].filter(Boolean).join(' ');
}

function isCoreTestCase(testCase: SystemTestCase): boolean {
  return testCase.priority === 'high' || textIncludesAny(corpusForTestCase(testCase), CORE_KEYWORDS);
}

function evidenceForCase(
  evidence: SystemTestEvidence[],
  testCaseId: TestCaseId
): SystemTestEvidence[] {
  return evidence.filter((item) => item.testCaseId === testCaseId);
}

function isMediumOrStrong(evidence: SystemTestEvidence): boolean {
  return evidence.strength === 'medium' || evidence.strength === 'strong';
}

function isUnresolvedDefect(defect: DefectFinding): boolean {
  return defect.status === 'open' || defect.status === 'needs_evidence';
}

function hasWorkaroundText(text: MarkdownString): boolean {
  return textIncludesAny(text, [
    'workaround',
    'mitigation',
    'mitigated',
    'accepted risk',
    'fixed',
    '后续修复',
    '规避',
    '缓解',
    '已修复',
  ]);
}

function hasWorkaround(input: ReleaseRecommendationInput, evidence?: SystemTestEvidence): boolean {
  const text = [
    evidence?.recommendation,
    ...list(input.defects).map((defect) => defect.recommendation),
    ...list(input.regressionSuggestions).map((item) => item.reason),
    ...list(input.notes),
    typeof input.manualOverride === 'string' ? input.manualOverride : input.manualOverride?.reason,
    ...(typeof input.manualOverride === 'object' ? list(input.manualOverride.notes) : []),
  ].filter(Boolean).join(' ');

  return hasWorkaroundText(text);
}

function hasPassingEvidenceForOpsItem(
  item: OpsChecklistItem,
  evidence: SystemTestEvidence[]
): boolean {
  const requiredEvidenceText = item.requiredEvidence.join(' ');
  const itemCorpus = [
    item.title,
    item.category,
    item.relatedRisk,
    item.description,
    requiredEvidenceText,
  ].join(' ');

  return evidence.some((evidenceItem) => {
    const evidenceCorpus = corpusForEvidence(evidenceItem);

    return (
      evidenceItem.result === 'pass' &&
      isMediumOrStrong(evidenceItem) &&
      (
        textIncludesAny(evidenceCorpus, [item.category, item.title]) ||
        textIncludesAny(evidenceCorpus, item.tags) ||
        textIncludesAny(itemCorpus, [evidenceItem.testScope])
      )
    );
  });
}

function buildFactor(params: {
  id: MarkdownString;
  type: ReleaseBlockingFactorType;
  title: MarkdownString;
  reason: MarkdownString;
  relatedEvidenceIds?: string[];
  relatedDefectIds?: string[];
  relatedTestCaseIds?: TestCaseId[];
  severity?: Severity;
  requiredAction: MarkdownString;
}): ReleaseBlockingFactor {
  return {
    id: params.id,
    type: params.type,
    title: params.title,
    reason: params.reason,
    relatedEvidenceIds: params.relatedEvidenceIds ?? [],
    relatedDefectIds: params.relatedDefectIds ?? [],
    relatedTestCaseIds: params.relatedTestCaseIds ?? [],
    severity: params.severity ?? 'unknown',
    requiredAction: params.requiredAction,
  };
}

export function summarizeReleaseInputs(
  input: ReleaseRecommendationInput
): ReleaseInputSummary {
  const opsChecklist = list(input.opsChecklist);
  const defects = list(input.defects);

  return {
    testCaseCount: list(input.testCases).length,
    evidenceCount: list(input.evidence).length,
    severityCount: list(input.severityClassifications).length,
    defectCount: defects.length,
    openDefectCount: defects.filter(isUnresolvedDefect).length,
    opsChecklistCount: opsChecklist.length,
    releaseBlockingOpsCount: opsChecklist.filter((item) => item.blockingIfFailed).length,
    regressionSuggestionCount: list(input.regressionSuggestions).length,
    unknownCount: list(input.unknowns).length,
    limitationCount: list(input.limitations).length,
  };
}

export function hasCoreEvidence(input: ReleaseRecommendationInput): boolean {
  const testCases = list(input.testCases);
  const evidence = list(input.evidence);
  const coreCases = testCases.filter(isCoreTestCase);

  if (evidence.length === 0) {
    return false;
  }

  if (coreCases.length === 0) {
    return evidence.some((item) => item.result === 'pass' && isMediumOrStrong(item));
  }

  return coreCases.every((testCase) =>
    evidenceForCase(evidence, testCase.id).some(
      (item) => item.result === 'pass' && isMediumOrStrong(item)
    )
  );
}

export function hasCriticalUnknowns(input: ReleaseRecommendationInput): boolean {
  return list(input.unknowns).some((unknown) =>
    textIncludesAny(normalizeUnknown(unknown), CRITICAL_KEYWORDS)
  );
}

export function findEvidenceGaps(
  input: ReleaseRecommendationInput
): MarkdownString[] {
  const gaps: MarkdownString[] = [];
  const testCases = list(input.testCases);
  const evidence = list(input.evidence);
  const coreCases = testCases.filter(isCoreTestCase);

  if (testCases.length === 0) {
    gaps.push('No test cases were provided for release evaluation.');
  }

  if (evidence.length === 0) {
    gaps.push('No evidence was provided; release cannot be approved from plans or reports alone.');
  }

  const casesWithoutEvidence = testCases.filter(
    (testCase) => evidenceForCase(evidence, testCase.id).length === 0
  );
  if (casesWithoutEvidence.length > 0) {
    gaps.push(`${casesWithoutEvidence.length} test case(s) have no linked evidence.`);
  }

  if (testCases.length > 0 && casesWithoutEvidence.length / testCases.length >= 0.5) {
    gaps.push('A large share of test cases have no linked evidence.');
  }

  const coreCasesWithoutEvidence = coreCases.filter(
    (testCase) => evidenceForCase(evidence, testCase.id).length === 0
  );
  if (coreCasesWithoutEvidence.length > 0) {
    gaps.push(`${coreCasesWithoutEvidence.length} core test case(s) have no linked evidence.`);
  }

  if (coreCases.length > 0 && !hasCoreEvidence(input)) {
    gaps.push('Core test cases do not have medium-or-strong passing evidence.');
  }

  if (evidence.length > 0) {
    const weakCount = evidence.filter((item) => item.strength === 'weak').length;
    const inconclusiveCount = evidence.filter((item) =>
      item.result === 'inconclusive' || item.result === 'not_run'
    ).length;

    if (weakCount / evidence.length > 0.5) {
      gaps.push('Most evidence is weak and cannot support a release approval.');
    }

    if (inconclusiveCount > 0) {
      gaps.push(`${inconclusiveCount} evidence item(s) are inconclusive or not_run.`);
    }
  }

  if (list(input.severityClassifications).some((item) => getClassification(item).severity === 'unknown')) {
    gaps.push('At least one severity classification is unknown.');
  }

  return uniqueList(gaps);
}

function hasEvidenceSeverityConflict(input: ReleaseRecommendationInput): boolean {
  const evidence = list(input.evidence);
  const classifications = list(input.severityClassifications).map(getClassification);
  const hasFailedEvidence = evidence.some((item) => item.result === 'fail' || item.result === 'blocked');
  const hasNoneClassification = classifications.some((item) => item.severity === 'none');
  const hasPassingEvidence = evidence.some((item) => item.result === 'pass');
  const hasBlockingClassification = classifications.some((item) =>
    item.blockingRelease || item.severity === 'P0'
  );

  return (hasFailedEvidence && hasNoneClassification) || (hasPassingEvidence && hasBlockingClassification);
}

export function findReleaseBlockingFactors(
  input: ReleaseRecommendationInput
): ReleaseBlockingFactor[] {
  const factors: ReleaseBlockingFactor[] = [];
  const evidence = list(input.evidence);

  list(input.severityClassifications).map(getClassification).forEach((classification, index) => {
    if (classification.severity === 'P0' || classification.blockingRelease) {
      factors.push(buildFactor({
        id: `RBF-SEVERITY-${String(index + 1).padStart(3, '0')}`,
        type: 'severity',
        title: `${classification.severity} release-blocking severity`,
        reason: classification.reason,
        severity: classification.severity,
        requiredAction: 'Resolve or explicitly mitigate the release-blocking severity before release approval.',
      }));
    }
  });

  list(input.defects).filter(isUnresolvedDefect).forEach((defect) => {
    const defectCorpus = [
      defect.title,
      defect.actualResult,
      defect.expectedResult,
      defect.affectedArea,
      defect.recommendation,
      defect.suspectedLayer,
    ].join(' ');
    const isCritical = defect.severity === 'P0' || textIncludesAny(defectCorpus, CRITICAL_KEYWORDS);

    if (isCritical) {
      factors.push(buildFactor({
        id: `RBF-DEFECT-${defect.id}`,
        type: textIncludesAny(defectCorpus, ['permission', 'private', 'unauthorized', '权限', '私密'])
          ? 'security'
          : 'defect',
        title: defect.title,
        reason: `Unresolved ${defect.severity} defect affects ${defect.affectedArea}.`,
        relatedEvidenceIds: defect.evidenceIds,
        relatedDefectIds: [defect.id],
        relatedTestCaseIds: [defect.testCaseId],
        severity: defect.severity,
        requiredAction: 'Fix the defect or provide medium-or-strong mitigation evidence before release.',
      }));
    }
  });

  list(input.opsChecklist).filter((item) => item.blockingIfFailed).forEach((item) => {
    if (!hasPassingEvidenceForOpsItem(item, evidence)) {
      const type: ReleaseBlockingFactorType =
        item.category === 'deployment' || item.category === 'network_exposure'
          ? 'deployment'
          : item.category === 'authentication' || item.category === 'authorization' || item.category === 'security'
            ? 'security'
            : item.category === 'backup' || item.category === 'restore' || item.category === 'database' || item.category === 'multi_user_usage'
              ? 'data_safety'
              : 'ops_risk';

      factors.push(buildFactor({
        id: `RBF-OPS-${item.id}`,
        type,
        title: item.title,
        reason: `Release-blocking ops check has no medium-or-strong passing evidence: ${item.relatedRisk}`,
        severity: item.priority === 'high' ? 'P1' : 'P2',
        requiredAction: `Collect evidence for: ${item.requiredEvidence.join(', ') || 'the release-blocking ops check'}.`,
      }));
    }
  });

  evidence.filter((item) => item.result === 'fail' || item.result === 'blocked').forEach((item) => {
    const relatedTestCase = list(input.testCases).find((testCase) => testCase.id === item.testCaseId);
    const isCoreFailure = relatedTestCase ? isCoreTestCase(relatedTestCase) : textIncludesAny(corpusForEvidence(item), CORE_KEYWORDS);
    const criticalFailure = textIncludesAny(corpusForEvidence(item), CRITICAL_KEYWORDS);

    if ((isCoreFailure || criticalFailure) && !hasWorkaround(input, item)) {
      factors.push(buildFactor({
        id: `RBF-EVIDENCE-${item.id}`,
        type: criticalFailure ? 'data_safety' : 'evidence',
        title: `Failed evidence blocks release: ${item.testScope}`,
        reason: item.evidenceSummary,
        relatedEvidenceIds: [item.id],
        relatedTestCaseIds: item.testCaseId ? [item.testCaseId] : [],
        severity: item.severity === 'none' ? 'unknown' : item.severity,
        requiredAction: 'Resolve the failed core evidence or provide a documented workaround with follow-up evidence.',
      }));
    }
  });

  return uniqueList(factors.map((factor) => JSON.stringify(factor))).map((factor) =>
    JSON.parse(factor) as ReleaseBlockingFactor
  );
}

function buildRiskSummary(input: ReleaseRecommendationInput): MarkdownString[] {
  const risks: MarkdownString[] = [];
  const classifications = list(input.severityClassifications).map(getClassification);
  const nonBlockingSeverity = classifications.filter((item) =>
    ['P1', 'P2', 'P3', 'unknown'].includes(item.severity) && !item.blockingRelease
  );

  risks.push(...nonBlockingSeverity.map((item) =>
    `${item.severity}: ${item.reason}`
  ));

  risks.push(...list(input.defects).filter(isUnresolvedDefect).map((defect) =>
    `${defect.severity} defect ${defect.id}: ${defect.title}`
  ));

  risks.push(...list(input.opsChecklist).filter((item) => !item.blockingIfFailed).map((item) =>
    `Ops ${item.category}: ${item.relatedRisk}`
  ));

  risks.push(...list(input.regressionSuggestions).map((item) =>
    `Regression suggested (${item.priority}): ${item.title}`
  ));

  risks.push(...list(input.unknowns).map((item) =>
    `Unknown: ${normalizeUnknown(item)}`
  ));

  return uniqueList(risks);
}

function inferConfidence(params: {
  recommendation: ReleaseRecommendationValue;
  input: ReleaseRecommendationInput;
  evidenceGaps: MarkdownString[];
  blockingFactors: ReleaseBlockingFactor[];
}): ConfidenceScore {
  const evidence = list(params.input.evidence);
  const hasStrongEvidence = evidence.some((item) => item.strength === 'strong');
  const hasMediumEvidence = evidence.some((item) => item.strength === 'medium');

  if (params.recommendation === 'inconclusive') {
    return 'low';
  }

  if (params.recommendation === 'blocked') {
    if (params.blockingFactors.some((factor) => factor.relatedEvidenceIds.length > 0) && (hasStrongEvidence || hasMediumEvidence)) {
      return hasStrongEvidence ? 'high' : 'medium';
    }

    return 'medium';
  }

  if (params.evidenceGaps.length > 0 || hasCriticalUnknowns(params.input)) {
    return 'low';
  }

  if (params.recommendation === 'approved') {
    return hasStrongEvidence ? 'medium' : 'low';
  }

  return hasMediumEvidence || hasStrongEvidence ? 'medium' : 'low';
}

export function buildReleaseRecommendation(
  input: ReleaseRecommendationInput,
  blockingFactors: ReleaseBlockingFactor[],
  evidenceGaps: MarkdownString[],
  riskSummary: MarkdownString[]
): ReleaseRecommendationOutput {
  const summary = summarizeReleaseInputs(input);
  const criticalUnknowns = hasCriticalUnknowns(input);
  const conflict = hasEvidenceSeverityConflict(input);
  const hasCore = hasCoreEvidence(input);
  const classifications = list(input.severityClassifications).map(getClassification);
  const hasUnaddressedFailure = list(input.evidence).some(
    (item) => (item.result === 'fail' || item.result === 'blocked') && !hasWorkaround(input, item)
  );
  let recommendation: ReleaseRecommendationValue = 'inconclusive';
  let reason: MarkdownString = 'Release input is insufficient for approval.';

  if (blockingFactors.length > 0) {
    recommendation = 'blocked';
    reason = 'Release is blocked by unresolved release-blocking factors.';
  } else if (
    summary.evidenceCount === 0 ||
    summary.testCaseCount === 0 ||
    evidenceGaps.length > 0 ||
    criticalUnknowns ||
    conflict ||
    !hasCore
  ) {
    recommendation = 'inconclusive';
    reason = conflict
      ? 'Release is inconclusive because evidence and severity or defect inputs conflict.'
      : 'Release is inconclusive because required evidence is missing, weak, unknown, or insufficient.';
  } else if (
    riskSummary.length > 0 ||
    classifications.some((item) => ['P1', 'P2', 'P3', 'unknown'].includes(item.severity)) ||
    summary.openDefectCount > 0
  ) {
    recommendation = 'approved_with_risks';
    reason = 'Core workflows have supporting evidence, but residual non-blocking risks remain.';
  } else if (!hasUnaddressedFailure && hasCore) {
    recommendation = 'approved';
    reason = 'Core tests have medium-or-strong evidence and no deterministic blocking risk was found.';
  }

  const requiredActions = uniqueList([
    ...blockingFactors.map((factor) => factor.requiredAction),
    ...(recommendation === 'inconclusive'
      ? evidenceGaps.map((gap) => `Provide evidence or clarification: ${gap}`)
      : []),
    ...(recommendation === 'approved_with_risks'
      ? riskSummary.map((risk) => `Track or mitigate residual risk: ${risk}`)
      : []),
  ]);

  const limitations = uniqueList([
    ...list(input.limitations),
    'Release recommendation is deterministic and based only on provided structured input.',
    'No files, logs, commands, network, database, MCP tools, LLMs, or live systems were accessed.',
    'This recommendation is not a Human-in-the-Loop final approval.',
    ...(typeof input.manualOverride === 'string'
      ? [`Manual override was recorded as input only: ${input.manualOverride}`]
      : input.manualOverride
        ? ['Manual override metadata was recorded as input only; no approval flow was executed.']
        : []),
    ...(recommendation === 'approved'
      ? ['Approval is limited to the provided release scope and evidence; unexecuted cases remain outside proven scope.']
      : []),
  ]);

  const confidence = inferConfidence({
    recommendation,
    input,
    evidenceGaps,
    blockingFactors,
  });

  return {
    recommendation,
    reason,
    blockingFactors,
    riskSummary,
    requiredActions,
    evidenceGaps,
    confidence,
    limitations,
  };
}

export function recommendRelease(
  input: ReleaseRecommendationInput
): ReleaseRecommendationOutput {
  const blockingFactors = findReleaseBlockingFactors(input);
  const evidenceGaps = findEvidenceGaps(input);
  const riskSummary = buildRiskSummary(input);

  return buildReleaseRecommendation(input, blockingFactors, evidenceGaps, riskSummary);
}

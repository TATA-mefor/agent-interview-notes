import type {
  ConfidenceScore,
  EvidenceExecutorType,
  EvidenceResult,
  EvidenceStrength,
  MarkdownString,
  Severity,
  SeverityClassification,
  SystemTestEvidence,
} from '../types';

export type SeverityImpactArea =
  | 'data_loss'
  | 'permission_bypass'
  | 'private_data_leak'
  | 'authentication_failure'
  | 'core_feature_unavailable'
  | 'backup_failure'
  | 'restore_failure'
  | 'logging_missing'
  | 'multi_user_conflict'
  | 'attachment_failure'
  | 'search_inaccuracy'
  | 'usability_issue'
  | 'documentation_gap'
  | 'tool_failure'
  | 'skill_quality_issue'
  | 'unknown';

export interface SeverityClassificationInput {
  evidence: SystemTestEvidence | SystemTestEvidence[];
  impactAreas?: SeverityImpactArea[];
  affectedUsers?: MarkdownString;
  isCoreWorkflow?: boolean;
  hasWorkaround?: boolean;
  isReproducible?: boolean;
  isSecurityRelated?: boolean;
  isDataSafetyRelated?: boolean;
  isOperationalRisk?: boolean;
  isToolFailure?: boolean;
  isSkillQualityIssue?: boolean;
  notes?: MarkdownString;
}

export interface SeverityEvidenceSummary {
  hasEvidence: boolean;
  results: EvidenceResult[];
  strongEvidenceCount: number;
  mediumEvidenceCount: number;
  weakEvidenceCount: number;
  hasFail: boolean;
  hasPass: boolean;
  hasBlocked: boolean;
  hasInconclusive: boolean;
  hasNotRun: boolean;
  minimumStrength: EvidenceStrength;
  maximumStrength: EvidenceStrength;
  executorTypes: EvidenceExecutorType[];
  limitations: MarkdownString[];
}

export interface SeverityClassificationOutput {
  classification: SeverityClassification;
  matchedRules: MarkdownString[];
  blockingRelease: boolean;
  requiresRegression: boolean;
  confidence: ConfidenceScore;
  reason: MarkdownString;
  limitations: MarkdownString[];
}

type EvidenceStrengthRank = 1 | 2 | 3;

const STRENGTH_RANK: Record<EvidenceStrength, EvidenceStrengthRank> = {
  weak: 1,
  medium: 2,
  strong: 3,
};

function toEvidenceList(
  evidence: SystemTestEvidence | SystemTestEvidence[] | undefined
): SystemTestEvidence[] {
  if (!evidence) {
    return [];
  }

  return Array.isArray(evidence) ? evidence : [evidence];
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function hasImpact(
  input: SeverityClassificationInput,
  impactArea: SeverityImpactArea
): boolean {
  return input.impactAreas?.includes(impactArea) ?? false;
}

function hasAnyImpact(
  input: SeverityClassificationInput,
  impactAreas: SeverityImpactArea[]
): boolean {
  return impactAreas.some((impactArea) => hasImpact(input, impactArea));
}

function hasRiskFlags(input: SeverityClassificationInput): boolean {
  return Boolean(
    input.isCoreWorkflow ||
      input.hasWorkaround ||
      input.isReproducible ||
      input.isSecurityRelated ||
      input.isDataSafetyRelated ||
      input.isOperationalRisk ||
      input.isToolFailure ||
      input.isSkillQualityIssue
  );
}

function hasProductFailureSignal(summary: SeverityEvidenceSummary): boolean {
  return summary.hasFail || summary.hasBlocked;
}

function hasOnlyAgentReasoning(summary: SeverityEvidenceSummary): boolean {
  return (
    summary.hasEvidence &&
    summary.executorTypes.length === 1 &&
    summary.executorTypes[0] === 'agent_reasoning'
  );
}

function hasToolOrSkillOnlyFailure(
  input: SeverityClassificationInput,
  summary: SeverityEvidenceSummary
): boolean {
  const onlyProcessExecutors =
    summary.executorTypes.length > 0 &&
    summary.executorTypes.every((executorType) =>
      ['mcp_tool', 'skill', 'agent_reasoning'].includes(executorType)
    );

  return Boolean(
    onlyProcessExecutors &&
      hasProductFailureSignal(summary) &&
      (input.isToolFailure ||
        input.isSkillQualityIssue ||
        hasAnyImpact(input, ['tool_failure', 'skill_quality_issue']))
  );
}

function buildLimitations(
  summary: SeverityEvidenceSummary,
  input: SeverityClassificationInput,
  extraLimitations: MarkdownString[] = []
): MarkdownString[] {
  const limitations = [
    ...summary.limitations,
    ...extraLimitations,
  ];

  if (input.isToolFailure || hasImpact(input, 'tool_failure')) {
    limitations.push(
      'MCP or tool failure was treated as a test-process signal unless product failure evidence is also present.'
    );
  }

  if (input.isSkillQualityIssue || hasImpact(input, 'skill_quality_issue')) {
    limitations.push(
      'Skill output quality issue was treated as a test-process signal unless product failure evidence is also present.'
    );
  }

  if (input.notes) {
    limitations.push(`Classifier note: ${input.notes}`);
  }

  return uniqueList(limitations);
}

function inferConfidence(
  severity: Severity,
  summary: SeverityEvidenceSummary,
  limitations: MarkdownString[]
): ConfidenceScore {
  if (severity === 'unknown') {
    return 'low';
  }

  if (limitations.length > 0) {
    return 'medium';
  }

  if (summary.strongEvidenceCount > 0) {
    return 'high';
  }

  if (summary.mediumEvidenceCount > 0) {
    return 'medium';
  }

  return 'low';
}

export function summarizeEvidenceForSeverity(
  evidence: SystemTestEvidence | SystemTestEvidence[]
): SeverityEvidenceSummary {
  const evidenceList = toEvidenceList(evidence);
  const strengths = evidenceList.map((item) => item.strength);
  const results = uniqueList(evidenceList.map((item) => item.result));
  const executorTypes = uniqueList(evidenceList.map((item) => item.executorType));
  const limitations = evidenceList.flatMap((item) => item.limitations);
  const hasEvidence = evidenceList.length > 0;

  return {
    hasEvidence,
    results,
    strongEvidenceCount: strengths.filter((strength) => strength === 'strong').length,
    mediumEvidenceCount: strengths.filter((strength) => strength === 'medium').length,
    weakEvidenceCount: strengths.filter((strength) => strength === 'weak').length,
    hasFail: results.includes('fail'),
    hasPass: results.includes('pass'),
    hasBlocked: results.includes('blocked'),
    hasInconclusive: results.includes('inconclusive'),
    hasNotRun: results.includes('not_run'),
    minimumStrength: hasEvidence
      ? strengths.reduce((minimum, strength) =>
          STRENGTH_RANK[strength] < STRENGTH_RANK[minimum] ? strength : minimum
        )
      : 'weak',
    maximumStrength: hasEvidence
      ? strengths.reduce((maximum, strength) =>
          STRENGTH_RANK[strength] > STRENGTH_RANK[maximum] ? strength : maximum
        )
      : 'weak',
    executorTypes,
    limitations: uniqueList(limitations),
  };
}

export function hasMinimumEvidenceStrength(
  summary: SeverityEvidenceSummary,
  minimum: EvidenceStrength
): boolean {
  return (
    summary.hasEvidence &&
    STRENGTH_RANK[summary.maximumStrength] >= STRENGTH_RANK[minimum]
  );
}

export function isCriticalImpact(input: SeverityClassificationInput): boolean {
  const hasCriticalArea = hasAnyImpact(input, [
    'data_loss',
    'permission_bypass',
    'private_data_leak',
  ]);

  const hasCriticalCoreOutage =
    hasAnyImpact(input, ['authentication_failure', 'core_feature_unavailable']) &&
    input.isCoreWorkflow === true &&
    input.hasWorkaround === false;

  const hasCriticalBackupRestore =
    hasAnyImpact(input, ['backup_failure', 'restore_failure']) &&
    input.isDataSafetyRelated === true &&
    input.hasWorkaround === false;

  const hasCriticalMultiUserConflict =
    hasImpact(input, 'multi_user_conflict') &&
    (input.isDataSafetyRelated === true || input.isSecurityRelated === true);

  const hasCriticalSecurityRisk =
    input.isSecurityRelated === true &&
    (input.isCoreWorkflow === true ||
      input.isDataSafetyRelated === true ||
      hasAnyImpact(input, ['permission_bypass', 'private_data_leak']));

  return (
    hasCriticalArea ||
    hasCriticalCoreOutage ||
    hasCriticalBackupRestore ||
    hasCriticalMultiUserConflict ||
    hasCriticalSecurityRisk
  );
}

export function isImportantImpact(input: SeverityClassificationInput): boolean {
  const hasImportantArea = hasAnyImpact(input, [
    'authentication_failure',
    'core_feature_unavailable',
    'backup_failure',
    'restore_failure',
    'logging_missing',
    'multi_user_conflict',
    'attachment_failure',
    'search_inaccuracy',
  ]);

  return Boolean(
    hasImportantArea ||
      input.isCoreWorkflow ||
      input.isOperationalRisk ||
      input.isSecurityRelated ||
      input.isDataSafetyRelated
  );
}

export function isStandardImpact(input: SeverityClassificationInput): boolean {
  return Boolean(
    hasAnyImpact(input, [
      'attachment_failure',
      'search_inaccuracy',
      'logging_missing',
      'documentation_gap',
      'tool_failure',
      'skill_quality_issue',
    ]) ||
      input.hasWorkaround ||
      input.isToolFailure ||
      input.isSkillQualityIssue
  );
}

export function isSuggestionImpact(input: SeverityClassificationInput): boolean {
  return hasAnyImpact(input, [
    'usability_issue',
    'documentation_gap',
  ]);
}

export function buildSeverityClassification(params: {
  severity: Severity;
  reason: MarkdownString;
  blockingRelease: boolean;
  requiresRegression: boolean;
  minimumEvidenceStrength: EvidenceStrength;
  limitations?: MarkdownString[];
  matchedRules?: MarkdownString[];
  confidence?: ConfidenceScore;
  summary?: SeverityEvidenceSummary;
}): SeverityClassificationOutput {
  const limitations = uniqueList(params.limitations ?? []);
  const classification: SeverityClassification = {
    severity: params.severity,
    reason: params.reason,
    blockingRelease: params.blockingRelease,
    requiresRegression: params.requiresRegression,
    minimumEvidenceStrength: params.minimumEvidenceStrength,
    limitations,
  };

  return {
    classification,
    matchedRules: params.matchedRules ?? [],
    blockingRelease: params.blockingRelease,
    requiresRegression: params.requiresRegression,
    confidence:
      params.confidence ??
      (params.summary
        ? inferConfidence(params.severity, params.summary, limitations)
        : 'low'),
    reason: params.reason,
    limitations,
  };
}

export function classifySeverity(
  input: SeverityClassificationInput
): SeverityClassificationOutput {
  const summary = summarizeEvidenceForSeverity(input.evidence);
  const impactAreas = input.impactAreas ?? [];
  const hasImpactHints = impactAreas.length > 0 || hasRiskFlags(input);

  if (!summary.hasEvidence) {
    const limitations = buildLimitations(summary, input, [
      'No normalized evidence was provided, so product defect severity cannot be classified.',
    ]);

    return buildSeverityClassification({
      severity: 'unknown',
      reason: 'Severity is unknown because no normalized evidence is available.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'weak',
      limitations,
      matchedRules: ['unknown:no_evidence'],
      summary,
    });
  }

  if (!hasMinimumEvidenceStrength(summary, 'medium')) {
    const limitations = buildLimitations(summary, input, [
      'All provided evidence is weak; weak evidence cannot directly classify a product defect.',
    ]);

    return buildSeverityClassification({
      severity: 'unknown',
      reason: 'Severity is unknown because evidence strength is below medium.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['unknown:weak_evidence'],
      summary,
    });
  }

  if (hasOnlyAgentReasoning(summary)) {
    const limitations = buildLimitations(summary, input, [
      'Only agent reasoning evidence is present; analysis-only evidence cannot prove product impact.',
    ]);

    return buildSeverityClassification({
      severity: 'unknown',
      reason: 'Severity is unknown because only agent reasoning evidence is present.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['unknown:agent_reasoning_only'],
      summary,
    });
  }

  if (summary.hasInconclusive || summary.hasNotRun) {
    const limitations = buildLimitations(summary, input, [
      'Evidence includes inconclusive or not_run results that must be resolved before product severity is assigned.',
    ]);

    return buildSeverityClassification({
      severity: 'unknown',
      reason: 'Severity is unknown because at least one evidence result is inconclusive or not run.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['unknown:inconclusive_or_not_run'],
      summary,
    });
  }

  if (summary.hasPass && !hasProductFailureSignal(summary) && hasImpactHints) {
    const limitations = buildLimitations(summary, input, [
      'Evidence passes but impact hints describe a possible defect or risk; the conflict requires triage.',
    ]);

    return buildSeverityClassification({
      severity: 'unknown',
      reason: 'Severity is unknown because passing evidence conflicts with impact hints.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['unknown:evidence_impact_conflict'],
      summary,
    });
  }

  if (
    hasToolOrSkillOnlyFailure(input, summary) &&
    !hasAnyImpact(input, [
      'data_loss',
      'permission_bypass',
      'private_data_leak',
      'authentication_failure',
      'core_feature_unavailable',
      'backup_failure',
      'restore_failure',
      'multi_user_conflict',
      'attachment_failure',
      'search_inaccuracy',
      'logging_missing',
    ])
  ) {
    const limitations = buildLimitations(summary, input, [
      'Only tool or skill process failure is evident; no target-system failure evidence was provided.',
    ]);

    return buildSeverityClassification({
      severity: 'P2',
      reason: 'Classified as P2 test-process issue because tool or skill failure is present without product failure evidence.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['P2:tool_or_skill_process_issue'],
      summary,
    });
  }

  if (isCriticalImpact(input) && hasProductFailureSignal(summary)) {
    const limitations = buildLimitations(summary, input);

    return buildSeverityClassification({
      severity: 'P0',
      reason: 'Classified as P0 because medium-or-strong evidence indicates critical safety, security, data, or core workflow impact.',
      blockingRelease: true,
      requiresRegression: true,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['P0:critical_impact_with_evidence'],
      summary,
    });
  }

  if (isImportantImpact(input) && hasProductFailureSignal(summary)) {
    const blockingRelease = Boolean(
      input.isCoreWorkflow && input.isSecurityRelated && !input.hasWorkaround
    );
    const limitations = buildLimitations(summary, input);

    return buildSeverityClassification({
      severity: 'P1',
      reason: 'Classified as P1 because medium-or-strong evidence indicates important product or operational risk.',
      blockingRelease,
      requiresRegression: true,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['P1:important_impact_with_evidence'],
      summary,
    });
  }

  if (isStandardImpact(input) && hasProductFailureSignal(summary)) {
    const limitations = buildLimitations(summary, input);

    return buildSeverityClassification({
      severity: 'P2',
      reason: 'Classified as P2 because evidence indicates a bounded defect or process issue with limited release impact.',
      blockingRelease: false,
      requiresRegression: !input.isToolFailure && !input.isSkillQualityIssue,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['P2:standard_or_bounded_impact'],
      summary,
    });
  }

  if (isSuggestionImpact(input) && !summary.hasBlocked) {
    const limitations = buildLimitations(summary, input);

    return buildSeverityClassification({
      severity: 'P3',
      reason: 'Classified as P3 because the impact is limited to usability, documentation clarity, or low-risk improvement.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'weak',
      limitations,
      matchedRules: ['P3:suggestion_or_polish'],
      summary,
    });
  }

  if (
    summary.hasPass &&
    !summary.hasFail &&
    !summary.hasBlocked &&
    !summary.hasInconclusive &&
    !summary.hasNotRun &&
    !hasImpactHints
  ) {
    const limitations = buildLimitations(summary, input);

    return buildSeverityClassification({
      severity: 'none',
      reason: 'Classified as none because medium-or-strong evidence supports the tested behavior and no impact hints are present.',
      blockingRelease: false,
      requiresRegression: false,
      minimumEvidenceStrength: 'medium',
      limitations,
      matchedRules: ['none:passing_evidence_no_impact'],
      summary,
    });
  }

  const limitations = buildLimitations(summary, input, [
    'Input did not match a deterministic severity rule with enough product impact detail.',
  ]);

  return buildSeverityClassification({
    severity: 'unknown',
    reason: 'Severity is unknown because the provided evidence and impact hints are insufficient for deterministic classification.',
    blockingRelease: false,
    requiresRegression: false,
    minimumEvidenceStrength: 'medium',
    limitations,
    matchedRules: ['unknown:insufficient_input'],
    summary,
  });
}

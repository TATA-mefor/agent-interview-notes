import type {
  ConfidenceScore,
  EvidenceExecutorType,
  EvidenceResult,
  EvidenceStrength,
  MarkdownString,
  Severity,
  SystemTestEvidence,
  TestEnvironment,
} from '../types';

export interface EvidenceMetadata {
  toolName?: string;
  rawEvidenceRef?: string;
  sourceType?: string;
  statusCode?: number;
  exitCode?: number;
  timeRange?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface RawEvidenceInput {
  id?: string;
  testCaseId?: string;
  testScope?: string;
  executionMethod?: string;
  executorType?: unknown;
  rawResult?: unknown;
  evidenceSource?: string;
  evidenceSummary?: string;
  command?: string;
  apiRequest?: string;
  apiResponse?: string;
  logs?: string[];
  screenshotPaths?: string[];
  attachmentPaths?: string[];
  observedAt?: string;
  environment?: Partial<TestEnvironment> | string;
  severity?: Severity;
  recommendation?: string;
  confidence?: unknown;
  limitations?: string[];
  metadata?: EvidenceMetadata;
}

export interface EvidenceNormalizationOutput {
  evidence: SystemTestEvidence;
  issues: MarkdownString[];
  warnings: MarkdownString[];
  normalizedFields: string[];
  downgradedClaims: MarkdownString[];
}

const EXECUTOR_TYPES: EvidenceExecutorType[] = [
  'human',
  'script',
  'api',
  'browser',
  'log_review',
  'config_review',
  'mcp_tool',
  'skill',
  'agent_reasoning',
];

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function strengthRank(strength: EvidenceStrength): number {
  if (strength === 'strong') {
    return 3;
  }

  if (strength === 'medium') {
    return 2;
  }

  return 1;
}

function capStrength(
  strength: EvidenceStrength,
  maximum: EvidenceStrength
): EvidenceStrength {
  return strengthRank(strength) > strengthRank(maximum) ? maximum : strength;
}

function normalizeConfidence(confidence: unknown): ConfidenceScore {
  if (typeof confidence === 'number') {
    if (confidence >= 0.75) {
      return 'high';
    }

    if (confidence >= 0.4) {
      return 'medium';
    }

    return 'low';
  }

  const normalized = normalizeText(confidence);

  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }

  return 'low';
}

function normalizeEnvironment(
  environment: RawEvidenceInput['environment'],
  limitations: MarkdownString[],
  normalizedFields: string[]
): TestEnvironment {
  if (typeof environment === 'string' && environment.trim()) {
    normalizedFields.push('environment');

    return {
      name: environment.trim(),
    };
  }

  if (environment && typeof environment === 'object') {
    const name = environment.name?.trim() || 'unknown';

    if (!environment.name?.trim()) {
      limitations.push('Environment name was missing and normalized to unknown.');
      normalizedFields.push('environment.name');
    }

    return {
      ...environment,
      name,
    };
  }

  limitations.push('Environment was missing and normalized to unknown.');
  normalizedFields.push('environment');

  return {
    name: 'unknown',
  };
}

function createFallbackId(input: RawEvidenceInput, executorType: EvidenceExecutorType): string {
  const testCasePart = input.testCaseId?.trim() || 'NOCASE';
  const scopePart = input.testScope?.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'SCOPE';

  return `EV-${testCasePart}-${executorType}-${scopePart}`.toUpperCase();
}

export function normalizeEvidenceResult(rawResult: unknown): EvidenceResult {
  if (rawResult === true) {
    return 'pass';
  }

  if (rawResult === false) {
    return 'fail';
  }

  if (rawResult === null || rawResult === undefined) {
    return 'inconclusive';
  }

  const normalized = normalizeText(rawResult);

  if (['pass', 'passed', 'success', 'ok'].includes(normalized)) {
    return 'pass';
  }

  if (['fail', 'failed', 'error', 'broken'].includes(normalized)) {
    return 'fail';
  }

  if (normalized === 'blocked') {
    return 'blocked';
  }

  if (['not_run', 'not run', 'skipped'].includes(normalized)) {
    return 'not_run';
  }

  if (['inconclusive', 'unknown'].includes(normalized)) {
    return 'inconclusive';
  }

  return 'inconclusive';
}

export function normalizeExecutorType(
  rawExecutorType: unknown
): EvidenceExecutorType {
  const normalized = normalizeText(rawExecutorType).replace(/[\s-]+/g, '_');

  return EXECUTOR_TYPES.includes(normalized as EvidenceExecutorType)
    ? (normalized as EvidenceExecutorType)
    : 'agent_reasoning';
}

export function inferEvidenceStrength(
  input: RawEvidenceInput,
  normalizedResult: EvidenceResult,
  executorType: EvidenceExecutorType
): EvidenceStrength {
  let strength: EvidenceStrength = 'weak';
  const hasSummary = isNonEmptyString(input.evidenceSummary);
  const hasSource = isNonEmptyString(input.evidenceSource) || Boolean(input.metadata?.rawEvidenceRef);
  const hasObservedAt = isNonEmptyString(input.observedAt);
  const hasEnvironment =
    typeof input.environment === 'string'
      ? input.environment.trim().length > 0
      : Boolean(input.environment?.name?.trim());

  if (executorType === 'agent_reasoning') {
    return 'weak';
  }

  if (executorType === 'skill') {
    strength = hasSummary && hasSource ? 'medium' : 'weak';
  }

  if (executorType === 'config_review') {
    strength = hasSummary && hasSource ? 'medium' : 'weak';
  }

  if (executorType === 'human') {
    strength = hasSummary && hasObservedAt && hasEnvironment ? 'medium' : 'weak';
  }

  if (executorType === 'script') {
    strength = isNonEmptyString(input.command) && hasSummary ? 'strong' : 'medium';
  }

  if (executorType === 'api') {
    strength =
      isNonEmptyString(input.apiRequest) && isNonEmptyString(input.apiResponse)
        ? 'strong'
        : 'medium';
  }

  if (executorType === 'browser') {
    strength =
      normalizeStringArray(input.screenshotPaths).length > 0 || hasSummary
        ? 'strong'
        : 'medium';
  }

  if (executorType === 'log_review') {
    strength =
      normalizeStringArray(input.logs).length > 0 && (hasSource || Boolean(input.metadata?.timeRange))
        ? 'strong'
        : 'medium';
  }

  if (executorType === 'mcp_tool') {
    strength = input.metadata?.rawEvidenceRef && hasSummary ? 'strong' : 'medium';
  }

  if (!hasSummary) {
    strength = capStrength(strength, 'medium');
  }

  if (!hasSource) {
    strength = capStrength(strength, 'medium');
  }

  if (normalizedResult === 'not_run') {
    strength = 'weak';
  }

  return strength;
}

export function applyEvidenceBoundaryRules(
  input: RawEvidenceInput,
  evidence: SystemTestEvidence
): {
  evidence: SystemTestEvidence;
  warnings: string[];
  downgradedClaims: string[];
} {
  const warnings: string[] = [];
  const downgradedClaims: string[] = [];
  let normalizedEvidence = evidence;

  if (evidence.executorType === 'agent_reasoning' && evidence.result === 'pass') {
    normalizedEvidence = {
      ...normalizedEvidence,
      result: 'inconclusive',
      strength: 'weak',
      limitations: [
        ...normalizedEvidence.limitations,
        'Agent reasoning cannot independently prove a passing system test.',
      ],
    };
    downgradedClaims.push('agent_reasoning cannot independently prove a passing system test');
  }

  if (evidence.executorType === 'skill' && evidence.result === 'pass') {
    warnings.push('skill output is process evidence, not execution proof');

    if (!isNonEmptyString(input.evidenceSource)) {
      normalizedEvidence = {
        ...normalizedEvidence,
        result: 'inconclusive',
        strength: capStrength(normalizedEvidence.strength, 'weak'),
        limitations: [
          ...normalizedEvidence.limitations,
          'Skill output lacks external evidence source and cannot prove execution.',
        ],
      };
      downgradedClaims.push('skill output without external evidence cannot prove a passing system test');
    }
  }

  if (evidence.executorType === 'config_review' && evidence.result === 'pass') {
    warnings.push('config review does not prove live environment behavior');
  }

  if (evidence.executorType === 'mcp_tool') {
    const hasMcpReference =
      isNonEmptyString(input.evidenceSource) ||
      isNonEmptyString(input.metadata?.toolName) ||
      isNonEmptyString(input.metadata?.rawEvidenceRef);

    if (!hasMcpReference) {
      warnings.push('mcp_tool evidence should include evidenceSource, metadata.toolName, or metadata.rawEvidenceRef');
      normalizedEvidence = {
        ...normalizedEvidence,
        strength: capStrength(normalizedEvidence.strength, 'medium'),
        limitations: [
          ...normalizedEvidence.limitations,
          'MCP evidence reference is missing; scope is limited to the provided summary.',
        ],
      };
    }
  }

  if (evidence.executorType === 'log_review') {
    const hasLogMaterial =
      normalizeStringArray(input.logs).length > 0 ||
      evidence.evidenceSummary.toLowerCase().includes('log');

    if (!hasLogMaterial) {
      warnings.push('log_review evidence should include logs or a log summary');
      normalizedEvidence = {
        ...normalizedEvidence,
        strength: capStrength(normalizedEvidence.strength, 'medium'),
        limitations: [
          ...normalizedEvidence.limitations,
          'Log review has no log excerpts or explicit log summary.',
        ],
      };
    }
  }

  return {
    evidence: normalizedEvidence,
    warnings,
    downgradedClaims,
  };
}

export function normalizeEvidence(
  input: RawEvidenceInput
): EvidenceNormalizationOutput {
  const issues: MarkdownString[] = [];
  const warnings: MarkdownString[] = [];
  const normalizedFields: string[] = [];
  const limitations: MarkdownString[] = [...normalizeStringArray(input.limitations)];

  const executorType = normalizeExecutorType(input.executorType);
  if (executorType === 'agent_reasoning' && normalizeText(input.executorType) !== 'agent_reasoning') {
    warnings.push('Unrecognized executor type defaulted to agent_reasoning; this evidence cannot independently prove system execution.');
    normalizedFields.push('executorType');
  }

  const result = normalizeEvidenceResult(input.rawResult);
  if (result === 'inconclusive' && !['inconclusive', 'unknown'].includes(normalizeText(input.rawResult))) {
    normalizedFields.push('rawResult');
  }

  if (!isNonEmptyString(input.id)) {
    normalizedFields.push('id');
  }

  if (!isNonEmptyString(input.testScope)) {
    warnings.push('testScope is missing and was normalized to unknown.');
    normalizedFields.push('testScope');
  }

  if (!isNonEmptyString(input.executionMethod)) {
    warnings.push('executionMethod is missing and was normalized to unspecified.');
    normalizedFields.push('executionMethod');
  }

  if (!isNonEmptyString(input.evidenceSource)) {
    warnings.push('evidenceSource is missing; strength is capped at medium.');
    limitations.push('Evidence source was missing in raw input.');
    normalizedFields.push('evidenceSource');
  }

  if (!isNonEmptyString(input.evidenceSummary)) {
    issues.push('evidenceSummary is missing; normalized evidence is not independently trustworthy.');
    limitations.push('Evidence summary was missing in raw input.');
    normalizedFields.push('evidenceSummary');
  }

  if (!isNonEmptyString(input.observedAt)) {
    warnings.push('observedAt is missing; no synthetic observation time was generated.');
    limitations.push('Observed timestamp was missing.');
    normalizedFields.push('observedAt');
  }

  const environment = normalizeEnvironment(input.environment, limitations, normalizedFields);
  const strength = inferEvidenceStrength(input, result, executorType);

  const evidence: SystemTestEvidence = {
    id: input.id?.trim() || createFallbackId(input, executorType),
    testCaseId: input.testCaseId?.trim() || undefined,
    testScope: input.testScope?.trim() || 'unknown',
    executionMethod: input.executionMethod?.trim() || 'unspecified',
    executorType,
    result,
    evidenceSource: input.evidenceSource?.trim() || 'unknown',
    evidenceSummary: input.evidenceSummary?.trim() || 'No evidence summary provided.',
    command: input.command?.trim() || undefined,
    apiRequest: input.apiRequest?.trim() || undefined,
    apiResponse: input.apiResponse?.trim() || undefined,
    logs: normalizeStringArray(input.logs),
    screenshotPaths: normalizeStringArray(input.screenshotPaths),
    attachmentPaths: normalizeStringArray(input.attachmentPaths),
    observedAt: input.observedAt?.trim() || '',
    environment,
    severity: input.severity ?? 'unknown',
    recommendation: input.recommendation?.trim() || undefined,
    confidence: normalizeConfidence(input.confidence),
    limitations,
    strength,
  };

  const boundaryResult = applyEvidenceBoundaryRules(input, evidence);

  return {
    evidence: boundaryResult.evidence,
    issues,
    warnings: [...warnings, ...boundaryResult.warnings],
    normalizedFields,
    downgradedClaims: boundaryResult.downgradedClaims,
  };
}

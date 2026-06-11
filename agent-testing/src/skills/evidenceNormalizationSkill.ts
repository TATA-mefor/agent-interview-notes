import {
  normalizeEvidence,
  type EvidenceNormalizationOutput,
  type RawEvidenceInput,
} from '../evidence';
import type {
  MarkdownString,
  SystemTestEvidence,
} from '../types';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface EvidenceNormalizationSkillInput {
  rawEvidence: RawEvidenceInput[];
}

export interface EvidenceNormalizationSkillOutput {
  evidence: SystemTestEvidence[];
  normalizationResults: EvidenceNormalizationOutput[];
  issues: MarkdownString[];
  warnings: MarkdownString[];
  downgradedClaims: MarkdownString[];
}

export function normalizeEvidenceSkill(
  input: EvidenceNormalizationSkillInput,
  context: SkillExecutionContext
): SkillResult<EvidenceNormalizationSkillOutput> {
  const skillIssues: SkillIssue[] = [];

  if (input.rawEvidence.length === 0) {
    skillIssues.push({
      code: 'RAW_EVIDENCE_MISSING',
      message: 'No raw evidence items were provided for normalization.',
      severity: 'error',
      field: 'rawEvidence',
      recoverable: true,
    });
  }

  const normalizationResults = input.rawEvidence.map((item) =>
    normalizeEvidence(item)
  );
  const issues = normalizationResults.flatMap((result) => result.issues);
  const warnings = normalizationResults.flatMap((result) => result.warnings);
  const downgradedClaims = normalizationResults.flatMap(
    (result) => result.downgradedClaims
  );
  const evidence = normalizationResults.map((result) => result.evidence);

  for (const issue of issues) {
    skillIssues.push({
      code: 'EVIDENCE_NORMALIZATION_ISSUE',
      message: issue,
      severity: 'warning',
      recoverable: true,
    });
  }

  return createSkillResult({
    skillName: 'evidence_normalization',
    output: {
      evidence,
      normalizationResults,
      issues,
      warnings,
      downgradedClaims,
    },
    issues: skillIssues,
    evidenceProduced: evidence.map((item) => item.id),
    evidenceRequired: [
      'Raw observations with source, summary, environment, timestamp, and executor type when available.',
    ],
    limitations: [
      ...context.limitations,
      'Evidence normalization did not execute tests, read files, call MCP, call LLM, or inspect live systems.',
      'Normalized evidence preserves boundaries and may downgrade pass claims when evidence is weak or analysis-only.',
    ],
    trace: [
      {
        step: 'normalize_batch',
        summary: `Normalized ${normalizationResults.length} raw evidence item(s).`,
      },
      {
        step: 'boundary_rules',
        summary: `Recorded ${downgradedClaims.length} downgraded claim(s) and ${warnings.length} warning(s).`,
      },
    ],
  });
}

export const evidenceNormalizationSkill: DeterministicSkill<
  EvidenceNormalizationSkillInput,
  EvidenceNormalizationSkillOutput
> = {
  name: 'evidence_normalization',
  riskLevel: 'MEDIUM',
  run: normalizeEvidenceSkill,
};

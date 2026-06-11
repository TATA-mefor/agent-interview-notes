import {
  classifySeverity,
  type SeverityClassificationInput,
  type SeverityClassificationOutput,
} from '../severity';
import type {
  MarkdownString,
} from '../types';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface SeverityClassificationSkillInput {
  classifications: SeverityClassificationInput[];
}

export interface SeverityClassificationSkillOutput {
  classifications: SeverityClassificationOutput[];
  issues: MarkdownString[];
  warnings: MarkdownString[];
  unknowns: SeverityClassificationOutput[];
}

export function classifySeveritySkill(
  input: SeverityClassificationSkillInput,
  context: SkillExecutionContext
): SkillResult<SeverityClassificationSkillOutput> {
  const skillIssues: SkillIssue[] = [];

  if (input.classifications.length === 0) {
    skillIssues.push({
      code: 'SEVERITY_CLASSIFICATION_INPUT_MISSING',
      message: 'No severity classification inputs were provided.',
      severity: 'error',
      field: 'classifications',
      recoverable: true,
    });
  }

  const classifications = input.classifications.map((item) =>
    classifySeverity(item)
  );
  const unknowns = classifications.filter(
    (item) => item.classification.severity === 'unknown'
  );
  const warnings = classifications.flatMap((item) => item.limitations);
  const issues = unknowns.map(
    (item) => `Unknown severity: ${item.reason}`
  );

  for (const unknown of unknowns) {
    skillIssues.push({
      code: 'SEVERITY_CLASSIFICATION_UNKNOWN',
      message: unknown.reason,
      severity: 'warning',
      recoverable: true,
    });
  }

  return createSkillResult({
    skillName: 'severity_classification',
    output: {
      classifications,
      issues,
      warnings,
      unknowns,
    },
    issues: skillIssues,
    evidenceProduced: [],
    evidenceRequired: [
      'Normalized SystemTestEvidence with at least medium strength for product defect classification.',
      'Impact hints such as affected area, core workflow, workaround, reproducibility, security, data safety, and operational risk.',
    ],
    limitations: [
      ...context.limitations,
      'Severity classification did not execute tests, read logs, call MCP, call LLM, or inspect live systems.',
      'Weak evidence, agent reasoning, inconclusive results, and unresolved tool failures remain unknown or process issues.',
    ],
    trace: [
      {
        step: 'classify_batch',
        summary: `Classified ${classifications.length} severity item(s).`,
      },
      {
        step: 'unknown_review',
        summary: `Recorded ${unknowns.length} unknown classification(s).`,
      },
    ],
  });
}

export const severityClassificationSkill: DeterministicSkill<
  SeverityClassificationSkillInput,
  SeverityClassificationSkillOutput
> = {
  name: 'severity_classification',
  riskLevel: 'LOW',
  run: classifySeveritySkill,
};

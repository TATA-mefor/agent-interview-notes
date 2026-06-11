import {
  analyzeDefect,
  type DefectAnalysisInput,
  type DefectAnalysisOutput,
} from '../defects';
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

export interface DefectAnalysisSkillInput {
  defects: DefectAnalysisInput[];
}

export interface DefectAnalysisSkillOutput {
  analyses: DefectAnalysisOutput[];
  issues: MarkdownString[];
  warnings: MarkdownString[];
  unknowns: DefectAnalysisOutput[];
}

export function analyzeDefectSkill(
  input: DefectAnalysisSkillInput,
  context: SkillExecutionContext
): SkillResult<DefectAnalysisSkillOutput> {
  const skillIssues: SkillIssue[] = [];

  if (input.defects.length === 0) {
    skillIssues.push({
      code: 'DEFECT_ANALYSIS_INPUT_MISSING',
      message: 'No defect analysis inputs were provided.',
      severity: 'error',
      field: 'defects',
      recoverable: true,
    });
  }

  const analyses = input.defects.map((item) => analyzeDefect(item));
  const unknowns = analyses.filter(
    (item) => item.causeCategory === 'unknown' || item.suspectedLayer === 'unknown'
  );
  const warnings = analyses.flatMap((item) => item.limitations);
  const issues = unknowns.map(
    (item) => `Unknown defect analysis: ${item.possibleCause}`
  );

  for (const unknown of unknowns) {
    skillIssues.push({
      code: 'DEFECT_ANALYSIS_UNKNOWN',
      message: unknown.possibleCause,
      severity: 'warning',
      recoverable: true,
    });
  }

  return createSkillResult({
    skillName: 'defect_analysis',
    output: {
      analyses,
      issues,
      warnings,
      unknowns,
    },
    issues: skillIssues,
    evidenceProduced: [],
    evidenceRequired: analyses.flatMap((item) => item.requiredAdditionalEvidence),
    limitations: [
      ...context.limitations,
      'Defect analysis Skill did not execute tests, call MCP, call LLM, read source, read logs, connect to a database, or modify defect status.',
      'Outputs are suspected causes and recommendations, not confirmed root cause proof.',
    ],
    trace: [
      {
        step: 'analyze_defects',
        summary: `Analyzed ${analyses.length} defect item(s).`,
      },
      {
        step: 'unknown_review',
        summary: `Recorded ${unknowns.length} unknown or low-certainty analysis item(s).`,
      },
    ],
  });
}

export const defectAnalysisSkill: DeterministicSkill<
  DefectAnalysisSkillInput,
  DefectAnalysisSkillOutput
> = {
  name: 'defect_analysis',
  riskLevel: 'LOW',
  run: analyzeDefectSkill,
};

import {
  suggestRegression,
  type RegressionSuggestionInput,
  type RegressionSuggestionOutput,
} from '../regression';
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

export interface RegressionSuggestionSkillInput {
  regressions: RegressionSuggestionInput[];
}

export interface RegressionSuggestionSkillOutput {
  suggestions: RegressionSuggestionOutput[];
  issues: MarkdownString[];
  warnings: MarkdownString[];
  unknowns: MarkdownString[];
}

export function suggestRegressionSkill(
  input: RegressionSuggestionSkillInput,
  context: SkillExecutionContext
): SkillResult<RegressionSuggestionSkillOutput> {
  const skillIssues: SkillIssue[] = [];

  if (input.regressions.length === 0) {
    skillIssues.push({
      code: 'REGRESSION_INPUT_MISSING',
      message: 'No regression suggestion inputs were provided.',
      severity: 'error',
      field: 'regressions',
      recoverable: true,
    });
  }

  const suggestions = input.regressions.map((item) => suggestRegression(item));
  const unknowns = suggestions.flatMap((item) => item.unknowns);
  const warnings = suggestions.flatMap((item) => item.limitations);

  for (const unknown of unknowns) {
    skillIssues.push({
      code: 'REGRESSION_UNKNOWN',
      message: unknown,
      severity: 'warning',
      recoverable: true,
    });
  }

  return createSkillResult({
    skillName: 'regression_suggestion',
    output: {
      suggestions,
      issues: unknowns,
      warnings,
      unknowns,
    },
    issues: skillIssues,
    evidenceProduced: [],
    evidenceRequired: suggestions.flatMap((item) => item.requiredEvidence),
    limitations: [
      ...context.limitations,
      'Regression suggestion Skill did not execute regression tests, call MCP, call LLM, read files, or modify defects or test cases.',
      'Suggestions are planning outputs, not regression results.',
    ],
    trace: [
      {
        step: 'suggest_regression',
        summary: `Generated regression suggestions for ${input.regressions.length} input item(s).`,
      },
      {
        step: 'collect_unknowns',
        summary: `Recorded ${unknowns.length} regression planning unknown(s).`,
      },
    ],
  });
}

export const regressionSuggestionSkill: DeterministicSkill<
  RegressionSuggestionSkillInput,
  RegressionSuggestionSkillOutput
> = {
  name: 'regression_suggestion',
  riskLevel: 'LOW',
  run: suggestRegressionSkill,
};

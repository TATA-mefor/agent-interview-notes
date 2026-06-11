import {
  generateOpsChecklist,
  type OpsChecklistInput,
  type OpsChecklistOutput,
} from '../ops';
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

export interface OpsChecklistSkillInput {
  profile: OpsChecklistInput;
}

export interface OpsChecklistSkillOutput extends OpsChecklistOutput {
  summary: MarkdownString;
  warnings: MarkdownString[];
}

export function generateOpsChecklistSkill(
  input: OpsChecklistSkillInput,
  context: SkillExecutionContext
): SkillResult<OpsChecklistSkillOutput> {
  const checklist = generateOpsChecklist(input.profile);
  const skillIssues: SkillIssue[] = [];

  for (const unknown of checklist.unknowns) {
    skillIssues.push({
      code: 'OPS_PROFILE_UNKNOWN',
      message: unknown,
      severity: 'warning',
      recoverable: true,
    });
  }

  const output: OpsChecklistSkillOutput = {
    ...checklist,
    summary: `Generated ${checklist.items.length} ops checklist item(s), including ${checklist.releaseBlockingChecks.length} release-blocking check(s) if failed.`,
    warnings: checklist.unknowns,
  };

  return createSkillResult({
    skillName: 'ops_checklist',
    output,
    issues: skillIssues,
    evidenceProduced: [],
    evidenceRequired: checklist.recommendedEvidence,
    limitations: [
      ...context.limitations,
      ...checklist.limitations,
      'Ops checklist Skill did not execute checks, call MCP, call LLM, read files, inspect logs, or connect to infrastructure.',
    ],
    trace: [
      {
        step: 'generate_ops_checklist',
        summary: `Generated checklist for ${input.profile.targetSystemName || 'unknown system'}.`,
      },
      {
        step: 'release_blocking_filter',
        summary: `Identified ${checklist.releaseBlockingChecks.length} check(s) that may block release if failed.`,
      },
    ],
  });
}

export const opsChecklistSkill: DeterministicSkill<
  OpsChecklistSkillInput,
  OpsChecklistSkillOutput
> = {
  name: 'ops_checklist',
  riskLevel: 'LOW',
  run: generateOpsChecklistSkill,
};

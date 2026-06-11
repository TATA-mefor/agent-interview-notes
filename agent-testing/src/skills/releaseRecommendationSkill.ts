import {
  recommendRelease,
  type ReleaseRecommendationInput,
  type ReleaseRecommendationOutput,
} from '../release';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface ReleaseRecommendationSkillInput extends ReleaseRecommendationInput {}

export interface ReleaseRecommendationSkillOutput extends ReleaseRecommendationOutput {}

export function recommendReleaseSkill(
  input: ReleaseRecommendationSkillInput,
  context: SkillExecutionContext
): SkillResult<ReleaseRecommendationSkillOutput> {
  const output = recommendRelease(input);
  const issues: SkillIssue[] = [];

  for (const gap of output.evidenceGaps) {
    issues.push({
      code: 'RELEASE_EVIDENCE_GAP',
      message: gap,
      severity: output.recommendation === 'inconclusive' ? 'warning' : 'info',
      recoverable: true,
    });
  }

  for (const factor of output.blockingFactors) {
    issues.push({
      code: 'RELEASE_BLOCKING_FACTOR',
      message: `${factor.title}: ${factor.reason}`,
      severity: 'warning',
      recoverable: true,
    });
  }

  return createSkillResult({
    skillName: 'release_recommendation',
    output,
    issues,
    evidenceProduced: [],
    evidenceRequired: output.evidenceGaps,
    limitations: [
      ...context.limitations,
      ...output.limitations,
      'Release recommendation Skill did not execute tests, call MCP, call LLM, request approval, or modify release state.',
    ],
    trace: [
      {
        step: 'recommend_release',
        summary: `Calculated ${output.recommendation} with ${output.blockingFactors.length} blocking factor(s) and ${output.evidenceGaps.length} evidence gap(s).`,
      },
      {
        step: 'approval_boundary',
        summary: 'Recommendation is advisory and does not represent Human-in-the-Loop final approval.',
      },
    ],
  });
}

export const releaseRecommendationSkill: DeterministicSkill<
  ReleaseRecommendationSkillInput,
  ReleaseRecommendationSkillOutput
> = {
  name: 'release_recommendation',
  riskLevel: 'LOW',
  run: recommendReleaseSkill,
};

import {
  evaluateApprovalPolicy,
  type ApprovalPolicyInput,
  type ApprovalPolicyOutput,
} from '../approval';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface ApprovalPolicySkillInput {
  actions: ApprovalPolicyInput[];
}

export interface ApprovalPolicySkillOutput {
  evaluations: ApprovalPolicyOutput[];
  issues: string[];
  warnings: string[];
  forbiddenActions: ApprovalPolicyOutput[];
  pendingApprovals: ApprovalPolicyOutput[];
}

export function evaluateApprovalPolicySkill(
  input: ApprovalPolicySkillInput | ApprovalPolicyInput[],
  context: SkillExecutionContext
): SkillResult<ApprovalPolicySkillOutput> {
  const actions = Array.isArray(input) ? input : input.actions;
  const evaluations = actions.map((action) => evaluateApprovalPolicy(action));
  const forbiddenActions = evaluations.filter((evaluation) => evaluation.status === 'forbidden');
  const pendingApprovals = evaluations.filter((evaluation) => evaluation.status === 'pending');
  const warnings = evaluations
    .filter((evaluation) => evaluation.riskAssessment.riskLevel === 'MEDIUM')
    .flatMap((evaluation) => evaluation.riskAssessment.riskReasons);
  const outputIssues = [
    ...forbiddenActions.flatMap((evaluation) => evaluation.policyViolations),
    ...pendingApprovals.map((evaluation) =>
      `${evaluation.request.id} requires approval from ${evaluation.requiredApproverRole ?? 'test_lead'}.`
    ),
  ];
  const issues: SkillIssue[] = [
    ...forbiddenActions.flatMap((evaluation) =>
      evaluation.policyViolations.map((violation) => ({
        code: 'APPROVAL_ACTION_FORBIDDEN',
        message: violation,
        severity: 'warning' as const,
        recoverable: false,
      }))
    ),
    ...pendingApprovals.map((evaluation) => ({
      code: 'APPROVAL_REQUIRED',
      message: `${evaluation.request.actionType} requires Human-in-the-Loop approval before execution.`,
      severity: 'info' as const,
      recoverable: true,
    })),
  ];

  return createSkillResult({
    skillName: 'approval_policy',
    output: {
      evaluations,
      issues: outputIssues,
      warnings,
      forbiddenActions,
      pendingApprovals,
    },
    issues,
    evidenceProduced: [],
    evidenceRequired: pendingApprovals.flatMap((evaluation) => evaluation.requiredEvidenceBeforeApproval),
    limitations: [
      ...context.limitations,
      'Approval policy Skill only evaluates action metadata and does not execute actions.',
      'No MCP call, LLM call, file read/write, network access, database access, or real human approval request was performed.',
    ],
    trace: [
      {
        step: 'approval_policy_evaluation',
        summary: `Evaluated ${evaluations.length} action(s), ${pendingApprovals.length} pending approval(s), and ${forbiddenActions.length} forbidden action(s).`,
      },
      {
        step: 'execution_boundary',
        summary: 'HIGH and FORBIDDEN actions were not executed by this Skill.',
      },
    ],
  });
}

export const approvalPolicySkill: DeterministicSkill<
  ApprovalPolicySkillInput | ApprovalPolicyInput[],
  ApprovalPolicySkillOutput
> = {
  name: 'approval_policy',
  riskLevel: 'LOW',
  run: evaluateApprovalPolicySkill,
};

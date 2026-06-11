import type {
  AgentRole,
  MarkdownString,
  McpCapability,
  SkillName,
} from '../types';
import type {
  ApprovalRiskLevel,
} from '../approval';

export type AgentPlanStatus =
  | 'draft'
  | 'ready'
  | 'blocked'
  | 'completed';

export interface AgentPlanStep {
  id: MarkdownString;
  ownerAgent: AgentRole;
  goal: MarkdownString;
  requiredInputs: MarkdownString[];
  expectedOutputs: MarkdownString[];
  allowedSkills: SkillName[];
  allowedMcpCapabilities: McpCapability[];
  requiresApproval: boolean;
  riskLevel: ApprovalRiskLevel;
  status: AgentPlanStatus;
  limitations: MarkdownString[];
}

export interface AgentPlan {
  id: MarkdownString;
  runId: MarkdownString;
  createdBy: AgentRole;
  goal: MarkdownString;
  steps: AgentPlanStep[];
  unknowns: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentPlanBoundaryValidation {
  valid: boolean;
  blockedStepIds: MarkdownString[];
  approvalRequiredStepIds: MarkdownString[];
  issues: MarkdownString[];
  limitations: MarkdownString[];
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeDraftStep(step: AgentPlanStep): AgentPlanStep {
  const highRiskNeedsApproval = step.riskLevel === 'HIGH' && step.allowedMcpCapabilities.length > 0;
  const forbidden = step.riskLevel === 'FORBIDDEN';
  const requiresApproval = step.requiresApproval || highRiskNeedsApproval;

  return {
    ...step,
    requiresApproval,
    status: forbidden ? 'blocked' : 'draft',
    limitations: uniqueList([
      ...step.limitations,
      'Plan step is a draft and was not executed.',
      ...(highRiskNeedsApproval
        ? ['High-risk MCP-capable plan step requires approval before any future execution.']
        : []),
      ...(forbidden
        ? ['Forbidden plan step is blocked by policy boundary.']
        : []),
    ]),
  };
}

export function createAgentPlanDraft(params: {
  id?: MarkdownString;
  runId: MarkdownString;
  createdBy: AgentRole;
  goal: MarkdownString;
  steps: AgentPlanStep[];
  unknowns?: MarkdownString[];
  limitations?: MarkdownString[];
}): AgentPlan {
  const steps = params.steps.map(normalizeDraftStep);

  return {
    id: params.id ?? `plan-${params.runId}-${params.createdBy}`,
    runId: params.runId,
    createdBy: params.createdBy,
    goal: params.goal,
    steps,
    unknowns: uniqueList([
      ...(params.unknowns ?? []),
      ...steps
        .filter((step) => step.requiredInputs.length === 0)
        .map((step) => `Step ${step.id} has no declared required inputs.`),
    ]),
    limitations: uniqueList([
      ...(params.limitations ?? []),
      'Agent plan is a draft contract only; it does not schedule, execute, or persist tasks.',
      'Planning cannot create execution evidence or release approval.',
    ]),
  };
}

export function validateAgentPlanBoundaries(
  plan: AgentPlan
): AgentPlanBoundaryValidation {
  const issues: MarkdownString[] = [];
  const blockedStepIds: MarkdownString[] = [];
  const approvalRequiredStepIds: MarkdownString[] = [];

  for (const step of plan.steps) {
    if (step.riskLevel === 'FORBIDDEN') {
      blockedStepIds.push(step.id);
      issues.push(`Step ${step.id} is forbidden and must remain blocked.`);
    }

    if (step.riskLevel === 'HIGH' && step.allowedMcpCapabilities.length > 0 && !step.requiresApproval) {
      blockedStepIds.push(step.id);
      issues.push(`Step ${step.id} requests high-risk MCP capability without approval requirement.`);
    }

    if (step.requiresApproval) {
      approvalRequiredStepIds.push(step.id);
    }
  }

  return {
    valid: blockedStepIds.length === 0,
    blockedStepIds: uniqueList(blockedStepIds),
    approvalRequiredStepIds: uniqueList(approvalRequiredStepIds),
    issues: uniqueList(issues),
    limitations: [
      'Plan boundary validation is deterministic and does not execute any plan step.',
      'Validation only checks supplied metadata and approval flags.',
    ],
  };
}

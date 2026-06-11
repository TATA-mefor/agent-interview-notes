import type {
  AuditEventInput,
} from '../audit';
import type {
  RawEvidenceInput,
} from '../evidence';
import {
  buildDryRunExecutionPlan,
  simulateControlledExecution,
  type ControlledExecutionPlan,
  type ControlledExecutionRequest,
  type ControlledExecutionResult,
} from '../controlled-execution';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface ControlledExecutionSkillInput {
  requests: ControlledExecutionRequest[];
}

export interface ControlledExecutionSkillOutput {
  plans: ControlledExecutionPlan[];
  simulatedResults: ControlledExecutionResult[];
  warnings: string[];
  forbiddenRequests: ControlledExecutionRequest[];
  approvalPendingRequests: ControlledExecutionRequest[];
  rawEvidenceDrafts: RawEvidenceInput[];
  auditDrafts: AuditEventInput[];
}

export function runControlledExecutionSkill(
  input: ControlledExecutionSkillInput | ControlledExecutionRequest[],
  context: SkillExecutionContext
): SkillResult<ControlledExecutionSkillOutput> {
  const requests = Array.isArray(input) ? input : input.requests;
  const plans = requests.map((request) => buildDryRunExecutionPlan(request));
  const simulatedResults = requests
    .filter((request) => request.mode === 'simulated')
    .map((request) => simulateControlledExecution(request));
  const forbiddenRequestIds = new Set(plans
    .filter((plan) => plan.forbidden)
    .map((plan) => plan.requestId));
  const approvalPendingRequestIds = new Set(plans
    .filter((plan) => plan.approvalRequired)
    .map((plan) => plan.requestId));
  const forbiddenRequests = requests.filter((request) => forbiddenRequestIds.has(request.id));
  const approvalPendingRequests = requests.filter((request) => approvalPendingRequestIds.has(request.id));
  const rawEvidenceDrafts = simulatedResults.flatMap((result) =>
    result.rawEvidenceDraft ? [result.rawEvidenceDraft] : []
  );
  const auditDrafts = [
    ...plans.flatMap((plan) => plan.auditEventDrafts),
    ...simulatedResults.flatMap((result) => [
      ...(result.requestAuditDraft ? [result.requestAuditDraft] : []),
      ...(result.resultAuditDraft ? [result.resultAuditDraft] : []),
    ]),
  ];
  const warnings = [
    ...plans.flatMap((plan) => plan.limitations),
    ...simulatedResults.flatMap((result) => result.limitations),
  ].filter((item, index, items) => items.indexOf(item) === index);
  const issues: SkillIssue[] = [
    ...forbiddenRequests.map((request) => ({
      code: 'CONTROLLED_EXECUTION_FORBIDDEN',
      message: `Controlled execution request ${request.id} was forbidden by safety policy.`,
      severity: 'warning' as const,
      recoverable: false,
    })),
    ...approvalPendingRequests.map((request) => ({
      code: 'CONTROLLED_EXECUTION_APPROVAL_PENDING',
      message: `Controlled execution request ${request.id} requires approval and was not simulated as completed.`,
      severity: 'info' as const,
      recoverable: true,
    })),
  ];

  return createSkillResult({
    skillName: 'controlled_execution',
    output: {
      plans,
      simulatedResults,
      warnings,
      forbiddenRequests,
      approvalPendingRequests,
      rawEvidenceDrafts,
      auditDrafts,
    },
    issues,
    evidenceProduced: [],
    evidenceRequired: plans.flatMap((plan) => plan.requiredEvidence),
    limitations: [
      ...context.limitations,
      'Controlled execution Skill only builds dry-run plans and deterministic simulated results from provided request metadata.',
      'No real MCP server, MCP tool, shell command, HTTP request, browser action, filesystem access, database access, network access, persistence, or LLM call was performed.',
      'Raw evidence drafts and audit drafts are not persisted and are not proof of real execution.',
      'Simulated completion is not a system test pass.',
    ],
    trace: [
      {
        step: 'controlled_execution_planning',
        summary: `Built ${plans.length} dry-run plan(s), including ${forbiddenRequests.length} forbidden and ${approvalPendingRequests.length} approval-pending request(s).`,
      },
      {
        step: 'controlled_execution_simulation',
        summary: `Processed ${simulatedResults.length} simulated result draft(s) and produced ${rawEvidenceDrafts.length} raw evidence draft(s).`,
      },
      {
        step: 'controlled_execution_audit_drafts',
        summary: `Produced ${auditDrafts.length} summary-only audit event draft(s).`,
      },
    ],
  });
}

export const controlledExecutionSkill: DeterministicSkill<
  ControlledExecutionSkillInput | ControlledExecutionRequest[],
  ControlledExecutionSkillOutput
> = {
  name: 'controlled_execution',
  riskLevel: 'LOW',
  run: runControlledExecutionSkill,
};

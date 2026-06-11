import type {
  AuditEventInput,
} from '../audit';
import type {
  RawEvidenceInput,
} from '../evidence';
import {
  runReadOnlyMcpPilot,
  type ReadOnlyPilotExecutionInput,
  type ReadOnlyPilotExecutionOutput,
} from '../mcp-pilot';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface ReadOnlyMcpPilotSkillInput {
  executions: ReadOnlyPilotExecutionInput[];
}

export interface ReadOnlyMcpPilotSkillOutput {
  outputs: ReadOnlyPilotExecutionOutput[];
  warnings: string[];
  forbiddenRequests: ReadOnlyPilotExecutionOutput[];
  approvalBlockedRequests: ReadOnlyPilotExecutionOutput[];
  evidenceDrafts: RawEvidenceInput[];
  auditDrafts: AuditEventInput[];
}

export function runReadOnlyMcpPilotSkill(
  input: ReadOnlyMcpPilotSkillInput | ReadOnlyPilotExecutionInput[],
  context: SkillExecutionContext
): SkillResult<ReadOnlyMcpPilotSkillOutput> {
  const executions = Array.isArray(input) ? input : input.executions;
  const outputs = executions.map((execution) => runReadOnlyMcpPilot(execution));
  const forbiddenRequests = outputs.filter((output) => output.result.status === 'forbidden');
  const approvalBlockedRequests = outputs.filter((output) => output.result.status === 'blocked_by_approval');
  const evidenceDrafts = outputs.flatMap((output) => output.rawEvidenceDraft ? [output.rawEvidenceDraft] : []);
  const auditDrafts = outputs.flatMap((output) => [
    ...(output.requestAuditDraft ? [output.requestAuditDraft] : []),
    ...(output.resultAuditDraft ? [output.resultAuditDraft] : []),
  ]);
  const warnings = outputs.flatMap((output) => output.warnings);
  const issues: SkillIssue[] = [
    ...forbiddenRequests.map((output) => ({
      code: 'READ_ONLY_MCP_PILOT_FORBIDDEN',
      message: `Read-only MCP pilot request ${output.request.id} was forbidden.`,
      severity: 'warning' as const,
      recoverable: false,
    })),
    ...approvalBlockedRequests.map((output) => ({
      code: 'READ_ONLY_MCP_PILOT_APPROVAL_BLOCKED',
      message: `Read-only MCP pilot request ${output.request.id} was blocked by approval policy.`,
      severity: 'info' as const,
      recoverable: true,
    })),
  ];

  return createSkillResult({
    skillName: 'read_only_mcp_pilot',
    output: {
      outputs,
      warnings,
      forbiddenRequests,
      approvalBlockedRequests,
      evidenceDrafts,
      auditDrafts,
    },
    issues,
    evidenceProduced: [],
    evidenceRequired: approvalBlockedRequests.flatMap((output) =>
      output.approvalEvaluation.approvalPolicyOutput.requiredEvidenceBeforeApproval
    ),
    limitations: [
      ...context.limitations,
      'Read-only MCP pilot Skill only reads provided in-memory snapshots.',
      'No real MCP server, tool execution, file read/write, network access, database access, browser access, command execution, persistence, or LLM call was performed.',
      'Evidence drafts and normalized previews are not real persisted evidence.',
    ],
    trace: [
      {
        step: 'read_only_mcp_pilot',
        summary: `Processed ${outputs.length} pilot request(s), ${forbiddenRequests.length} forbidden request(s), and ${approvalBlockedRequests.length} approval-blocked request(s).`,
      },
      {
        step: 'evidence_audit_drafts',
        summary: `Produced ${evidenceDrafts.length} raw evidence draft(s) and ${auditDrafts.length} audit event draft(s).`,
      },
    ],
  });
}

export const readOnlyMcpPilotSkill: DeterministicSkill<
  ReadOnlyMcpPilotSkillInput | ReadOnlyPilotExecutionInput[],
  ReadOnlyMcpPilotSkillOutput
> = {
  name: 'read_only_mcp_pilot',
  riskLevel: 'LOW',
  run: runReadOnlyMcpPilotSkill,
};

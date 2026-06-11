import {
  aggregateObservabilityMetrics,
  buildAuditTrail,
  type AuditTrailInput,
  type AuditTrailOutput,
  type ObservabilityMetrics,
} from '../audit';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface AuditTrailSkillInput extends AuditTrailInput {
  aggregateMetrics?: boolean;
}

export interface AuditTrailSkillOutput {
  auditTrail: AuditTrailOutput;
  observabilityMetrics?: ObservabilityMetrics;
  warnings: string[];
}

export function buildAuditTrailSkill(
  input: AuditTrailSkillInput,
  context: SkillExecutionContext
): SkillResult<AuditTrailSkillOutput> {
  const auditTrail = buildAuditTrail(input);
  const observabilityMetrics = input.aggregateMetrics === false
    ? undefined
    : aggregateObservabilityMetrics({
        events: auditTrail.events,
        runIds: [auditTrail.runId],
        limitations: [
          'Metrics were aggregated in memory from the audit trail Skill output.',
        ],
      });
  const warnings = [
    ...(auditTrail.redactedEventCount > 0
      ? [`${auditTrail.redactedEventCount} audit event(s) had sensitive summary redaction applied.`]
      : []),
    ...(auditTrail.pendingApprovalCount > 0
      ? [`${auditTrail.pendingApprovalCount} audit event(s) reference pending approval.`]
      : []),
    ...(auditTrail.forbiddenActionCount > 0
      ? [`${auditTrail.forbiddenActionCount} audit event(s) reference forbidden actions.`]
      : []),
  ];
  const issues: SkillIssue[] = [
    ...warnings.map((warning) => ({
      code: 'AUDIT_TRAIL_WARNING',
      message: warning,
      severity: 'info' as const,
      recoverable: true,
    })),
  ];

  return createSkillResult({
    skillName: 'audit_trail',
    output: {
      auditTrail,
      observabilityMetrics,
      warnings,
    },
    issues,
    evidenceProduced: auditTrail.evidenceIds,
    evidenceRequired: [],
    limitations: [
      ...context.limitations,
      ...auditTrail.limitations,
      ...(observabilityMetrics?.limitations ?? []),
      'Audit trail Skill did not persist events, emit metrics, call MCP, call LLM, read files, write files, or access a dashboard.',
    ],
    trace: [
      {
        step: 'build_audit_trail',
        summary: `Built ${auditTrail.eventCount} audit event(s) for run ${auditTrail.runId}.`,
      },
      {
        step: 'aggregate_observability_metrics',
        summary: observabilityMetrics
          ? `Aggregated ${observabilityMetrics.eventCount} event(s) into in-memory observability metrics.`
          : 'Metric aggregation was disabled by input option.',
      },
    ],
  });
}

export const auditTrailSkill: DeterministicSkill<
  AuditTrailSkillInput,
  AuditTrailSkillOutput
> = {
  name: 'audit_trail',
  riskLevel: 'LOW',
  run: buildAuditTrailSkill,
};

import type {
  AgentRole,
  EvidenceId,
  IsoDateTimeString,
  MarkdownString,
  McpCapability,
  McpPermissionLevel,
  McpSideEffectLevel,
  McpToolResult,
  ReleaseRecommendation,
  Severity,
  SkillName,
  SkillRiskLevel,
  SourceReference,
} from '../types';
import type {
  ApprovalActionType,
  ApprovalRiskLevel,
  ApprovalStatus,
} from '../approval';

export type AuditEventType =
  | 'run_started'
  | 'run_completed'
  | 'skill_invoked'
  | 'skill_completed'
  | 'skill_failed'
  | 'mcp_requested'
  | 'mcp_completed'
  | 'mcp_failed'
  | 'approval_evaluated'
  | 'approval_required'
  | 'approval_decided'
  | 'approval_forbidden'
  | 'evidence_created'
  | 'evidence_consumed'
  | 'severity_classified'
  | 'defect_analyzed'
  | 'regression_suggested'
  | 'release_recommended'
  | 'report_generated'
  | 'unknown_recorded'
  | 'policy_violation'
  | 'trace_checkpoint';

export type AuditEventOutcome =
  | 'success'
  | 'failure'
  | 'blocked'
  | 'pending'
  | 'forbidden'
  | 'inconclusive'
  | 'not_applicable';

export type AuditPrivacyLevel =
  | 'public_summary'
  | 'internal_summary'
  | 'sensitive_summary'
  | 'redacted';

export interface AuditActorRef {
  agentRole?: AgentRole;
  skillName?: SkillName;
  mcpCapability?: McpCapability;
  externalActor?: MarkdownString;
}

export interface AuditPolicyRef {
  approvalRequestId?: MarkdownString;
  approvalDecisionId?: MarkdownString;
  approvalStatus?: ApprovalStatus;
  approvalRiskLevel?: ApprovalRiskLevel;
  approvalActionType?: ApprovalActionType;
  policyViolations: MarkdownString[];
  requiresHumanApproval?: boolean;
}

export interface AuditArtifactRefs {
  evidenceIds: EvidenceId[];
  testCaseIds: MarkdownString[];
  defectIds: MarkdownString[];
  reportIds: MarkdownString[];
  releaseRecommendation?: ReleaseRecommendation;
  sourceRefs: SourceReference[];
}

export interface AuditMcpRef {
  capability?: McpCapability;
  permissionLevel?: McpPermissionLevel;
  sideEffectLevel?: McpSideEffectLevel;
  result?: McpToolResult;
}

export interface AuditSkillRef {
  skillName?: SkillName;
  riskLevel?: SkillRiskLevel;
  success?: boolean;
  evidenceProduced: EvidenceId[];
  evidenceRequired: MarkdownString[];
}

export interface AuditEventInput {
  id?: MarkdownString;
  runId: MarkdownString;
  traceId?: MarkdownString;
  parentEventId?: MarkdownString;
  eventType: AuditEventType;
  actor?: AuditActorRef;
  outcome?: AuditEventOutcome;
  summary: MarkdownString;
  inputSummary?: MarkdownString;
  outputSummary?: MarkdownString;
  issues?: MarkdownString[];
  limitations?: MarkdownString[];
  artifactRefs?: Partial<AuditArtifactRefs>;
  policyRef?: Partial<AuditPolicyRef>;
  mcpRef?: AuditMcpRef;
  skillRef?: Partial<AuditSkillRef>;
  privacyLevel?: AuditPrivacyLevel;
  createdAt?: IsoDateTimeString;
}

export interface AuditEvent {
  id: MarkdownString;
  runId: MarkdownString;
  traceId: MarkdownString;
  parentEventId?: MarkdownString;
  eventType: AuditEventType;
  actor: AuditActorRef;
  outcome: AuditEventOutcome;
  summary: MarkdownString;
  inputSummary: MarkdownString;
  outputSummary: MarkdownString;
  issues: MarkdownString[];
  limitations: MarkdownString[];
  artifactRefs: AuditArtifactRefs;
  policyRef: AuditPolicyRef;
  mcpRef: AuditMcpRef;
  skillRef: AuditSkillRef;
  privacyLevel: AuditPrivacyLevel;
  redactionApplied: boolean;
  createdAt: IsoDateTimeString;
}

export interface AuditTrailInput {
  runId: MarkdownString;
  events: AuditEventInput[];
  defaultTraceId?: MarkdownString;
  defaultActor?: AuditActorRef;
  limitations?: MarkdownString[];
}

export interface AuditTrailOutput {
  runId: MarkdownString;
  events: AuditEvent[];
  eventCount: number;
  redactedEventCount: number;
  policyViolationCount: number;
  pendingApprovalCount: number;
  forbiddenActionCount: number;
  evidenceIds: EvidenceId[];
  traceIds: MarkdownString[];
  limitations: MarkdownString[];
}

export interface ObservabilityMetrics {
  runCount: number;
  eventCount: number;
  byEventType: Record<AuditEventType, number>;
  byOutcome: Record<AuditEventOutcome, number>;
  byPrivacyLevel: Record<AuditPrivacyLevel, number>;
  skillInvocations: Record<SkillName, number>;
  skillFailures: Record<SkillName, number>;
  mcpRequestedCount: number;
  mcpCompletedCount: number;
  mcpFailedCount: number;
  approvalRequiredCount: number;
  approvalPendingCount: number;
  approvalApprovedCount: number;
  approvalRejectedCount: number;
  approvalForbiddenCount: number;
  policyViolationCount: number;
  evidenceCreatedCount: number;
  evidenceConsumedCount: number;
  severityDistribution: Record<Severity, number>;
  releaseRecommendationDistribution: Record<ReleaseRecommendation, number>;
  reportGeneratedCount: number;
  unknownRecordedCount: number;
  redactedEventCount: number;
  limitations: MarkdownString[];
}

export interface ObservabilityAggregationInput {
  events: AuditEvent[];
  runIds?: MarkdownString[];
  limitations?: MarkdownString[];
}

const SECRET_PATTERNS = [
  'api key',
  'access token',
  'private key',
  'password',
  'secret',
  'credential',
  'authorization:',
  'bearer ',
  '密钥',
  '密码',
  '凭证',
  '令牌',
];

const MAX_SUMMARY_LENGTH = 240;

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function emptyEventTypeCounts(): Record<AuditEventType, number> {
  return {
    run_started: 0,
    run_completed: 0,
    skill_invoked: 0,
    skill_completed: 0,
    skill_failed: 0,
    mcp_requested: 0,
    mcp_completed: 0,
    mcp_failed: 0,
    approval_evaluated: 0,
    approval_required: 0,
    approval_decided: 0,
    approval_forbidden: 0,
    evidence_created: 0,
    evidence_consumed: 0,
    severity_classified: 0,
    defect_analyzed: 0,
    regression_suggested: 0,
    release_recommended: 0,
    report_generated: 0,
    unknown_recorded: 0,
    policy_violation: 0,
    trace_checkpoint: 0,
  };
}

function emptyOutcomeCounts(): Record<AuditEventOutcome, number> {
  return {
    success: 0,
    failure: 0,
    blocked: 0,
    pending: 0,
    forbidden: 0,
    inconclusive: 0,
    not_applicable: 0,
  };
}

function emptyPrivacyCounts(): Record<AuditPrivacyLevel, number> {
  return {
    public_summary: 0,
    internal_summary: 0,
    sensitive_summary: 0,
    redacted: 0,
  };
}

function emptySeverityCounts(): Record<Severity, number> {
  return {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
    none: 0,
    unknown: 0,
  };
}

function emptyReleaseCounts(): Record<ReleaseRecommendation, number> {
  return {
    approved: 0,
    approved_with_risks: 0,
    blocked: 0,
    inconclusive: 0,
  };
}

function containsSensitiveText(text: MarkdownString): boolean {
  const normalized = text.toLowerCase();

  return SECRET_PATTERNS.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

export function summarizeAuditText(text: MarkdownString | undefined): MarkdownString {
  if (!text) {
    return '';
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  const redacted = containsSensitiveText(normalized)
    ? '[redacted sensitive summary]'
    : normalized;

  return redacted.length > MAX_SUMMARY_LENGTH
    ? `${redacted.slice(0, MAX_SUMMARY_LENGTH - 3)}...`
    : redacted;
}

export function buildAuditEvent(input: AuditEventInput): AuditEvent {
  const traceId = input.traceId ?? `${input.runId}-trace`;
  const eventId = input.id ?? `audit-${input.runId}-${input.eventType}-${traceId}`;
  const inputSummary = summarizeAuditText(input.inputSummary);
  const outputSummary = summarizeAuditText(input.outputSummary);
  const summary = summarizeAuditText(input.summary);
  const issues = (input.issues ?? []).map(summarizeAuditText).filter(Boolean);
  const limitations = [
    ...(input.limitations ?? []),
    'Audit event stores summaries and references only; it is not persisted by this utility.',
  ];
  const redactionApplied = [
    input.summary,
    input.inputSummary,
    input.outputSummary,
    ...(input.issues ?? []),
  ].some((item) => containsSensitiveText(item ?? ''));
  const privacyLevel: AuditPrivacyLevel = redactionApplied
    ? 'redacted'
    : input.privacyLevel ?? 'internal_summary';

  return {
    id: eventId,
    runId: input.runId,
    traceId,
    parentEventId: input.parentEventId,
    eventType: input.eventType,
    actor: input.actor ?? {},
    outcome: input.outcome ?? 'not_applicable',
    summary,
    inputSummary,
    outputSummary,
    issues,
    limitations,
    artifactRefs: {
      evidenceIds: input.artifactRefs?.evidenceIds ?? [],
      testCaseIds: input.artifactRefs?.testCaseIds ?? [],
      defectIds: input.artifactRefs?.defectIds ?? [],
      reportIds: input.artifactRefs?.reportIds ?? [],
      releaseRecommendation: input.artifactRefs?.releaseRecommendation,
      sourceRefs: input.artifactRefs?.sourceRefs ?? [],
    },
    policyRef: {
      approvalRequestId: input.policyRef?.approvalRequestId,
      approvalDecisionId: input.policyRef?.approvalDecisionId,
      approvalStatus: input.policyRef?.approvalStatus,
      approvalRiskLevel: input.policyRef?.approvalRiskLevel,
      approvalActionType: input.policyRef?.approvalActionType,
      policyViolations: input.policyRef?.policyViolations ?? [],
      requiresHumanApproval: input.policyRef?.requiresHumanApproval,
    },
    mcpRef: input.mcpRef ?? {},
    skillRef: {
      skillName: input.skillRef?.skillName,
      riskLevel: input.skillRef?.riskLevel,
      success: input.skillRef?.success,
      evidenceProduced: input.skillRef?.evidenceProduced ?? [],
      evidenceRequired: input.skillRef?.evidenceRequired ?? [],
    },
    privacyLevel,
    redactionApplied,
    createdAt: input.createdAt ?? '',
  };
}

export function buildAuditTrail(input: AuditTrailInput): AuditTrailOutput {
  const events = input.events.map((event, index) =>
    buildAuditEvent({
      ...event,
      runId: event.runId || input.runId,
      traceId: event.traceId ?? input.defaultTraceId ?? `${input.runId}-trace-${index + 1}`,
      actor: event.actor ?? input.defaultActor,
    })
  );
  const evidenceIds = uniqueList(events.flatMap((event) => [
    ...event.artifactRefs.evidenceIds,
    ...event.skillRef.evidenceProduced,
  ]));

  return {
    runId: input.runId,
    events,
    eventCount: events.length,
    redactedEventCount: events.filter((event) => event.redactionApplied).length,
    policyViolationCount: events.reduce((count, event) => count + event.policyRef.policyViolations.length, 0),
    pendingApprovalCount: events.filter((event) => event.policyRef.approvalStatus === 'pending').length,
    forbiddenActionCount: events.filter((event) =>
      event.outcome === 'forbidden' || event.policyRef.approvalStatus === 'forbidden'
    ).length,
    evidenceIds,
    traceIds: uniqueList(events.map((event) => event.traceId)),
    limitations: uniqueList([
      ...(input.limitations ?? []),
      'Audit trail output is an in-memory deterministic structure and is not an audit-log runtime.',
      'Events are summary-only and should not contain full sensitive prompts, logs, secrets, or private raw data.',
    ]),
  };
}

function increment<T extends string>(record: Record<T, number>, key: T | undefined): void {
  if (!key) {
    return;
  }

  record[key] = (record[key] ?? 0) + 1;
}

function extractSeverityFromIssues(event: AuditEvent): Severity | undefined {
  const text = [event.summary, event.inputSummary, event.outputSummary, ...event.issues].join(' ');
  const severities: Severity[] = ['P0', 'P1', 'P2', 'P3', 'unknown', 'none'];

  return severities.find((severity) => text.includes(severity));
}

export function aggregateObservabilityMetrics(
  input: ObservabilityAggregationInput
): ObservabilityMetrics {
  const byEventType = emptyEventTypeCounts();
  const byOutcome = emptyOutcomeCounts();
  const byPrivacyLevel = emptyPrivacyCounts();
  const severityDistribution = emptySeverityCounts();
  const releaseRecommendationDistribution = emptyReleaseCounts();
  const skillInvocations: Record<SkillName, number> = {} as Record<SkillName, number>;
  const skillFailures: Record<SkillName, number> = {} as Record<SkillName, number>;
  const runIds = input.runIds ?? uniqueList(input.events.map((event) => event.runId));

  for (const event of input.events) {
    increment(byEventType, event.eventType);
    increment(byOutcome, event.outcome);
    increment(byPrivacyLevel, event.privacyLevel);

    if (event.eventType === 'skill_invoked' || event.eventType === 'skill_completed' || event.eventType === 'skill_failed') {
      increment(skillInvocations, event.skillRef.skillName);
    }

    if (event.eventType === 'skill_failed' || event.skillRef.success === false) {
      increment(skillFailures, event.skillRef.skillName);
    }

    const severity = event.eventType === 'severity_classified'
      ? extractSeverityFromIssues(event) ?? 'unknown'
      : undefined;
    increment(severityDistribution, severity);
    increment(releaseRecommendationDistribution, event.artifactRefs.releaseRecommendation);
  }

  return {
    runCount: runIds.length,
    eventCount: input.events.length,
    byEventType,
    byOutcome,
    byPrivacyLevel,
    skillInvocations,
    skillFailures,
    mcpRequestedCount: byEventType.mcp_requested,
    mcpCompletedCount: byEventType.mcp_completed,
    mcpFailedCount: byEventType.mcp_failed,
    approvalRequiredCount: byEventType.approval_required,
    approvalPendingCount: input.events.filter((event) => event.policyRef.approvalStatus === 'pending').length,
    approvalApprovedCount: input.events.filter((event) => event.policyRef.approvalStatus === 'approved').length,
    approvalRejectedCount: input.events.filter((event) => event.policyRef.approvalStatus === 'rejected').length,
    approvalForbiddenCount: input.events.filter((event) =>
      event.policyRef.approvalStatus === 'forbidden' || event.eventType === 'approval_forbidden'
    ).length,
    policyViolationCount: input.events.reduce((count, event) => count + event.policyRef.policyViolations.length, 0),
    evidenceCreatedCount: byEventType.evidence_created,
    evidenceConsumedCount: byEventType.evidence_consumed,
    severityDistribution,
    releaseRecommendationDistribution,
    reportGeneratedCount: byEventType.report_generated,
    unknownRecordedCount: byEventType.unknown_recorded,
    redactedEventCount: input.events.filter((event) => event.redactionApplied).length,
    limitations: uniqueList([
      ...(input.limitations ?? []),
      'Observability metrics are aggregated from provided audit events only.',
      'No metrics were persisted, emitted, scraped, or displayed in a dashboard.',
    ]),
  };
}

import type {
  ReleaseRecommendation,
  Severity,
} from '../types';
import type {
  AgentTestingRunDto,
  ApprovalApiDto,
  AuditTrailApiDto,
  EvidenceApiDto,
  ObservabilityMetricsApiDto,
  PersistenceSnapshotApiDto,
  ReportApiDto,
  SmallNoteApiDemoResult,
  ValidatePersistenceSnapshotResponse,
} from '../api';
import type {
  AgentTestingApprovalRow,
  AgentTestingAuditTimelineItem,
  AgentTestingDemoShellViewModel,
  AgentTestingEvidenceRow,
  AgentTestingObservabilityViewModel,
  AgentTestingPersistenceViewModel,
  AgentTestingReleasePanelViewModel,
  AgentTestingReportViewModel,
  AgentTestingRunOverviewViewModel,
  AgentTestingSummaryCard,
  AgentTestingUiBadge,
  AgentTestingUiStatusTone,
} from './uiTypes';

function text(value: unknown, fallback = 'not provided'): string {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

function uniqueList(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function badge(label: string, tone: AgentTestingUiStatusTone, title?: string): AgentTestingUiBadge {
  return {
    label,
    tone,
    title: title ?? label,
  };
}

function countEntries(record: Record<string, number> | undefined): Record<string, number> {
  return record ?? {};
}

function card(
  label: string,
  value: string | number,
  tone: AgentTestingUiStatusTone,
  description: string
): AgentTestingSummaryCard {
  return {
    label,
    value,
    tone,
    description,
  };
}

export function mapReleaseRecommendationToBadge(
  recommendation: ReleaseRecommendation | undefined
): AgentTestingUiBadge {
  if (recommendation === 'approved') {
    return badge('approved', 'success', 'Release recommendation is approved within provided evidence scope.');
  }

  if (recommendation === 'approved_with_risks') {
    return badge('approved with risks', 'warning', 'Release can proceed only with explicit residual risk tracking.');
  }

  if (recommendation === 'blocked') {
    return badge('blocked', 'danger', 'Release is blocked by deterministic rules.');
  }

  if (recommendation === 'inconclusive') {
    return badge('inconclusive', 'warning', 'Release cannot be approved from available evidence.');
  }

  return badge('not provided', 'muted', 'Release recommendation was not provided.');
}

export function mapSeverityToBadge(severity: Severity | undefined): AgentTestingUiBadge {
  if (severity === 'P0' || severity === 'P1') {
    return badge(severity, 'danger', `${severity} severity requires attention before release decisions.`);
  }

  if (severity === 'P2') {
    return badge('P2', 'warning', 'P2 severity is a residual or important risk.');
  }

  if (severity === 'P3') {
    return badge('P3', 'info', 'P3 severity is informational or low priority.');
  }

  if (severity === 'none') {
    return badge('none', 'success', 'No severity was assigned for this item.');
  }

  return badge('unknown', 'warning', 'Severity is unknown and must not be hidden.');
}

export function mapEvidenceResultToBadge(result: string | undefined): AgentTestingUiBadge {
  if (result === 'pass') {
    return badge('pass', 'success', 'This evidence record is pass; it does not imply the whole release passed.');
  }

  if (result === 'fail') {
    return badge('fail', 'danger', 'This evidence record failed.');
  }

  if (result === 'blocked') {
    return badge('blocked', 'danger', 'This evidence record is blocked.');
  }

  if (result === 'inconclusive') {
    return badge('inconclusive', 'warning', 'This evidence record is inconclusive.');
  }

  if (result === 'not_run') {
    return badge('not run', 'muted', 'This evidence record was not run.');
  }

  if (result === 'no evidence') {
    return badge('no evidence', 'warning', 'No evidence is available; this must not be shown as pass.');
  }

  return badge('unknown', 'muted', 'Evidence result was not provided.');
}

export function mapRunToOverviewViewModel(
  run: AgentTestingRunDto | undefined
): AgentTestingRunOverviewViewModel {
  const statusTone: AgentTestingUiStatusTone = run?.validationValid === false ? 'warning' : run ? 'success' : 'muted';
  const releaseBadge = mapReleaseRecommendationToBadge(run?.releaseRecommendation);
  const summaryCards = [
    card('Test cases', run?.testCaseCount ?? 0, 'neutral', 'Generated test case count from the API boundary DTO.'),
    card('Evidence', run?.evidenceCount ?? 0, run && run.evidenceCount > 0 ? 'info' : 'warning', 'Evidence DTO count; zero is not pass.'),
    card('Unknowns', run?.unknownCount ?? 0, run && run.unknownCount > 0 ? 'warning' : 'neutral', 'Unknown items surfaced by orchestration.'),
    card('Snapshot records', run?.snapshotRecordCount ?? 0, 'neutral', 'In-memory persistence snapshot record count.'),
    card('Validation', run?.validationValid ? 'passed' : 'not passed', run?.validationValid ? 'success' : 'warning', 'Snapshot metadata validation status.'),
  ];

  return {
    runId: text(run?.runId, 'unknown-run'),
    targetSystemName: text(run?.targetSystemName),
    targetSystemType: text(run?.targetSystemType),
    statusBadge: badge(run ? 'loaded' : 'missing', statusTone, run ? 'Run DTO is available.' : 'Run DTO was not provided.'),
    releaseBadge,
    summaryCards,
    warnings: uniqueList(run?.warnings ?? []),
    limitations: uniqueList(run?.limitations ?? [
      'Run overview is built from summary-only API DTOs.',
    ]),
  };
}

export function mapEvidenceToRows(evidence: EvidenceApiDto[] | undefined): AgentTestingEvidenceRow[] {
  return (evidence ?? []).map((item) => ({
    id: text(item.id),
    testCaseId: text(item.testCaseId, 'not linked'),
    source: text(item.sourceSummary),
    executor: text(item.executorType),
    result: text(item.result, 'unknown'),
    strength: text(item.strength, 'unknown'),
    summary: text(item.evidenceSummary),
    badge: mapEvidenceResultToBadge(item.result),
  }));
}

export function mapApprovalsToRows(approvals: ApprovalApiDto[] | undefined): AgentTestingApprovalRow[] {
  return (approvals ?? []).map((item) => {
    const tone: AgentTestingUiStatusTone = item.status === 'forbidden'
      ? 'danger'
      : item.status === 'pending'
        ? 'warning'
        : item.requiresHumanApproval
          ? 'info'
          : 'success';

    return {
      id: text(item.approvalRequestId),
      actionType: text(item.actionType),
      riskLevel: text(item.riskLevel),
      status: text(item.status),
      requiresApproval: item.requiresHumanApproval,
      reason: text(item.reason),
      badge: badge(text(item.status, 'unknown'), tone, item.requiresHumanApproval ? 'Human approval is required by policy.' : 'No human approval is required by policy.'),
    };
  });
}

export function mapAuditTrailToTimeline(
  auditTrail: AuditTrailApiDto | undefined
): AgentTestingAuditTimelineItem[] {
  return (auditTrail?.events ?? []).map((event) => {
    const tone: AgentTestingUiStatusTone = event.outcome === 'failure' ||
      event.outcome === 'blocked' ||
      event.outcome === 'forbidden'
      ? 'danger'
      : event.outcome === 'pending' || event.outcome === 'inconclusive'
        ? 'warning'
        : event.redactionApplied
          ? 'info'
          : 'success';

    return {
      id: text(event.id),
      eventType: text(event.eventType),
      outcome: text(event.outcome),
      actor: 'summary-only API boundary',
      summary: text(event.summary),
      timestamp: 'not provided',
      badge: badge(text(event.outcome, 'unknown'), tone, event.redactionApplied ? 'Sensitive content was redacted.' : 'Summary-only audit event.'),
    };
  });
}

export function mapObservabilityToViewModel(
  metrics: ObservabilityMetricsApiDto | undefined
): AgentTestingObservabilityViewModel {
  return {
    summaryCards: [
      card('Runs', metrics?.runCount ?? 0, 'neutral', 'Run count included in the metrics DTO.'),
      card('Events', metrics?.eventCount ?? 0, 'neutral', 'Audit-derived event count.'),
      card('Evidence events', metrics?.evidenceCreatedCount ?? 0, 'info', 'Evidence-created event count, not proof of execution by itself.'),
      card('Approvals required', metrics?.approvalRequiredCount ?? 0, metrics && metrics.approvalRequiredCount > 0 ? 'warning' : 'neutral', 'Approval-required event count.'),
      card('Redacted events', metrics?.redactedEventCount ?? 0, metrics && metrics.redactedEventCount > 0 ? 'info' : 'neutral', 'Events with redaction applied.'),
    ],
    eventCounts: countEntries(metrics?.byEventType),
    severityDistribution: countEntries(metrics?.severityDistribution),
    approvalCounts: {
      required: metrics?.approvalRequiredCount ?? 0,
      pending: metrics?.approvalPendingCount ?? 0,
      forbidden: metrics?.approvalForbiddenCount ?? 0,
    },
    mcpCounts: {
      requested: 0,
      completed: 0,
      failed: 0,
    },
    warnings: [],
    limitations: uniqueList(metrics?.limitations ?? [
      'Observability view model was built without metrics input.',
    ]),
  };
}

export function mapReportToViewModel(report: ReportApiDto | undefined): AgentTestingReportViewModel {
  return {
    title: text(report?.reportId, 'report-not-provided'),
    markdown: text(report?.markdown ?? report?.markdownSummary, 'Report markdown was not included in this API DTO.'),
    sections: (report?.sections ?? []).map((section) => ({
      name: text(section.sectionName),
      itemCount: section.itemCount,
      hasWarnings: section.hasWarnings,
    })),
    warnings: uniqueList([
      ...(report?.warnings ?? []),
      ...(report?.missingInputs ?? []).map((item) => `Missing input: ${item}`),
    ]),
    limitations: uniqueList(report?.limitations ?? [
      'Report preview is summary-only because full markdown was not requested from the API demo.',
    ]),
  };
}

export function mapPersistenceSnapshotToViewModel(params: {
  snapshot?: PersistenceSnapshotApiDto;
  validation?: ValidatePersistenceSnapshotResponse['validation'];
}): AgentTestingPersistenceViewModel {
  return {
    recordCount: params.snapshot?.recordCount ?? 0,
    relationshipCount: params.snapshot?.relationshipCount ?? 0,
    validationPassed: params.validation?.valid ?? false,
    issues: (params.validation?.issues ?? []).map((item) =>
      `${item.severity}: ${item.code} - ${item.message}`
    ),
    warnings: uniqueList([
      ...(params.snapshot?.warnings ?? []),
      ...(params.validation?.warnings ?? []),
    ]),
    limitations: uniqueList([
      ...(params.snapshot?.limitations ?? []),
      ...(params.validation?.limitations ?? []),
      'Persistence panel displays snapshot metadata only; it is not proof of disk or database persistence.',
    ]),
  };
}

export function mapApiDemoToUiViewModel(
  demo: SmallNoteApiDemoResult
): AgentTestingDemoShellViewModel {
  const run = demo.getRun?.run ?? demo.createRun?.run;
  const evidenceRows = run?.evidenceIds.map((id): AgentTestingEvidenceRow => ({
    id,
    testCaseId: 'not provided in API demo',
    source: 'not provided in API demo',
    executor: 'not provided in API demo',
    result: 'unknown',
    strength: 'unknown',
    summary: 'Evidence details were not included in runSmallNoteApiDemo; this row is not a pass result.',
    badge: mapEvidenceResultToBadge('unknown'),
  })) ?? [];
  const releasePanel: AgentTestingReleasePanelViewModel = {
    badge: mapReleaseRecommendationToBadge(run?.releaseRecommendation),
    reason: run?.releaseReason,
    blockingFactors: run?.releaseRecommendation === 'blocked'
      ? ['Release was blocked by deterministic API run DTO summary; inspect release utilities for detailed factors.']
      : [],
    evidenceGaps: run && run.evidenceCount === 0
      ? ['No evidence was exposed in the API demo run DTO.']
      : [],
    limitations: uniqueList([
      ...(run?.limitations ?? []),
      'Release panel is derived from summary-only API run DTO fields.',
    ]),
  };
  const warnings = uniqueList([
    demo.summary,
    ...(run?.warnings ?? []),
    ...(demo.report?.report.warnings ?? []),
    ...(run && run.evidenceCount > 0
      ? ['Evidence rows are ID-only because runSmallNoteApiDemo does not include listEvidence output.']
      : ['No evidence rows were available from runSmallNoteApiDemo.']),
  ]);
  const limitations = uniqueList([
    ...demo.limitations,
    ...(run?.limitations ?? []),
    'UI demo view model is built from an in-memory API demo result and is not a production test report.',
  ]);

  return {
    overview: mapRunToOverviewViewModel(run),
    evidenceRows,
    approvalRows: [],
    auditTimeline: [],
    observability: mapObservabilityToViewModel(demo.observability?.metrics),
    report: mapReportToViewModel(demo.report?.report),
    persistence: mapPersistenceSnapshotToViewModel({
      snapshot: demo.snapshot?.snapshot,
      validation: demo.validation?.validation,
    }),
    release: releasePanel,
    warnings,
    limitations,
  };
}

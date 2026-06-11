import type {
  ApprovalPolicyOutput,
} from '../approval';
import type {
  AuditEvent,
  AuditTrailOutput,
  ObservabilityMetrics,
} from '../audit';
import type {
  MarkdownString,
  SystemTestEvidence,
} from '../types';
import type {
  TestLeadOrchestrationInput,
  TestLeadOrchestrationOutput,
} from '../orchestration';
import type {
  AgentTestingPersistenceSnapshot,
  PersistenceValidationResult,
} from '../persistence';
import {
  redactPersistenceText,
  summarizeForPersistence,
  summarizePersistenceSnapshot,
} from '../persistence';
import type {
  MarkdownReportOutput,
} from '../report';
import type {
  AgentTestingApiRequestContext,
} from './apiTypes';
import type {
  AgentTestingRunDto,
  ApprovalApiDto,
  AuditEventApiDto,
  AuditTrailApiDto,
  CreateAgentTestingRunRequest,
  EvidenceApiDto,
  ObservabilityMetricsApiDto,
  PersistenceSnapshotApiDto,
  ReportApiDto,
} from './apiModels';

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce<Record<T, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

export function mapApiInputToOrchestrationInput(
  request: CreateAgentTestingRunRequest,
  runId: MarkdownString
): TestLeadOrchestrationInput {
  return {
    runId,
    targetSystemName: request.targetSystemName,
    targetSystemType: request.targetSystemType,
    systemDescription: request.systemDescription,
    requirementsText: request.requirementsText,
    modules: request.modules,
    contextSources: request.contextSources,
    knownConstraints: request.knownConstraints,
    opsProfile: request.opsProfile,
    rawEvidence: request.rawEvidence,
    existingDefects: request.existingDefects,
    notes: request.notes,
    options: request.options,
  };
}

export function mapEvidenceToApiDto(evidence: SystemTestEvidence): EvidenceApiDto {
  return {
    id: evidence.id,
    testCaseId: evidence.testCaseId,
    testScope: summarizeForPersistence(evidence.testScope),
    executorType: evidence.executorType,
    result: evidence.result,
    strength: evidence.strength,
    sourceSummary: summarizeForPersistence(evidence.evidenceSource),
    evidenceSummary: summarizeForPersistence(evidence.evidenceSummary),
    severity: evidence.severity,
    confidence: evidence.confidence,
    limitations: evidence.limitations.map((item) => summarizeForPersistence(item)),
  };
}

export function mapApprovalToApiDto(output: ApprovalPolicyOutput): ApprovalApiDto {
  return {
    approvalRequestId: output.request.id,
    runId: output.request.runId,
    actionType: output.request.actionType,
    riskLevel: output.request.riskLevel,
    status: output.status,
    requiresHumanApproval: output.requiresHumanApproval,
    reason: summarizeForPersistence(output.reason),
    requiredApproverRole: output.requiredApproverRole,
    policyViolations: output.policyViolations.map((item) => summarizeForPersistence(item)),
    limitations: output.limitations.map((item) => summarizeForPersistence(item)),
  };
}

export function mapAuditEventToApiDto(event: AuditEvent): AuditEventApiDto {
  return {
    id: event.id,
    runId: event.runId,
    traceId: event.traceId,
    eventType: event.eventType,
    outcome: event.outcome,
    summary: summarizeForPersistence(event.summary),
    privacyLevel: event.privacyLevel,
    redactionApplied: event.redactionApplied,
  };
}

export function mapAuditTrailToApiDto(auditTrail: AuditTrailOutput): AuditTrailApiDto {
  return {
    runId: auditTrail.runId,
    eventCount: auditTrail.eventCount,
    redactedEventCount: auditTrail.redactedEventCount,
    policyViolationCount: auditTrail.policyViolationCount,
    pendingApprovalCount: auditTrail.pendingApprovalCount,
    forbiddenActionCount: auditTrail.forbiddenActionCount,
    evidenceIds: auditTrail.evidenceIds,
    traceIds: auditTrail.traceIds,
    events: auditTrail.events.map(mapAuditEventToApiDto),
    limitations: auditTrail.limitations.map((item) => summarizeForPersistence(item)),
  };
}

export function mapAuditMetricsToApiDto(metrics: ObservabilityMetrics): ObservabilityMetricsApiDto {
  return {
    runCount: metrics.runCount,
    eventCount: metrics.eventCount,
    evidenceCreatedCount: metrics.evidenceCreatedCount,
    approvalRequiredCount: metrics.approvalRequiredCount,
    approvalPendingCount: metrics.approvalPendingCount,
    approvalForbiddenCount: metrics.approvalForbiddenCount,
    reportGeneratedCount: metrics.reportGeneratedCount,
    unknownRecordedCount: metrics.unknownRecordedCount,
    redactedEventCount: metrics.redactedEventCount,
    byEventType: metrics.byEventType,
    byOutcome: metrics.byOutcome,
    severityDistribution: metrics.severityDistribution,
    releaseRecommendationDistribution: metrics.releaseRecommendationDistribution,
    limitations: metrics.limitations.map((item) => summarizeForPersistence(item)),
  };
}

export function mapReportToApiDto(params: {
  runId: MarkdownString;
  report: MarkdownReportOutput;
  relatedEvidenceIds?: MarkdownString[];
  includeMarkdown?: boolean;
}): ReportApiDto {
  return {
    reportId: `report-${params.runId}`,
    markdownSummary: summarizeForPersistence(params.report.markdown),
    markdown: params.includeMarkdown
      ? redactPersistenceText(summarizeForPersistence(params.report.markdown, 4000))
      : undefined,
    sections: params.report.sections,
    warnings: params.report.warnings.map((item) => summarizeForPersistence(item)),
    missingInputs: params.report.missingInputs.map((item) => summarizeForPersistence(item)),
    relatedEvidenceIds: params.relatedEvidenceIds ?? [],
    limitations: params.report.limitations.map((item) => summarizeForPersistence(item)),
  };
}

export function mapPersistenceSnapshotToApiDto(
  snapshot: AgentTestingPersistenceSnapshot
): PersistenceSnapshotApiDto {
  const recordKinds = countBy(snapshot.records.map((record) => record.kind));

  return {
    runId: snapshot.run?.runId,
    runSummary: snapshot.run
      ? summarizeForPersistence(`${snapshot.run.targetSystemName}: ${snapshot.run.summary}`)
      : summarizePersistenceSnapshot(snapshot),
    recordCount: snapshot.records.length,
    relationshipCount: snapshot.relationships.length,
    recordKinds,
    warnings: snapshot.warnings.map((item) => summarizeForPersistence(item)),
    limitations: snapshot.limitations.map((item) => summarizeForPersistence(item)),
  };
}

export function mapOrchestrationToRunDto(params: {
  context: AgentTestingApiRequestContext;
  orchestration: TestLeadOrchestrationOutput;
  snapshot: AgentTestingPersistenceSnapshot;
  validation: PersistenceValidationResult;
  auditTrail?: AuditTrailOutput;
  warnings?: MarkdownString[];
}): AgentTestingRunDto {
  const orchestration = params.orchestration;
  const auditEventIds = params.auditTrail?.events.map((event) => event.id) ?? [];
  const approvalRequestIds = orchestration.approvalRequiredActions.map((item) => item.id);

  return {
    runId: orchestration.runId,
    targetSystemName: summarizeForPersistence(orchestration.context.targetSystem.name),
    targetSystemType: summarizeForPersistence(orchestration.context.targetSystem.type),
    summary: summarizeForPersistence([
      `${orchestration.testCases.length} test case(s)`,
      `${orchestration.normalizedEvidence.length} evidence item(s)`,
      `${orchestration.unknowns.length} unknown(s)`,
      orchestration.releaseRecommendation
        ? `release=${orchestration.releaseRecommendation.recommendation}`
        : 'release=not generated',
    ].join('; ')),
    testCaseCount: orchestration.testCases.length,
    acceptancePointCount: orchestration.acceptancePoints.length,
    evidenceCount: orchestration.normalizedEvidence.length,
    defectAnalysisCount: orchestration.defectAnalyses.length,
    opsChecklistCount: orchestration.opsChecklist.length,
    unknownCount: orchestration.unknowns.length,
    limitationCount: orchestration.limitations.length,
    releaseRecommendation: orchestration.releaseRecommendation?.recommendation,
    releaseReason: orchestration.releaseRecommendation
      ? summarizeForPersistence(orchestration.releaseRecommendation.reason)
      : undefined,
    traceId: params.context.traceId,
    evidenceIds: orchestration.normalizedEvidence.map((item) => item.id),
    approvalRequestIds,
    auditEventIds,
    reportId: orchestration.report ? `report-${orchestration.runId}` : undefined,
    snapshotRecordCount: params.snapshot.records.length,
    validationValid: params.validation.valid,
    warnings: uniqueList([
      ...(params.warnings ?? []),
      ...params.validation.warnings,
      ...(orchestration.report?.warnings ?? []),
    ]).map((item) => summarizeForPersistence(item)),
    limitations: uniqueList([
      ...orchestration.limitations,
      ...params.snapshot.limitations,
      ...params.validation.limitations,
      'Run DTO is summary-only and omits raw private evidence content.',
    ]).map((item) => summarizeForPersistence(item)),
  };
}

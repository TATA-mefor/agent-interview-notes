import type {
  MarkdownString,
} from '../types';
import type {
  ApprovalDecision,
  ApprovalRequest,
} from '../approval';
import type {
  AuditEvent,
} from '../audit';
import type {
  ControlledExecutionResult,
} from '../controlled-execution';
import type {
  McpToolResult,
} from '../mcp';
import type {
  TestLeadOrchestrationOutput,
} from '../orchestration';
import type {
  MarkdownReportOutput,
} from '../report';
import type {
  AgentTestingPersistenceRecord,
  TestRunRecord,
  EvidenceRecord,
  ReportRecord,
  AuditEventRecord,
  ApprovalRequestRecord,
  ApprovalDecisionRecord,
  McpToolResultRecord,
  ControlledExecutionResultRecord,
} from './persistenceRecords';
import type {
  PersistenceRelationship,
} from './persistenceRelationships';
import {
  createPersistenceRelationship,
} from './persistenceRelationships';
import {
  summarizeForPersistence,
} from './persistenceRedaction';

export interface AgentTestingPersistenceSnapshot {
  run?: TestRunRecord;
  records: AgentTestingPersistenceRecord[];
  relationships: PersistenceRelationship[];
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface BuildPersistenceSnapshotInput {
  run?: TestRunRecord;
  records?: AgentTestingPersistenceRecord[];
  relationships?: PersistenceRelationship[];
  orchestrationOutput?: TestLeadOrchestrationOutput;
  approvalRequests?: ApprovalRequest[];
  approvalDecisions?: ApprovalDecision[];
  auditEvents?: AuditEvent[];
  controlledExecutionResults?: ControlledExecutionResult[];
  mcpResults?: McpToolResult[];
  report?: MarkdownReportOutput;
  limitations?: MarkdownString[];
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function defaultBase(params: {
  id: MarkdownString;
  kind: AgentTestingPersistenceRecord['kind'];
  runId: MarkdownString;
}): Pick<AgentTestingPersistenceRecord, 'id' | 'kind' | 'runId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'sensitivity' | 'dataBoundary' | 'source' | 'limitations'> {
  return {
    id: params.id,
    kind: params.kind,
    runId: params.runId,
    status: 'draft',
    createdAt: '',
    updatedAt: '',
    createdBy: 'test_lead',
    sensitivity: 'internal',
    dataBoundary: 'summary_only',
    source: {},
    limitations: [
      'Persistence snapshot record is an in-memory draft only and was not saved to storage.',
    ],
  };
}

function recordsFromOrchestration(output: TestLeadOrchestrationOutput): AgentTestingPersistenceRecord[] {
  const run: TestRunRecord = {
    ...defaultBase({ id: `run-${output.runId}`, kind: 'test_run', runId: output.runId }),
    kind: 'test_run',
    targetSystemName: summarizeForPersistence(output.context.targetSystem.name),
    targetSystemType: summarizeForPersistence(output.context.targetSystem.type),
    scopeSummary: summarizeForPersistence(output.context.targetSystem.description),
    environmentSummary: 'Environment summary was not provided by orchestration output.',
    startedAt: '',
    completedAt: '',
    summary: summarizeForPersistence(`${output.testCases.length} test case(s), ${output.normalizedEvidence.length} evidence item(s).`),
  };
  const evidence: EvidenceRecord[] = output.normalizedEvidence.map((item) => ({
    ...defaultBase({ id: item.id, kind: 'evidence', runId: output.runId }),
    kind: 'evidence',
    testCaseId: item.testCaseId,
    executorType: item.executorType,
    result: item.result,
    strength: item.strength,
    sourceSummary: summarizeForPersistence(item.evidenceSource),
    evidenceSummary: summarizeForPersistence(item.evidenceSummary),
    rawEvidenceRef: item.evidenceSource,
  }));
  const report: ReportRecord[] = output.report ? [{
    ...defaultBase({ id: `report-${output.runId}`, kind: 'report', runId: output.runId }),
    kind: 'report',
    title: 'Orchestration report',
    markdownSummary: summarizeForPersistence(output.report.markdown),
    sections: output.report.sections.map((section) => section.sectionName),
    relatedEvidenceIds: output.normalizedEvidence.map((item) => item.id),
    relatedDefectIds: [],
    relatedReleaseRecommendationId: output.releaseRecommendation ? `release-${output.runId}` : undefined,
    warnings: output.report.warnings,
  }] : [];

  return [run, ...evidence, ...report];
}

function recordsFromAuditEvents(events: AuditEvent[]): AuditEventRecord[] {
  return events.map((event) => ({
    ...defaultBase({ id: event.id, kind: 'audit_event', runId: event.runId }),
    kind: 'audit_event',
    eventType: event.eventType,
    outcome: event.outcome,
    actorSummary: summarizeForPersistence(JSON.stringify(event.actor)),
    inputSummary: summarizeForPersistence(event.inputSummary),
    outputSummary: summarizeForPersistence(event.outputSummary),
    relatedEvidenceIds: event.artifactRefs.evidenceIds,
    relatedApprovalRequestId: event.policyRef.approvalRequestId,
    privacyLevel: event.privacyLevel,
    sensitivity: event.privacyLevel === 'redacted' ? 'secret_redacted' : 'internal',
    dataBoundary: event.privacyLevel === 'redacted' ? 'redacted_content' : 'summary_only',
  }));
}

function recordsFromApprovals(params: {
  requests: ApprovalRequest[];
  decisions: ApprovalDecision[];
}): Array<ApprovalRequestRecord | ApprovalDecisionRecord> {
  const requests = params.requests.map((request): ApprovalRequestRecord => ({
    ...defaultBase({ id: request.id, kind: 'approval_request', runId: request.runId }),
    kind: 'approval_request',
    approvalRequestId: request.id,
    requestedByAgent: request.requestedByAgent,
    actionType: request.actionType,
    targetSummary: summarizeForPersistence(request.target),
    purposeSummary: summarizeForPersistence(request.purpose),
    riskLevel: request.riskLevel,
    permissionLevel: request.permissionLevel,
    sideEffectLevel: request.sideEffectLevel,
    approvalStatus: request.status,
    requiresApproval: request.requiresApproval,
    relatedAuditEventIds: [],
  }));
  const decisions = params.decisions.map((decision): ApprovalDecisionRecord => ({
    ...defaultBase({ id: decision.id, kind: 'approval_decision', runId: 'unknown-run' }),
    kind: 'approval_decision',
    approvalDecisionId: decision.id,
    approvalRequestId: decision.approvalRequestId,
    decision: decision.decision,
    decidedBy: summarizeForPersistence(decision.decidedBy),
    reasonSummary: summarizeForPersistence(decision.reason),
    conditions: decision.conditions.map(summarizeForPersistence),
    decidedAt: decision.decidedAt,
    relatedAuditEventIds: [],
  }));

  return [...requests, ...decisions];
}

function recordsFromMcpResults(results: McpToolResult[]): McpToolResultRecord[] {
  return results.map((result) => ({
    ...defaultBase({ id: result.id, kind: 'mcp_tool_result', runId: result.runId }),
    kind: 'mcp_tool_result',
    mcpResultId: result.id,
    mcpRequestId: result.requestId,
    adapterKind: result.adapterKind,
    toolName: result.toolName,
    resultStatus: result.status,
    failureKind: result.failureKind,
    outputSummary: summarizeForPersistence(result.outputSummary),
    rawEvidenceRef: result.rawEvidenceRef,
    producedEvidenceIds: result.producedEvidenceIds,
    relatedAuditEventIds: [],
  }));
}

function recordsFromControlledExecutionResults(
  results: ControlledExecutionResult[]
): ControlledExecutionResultRecord[] {
  return results.map((result) => ({
    ...defaultBase({ id: result.id, kind: 'controlled_execution_result', runId: result.runId }),
    kind: 'controlled_execution_result',
    controlledExecutionResultId: result.id,
    controlledExecutionRequestId: result.requestId,
    executionKind: result.kind,
    mode: 'simulated',
    simulated: result.simulated,
    simulatedStatus: result.status,
    failureKind: result.failureKind,
    outputSummary: summarizeForPersistence(result.outputSummary),
    evidenceDraftRef: result.rawEvidenceDraft?.metadata?.rawEvidenceRef,
    producedEvidenceIds: result.producedEvidenceIds,
    relatedAuditEventIds: [],
    limitations: [
      ...defaultBase({ id: result.id, kind: 'controlled_execution_result', runId: result.runId }).limitations,
      'Controlled execution result record may reference evidence drafts, but it is not persisted as real execution evidence by this snapshot utility.',
    ],
  }));
}

function buildDefaultRelationships(
  records: AgentTestingPersistenceRecord[]
): PersistenceRelationship[] {
  const evidence = records.filter((record) => record.kind === 'evidence');
  const reports = records.filter((record) => record.kind === 'report');

  return reports.flatMap((report) =>
    evidence.map((item) => createPersistenceRelationship({
      runId: report.runId,
      from: { id: report.id, kind: report.kind },
      to: { id: item.id, kind: item.kind },
      relationshipType: 'reports_on',
      summary: `Report ${report.id} reports on evidence ${item.id}.`,
    }))
  );
}

export function buildPersistenceSnapshot(
  input: BuildPersistenceSnapshotInput
): AgentTestingPersistenceSnapshot {
  const generatedRecords = [
    ...(input.orchestrationOutput ? recordsFromOrchestration(input.orchestrationOutput) : []),
    ...recordsFromAuditEvents(input.auditEvents ?? []),
    ...recordsFromApprovals({
      requests: input.approvalRequests ?? [],
      decisions: input.approvalDecisions ?? [],
    }),
    ...recordsFromMcpResults(input.mcpResults ?? []),
    ...recordsFromControlledExecutionResults(input.controlledExecutionResults ?? []),
  ];
  const records = [
    ...(input.run ? [input.run] : []),
    ...(input.records ?? []),
    ...generatedRecords,
  ];
  const relationships = [
    ...(input.relationships ?? []),
    ...buildDefaultRelationships(records),
  ];
  const warnings = uniqueList([
    ...(input.orchestrationOutput?.unknowns.map(String) ?? []),
    ...(input.report?.warnings ?? []),
    ...(records.length === 0 ? ['No records were provided for snapshot construction.'] : []),
  ]);

  return {
    run: input.run ?? records.find((record): record is TestRunRecord => record.kind === 'test_run'),
    records,
    relationships,
    warnings,
    limitations: uniqueList([
      ...(input.limitations ?? []),
      'Persistence snapshot is an in-memory export shape only; it is not storage and was not written anywhere.',
      'Snapshot records must remain summary/ref/id oriented and must not contain raw secrets or full private evidence.',
    ]),
  };
}

export function summarizePersistenceSnapshot(
  snapshot: AgentTestingPersistenceSnapshot
): MarkdownString {
  const byKind = snapshot.records.reduce<Record<string, number>>((counts, record) => {
    counts[record.kind] = (counts[record.kind] ?? 0) + 1;
    return counts;
  }, {});
  const kindSummary = Object.entries(byKind)
    .map(([kind, count]) => `${kind}=${count}`)
    .join(', ');

  return summarizeForPersistence([
    `records=${snapshot.records.length}`,
    `relationships=${snapshot.relationships.length}`,
    `warnings=${snapshot.warnings.length}`,
    kindSummary,
  ].filter(Boolean).join('; '));
}

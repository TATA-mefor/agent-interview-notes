import type {
  ApprovalPolicyOutput,
} from '../approval';
import {
  evaluateApprovalPolicy,
} from '../approval';
import type {
  AuditEventInput,
  AuditEventType,
} from '../audit';
import {
  aggregateObservabilityMetrics,
  buildAuditTrail,
} from '../audit';
import {
  normalizeEvidence,
} from '../evidence';
import {
  runTestLeadOrchestration,
  type AuditEventDraft,
  type TestLeadOrchestrationOutput,
} from '../orchestration';
import {
  buildPersistenceSnapshot,
  validatePersistenceSnapshot,
} from '../persistence';
import {
  generateMarkdownReport,
} from '../report';
import type {
  MarkdownString,
  SystemTestEvidence,
} from '../types';
import {
  createApiError,
  createApiErrorResponse,
  createApiSuccessResponse,
} from './apiErrors';
import {
  createInMemoryAgentTestingStore,
  type InMemoryAgentTestingStore,
} from './inMemoryAgentTestingStore';
import {
  mapApiInputToOrchestrationInput,
  mapApprovalToApiDto,
  mapAuditMetricsToApiDto,
  mapAuditTrailToApiDto,
  mapEvidenceToApiDto,
  mapOrchestrationToRunDto,
  mapPersistenceSnapshotToApiDto,
  mapReportToApiDto,
} from './apiMappers';
import type {
  AgentTestingApiListResponse,
  AgentTestingApiPagination,
  AgentTestingApiRequestContext,
  AgentTestingApiResponse,
} from './apiTypes';
import type {
  AgentTestingRunDto,
  CreateAgentTestingRunRequest,
  CreateAgentTestingRunResponse,
  EvaluateApprovalRequest,
  EvaluateApprovalResponse,
  GenerateReportRequest,
  GenerateReportResponse,
  GetAgentTestingRunResponse,
  GetAuditTrailResponse,
  GetObservabilityMetricsResponse,
  GetPersistenceSnapshotResponse,
  GetReportResponse,
  ListApprovalRequestsResponse,
  ListEvidenceResponse,
  ListAgentTestingRunsResponse,
  SubmitEvidenceRequest,
  SubmitEvidenceResponse,
  ValidatePersistenceSnapshotResponse,
} from './apiModels';

export interface AgentTestingApiService {
  createRun(
    context: AgentTestingApiRequestContext,
    request: CreateAgentTestingRunRequest
  ): AgentTestingApiResponse<CreateAgentTestingRunResponse>;
  getRun(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<GetAgentTestingRunResponse>;
  listRuns(
    context: AgentTestingApiRequestContext,
    pagination?: AgentTestingApiPagination
  ): AgentTestingApiResponse<ListAgentTestingRunsResponse>;
  submitEvidence(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString,
    request: SubmitEvidenceRequest
  ): AgentTestingApiResponse<SubmitEvidenceResponse>;
  listEvidence(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<ListEvidenceResponse>;
  evaluateApproval(
    context: AgentTestingApiRequestContext,
    request: EvaluateApprovalRequest
  ): AgentTestingApiResponse<EvaluateApprovalResponse>;
  listApprovalRequests(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<ListApprovalRequestsResponse>;
  getAuditTrail(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<GetAuditTrailResponse>;
  getObservabilityMetrics(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<GetObservabilityMetricsResponse>;
  generateReport(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString,
    request?: GenerateReportRequest
  ): AgentTestingApiResponse<GenerateReportResponse>;
  getReport(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<GetReportResponse>;
  getPersistenceSnapshot(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<GetPersistenceSnapshotResponse>;
  validatePersistenceSnapshot(
    context: AgentTestingApiRequestContext,
    runId: MarkdownString
  ): AgentTestingApiResponse<ValidatePersistenceSnapshotResponse>;
}

function sanitizeIdPart(value: MarkdownString): MarkdownString {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'run';
}

function createRunId(request: CreateAgentTestingRunRequest, store: InMemoryAgentTestingStore): MarkdownString {
  if (request.runId?.trim()) {
    return request.runId.trim();
  }

  return `api-${sanitizeIdPart(request.targetSystemName || 'agent-testing')}-${store.state.runs.size + 1}`;
}

function validateCreateRunRequest(request: CreateAgentTestingRunRequest): MarkdownString[] {
  const missing: MarkdownString[] = [];

  if (!request.targetSystemName?.trim()) {
    missing.push('targetSystemName is required.');
  }

  if (!request.targetSystemType?.trim()) {
    missing.push('targetSystemType is required.');
  }

  if (!request.systemDescription?.trim()) {
    missing.push('systemDescription is required.');
  }

  if (!request.requirementsText?.trim()) {
    missing.push('requirementsText is required.');
  }

  return missing;
}

function mapDraftEventType(eventType: MarkdownString): AuditEventType {
  const mapping: Record<MarkdownString, AuditEventType> = {
    run_started: 'run_started',
    run_completed: 'run_completed',
    skill_completed: 'skill_completed',
    skill_failed: 'skill_failed',
    evidence_normalized: 'evidence_created',
    severity_classified: 'severity_classified',
    defect_analyzed: 'defect_analyzed',
    regression_suggested: 'regression_suggested',
    release_recommendation_generated: 'release_recommended',
    report_generated: 'report_generated',
    unknown_recorded: 'unknown_recorded',
  };

  return mapping[eventType] ?? 'trace_checkpoint';
}

function draftToAuditInput(
  draft: AuditEventDraft,
  context: AgentTestingApiRequestContext,
  orchestration: TestLeadOrchestrationOutput,
  index: number
): AuditEventInput {
  const eventType = mapDraftEventType(draft.eventType);

  return {
    id: `audit-${draft.runId}-${eventType}-${index + 1}`,
    runId: draft.runId,
    traceId: context.traceId,
    eventType,
    actor: {
      agentRole: context.actorRole ?? 'test_lead',
      externalActor: context.actor,
    },
    outcome: eventType === 'release_recommended' &&
      orchestration.releaseRecommendation?.recommendation === 'blocked'
      ? 'blocked'
      : eventType === 'release_recommended' &&
          orchestration.releaseRecommendation?.recommendation === 'inconclusive'
        ? 'inconclusive'
        : 'success',
    summary: draft.summary,
    inputSummary: draft.relatedStep ?? draft.eventType,
    outputSummary: draft.summary,
    artifactRefs: {
      evidenceIds: orchestration.normalizedEvidence.map((item) => item.id),
      testCaseIds: orchestration.testCases.map((item) => item.id),
      defectIds: [],
      reportIds: orchestration.report ? [`report-${orchestration.runId}`] : [],
      releaseRecommendation: orchestration.releaseRecommendation?.recommendation,
      sourceRefs: orchestration.context.contextSources,
    },
    skillRef: {
      success: true,
      evidenceProduced: eventType === 'evidence_created'
        ? orchestration.normalizedEvidence.map((item) => item.id)
        : [],
      evidenceRequired: [],
    },
    privacyLevel: 'internal_summary',
    limitations: [
      'Audit event was derived from orchestration draft and stored only in memory.',
    ],
  };
}

function notFound<T>(
  context: AgentTestingApiRequestContext,
  runId: MarkdownString
): AgentTestingApiResponse<T> {
  return createApiErrorResponse({
    context,
    status: 'not_found',
    error: createApiError({
      code: 'NOT_FOUND',
      message: `Agent testing run was not found: ${runId}`,
    }),
  });
}

function listResponse<T>(
  items: T[],
  pagination?: AgentTestingApiPagination
): AgentTestingApiListResponse<T> {
  const offset = Math.max(0, Number(pagination?.cursor ?? 0) || 0);
  const limit = pagination?.limit && pagination.limit > 0
    ? pagination.limit
    : items.length;
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;

  return {
    items: pageItems,
    total: items.length,
    nextCursor: nextOffset < items.length ? String(nextOffset) : undefined,
    warnings: [],
    limitations: [
      'List response is paginated over in-memory data only.',
    ],
  };
}

function updateRunEvidenceSummary(
  run: AgentTestingRunDto,
  evidence: SystemTestEvidence[]
): AgentTestingRunDto {
  return {
    ...run,
    evidenceCount: evidence.length,
    evidenceIds: evidence.map((item) => item.id),
    warnings: [
      ...run.warnings,
      'Evidence view was updated in memory after run creation; release recommendation was not recomputed.',
    ],
  };
}

export function createAgentTestingApiService(
  store = createInMemoryAgentTestingStore()
): AgentTestingApiService {
  return {
    createRun(context, request) {
      const missing = validateCreateRunRequest(request);
      if (missing.length > 0) {
        return createApiErrorResponse({
          context,
          status: 'bad_request',
          error: createApiError({
            code: 'INVALID_INPUT',
            message: 'Create run request is missing required fields.',
            details: missing,
          }),
        });
      }

      const runId = createRunId(request, store);
      if (store.state.runs.has(runId)) {
        return createApiErrorResponse({
          context,
          status: 'conflict',
          error: createApiError({
            code: 'CONFLICT',
            message: `Run already exists in memory: ${runId}`,
          }),
        });
      }

      const orchestrationInput = mapApiInputToOrchestrationInput(request, runId);
      const orchestration = runTestLeadOrchestration(orchestrationInput);
      const auditTrail = buildAuditTrail({
        runId,
        defaultTraceId: context.traceId,
        defaultActor: {
          agentRole: context.actorRole ?? 'test_lead',
          externalActor: context.actor,
        },
        events: orchestration.auditEventDrafts.map((draft, index) =>
          draftToAuditInput(draft, context, orchestration, index)
        ),
        limitations: [
          'API createRun built audit events in memory from deterministic orchestration drafts.',
        ],
      });
      const metrics = aggregateObservabilityMetrics({
        events: auditTrail.events,
        runIds: [runId],
        limitations: [
          'API createRun aggregated observability metrics in memory only.',
        ],
      });
      const snapshot = buildPersistenceSnapshot({
        orchestrationOutput: orchestration,
        auditEvents: auditTrail.events,
        report: orchestration.report,
        limitations: [
          'Snapshot was built by API service for in-memory boundary validation only.',
        ],
      });
      const validation = validatePersistenceSnapshot(snapshot);
      const runDto = mapOrchestrationToRunDto({
        context,
        orchestration,
        snapshot,
        validation,
        auditTrail,
        warnings: snapshot.warnings,
      });

      store.state.runs.set(runId, runDto);
      store.state.orchestrationOutputs.set(runId, orchestration);
      store.state.evidence.set(runId, orchestration.normalizedEvidence);
      store.state.auditTrails.set(runId, auditTrail);
      store.state.observabilityMetrics.set(runId, metrics);
      if (orchestration.report) {
        store.state.reports.set(runId, orchestration.report);
      }
      store.state.persistenceSnapshots.set(runId, snapshot);
      store.state.validationResults.set(runId, validation);

      return createApiSuccessResponse({
        context,
        status: 'created',
        data: { run: runDto },
        auditEventIds: auditTrail.events.map((event) => event.id),
        warnings: runDto.warnings,
        limitations: [
          'createRun did not execute tests; it only ran deterministic in-memory orchestration.',
        ],
      });
    },

    getRun(context, runId) {
      const run = store.state.runs.get(runId);
      if (!run) {
        return notFound(context, runId);
      }

      return createApiSuccessResponse({
        context,
        data: { run },
        auditEventIds: run.auditEventIds,
      });
    },

    listRuns(context, pagination) {
      const response = listResponse(Array.from(store.state.runs.values()), pagination);

      return createApiSuccessResponse({
        context,
        data: response,
        limitations: response.limitations,
      });
    },

    submitEvidence(context, runId, request) {
      if (!store.state.runs.has(runId)) {
        return notFound(context, runId);
      }

      if (!Array.isArray(request.evidence) || request.evidence.length === 0) {
        return createApiErrorResponse({
          context,
          status: 'bad_request',
          error: createApiError({
            code: 'MISSING_EVIDENCE',
            message: 'submitEvidence requires at least one raw evidence item.',
          }),
        });
      }

      const normalized = request.evidence.map((item) => normalizeEvidence(item));
      const existing = store.state.evidence.get(runId) ?? [];
      const merged = [...existing, ...normalized.map((item) => item.evidence)];
      const run = store.state.runs.get(runId);

      store.state.evidence.set(runId, merged);
      if (run) {
        store.state.runs.set(runId, updateRunEvidenceSummary(run, merged));
      }

      return createApiSuccessResponse({
        context,
        status: 'accepted',
        data: {
          runId,
          evidence: normalized.map((item) => mapEvidenceToApiDto(item.evidence)),
          warnings: [
            ...normalized.flatMap((item) => item.warnings),
            'Evidence was accepted into the in-memory view only; orchestration and release recommendation were not recomputed.',
          ],
          normalizationIssues: normalized.flatMap((item) => [
            ...item.issues,
            ...item.downgradedClaims,
          ]),
        },
        warnings: normalized.flatMap((item) => item.warnings),
        limitations: [
          'submitEvidence did not execute MCP tools, commands, APIs, browsers, or tests.',
          'Submitted evidence is normalized from caller input and is not automatically treated as pass.',
        ],
      });
    },

    listEvidence(context, runId) {
      if (!store.state.runs.has(runId)) {
        return notFound(context, runId);
      }

      const evidence = store.state.evidence.get(runId) ?? [];
      const response: ListEvidenceResponse = {
        items: evidence.map(mapEvidenceToApiDto),
        total: evidence.length,
        warnings: [],
        limitations: [
          'Evidence list is the current in-memory evidence view for the run.',
        ],
      };

      return createApiSuccessResponse({
        context,
        data: response,
        limitations: response.limitations,
      });
    },

    evaluateApproval(context, request) {
      const runId = request.policyInput?.runId;
      if (!runId || !store.state.runs.has(runId)) {
        return createApiErrorResponse({
          context,
          status: runId ? 'not_found' : 'bad_request',
          error: createApiError({
            code: runId ? 'NOT_FOUND' : 'INVALID_INPUT',
            message: runId
              ? `Cannot evaluate approval for unknown run: ${runId}`
              : 'Approval policy input must include runId.',
          }),
        });
      }

      const output = evaluateApprovalPolicy(request.policyInput);
      const approvals = store.state.approvals.get(runId) ?? [];
      store.state.approvals.set(runId, [...approvals, output]);

      return createApiSuccessResponse({
        context,
        data: {
          approval: mapApprovalToApiDto(output),
        },
        warnings: output.policyViolations,
        limitations: [
          'Approval policy was evaluated only; no human approval request was sent and no decision was persisted.',
        ],
      });
    },

    listApprovalRequests(context, runId) {
      if (!store.state.runs.has(runId)) {
        return notFound(context, runId);
      }

      const approvals = store.state.approvals.get(runId) ?? [];
      const response: ListApprovalRequestsResponse = {
        items: approvals.map(mapApprovalToApiDto),
        total: approvals.length,
        warnings: approvals.flatMap((item: ApprovalPolicyOutput) => item.policyViolations),
        limitations: [
          'Approval requests are in-memory policy evaluations only.',
        ],
      };

      return createApiSuccessResponse({
        context,
        data: response,
        warnings: response.warnings,
        limitations: response.limitations,
      });
    },

    getAuditTrail(context, runId) {
      const auditTrail = store.state.auditTrails.get(runId);
      if (!auditTrail) {
        return notFound(context, runId);
      }

      return createApiSuccessResponse({
        context,
        data: {
          auditTrail: mapAuditTrailToApiDto(auditTrail),
        },
        auditEventIds: auditTrail.events.map((event) => event.id),
        limitations: auditTrail.limitations,
      });
    },

    getObservabilityMetrics(context, runId) {
      const metrics = store.state.observabilityMetrics.get(runId);
      if (!metrics) {
        return notFound(context, runId);
      }

      return createApiSuccessResponse({
        context,
        data: {
          metrics: mapAuditMetricsToApiDto(metrics),
        },
        limitations: metrics.limitations,
      });
    },

    generateReport(context, runId, request) {
      const orchestration = store.state.orchestrationOutputs.get(runId);
      if (!orchestration) {
        return notFound(context, runId);
      }

      const report = generateMarkdownReport({
        reportId: runId,
        title: request?.title ?? `${orchestration.context.targetSystem.name} System Test Report`,
        targetSystem: orchestration.context.targetSystem.name,
        testScope: orchestration.context.targetSystem.description,
        contextSources: orchestration.context.contextSources,
        acceptancePoints: orchestration.acceptancePoints,
        testCases: orchestration.testCases,
        evidence: store.state.evidence.get(runId) ?? orchestration.normalizedEvidence,
        severityClassifications: orchestration.severityClassifications,
        defects: [],
        defectAnalyses: orchestration.defectAnalyses,
        opsChecklist: orchestration.opsChecklist,
        regressionSuggestions: orchestration.regressionSuggestions,
        unknowns: orchestration.unknowns,
        limitations: [
          ...orchestration.limitations,
          ...(request?.notes ?? []),
          'Report was generated by API service as returned data only.',
        ],
        releaseRecommendation: orchestration.releaseRecommendation?.recommendation,
      });
      store.state.reports.set(runId, report);

      return createApiSuccessResponse({
        context,
        data: {
          report: mapReportToApiDto({
            runId,
            report,
            relatedEvidenceIds: (store.state.evidence.get(runId) ?? []).map((item) => item.id),
            includeMarkdown: request?.includeMarkdown,
          }),
        },
        warnings: report.warnings,
        limitations: [
          'generateReport did not write a report file and did not execute tests.',
        ],
      });
    },

    getReport(context, runId) {
      const report = store.state.reports.get(runId);
      if (!report) {
        return notFound(context, runId);
      }

      return createApiSuccessResponse({
        context,
        data: {
          report: mapReportToApiDto({
            runId,
            report,
            relatedEvidenceIds: (store.state.evidence.get(runId) ?? []).map((item) => item.id),
          }),
        },
        warnings: report.warnings,
        limitations: report.limitations,
      });
    },

    getPersistenceSnapshot(context, runId) {
      const snapshot = store.state.persistenceSnapshots.get(runId);
      if (!snapshot) {
        return notFound(context, runId);
      }

      return createApiSuccessResponse({
        context,
        data: {
          snapshot: mapPersistenceSnapshotToApiDto(snapshot),
        },
        warnings: snapshot.warnings,
        limitations: snapshot.limitations,
      });
    },

    validatePersistenceSnapshot(context, runId) {
      const snapshot = store.state.persistenceSnapshots.get(runId);
      if (!snapshot) {
        return notFound(context, runId);
      }

      const validation = validatePersistenceSnapshot(snapshot);
      store.state.validationResults.set(runId, validation);

      return createApiSuccessResponse({
        context,
        data: {
          snapshot: mapPersistenceSnapshotToApiDto(snapshot),
          validation: {
            valid: validation.valid,
            issueCount: validation.issues.length,
            errorCount: validation.issues.filter((item) => item.severity === 'error').length,
            warningCount: validation.warnings.length,
            issues: validation.issues,
            warnings: validation.warnings,
            limitations: validation.limitations,
          },
        },
        warnings: validation.warnings,
        limitations: validation.limitations,
      });
    },
  };
}

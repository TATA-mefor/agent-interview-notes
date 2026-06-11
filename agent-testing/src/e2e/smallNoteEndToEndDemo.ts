import {
  evaluateApprovalPolicy,
} from '../approval';
import {
  aggregateObservabilityMetrics,
  buildAuditTrail,
  type AuditEventInput,
} from '../audit';
import {
  runSmallNoteApiDemo,
} from '../api';
import {
  buildControlledApiExecutionRequest,
  buildControlledCommandExecutionRequest,
  buildDryRunExecutionPlan,
  evaluateControlledExecutionSafety,
  simulateControlledExecution,
  type ControlledExecutionRequest,
  type ControlledExecutionResult,
} from '../controlled-execution';
import {
  smallNoteSystemFixture,
  validateSmallNoteSystemScenario,
} from '../examples';
import {
  runSmallNoteReadOnlyPilotScenario,
} from '../mcp-pilot';
import {
  buildPersistenceSnapshot,
  validatePersistenceSnapshot,
} from '../persistence';
import {
  buildSmallNoteUiDemoViewModel,
} from '../ui';
import type {
  MarkdownString,
} from '../types';
import {
  summarizeEndToEndDemo,
} from './endToEndDemoSummary';
import type {
  EndToEndApprovalPreview,
  EndToEndControlledExecutionPreview,
  EndToEndDemoArtifactRefs,
  EndToEndDemoResult,
  EndToEndDemoStageResult,
} from './endToEndDemoTypes';

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function stage(params: EndToEndDemoStageResult): EndToEndDemoStageResult {
  return params;
}

function demoStageLimitations(extra: MarkdownString[] = []): MarkdownString[] {
  return [
    ...extra,
    'Phase 22 E2E demo stage is offline, deterministic, in-memory, and not a live system test.',
  ];
}

function draftToAuditInput(
  draft: { runId: MarkdownString; eventType: MarkdownString; summary: MarkdownString; relatedStep?: MarkdownString },
  index: number,
  evidenceIds: MarkdownString[],
  testCaseIds: MarkdownString[],
  reportId: MarkdownString | undefined
): AuditEventInput {
  const eventType = draft.eventType === 'release_recommendation_generated'
    ? 'release_recommended'
    : draft.eventType === 'evidence_normalized'
      ? 'evidence_created'
      : draft.eventType === 'report_generated'
        ? 'report_generated'
        : draft.eventType === 'severity_classified'
          ? 'severity_classified'
          : draft.eventType === 'defect_analyzed'
            ? 'defect_analyzed'
            : draft.eventType === 'regression_suggested'
              ? 'regression_suggested'
              : draft.eventType === 'unknown_recorded'
                ? 'unknown_recorded'
                : draft.eventType === 'run_started'
                  ? 'run_started'
                  : draft.eventType === 'run_completed'
                    ? 'run_completed'
                    : 'trace_checkpoint';

  return {
    id: `audit-e2e-${draft.runId}-${eventType}-${index + 1}`,
    runId: draft.runId,
    traceId: `trace-e2e-${draft.runId}`,
    eventType,
    actor: { agentRole: 'test_lead', externalActor: 'phase-22-e2e-demo' },
    outcome: eventType === 'release_recommended' ? 'blocked' : 'success',
    summary: draft.summary,
    inputSummary: draft.relatedStep ?? draft.eventType,
    outputSummary: draft.summary,
    artifactRefs: {
      evidenceIds,
      testCaseIds,
      reportIds: reportId ? [reportId] : [],
      sourceRefs: smallNoteSystemFixture.input.contextSources ?? [],
    },
    limitations: [
      'Audit input was derived from an orchestration draft for the Phase 22 offline demo.',
    ],
  };
}

function buildControlledPreview(
  kind: EndToEndControlledExecutionPreview['kind'],
  request: ControlledExecutionRequest
): EndToEndControlledExecutionPreview {
  const plan = buildDryRunExecutionPlan(request);
  const safety = evaluateControlledExecutionSafety(request);
  const result = safety.allowedForSimulation
    ? simulateControlledExecution(request)
    : undefined;
  const warnings = [
    ...(safety.forbidden ? ['Controlled execution request is forbidden and was not simulated as completed.'] : []),
    ...(safety.requiresHumanApproval ? ['Controlled execution request requires approval before any future live action.'] : []),
    ...(result?.status === 'simulated_completed'
      ? ['Simulated completion is not real evidence and must not be interpreted as a pass.']
      : []),
  ];

  return {
    kind,
    request: safety.request,
    plan,
    safety,
    result,
    safetyCategory: safety.risk,
    simulated: result?.simulated ?? false,
    warnings,
    limitations: uniqueList([
      ...request.limitations,
      ...plan.limitations,
      ...safety.limitations,
      ...(result?.limitations ?? []),
      'Controlled execution preview did not run a command, send HTTP, launch a browser, call MCP, or create real evidence.',
    ]),
  };
}

function buildControlledExecutionPreviews(runId: MarkdownString): EndToEndControlledExecutionPreview[] {
  const safeCommand = buildControlledCommandExecutionRequest({
    id: 'controlled-e2e-typecheck-dry-run',
    runId,
    requestedByAgent: 'test_lead',
    mode: 'dry_run',
    purpose: 'Preview a typecheck command boundary without executing it.',
    environment: 'offline-demo',
    commandRequest: {
      command: 'tsc',
      args: ['--noEmit', '--pretty', 'false'],
      workingDirectorySummary: 'agent-testing repository workspace summary',
      environmentSummary: 'offline demo environment; no process execution',
      timeoutMs: 120000,
      allowlistedCategory: 'typecheck',
      expectedOutput: 'TypeScript check output if a later approved runtime executed it.',
      riskNotes: ['This Phase 22 preview creates only a dry-run plan.'],
    },
  });
  const apiGet = buildControlledApiExecutionRequest({
    id: 'controlled-e2e-api-get-private-note',
    runId,
    requestedByAgent: 'test_design',
    mode: 'simulated',
    purpose: 'Preview a read-style API GET boundary over the demo snapshot.',
    environment: 'demo_snapshot',
    apiRequest: {
      method: 'GET',
      urlSummary: '/api/notes/private-note',
      headersSummary: 'Authorization: [redacted fixture token]',
      bodySummary: 'none',
      expectedStatus: 403,
      expectedOutput: 'Permission denial summary if a later controlled runtime inspected a snapshot.',
      targetEnvironment: 'demo_snapshot',
      riskNotes: ['No HTTP request is sent; simulation can only produce non-pass draft evidence.'],
    },
  });
  const forbiddenCommand = buildControlledCommandExecutionRequest({
    id: 'controlled-e2e-forbidden-rm-root',
    runId,
    requestedByAgent: 'ops_check',
    mode: 'dry_run',
    purpose: 'Demonstrate forbidden destructive command handling.',
    environment: 'production',
    isProduction: true,
    isDestructive: true,
    commandRequest: {
      command: 'rm',
      args: ['-rf', '/'],
      workingDirectorySummary: 'production root path summary',
      environmentSummary: 'production-like destructive target',
      timeoutMs: 1000,
      allowlistedCategory: 'unknown',
      expectedOutput: 'No output; request must be forbidden before execution.',
      riskNotes: ['Destructive command preview must be blocked.'],
    },
  });

  return [
    buildControlledPreview('safe_command_dry_run', safeCommand),
    buildControlledPreview('api_get_simulated', apiGet),
    buildControlledPreview('forbidden_destructive', forbiddenCommand),
  ];
}

function buildApprovalPreviews(runId: MarkdownString): EndToEndApprovalPreview[] {
  const low = evaluateApprovalPolicy({
    id: 'approval-e2e-low-report-generation',
    runId,
    requestedByAgent: 'test_lead',
    actionType: 'report_generation',
    target: 'agent-testing in-memory markdown report preview',
    purpose: 'Generate a deterministic report preview from provided fixture evidence.',
    permissionLevel: 'READ_ONLY',
    sideEffectLevel: 'NONE',
    inputSummary: 'Report generation over in-memory orchestration output.',
    expectedOutput: 'Markdown report preview.',
  });
  const high = evaluateApprovalPolicy({
    id: 'approval-e2e-high-command',
    runId,
    requestedByAgent: 'ops_check',
    actionType: 'terminal_command',
    target: 'tsc --noEmit --pretty false',
    purpose: 'Preview a future controlled command execution boundary.',
    permissionLevel: 'EXECUTE_LIMITED',
    sideEffectLevel: 'NONE',
    executesCommand: true,
    inputSummary: 'Command execution metadata only.',
    expectedOutput: 'Future typecheck output if approved in a later runtime.',
  });
  const forbidden = evaluateApprovalPolicy({
    id: 'approval-e2e-forbidden-delete',
    runId,
    requestedByAgent: 'ops_check',
    actionType: 'data_deletion',
    target: 'production notes database',
    purpose: 'Attempt production destructive delete preview.',
    permissionLevel: 'PRODUCTION_FORBIDDEN',
    sideEffectLevel: 'DESTRUCTIVE',
    environment: 'production',
    isProduction: true,
    isDestructive: true,
    modifiesDatabase: true,
    inputSummary: 'DELETE FROM notes in production.',
    expectedOutput: 'Forbidden by policy.',
  });

  return [
    {
      label: 'LOW',
      riskCategory: low.riskAssessment.riskLevel,
      policyOutput: low,
      expectedBoundary: 'not_required for pure deterministic report generation.',
      warnings: [],
      limitations: low.limitations,
    },
    {
      label: 'HIGH',
      riskCategory: high.riskAssessment.riskLevel,
      policyOutput: high,
      expectedBoundary: 'pending approval for command execution metadata.',
      warnings: high.status === 'pending' ? [] : ['Expected HIGH approval preview to be pending.'],
      limitations: high.limitations,
    },
    {
      label: 'FORBIDDEN',
      riskCategory: forbidden.riskAssessment.riskLevel,
      policyOutput: forbidden,
      expectedBoundary: 'forbidden for production destructive data deletion.',
      warnings: forbidden.status === 'forbidden' ? forbidden.policyViolations : ['Expected FORBIDDEN approval preview to be forbidden.'],
      limitations: forbidden.limitations,
    },
  ];
}

function buildStages(params: {
  offlineSuccess: boolean;
  apiSuccess: boolean;
  uiSuccess: boolean;
  readOnlySuccess: boolean;
  controlledSuccess: boolean;
  approvalSuccess: boolean;
  auditSuccess: boolean;
  observabilitySuccess: boolean;
  persistenceSuccess: boolean;
  reportSuccess: boolean;
  summarySuccess: boolean;
}): EndToEndDemoStageResult[] {
  return [
    stage({
      stage: 'fixture_loaded',
      success: true,
      summary: 'Loaded the small note system fixture from in-memory module exports.',
      warnings: [],
      limitations: demoStageLimitations(['Fixture evidence is static and not live system evidence.']),
    }),
    stage({
      stage: 'offline_scenario_validated',
      success: params.offlineSuccess,
      summary: 'Validated the offline scenario against expected small note characteristics.',
      warnings: params.offlineSuccess ? [] : ['Offline scenario validation reported failed checks.'],
      limitations: demoStageLimitations(),
    }),
    stage({
      stage: 'api_demo_created',
      success: params.apiSuccess,
      summary: 'Created the in-memory API boundary demo result.',
      warnings: [],
      limitations: demoStageLimitations(['No real API route or server was created.']),
    }),
    stage({
      stage: 'ui_view_model_built',
      success: params.uiSuccess,
      summary: 'Built the props-only UI demo view model.',
      warnings: [],
      limitations: demoStageLimitations(['No production page, route, browser, or localStorage was used.']),
    }),
    stage({
      stage: 'read_only_mcp_pilot_run',
      success: params.readOnlySuccess,
      summary: 'Ran the fake read-only MCP pilot over an in-memory snapshot.',
      warnings: [],
      limitations: demoStageLimitations(['No real MCP server or tool was contacted.']),
    }),
    stage({
      stage: 'controlled_execution_boundary_checked',
      success: params.controlledSuccess,
      summary: 'Built dry-run and simulated controlled execution boundary previews.',
      warnings: [],
      limitations: demoStageLimitations(['No command, HTTP request, or browser action was executed.']),
    }),
    stage({
      stage: 'approval_policy_evaluated',
      success: params.approvalSuccess,
      summary: 'Evaluated LOW, HIGH, and FORBIDDEN approval policy previews.',
      warnings: [],
      limitations: demoStageLimitations(['No real human approval request was sent.']),
    }),
    stage({
      stage: 'audit_trail_built',
      success: params.auditSuccess,
      summary: 'Built an in-memory summary-only audit preview.',
      warnings: [],
      limitations: demoStageLimitations(['Audit events were not persisted.']),
    }),
    stage({
      stage: 'observability_metrics_built',
      success: params.observabilitySuccess,
      summary: 'Aggregated observability metrics from in-memory audit events.',
      warnings: [],
      limitations: demoStageLimitations(['Metrics were not emitted, scraped, or displayed in a real dashboard.']),
    }),
    stage({
      stage: 'persistence_snapshot_built',
      success: params.persistenceSuccess,
      summary: 'Built an in-memory persistence snapshot from orchestration, audit, approvals, and controlled previews.',
      warnings: [],
      limitations: demoStageLimitations(['Snapshot is not a database write or durable repository.']),
    }),
    stage({
      stage: 'persistence_snapshot_validated',
      success: params.persistenceSuccess,
      summary: 'Validated the in-memory persistence snapshot metadata.',
      warnings: params.persistenceSuccess ? [] : ['Persistence validation reported errors.'],
      limitations: demoStageLimitations(),
    }),
    stage({
      stage: 'report_preview_built',
      success: params.reportSuccess,
      summary: 'Referenced the markdown report preview generated by deterministic orchestration.',
      warnings: params.reportSuccess ? [] : ['Report preview is missing from orchestration output.'],
      limitations: demoStageLimitations(['Report preview is not a real production test report.']),
    }),
    stage({
      stage: 'summary_built',
      success: params.summarySuccess,
      summary: 'Built the Phase 22 E2E demo summary.',
      warnings: [],
      limitations: demoStageLimitations(),
    }),
  ];
}

function buildArtifactRefs(params: {
  runId: MarkdownString;
  reportId?: MarkdownString;
  evidenceIds: MarkdownString[];
  auditEventIds: MarkdownString[];
  approvalRequestIds: MarkdownString[];
  persistenceRecordIds: MarkdownString[];
}): EndToEndDemoArtifactRefs {
  return {
    ...params,
    uiSections: [
      'overview',
      'evidenceRows',
      'approvalRows',
      'auditTimeline',
      'observability',
      'report',
      'persistence',
      'release',
    ],
    limitations: [
      'Artifact refs identify in-memory demo objects only.',
      'Refs do not prove durable persistence, live execution, real MCP output, or real system test evidence.',
    ],
  };
}

export function runSmallNoteEndToEndDemo(): EndToEndDemoResult {
  const runId = smallNoteSystemFixture.input.runId ?? 'offline-small-note-system';
  const offlineScenarioValidation = validateSmallNoteSystemScenario();
  const orchestration = offlineScenarioValidation.orchestration;
  const apiDemo = runSmallNoteApiDemo();
  const uiViewModel = buildSmallNoteUiDemoViewModel();
  const readOnlyMcpPilot = runSmallNoteReadOnlyPilotScenario();
  const controlledExecutionPreview = buildControlledExecutionPreviews(runId);
  const approvalPreview = buildApprovalPreviews(runId);
  const reportPreview = orchestration.report;
  const reportId = reportPreview ? `report-${runId}` : undefined;
  const evidenceIds = orchestration.normalizedEvidence.map((item) => item.id);
  const testCaseIds = orchestration.testCases.map((item) => item.id);
  const auditInputs: AuditEventInput[] = [
    ...orchestration.auditEventDrafts.map((draft, index) =>
      draftToAuditInput(draft, index, evidenceIds, testCaseIds, reportId)
    ),
    ...approvalPreview.map((preview): AuditEventInput => ({
      id: `audit-e2e-${runId}-approval-${preview.label.toLowerCase()}`,
      runId,
      traceId: `trace-e2e-${runId}`,
      eventType: preview.policyOutput.status === 'forbidden' ? 'approval_forbidden' : 'approval_evaluated',
      actor: { agentRole: 'test_lead', externalActor: 'phase-22-e2e-demo' },
      outcome: preview.policyOutput.status === 'forbidden'
        ? 'forbidden'
        : preview.policyOutput.status === 'pending'
          ? 'pending'
          : 'success',
      summary: `${preview.label} approval policy preview evaluated as ${preview.policyOutput.status}.`,
      inputSummary: preview.expectedBoundary,
      outputSummary: preview.policyOutput.reason,
      policyRef: {
        approvalRequestId: preview.policyOutput.request.id,
        approvalStatus: preview.policyOutput.status,
        approvalRiskLevel: preview.policyOutput.riskAssessment.riskLevel,
        approvalActionType: preview.policyOutput.request.actionType,
        policyViolations: preview.policyOutput.policyViolations,
        requiresHumanApproval: preview.policyOutput.requiresHumanApproval,
      },
      limitations: ['Approval preview is policy evaluation only and is not human approval.'],
    })),
    ...controlledExecutionPreview.flatMap((preview, index): AuditEventInput[] => [
      ...(preview.plan.auditEventDrafts.map((draft, draftIndex): AuditEventInput => ({
        ...draft,
        id: `audit-e2e-${runId}-controlled-${index + 1}-${draftIndex + 1}`,
        traceId: `trace-e2e-${runId}`,
        outcome: preview.safety.forbidden
          ? 'forbidden'
          : preview.safety.requiresHumanApproval
            ? 'pending'
            : 'success',
        limitations: [
          ...(draft.limitations ?? []),
          'Controlled execution audit draft is summary-only and not persisted.',
        ],
      }))),
      ...(preview.result?.resultAuditDraft ? [{
        ...preview.result.resultAuditDraft,
        id: `audit-e2e-${runId}-controlled-result-${index + 1}`,
        traceId: `trace-e2e-${runId}`,
        outcome: preview.result.status === 'simulated_completed' ? 'success' : 'blocked',
        limitations: [
          ...(preview.result.resultAuditDraft.limitations ?? []),
          'Simulated result audit draft does not prove live execution.',
        ],
      } as AuditEventInput] : []),
    ]),
  ];
  const auditPreview = buildAuditTrail({
    runId,
    defaultTraceId: `trace-e2e-${runId}`,
    defaultActor: { agentRole: 'test_lead', externalActor: 'phase-22-e2e-demo' },
    events: auditInputs,
    limitations: [
      'Phase 22 E2E audit preview is in-memory only and not an audit runtime.',
    ],
  });
  const observabilityPreview = aggregateObservabilityMetrics({
    events: auditPreview.events,
    runIds: [runId],
    limitations: [
      'Phase 22 E2E observability preview is aggregated from in-memory audit events only.',
    ],
  });
  const simulatedResults = controlledExecutionPreview
    .map((preview) => preview.result)
    .filter((result): result is ControlledExecutionResult => Boolean(result));
  const persistenceSnapshot = buildPersistenceSnapshot({
    orchestrationOutput: orchestration,
    approvalRequests: approvalPreview.map((preview) => preview.policyOutput.request),
    auditEvents: auditPreview.events,
    controlledExecutionResults: simulatedResults,
    report: reportPreview,
    limitations: [
      'Phase 22 E2E persistence snapshot is in-memory and was not saved to disk or database.',
    ],
  });
  const persistenceValidation = validatePersistenceSnapshot(persistenceSnapshot);
  const artifactRefs = buildArtifactRefs({
    runId,
    reportId,
    evidenceIds,
    auditEventIds: auditPreview.events.map((event) => event.id),
    approvalRequestIds: approvalPreview.map((preview) => preview.policyOutput.request.id),
    persistenceRecordIds: persistenceSnapshot.records.map((record) => record.id),
  });
  const warnings = uniqueList([
    'Phase 22 E2E demo is not a real system test result.',
    'Fixture evidence, draft evidence, dry-run plans, and simulated results must not be treated as live pass evidence.',
    'Approval policy evaluations are not human approvals.',
    ...(offlineScenarioValidation.success ? [] : ['Offline scenario validation reported failed checks.']),
    ...apiDemo.limitations.filter((item) => item.toLowerCase().includes('demo')),
    ...readOnlyMcpPilot.warnings,
    ...controlledExecutionPreview.flatMap((preview) => preview.warnings),
    ...approvalPreview.flatMap((preview) => preview.warnings),
    ...persistenceValidation.warnings,
  ]);
  const limitations = uniqueList([
    'No real Next.js route, API route, server, database, repository, MCP server, LLM, command, HTTP request, browser, filesystem read, config read, log read, network call, or production UI page was used.',
    'runSmallNoteApiDemo returns summary DTOs; full internal evidence, approval, and audit lists are rebuilt here from deterministic in-memory outputs where available.',
    'Controlled execution simulated output is only a boundary preview and is not appended to real test evidence.',
    'Read-only MCP pilot uses fake snapshot adapters and does not contact MCP.',
    'Persistence snapshot is an in-memory export shape, not storage.',
    'UI view model is props-only demo data and not a production page.',
    ...(reportPreview ? reportPreview.limitations : ['Report preview is missing from orchestration output.']),
  ]);
  const stages = buildStages({
    offlineSuccess: offlineScenarioValidation.success,
    apiSuccess: Boolean(apiDemo.createRun && apiDemo.getRun),
    uiSuccess: Boolean(uiViewModel.overview),
    readOnlySuccess: readOnlyMcpPilot.summary.totalRequests > 0,
    controlledSuccess: controlledExecutionPreview.length >= 3,
    approvalSuccess: approvalPreview.length >= 3,
    auditSuccess: auditPreview.eventCount > 0,
    observabilitySuccess: observabilityPreview.eventCount === auditPreview.eventCount,
    persistenceSuccess: persistenceValidation.valid,
    reportSuccess: Boolean(reportPreview),
    summarySuccess: true,
  });
  const successfulRequiredStages = stages.every((item) => item.success || item.stage === 'persistence_snapshot_validated');
  const status = !offlineScenarioValidation.success
    ? 'failed'
    : !persistenceValidation.valid
      ? 'completed_with_warnings'
      : warnings.length > 0
        ? 'completed_with_warnings'
        : successfulRequiredStages
          ? 'completed'
          : 'inconclusive';
  const resultWithoutSummary: Omit<EndToEndDemoResult, 'summary'> = {
    id: 'e2e-small-note-offline-demo',
    status,
    fixture: smallNoteSystemFixture,
    stages,
    offlineScenarioValidation,
    apiDemo,
    uiViewModel,
    readOnlyMcpPilot,
    controlledExecutionPreview,
    approvalPreview,
    auditPreview,
    observabilityPreview,
    persistenceSnapshot,
    persistenceValidation,
    reportPreview,
    artifactRefs,
    warnings,
    limitations,
  };
  const summary = summarizeEndToEndDemo({
    ...resultWithoutSummary,
    summary: 'Phase 22 offline E2E demo summary pending.',
  });

  return {
    ...resultWithoutSummary,
    summary,
  };
}

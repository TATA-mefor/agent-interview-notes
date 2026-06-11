import type {
  AcceptancePoint,
  DefectFinding,
  MarkdownString,
  SeverityClassification,
  SourceReference,
  SystemTestCase,
  SystemTestEvidence,
  UnknownItem,
} from '../types';
import {
  analyzeDefect,
  type DefectAnalysisInput,
  type DefectAnalysisOutput,
} from '../defects';
import {
  normalizeEvidence,
  type RawEvidenceInput,
} from '../evidence';
import {
  generateOpsChecklist,
  type DeploymentMode,
  type OpsChecklistInput,
  type OpsChecklistItem,
  type UserScale,
} from '../ops';
import {
  generateMarkdownReport,
  type MarkdownReportOutput,
} from '../report';
import {
  recommendRelease,
  type ReleaseRecommendationOutput,
} from '../release';
import {
  suggestRegression,
  type RegressionSuggestionItem,
} from '../regression';
import {
  classifySeverity,
  type SeverityClassificationOutput,
} from '../severity';
import {
  buildContext,
  extractAcceptancePoints,
  generateSystemTestCases,
  type ContextBuildingOutput,
  type SkillExecutionContext,
} from '../skills';

export interface TestLeadOrchestrationOptions {
  includeOpsChecklist?: boolean;
  includeNegativeCases?: boolean;
  includePermissionChecks?: boolean;
  generateReport?: boolean;
  generateRegressionSuggestions?: boolean;
  generateReleaseRecommendation?: boolean;
}

export interface TestLeadOrchestrationInput {
  runId?: MarkdownString;
  targetSystemName: MarkdownString;
  targetSystemType: MarkdownString;
  systemDescription: MarkdownString;
  requirementsText: MarkdownString;
  modules?: MarkdownString[];
  contextSources?: SourceReference[];
  knownConstraints?: MarkdownString[];
  opsProfile?: Partial<OpsChecklistInput> & {
    deploymentMode?: DeploymentMode;
    userScale?: UserScale | number | MarkdownString;
  };
  rawEvidence?: RawEvidenceInput[];
  existingDefects?: DefectFinding[];
  notes?: MarkdownString[];
  options?: TestLeadOrchestrationOptions;
}

export interface TestLeadOrchestrationTraceEntry {
  step: MarkdownString;
  skillName: MarkdownString;
  success: boolean;
  inputSummary: MarkdownString;
  outputSummary: MarkdownString;
  issues: MarkdownString[];
  limitations: MarkdownString[];
}

export interface ApprovalRequiredActionDraft {
  id: MarkdownString;
  reason: MarkdownString;
  recommendedOwner: MarkdownString;
  blocking: boolean;
}

export interface AuditEventDraft {
  eventType: MarkdownString;
  runId: MarkdownString;
  summary: MarkdownString;
  relatedStep?: MarkdownString;
}

export interface TestLeadOrchestrationOutput {
  runId: MarkdownString;
  context: ContextBuildingOutput;
  acceptancePoints: AcceptancePoint[];
  testCases: SystemTestCase[];
  opsChecklist: OpsChecklistItem[];
  normalizedEvidence: SystemTestEvidence[];
  severityClassifications: SeverityClassificationOutput[];
  defectAnalyses: DefectAnalysisOutput[];
  regressionSuggestions: RegressionSuggestionItem[];
  releaseRecommendation?: ReleaseRecommendationOutput;
  report?: MarkdownReportOutput;
  unknowns: Array<UnknownItem | MarkdownString>;
  limitations: MarkdownString[];
  trace: TestLeadOrchestrationTraceEntry[];
  approvalRequiredActions: ApprovalRequiredActionDraft[];
  auditEventDrafts: AuditEventDraft[];
}

const DEFAULT_OPTIONS: Required<TestLeadOrchestrationOptions> = {
  includeOpsChecklist: true,
  includeNegativeCases: true,
  includePermissionChecks: true,
  generateReport: true,
  generateRegressionSuggestions: true,
  generateReleaseRecommendation: true,
};

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function createContext(input: TestLeadOrchestrationInput): SkillExecutionContext {
  return {
    runId: input.runId || 'test-lead-run-draft',
    invokedByAgent: 'test_lead',
    createdAt: '',
    source: input.contextSources?.[0] ?? 'provided-orchestration-input',
    limitations: [
      'Test Lead orchestration is a pure deterministic function over provided input.',
    ],
  };
}

function traceEntry(params: TestLeadOrchestrationTraceEntry): TestLeadOrchestrationTraceEntry {
  return params;
}

function summarizeIssues(issues: Array<{ code?: string; message: MarkdownString }>): MarkdownString[] {
  return issues.map((issue) => issue.code ? `${issue.code}: ${issue.message}` : issue.message);
}

function makeOpsInput(input: TestLeadOrchestrationInput): OpsChecklistInput {
  const profile = input.opsProfile ?? {};

  return {
    targetSystemName: profile.targetSystemName ?? input.targetSystemName,
    targetSystemType: profile.targetSystemType ?? input.targetSystemType,
    deploymentMode: profile.deploymentMode ?? 'unknown',
    userScale: profile.userScale,
    modules: profile.modules ?? input.modules ?? [],
    hasAuthentication: profile.hasAuthentication,
    hasAuthorization: profile.hasAuthorization,
    hasFileUpload: profile.hasFileUpload,
    hasSearch: profile.hasSearch,
    hasBackup: profile.hasBackup,
    hasRestore: profile.hasRestore,
    hasLogging: profile.hasLogging,
    hasMonitoring: profile.hasMonitoring,
    hasPublicAccess: profile.hasPublicAccess,
    hasDatabase: profile.hasDatabase,
    hasExternalStorage: profile.hasExternalStorage,
    hasMultiUserUsage: profile.hasMultiUserUsage,
    hasAdminRole: profile.hasAdminRole,
    knownConstraints: profile.knownConstraints ?? input.knownConstraints,
    knownOpsRisks: profile.knownOpsRisks,
  };
}

function relatedEvidenceForDefect(
  defect: DefectFinding,
  evidence: SystemTestEvidence[]
): SystemTestEvidence[] {
  return evidence.filter((item) =>
    defect.evidenceIds.includes(item.id) || item.testCaseId === defect.testCaseId
  );
}

function severityForEvidence(
  evidenceItem: SystemTestEvidence,
  classifications: SeverityClassificationOutput[]
): SeverityClassificationOutput | undefined {
  return classifications.find((item) =>
    item.classification.severity === evidenceItem.severity ||
    item.reason.toLowerCase().includes(evidenceItem.id.toLowerCase())
  );
}

function severityForDefect(
  defect: DefectFinding,
  classifications: SeverityClassificationOutput[]
): SeverityClassification | SeverityClassificationOutput | undefined {
  return classifications.find((item) => item.classification.severity === defect.severity);
}

function buildDraftDefectAnalysisInputs(
  evidence: SystemTestEvidence[],
  testCases: SystemTestCase[],
  opsChecklist: OpsChecklistItem[],
  classifications: SeverityClassificationOutput[]
): DefectAnalysisInput[] {
  return evidence
    .filter((item) => item.result === 'fail' || item.result === 'blocked')
    .map((item) => ({
      testCase: testCases.find((testCase) => testCase.id === item.testCaseId),
      evidence: item,
      severityClassification: severityForEvidence(item, classifications),
      opsRisks: opsChecklist,
      affectedModule: item.testScope,
      notes: `Draft analysis from failed evidence ${item.id}; no formal defect ID was created.`,
    }));
}

function buildUnknowns(params: {
  contextUnknowns: MarkdownString[];
  acceptanceUnknowns: MarkdownString[];
  testCaseUnknowns: MarkdownString[];
  opsUnknowns: MarkdownString[];
  evidenceCount: number;
  severityUnknowns: SeverityClassificationOutput[];
  regressionUnknowns: MarkdownString[];
  input: TestLeadOrchestrationInput;
}): MarkdownString[] {
  const unknowns = [
    ...params.contextUnknowns,
    ...params.acceptanceUnknowns,
    ...params.testCaseUnknowns,
    ...params.opsUnknowns,
    ...params.severityUnknowns.map((item) => `Unknown severity: ${item.reason}`),
    ...params.regressionUnknowns,
  ];

  if (!params.input.requirementsText.trim()) {
    unknowns.push('Requirements text is missing.');
  }

  if (params.evidenceCount === 0) {
    unknowns.push('No raw evidence was provided; no pass claims can be generated.');
  }

  if ((params.input.modules ?? []).length === 0) {
    unknowns.push('Module list is missing.');
  }

  return uniqueList(unknowns);
}

function approvalDrafts(
  runId: MarkdownString,
  releaseRecommendation: ReleaseRecommendationOutput | undefined,
  unknowns: MarkdownString[]
): ApprovalRequiredActionDraft[] {
  const drafts: ApprovalRequiredActionDraft[] = [];

  if (releaseRecommendation?.recommendation === 'blocked') {
    drafts.push({
      id: `${runId}-APPROVAL-BLOCKED-RELEASE`,
      reason: 'Release recommendation is blocked and requires human release decision.',
      recommendedOwner: 'test_lead',
      blocking: true,
    });
  }

  if (releaseRecommendation?.recommendation === 'inconclusive') {
    drafts.push({
      id: `${runId}-APPROVAL-INCONCLUSIVE-RELEASE`,
      reason: 'Release recommendation is inconclusive and requires missing evidence or human decision.',
      recommendedOwner: 'test_lead',
      blocking: true,
    });
  }

  if (unknowns.length > 0) {
    drafts.push({
      id: `${runId}-APPROVAL-MISSING-EVIDENCE`,
      reason: `${unknowns.length} unknown or missing-evidence item(s) need human clarification.`,
      recommendedOwner: 'user_representative',
      blocking: false,
    });
  }

  return drafts;
}

function auditDraft(
  runId: MarkdownString,
  eventType: MarkdownString,
  summary: MarkdownString,
  relatedStep?: MarkdownString
): AuditEventDraft {
  return {
    eventType,
    runId,
    summary,
    relatedStep,
  };
}

export function runTestLeadOrchestration(
  input: TestLeadOrchestrationInput
): TestLeadOrchestrationOutput {
  const options = {
    ...DEFAULT_OPTIONS,
    ...(input.options ?? {}),
  };
  const runId = input.runId || 'test-lead-run-draft';
  const skillContext = createContext({ ...input, runId });
  const trace: TestLeadOrchestrationTraceEntry[] = [];
  const auditEventDrafts: AuditEventDraft[] = [
    auditDraft(runId, 'run_started', 'Test Lead orchestration started from provided input.', 'start'),
  ];

  const contextResult = buildContext({
    targetSystemName: input.targetSystemName,
    targetSystemType: input.targetSystemType,
    description: input.systemDescription,
    modules: input.modules ?? [],
    contextSources: input.contextSources ?? [],
    knownConstraints: input.knownConstraints ?? [],
  }, skillContext);
  const context = contextResult.output;
  trace.push(traceEntry({
    step: 'context_building',
    skillName: contextResult.skillName,
    success: contextResult.success,
    inputSummary: `${input.modules?.length ?? 0} module(s), ${input.contextSources?.length ?? 0} context source(s).`,
    outputSummary: `${context.moduleMap.length} module context item(s), ${context.riskAreas.length} risk area(s).`,
    issues: summarizeIssues(contextResult.issues),
    limitations: contextResult.limitations,
  }));
  auditEventDrafts.push(auditDraft(runId, 'skill_completed', 'Context building completed.', 'context_building'));

  const acceptanceResult = extractAcceptancePoints({
    requirementsText: input.requirementsText,
    source: input.contextSources?.[0] ?? 'provided-requirements',
    targetModules: input.modules ?? [],
    defaultPriority: 'should',
  }, skillContext);
  const acceptancePoints = acceptanceResult.output.acceptancePoints;
  trace.push(traceEntry({
    step: 'acceptance_extraction',
    skillName: acceptanceResult.skillName,
    success: acceptanceResult.success,
    inputSummary: `Requirements text length ${input.requirementsText.length}.`,
    outputSummary: `${acceptancePoints.length} acceptance point(s), ${acceptanceResult.output.ambiguities.length} ambiguity item(s).`,
    issues: summarizeIssues(acceptanceResult.issues),
    limitations: acceptanceResult.limitations,
  }));
  auditEventDrafts.push(auditDraft(runId, 'skill_completed', 'Acceptance extraction completed.', 'acceptance_extraction'));

  const testCaseResult = generateSystemTestCases({
    acceptancePoints,
    targetSystemType: input.targetSystemType,
    includeOpsChecks: options.includeOpsChecklist,
    includeNegativeCases: options.includeNegativeCases,
    includePermissionChecks: options.includePermissionChecks,
  }, skillContext);
  const testCases = testCaseResult.output.testCases;
  trace.push(traceEntry({
    step: 'test_case_generation',
    skillName: testCaseResult.skillName,
    success: testCaseResult.success,
    inputSummary: `${acceptancePoints.length} acceptance point(s).`,
    outputSummary: `${testCases.length} planned test case(s).`,
    issues: summarizeIssues(testCaseResult.issues),
    limitations: testCaseResult.limitations,
  }));
  auditEventDrafts.push(auditDraft(runId, 'skill_completed', 'Test case generation completed.', 'test_case_generation'));

  const opsOutput = options.includeOpsChecklist
    ? generateOpsChecklist(makeOpsInput(input))
    : {
        items: [],
        releaseBlockingChecks: [],
        recommendedEvidence: [],
        unknowns: [],
        limitations: ['Ops checklist generation was disabled by orchestration options.'],
      };
  const opsChecklist = opsOutput.items;
  trace.push(traceEntry({
    step: 'ops_checklist',
    skillName: 'ops_checklist',
    success: true,
    inputSummary: options.includeOpsChecklist ? `Ops profile for ${input.targetSystemName}.` : 'Disabled by option.',
    outputSummary: `${opsChecklist.length} ops item(s), ${opsOutput.releaseBlockingChecks.length} release-blocking item(s).`,
    issues: opsOutput.unknowns,
    limitations: opsOutput.limitations,
  }));
  auditEventDrafts.push(auditDraft(runId, 'skill_completed', 'Ops checklist step completed.', 'ops_checklist'));

  const normalizationResults = (input.rawEvidence ?? []).map((item) =>
    normalizeEvidence(item)
  );
  const normalizedEvidence = normalizationResults.map((item) => item.evidence);
  const normalizationIssues = normalizationResults.flatMap((item) => [
    ...item.issues,
    ...item.warnings,
    ...item.downgradedClaims,
  ]);
  trace.push(traceEntry({
    step: 'evidence_normalization',
    skillName: 'evidence_normalization',
    success: (input.rawEvidence ?? []).length > 0,
    inputSummary: `${input.rawEvidence?.length ?? 0} raw evidence item(s).`,
    outputSummary: `${normalizedEvidence.length} normalized evidence item(s).`,
    issues: normalizationIssues,
    limitations: normalizationResults.flatMap((item) => item.evidence.limitations),
  }));
  auditEventDrafts.push(auditDraft(runId, 'evidence_normalized', `${normalizedEvidence.length} evidence item(s) normalized.`, 'evidence_normalization'));

  const severityInputs = normalizedEvidence.map((evidenceItem) =>
    classifySeverity({
      evidence: evidenceItem,
      impactAreas: [],
      isCoreWorkflow: testCases.some((testCase) => testCase.id === evidenceItem.testCaseId && testCase.priority === 'high'),
      hasWorkaround: Boolean(evidenceItem.recommendation),
      notes: 'Generated by Test Lead orchestration from normalized evidence only.',
    })
  );
  const severityClassifications = severityInputs;
  trace.push(traceEntry({
    step: 'severity_classification',
    skillName: 'severity_classification',
    success: normalizedEvidence.length > 0,
    inputSummary: `${normalizedEvidence.length} normalized evidence item(s).`,
    outputSummary: `${severityClassifications.length} severity classification(s).`,
    issues: severityClassifications
      .filter((item) => item.classification.severity === 'unknown')
      .map((item) => item.reason),
    limitations: severityClassifications.flatMap((item) => item.limitations),
  }));
  auditEventDrafts.push(auditDraft(runId, 'severity_classified', `${severityClassifications.length} severity item(s) classified.`, 'severity_classification'));

  const defectAnalysisInputs: DefectAnalysisInput[] = [
    ...(input.existingDefects ?? []).map((defect) => ({
      defect,
      testCase: testCases.find((testCase) => testCase.id === defect.testCaseId),
      evidence: relatedEvidenceForDefect(defect, normalizedEvidence),
      severityClassification: severityForDefect(defect, severityClassifications),
      opsRisks: opsChecklist,
      affectedModule: defect.affectedArea,
      notes: 'Existing defect analysis from provided defect input.',
    })),
    ...buildDraftDefectAnalysisInputs(
      normalizedEvidence,
      testCases,
      opsChecklist,
      severityClassifications
    ),
  ];
  const defectAnalyses = defectAnalysisInputs.map((item) => analyzeDefect(item));
  trace.push(traceEntry({
    step: 'defect_analysis',
    skillName: 'defect_analysis',
    success: true,
    inputSummary: `${input.existingDefects?.length ?? 0} existing defect(s), ${normalizedEvidence.filter((item) => item.result === 'fail' || item.result === 'blocked').length} failed evidence draft(s).`,
    outputSummary: `${defectAnalyses.length} defect analysis item(s).`,
    issues: defectAnalyses
      .filter((item) => item.suspectedLayer === 'unknown' || item.causeCategory === 'unknown')
      .map((item) => item.possibleCause),
    limitations: defectAnalyses.flatMap((item) => item.limitations),
  }));
  auditEventDrafts.push(auditDraft(runId, 'skill_completed', 'Defect analysis completed.', 'defect_analysis'));

  const regressionOutputs = options.generateRegressionSuggestions
    ? defectAnalysisInputs.map((defectInput, index) =>
        suggestRegression({
          defect: defectInput.defect,
          defectAnalysis: defectAnalyses[index],
          severityClassification: defectInput.severityClassification,
          testCase: defectInput.testCase,
          evidence: defectInput.evidence,
          opsRisks: opsChecklist,
          availableTestCases: testCases,
          affectedModule: defectInput.affectedModule,
          notes: defectInput.notes,
        })
      )
    : [];
  const regressionSuggestions = regressionOutputs.flatMap((item) => item.items);
  trace.push(traceEntry({
    step: 'regression_suggestion',
    skillName: 'regression_suggestion',
    success: true,
    inputSummary: options.generateRegressionSuggestions ? `${defectAnalysisInputs.length} defect context item(s).` : 'Disabled by option.',
    outputSummary: `${regressionSuggestions.length} regression suggestion item(s).`,
    issues: regressionOutputs.flatMap((item) => item.unknowns),
    limitations: regressionOutputs.flatMap((item) => item.limitations),
  }));
  auditEventDrafts.push(auditDraft(runId, 'skill_completed', 'Regression suggestion step completed.', 'regression_suggestion'));

  const unknowns = buildUnknowns({
    contextUnknowns: context.unknowns,
    acceptanceUnknowns: acceptanceResult.output.unknowns,
    testCaseUnknowns: testCaseResult.output.unknowns,
    opsUnknowns: opsOutput.unknowns,
    evidenceCount: normalizedEvidence.length,
    severityUnknowns: severityClassifications.filter((item) => item.classification.severity === 'unknown'),
    regressionUnknowns: regressionOutputs.flatMap((item) => item.unknowns),
    input,
  });

  const releaseRecommendation = options.generateReleaseRecommendation
    ? recommendRelease({
        testCases,
        evidence: normalizedEvidence,
        severityClassifications,
        defects: input.existingDefects ?? [],
        opsChecklist,
        regressionSuggestions,
        unknowns,
        limitations: [
          ...opsOutput.limitations,
          ...normalizationIssues,
          'Release recommendation was generated by orchestration and remains advisory.',
        ],
        notes: input.notes,
      })
    : undefined;
  trace.push(traceEntry({
    step: 'release_recommendation',
    skillName: 'release_recommendation',
    success: Boolean(releaseRecommendation),
    inputSummary: options.generateReleaseRecommendation ? `${testCases.length} cases, ${normalizedEvidence.length} evidence item(s).` : 'Disabled by option.',
    outputSummary: releaseRecommendation
      ? `${releaseRecommendation.recommendation}, ${releaseRecommendation.blockingFactors.length} blocking factor(s), ${releaseRecommendation.evidenceGaps.length} evidence gap(s).`
      : 'No release recommendation generated.',
    issues: [
      ...(releaseRecommendation?.evidenceGaps ?? []),
      ...(releaseRecommendation?.blockingFactors.map((item) => item.reason) ?? []),
    ],
    limitations: releaseRecommendation?.limitations ?? ['Release recommendation generation was disabled by orchestration options.'],
  }));
  if (releaseRecommendation) {
    auditEventDrafts.push(auditDraft(runId, 'release_recommendation_generated', `Release recommendation: ${releaseRecommendation.recommendation}.`, 'release_recommendation'));
  }

  const report = options.generateReport
    ? generateMarkdownReport({
        reportId: runId,
        title: `${input.targetSystemName || 'Target System'} System Test Report`,
        targetSystem: input.targetSystemName,
        testScope: input.systemDescription,
        contextSources: input.contextSources ?? [],
        acceptancePoints,
        testCases,
        evidence: normalizedEvidence,
        severityClassifications,
        defects: input.existingDefects ?? [],
        defectAnalyses,
        opsChecklist,
        regressionSuggestions,
        unknowns,
        limitations: [
          'Report was generated from orchestration outputs and does not prove test execution.',
        ],
        releaseRecommendation: releaseRecommendation?.recommendation,
      })
    : undefined;
  trace.push(traceEntry({
    step: 'report_generation',
    skillName: 'report_generation',
    success: Boolean(report),
    inputSummary: options.generateReport ? `${testCases.length} cases and ${normalizedEvidence.length} evidence item(s).` : 'Disabled by option.',
    outputSummary: report ? `${report.sections.length} report section summary item(s).` : 'No report generated.',
    issues: report ? [...report.warnings, ...report.missingInputs] : [],
    limitations: report?.limitations ?? ['Report generation was disabled by orchestration options.'],
  }));
  if (report) {
    auditEventDrafts.push(auditDraft(runId, 'report_generated', 'Markdown report generated as returned data only.', 'report_generation'));
  }

  const limitations = uniqueList([
    'Orchestration did not read files, write files, execute commands, access network, connect to a database, call MCP, call LLM, or execute tests.',
    'Agent reasoning and generated reports are not treated as execution evidence.',
    'Approval and audit outputs are draft records only; no runtime approval or audit persistence was implemented.',
    ...contextResult.limitations,
    ...acceptanceResult.limitations,
    ...testCaseResult.limitations,
    ...opsOutput.limitations,
    ...(releaseRecommendation?.limitations ?? []),
    ...(report?.limitations ?? []),
  ]);

  return {
    runId,
    context,
    acceptancePoints,
    testCases,
    opsChecklist,
    normalizedEvidence,
    severityClassifications,
    defectAnalyses,
    regressionSuggestions,
    releaseRecommendation,
    report,
    unknowns,
    limitations,
    trace,
    approvalRequiredActions: approvalDrafts(runId, releaseRecommendation, unknowns),
    auditEventDrafts,
  };
}

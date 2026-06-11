import type {
  AcceptancePoint,
  DefectFinding,
  SeverityClassification,
  SystemTestCase,
  SystemTestEvidence,
} from '../types';
import type {
  DefectAnalysisInput,
  DefectAnalysisOutput,
} from '../defects';
import type {
  RawEvidenceInput,
} from '../evidence';
import type {
  OpsChecklistInput,
  OpsChecklistItem,
} from '../ops';
import type {
  RegressionSuggestionInput,
  RegressionSuggestionItem,
} from '../regression';
import type {
  SeverityClassificationInput,
  SeverityClassificationOutput,
} from '../severity';
import type {
  ReleaseRecommendationOutput,
} from '../release';
import type {
  ContextBuildingInput,
} from '../skills/contextBuildingSkill';
import type {
  AcceptanceExtractionInput,
} from '../skills/acceptanceExtractionSkill';
import type {
  TestCaseGenerationInput,
} from '../skills/testCaseGenerationSkill';
import type {
  OpsChecklistSkillInput,
} from '../skills/opsChecklistSkill';
import type {
  EvidenceNormalizationSkillInput,
} from '../skills/evidenceNormalizationSkill';
import type {
  SeverityClassificationSkillInput,
} from '../skills/severityClassificationSkill';
import type {
  DefectAnalysisSkillInput,
} from '../skills/defectAnalysisSkill';
import type {
  RegressionSuggestionSkillInput,
} from '../skills/regressionSuggestionSkill';
import type {
  ReleaseRecommendationSkillInput,
} from '../skills/releaseRecommendationSkill';
import type {
  ReportGenerationSkillInput,
} from '../skills/reportGenerationSkill';
import type {
  AgentRuntimeSkillName,
} from './agentProfileTypes';
import type {
  AgentTaskType,
  BlackboardRef,
  SharedBlackboard,
} from './agentRuntimeTypes';

export type TypedInputBuilderStatus =
  | 'ready'
  | 'missing_input'
  | 'unsupported'
  | 'failed';

export interface TypedInputBuilderIssue {
  field: string;
  message: string;
}

export interface TypedInputBuildResult<TInput = unknown> {
  status: TypedInputBuilderStatus;
  input?: TInput;
  inputSummary: string;
  issues: TypedInputBuilderIssue[];
  warnings: string[];
  limitations: string[];
}

export interface BuildTypedSkillInputRequest {
  skillName: AgentRuntimeSkillName;
  taskType: AgentTaskType;
  blackboard: SharedBlackboard;
  inputRefs: BlackboardRef[];
}

interface RuntimeRequirements {
  targetSystemName?: string;
  targetSystemType?: string;
  systemDescription?: string;
  requirementsText?: string;
  modules?: string[];
  contextSources?: string[];
  knownConstraints?: string[];
  opsProfile?: OpsChecklistInput;
  notes?: string[];
  options?: {
    includeOpsChecklist?: boolean;
    includeNegativeCases?: boolean;
    includePermissionChecks?: boolean;
    generateRegressionSuggestions?: boolean;
    generateReleaseRecommendation?: boolean;
    generateReport?: boolean;
  };
}

const M3_TYPED_INPUT_FALLBACK_LIMITATION =
  'M3 typed input fallback; not full production schema.';

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function requirementsFromBlackboard(blackboard: SharedBlackboard): RuntimeRequirements {
  if (typeof blackboard.requirements === 'object' && blackboard.requirements !== null) {
    return blackboard.requirements as RuntimeRequirements;
  }

  return {};
}

function ready<TInput>(
  input: TInput,
  inputSummary: string,
  params: {
    warnings?: string[];
    limitations?: string[];
  } = {}
): TypedInputBuildResult<TInput> {
  return {
    status: 'ready',
    input,
    inputSummary,
    issues: [],
    warnings: params.warnings ?? [],
    limitations: params.limitations ?? [],
  };
}

function missing<TInput = unknown>(
  field: string,
  message: string,
  inputSummary: string,
  params: {
    warnings?: string[];
    limitations?: string[];
  } = {}
): TypedInputBuildResult<TInput> {
  return {
    status: 'missing_input',
    inputSummary,
    issues: [{ field, message }],
    warnings: params.warnings ?? [message],
    limitations: [
      ...(params.limitations ?? []),
      M3_TYPED_INPUT_FALLBACK_LIMITATION,
    ],
  };
}

function unsupported(
  request: BuildTypedSkillInputRequest
): TypedInputBuildResult {
  const message = `No typed input builder is registered for task ${request.taskType} and skill ${request.skillName}.`;

  return {
    status: 'unsupported',
    inputSummary: message,
    issues: [{ field: 'skillName', message }],
    warnings: [message],
    limitations: [M3_TYPED_INPUT_FALLBACK_LIMITATION],
  };
}

function findTestCase(
  blackboard: SharedBlackboard,
  testCaseId: string | undefined
): SystemTestCase | undefined {
  if (!testCaseId) {
    return undefined;
  }

  return arrayOf<SystemTestCase>(blackboard.testCases).find(
    (testCase) => testCase.id === testCaseId
  );
}

function evidenceForDefect(
  blackboard: SharedBlackboard,
  defect: DefectFinding
): SystemTestEvidence[] {
  const evidence = arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence);

  return evidence.filter(
    (item) =>
      defect.evidenceIds.includes(item.id) ||
      item.testCaseId === defect.testCaseId
  );
}

function inferSeverityInput(evidence: SystemTestEvidence): SeverityClassificationInput {
  const corpus = [
    evidence.testScope,
    evidence.evidenceSummary,
    evidence.recommendation,
    evidence.limitations.join(' '),
  ].filter(Boolean).join(' ').toLowerCase();

  return {
    evidence,
    impactAreas: [
      corpus.includes('private') || corpus.includes('permission') || corpus.includes('unauthorized')
        ? 'permission_bypass'
        : undefined,
      corpus.includes('backup') ? 'backup_failure' : undefined,
      corpus.includes('restore') ? 'restore_failure' : undefined,
      corpus.includes('concurrent') || corpus.includes('overwrite') ? 'multi_user_conflict' : undefined,
      corpus.includes('data loss') ? 'data_loss' : undefined,
    ].filter((item): item is NonNullable<SeverityClassificationInput['impactAreas']>[number] => Boolean(item)),
    isCoreWorkflow: evidence.severity === 'P0' || evidence.severity === 'P1',
    hasWorkaround: false,
    isSecurityRelated: corpus.includes('permission') || corpus.includes('private') || corpus.includes('unauthorized'),
    isDataSafetyRelated: corpus.includes('backup') || corpus.includes('restore') || corpus.includes('data'),
    isOperationalRisk: corpus.includes('deploy') || corpus.includes('backup') || corpus.includes('restore'),
    notes: 'M3 inferred severity input from normalized evidence summary only.',
  };
}

function releaseRecommendationValue(
  blackboard: SharedBlackboard
): ReleaseRecommendationOutput['recommendation'] | undefined {
  const value = blackboard.releaseRecommendation as
    | ReleaseRecommendationOutput
    | undefined;

  return value?.recommendation;
}

export function buildContextInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<ContextBuildingInput> {
  const requirements = requirementsFromBlackboard(blackboard);
  const input: ContextBuildingInput = {
    targetSystemName: requirements.targetSystemName ?? 'unknown',
    targetSystemType: requirements.targetSystemType ?? 'unknown',
    description: requirements.systemDescription ?? '',
    modules: requirements.modules ?? [],
    contextSources: requirements.contextSources ?? [],
    knownConstraints: requirements.knownConstraints ?? [],
  };

  return ready(
    input,
    `Context input from requirements: ${input.modules.length} module(s), ${input.contextSources.length} context source(s).`,
    {
      limitations: [
        'Context input is derived only from SharedBlackboard.requirements.',
      ],
    }
  );
}

export function buildAcceptanceInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<AcceptanceExtractionInput> {
  const requirements = requirementsFromBlackboard(blackboard);
  const requirementsText = requirements.requirementsText ?? '';

  if (!requirementsText.trim()) {
    return missing(
      'requirements.requirementsText',
      'Requirements text is missing for acceptance extraction.',
      'Acceptance extraction input missing requirements text.'
    );
  }

  return ready(
    {
      requirementsText,
      source: requirements.contextSources?.[0] ?? 'provided requirements',
      targetModules: requirements.modules ?? [],
      defaultPriority: 'should',
    },
    `Acceptance input from requirements text and ${requirements.modules?.length ?? 0} module(s).`
  );
}

export function buildTestCaseInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<TestCaseGenerationInput> {
  const requirements = requirementsFromBlackboard(blackboard);
  const acceptancePoints = arrayOf<AcceptancePoint>(blackboard.acceptancePoints);

  if (acceptancePoints.length === 0) {
    return missing(
      'acceptancePoints',
      'Acceptance points are missing for test case generation.',
      'Test case input missing acceptance points.'
    );
  }

  return ready(
    {
      acceptancePoints,
      targetSystemType: requirements.targetSystemType ?? 'unknown',
      includeOpsChecks: requirements.options?.includeOpsChecklist ?? true,
      includePermissionChecks: requirements.options?.includePermissionChecks ?? true,
      includeNegativeCases: requirements.options?.includeNegativeCases ?? true,
    },
    `Test case input from ${acceptancePoints.length} acceptance point(s).`
  );
}

export function buildOpsChecklistInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<OpsChecklistSkillInput> {
  const requirements = requirementsFromBlackboard(blackboard);

  return ready(
    {
      profile: requirements.opsProfile ?? {
        targetSystemName: requirements.targetSystemName ?? 'unknown',
        targetSystemType: requirements.targetSystemType ?? 'unknown',
        deploymentMode: 'unknown',
        modules: requirements.modules ?? [],
      },
    },
    'Ops checklist input built from requirements ops profile or conservative unknown deployment fallback.',
    {
      limitations: requirements.opsProfile
        ? []
        : [M3_TYPED_INPUT_FALLBACK_LIMITATION],
    }
  );
}

export function buildEvidenceNormalizationInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<EvidenceNormalizationSkillInput> {
  const rawEvidence = arrayOf<RawEvidenceInput>(blackboard.rawEvidence);

  if (rawEvidence.length === 0) {
    return missing(
      'rawEvidence',
      'Raw evidence is missing for evidence normalization.',
      'Evidence normalization input missing raw evidence.'
    );
  }

  return ready(
    { rawEvidence },
    `Evidence normalization input from ${rawEvidence.length} raw evidence item(s).`
  );
}

export function buildSeverityClassificationInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<SeverityClassificationSkillInput> {
  const evidence = arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence);

  if (evidence.length === 0) {
    return missing(
      'normalizedEvidence',
      'Normalized evidence is missing for severity classification.',
      'Severity classification input missing normalized evidence.'
    );
  }

  return ready(
    {
      classifications: evidence.map(inferSeverityInput),
    },
    `Severity classification input from ${evidence.length} normalized evidence item(s).`,
    {
      limitations: [
        'Severity impact hints are inferred from normalized evidence summaries only.',
      ],
    }
  );
}

export function buildDefectAnalysisInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<DefectAnalysisSkillInput> {
  const defects = arrayOf<DefectFinding>(blackboard.defects);
  const failedEvidence = arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence)
    .filter((item) => item.result === 'fail' || item.result === 'blocked');
  const classifications = arrayOf<SeverityClassification | SeverityClassificationOutput>(
    blackboard.severityClassifications
  );
  const inputs: DefectAnalysisInput[] = defects.length > 0
    ? defects.map((defect, index) => ({
        defect,
        testCase: findTestCase(blackboard, defect.testCaseId),
        evidence: evidenceForDefect(blackboard, defect),
        severityClassification: classifications[index],
        opsRisks: arrayOf<OpsChecklistItem>(blackboard.opsChecklist),
        notes: 'M3 draft defect analysis from provided defect metadata.',
      }))
    : failedEvidence.map((evidence) => ({
        evidence,
        testCase: findTestCase(blackboard, evidence.testCaseId),
        notes: 'Draft analysis from failed evidence only; no formal defect ID was created.',
      }));

  if (inputs.length === 0) {
    return missing(
      'defects|normalizedEvidence',
      'Defects or failed evidence are missing for defect analysis.',
      'Defect analysis input missing defects and failed evidence.'
    );
  }

  return ready(
    { defects: inputs },
    `Defect analysis input from ${defects.length} defect(s) and ${failedEvidence.length} failed or blocked evidence item(s).`,
    {
      limitations: defects.length === 0
        ? ['Failed evidence can generate draft analysis only; no formal defect ID is created.']
        : [],
    }
  );
}

export function buildRegressionSuggestionInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<RegressionSuggestionSkillInput> {
  const defects = arrayOf<DefectFinding>(blackboard.defects);

  if (defects.length === 0) {
    return missing(
      'defects',
      'Defects are missing for regression suggestion.',
      'Regression suggestion input missing defects.'
    );
  }

  const analyses = arrayOf<DefectAnalysisOutput>(blackboard.defectAnalyses);
  const classifications = arrayOf<SeverityClassification | SeverityClassificationOutput>(
    blackboard.severityClassifications
  );
  const inputs: RegressionSuggestionInput[] = defects.map((defect, index) => ({
    defect,
    defectAnalysis: analyses[index],
    severityClassification: classifications[index],
    testCase: findTestCase(blackboard, defect.testCaseId),
    evidence: evidenceForDefect(blackboard, defect),
    opsRisks: arrayOf<OpsChecklistItem>(blackboard.opsChecklist),
    availableTestCases: arrayOf<SystemTestCase>(blackboard.testCases),
    affectedModule: defect.affectedArea,
    notes: 'M3 regression planning from existing defect and analysis metadata.',
  }));

  return ready(
    { regressions: inputs },
    `Regression suggestion input from ${inputs.length} defect-linked item(s).`
  );
}

export function buildReleaseRecommendationInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<ReleaseRecommendationSkillInput> {
  const requirements = requirementsFromBlackboard(blackboard);
  const input: ReleaseRecommendationSkillInput = {
    testCases: arrayOf<SystemTestCase>(blackboard.testCases),
    evidence: arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence),
    severityClassifications: arrayOf<SeverityClassification | SeverityClassificationOutput>(
      blackboard.severityClassifications
    ),
    defects: arrayOf<DefectFinding>(blackboard.defects),
    opsChecklist: arrayOf<OpsChecklistItem>(blackboard.opsChecklist),
    regressionSuggestions: arrayOf<RegressionSuggestionItem>(blackboard.regressionSuggestions),
    unknowns: arrayOf<string>(blackboard.unknowns),
    limitations: arrayOf<string>(blackboard.limitations),
    notes: requirements.notes,
  };

  return ready(
    input,
    `Release recommendation input: ${input.testCases?.length ?? 0} test case(s), ${input.evidence?.length ?? 0} evidence item(s), ${input.unknowns?.length ?? 0} unknown(s).`
  );
}

export function buildReportInputFromBlackboard(
  blackboard: SharedBlackboard
): TypedInputBuildResult<ReportGenerationSkillInput> {
  const requirements = requirementsFromBlackboard(blackboard);
  const input: ReportGenerationSkillInput = {
    report: {
      reportId: `${blackboard.sessionId}-m3-report`,
      title: 'M3 Multi-Agent Runtime Report',
      targetSystem: requirements.targetSystemName ?? 'unknown',
      testScope: 'M3 in-memory SkillRouter demo scope; no real tests executed.',
      contextSources: requirements.contextSources ?? [],
      acceptancePoints: arrayOf<AcceptancePoint>(blackboard.acceptancePoints),
      testCases: arrayOf<SystemTestCase>(blackboard.testCases),
      evidence: arrayOf<SystemTestEvidence>(blackboard.normalizedEvidence),
      severityClassifications: arrayOf<SeverityClassification | SeverityClassificationOutput>(
        blackboard.severityClassifications
      ),
      defects: arrayOf<DefectFinding>(blackboard.defects),
      defectAnalyses: arrayOf<DefectAnalysisOutput>(blackboard.defectAnalyses),
      opsChecklist: arrayOf<OpsChecklistItem>(blackboard.opsChecklist),
      regressionSuggestions: arrayOf<RegressionSuggestionItem>(blackboard.regressionSuggestions),
      unknowns: arrayOf<string>(blackboard.unknowns),
      limitations: arrayOf<string>(blackboard.limitations),
      releaseRecommendation: releaseRecommendationValue(blackboard),
    },
  };

  return ready(
    input,
    `Report input from blackboard: ${input.report.testCases?.length ?? 0} test case(s), ${input.report.evidence?.length ?? 0} evidence item(s).`
  );
}

export function buildTypedSkillInputFromBlackboard(
  request: BuildTypedSkillInputRequest
): TypedInputBuildResult {
  try {
    switch (request.taskType) {
      case 'build_context':
        return buildContextInputFromBlackboard(request.blackboard);
      case 'extract_acceptance':
        return buildAcceptanceInputFromBlackboard(request.blackboard);
      case 'generate_test_cases':
        return buildTestCaseInputFromBlackboard(request.blackboard);
      case 'generate_ops_checklist':
        return buildOpsChecklistInputFromBlackboard(request.blackboard);
      case 'normalize_evidence':
        return buildEvidenceNormalizationInputFromBlackboard(request.blackboard);
      case 'classify_severity':
        return buildSeverityClassificationInputFromBlackboard(request.blackboard);
      case 'analyze_defect':
        return buildDefectAnalysisInputFromBlackboard(request.blackboard);
      case 'suggest_regression':
        return buildRegressionSuggestionInputFromBlackboard(request.blackboard);
      case 'recommend_release':
        return buildReleaseRecommendationInputFromBlackboard(request.blackboard);
      case 'generate_report':
        return buildReportInputFromBlackboard(request.blackboard);
      default:
        return unsupported(request);
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Unknown typed input builder failure.';

    return {
      status: 'failed',
      inputSummary: message,
      issues: [{ field: 'builder', message }],
      warnings: [message],
      limitations: [
        'Typed input builder failure was captured in-memory only.',
        M3_TYPED_INPUT_FALLBACK_LIMITATION,
      ],
    };
  }
}

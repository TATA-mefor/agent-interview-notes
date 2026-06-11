import type {
  ReleaseRecommendationOutput,
} from '../release';
import {
  buildContext,
  type ContextBuildingInput,
} from '../skills/contextBuildingSkill';
import {
  extractAcceptancePoints,
  type AcceptanceExtractionInput,
} from '../skills/acceptanceExtractionSkill';
import {
  generateSystemTestCases,
  type TestCaseGenerationInput,
} from '../skills/testCaseGenerationSkill';
import {
  generateOpsChecklistSkill,
  type OpsChecklistSkillInput,
} from '../skills/opsChecklistSkill';
import {
  normalizeEvidenceSkill,
  type EvidenceNormalizationSkillInput,
} from '../skills/evidenceNormalizationSkill';
import {
  classifySeveritySkill,
  type SeverityClassificationSkillInput,
} from '../skills/severityClassificationSkill';
import {
  analyzeDefectSkill,
  type DefectAnalysisSkillInput,
} from '../skills/defectAnalysisSkill';
import {
  suggestRegressionSkill,
  type RegressionSuggestionSkillInput,
} from '../skills/regressionSuggestionSkill';
import {
  recommendReleaseSkill,
  type ReleaseRecommendationSkillInput,
} from '../skills/releaseRecommendationSkill';
import {
  generateReportSkill,
  type ReportGenerationSkillInput,
} from '../skills/reportGenerationSkill';
import type {
  SkillExecutionContext,
} from '../skills/skillTypes';
import type {
  AgentProfile,
  AgentRuntimeSkillName,
} from './agentProfileTypes';
import type {
  AgentArtifactRef,
  AgentRuntimeRole,
  AgentTaskType,
  BlackboardRef,
  SharedBlackboard,
  SharedBlackboardKey,
} from './agentRuntimeTypes';
import {
  AGENT_TASK_BLACKBOARD_CONTRACTS,
} from './agentRuntimeTypes';
import {
  summarizeSharedBlackboard,
} from './sharedBlackboard';
import {
  buildTypedSkillInputFromBlackboard,
} from './typedInputBuilder';
import {
  createAgentMcpActionRequest,
  routeAgentMcpAction,
  type AgentMcpActionResult,
} from './mcpActionRouter';

export type SkillRouterStatus =
  | 'completed'
  | 'refused'
  | 'blocked'
  | 'failed'
  | 'unsupported';

export interface SkillRouterInvocationRequest {
  id?: string;
  sessionId: string;
  traceId: string;
  agentRole: AgentRuntimeRole;
  taskId: string;
  taskType: AgentTaskType;
  skillName: AgentRuntimeSkillName | 'placeholder';
  inputRefs: BlackboardRef[];
  blackboard: SharedBlackboard;
  expectedOutput: string;
  now?: string;
  limitations?: string[];
}

export interface SkillRouterWrite {
  key: SharedBlackboardKey;
  value: unknown;
  summary: string;
}

export interface SkillRouterInvocationResult {
  id: string;
  sessionId: string;
  traceId: string;
  agentRole: AgentRuntimeRole;
  taskId: string;
  taskType: AgentTaskType;
  skillName: AgentRuntimeSkillName | 'placeholder';
  status: SkillRouterStatus;
  output: unknown;
  outputSummary: string;
  writes: SkillRouterWrite[];
  artifacts: AgentArtifactRef[];
  warnings: string[];
  limitations: string[];
}

export interface SkillRouterValidationIssue {
  field: string;
  message: string;
}

export interface SkillRouterValidationResult {
  valid: boolean;
  issues: SkillRouterValidationIssue[];
}

export interface AgentTaskSkillContract {
  taskType: AgentTaskType;
  skillName: AgentRuntimeSkillName | 'placeholder';
  outputBlackboardKeys: SharedBlackboardKey[];
}

export const AGENT_TASK_SKILL_CONTRACTS: readonly AgentTaskSkillContract[] = [
  { taskType: 'build_context', skillName: 'context_building', outputBlackboardKeys: ['context'] },
  { taskType: 'extract_acceptance', skillName: 'acceptance_extraction', outputBlackboardKeys: ['acceptancePoints'] },
  { taskType: 'generate_test_cases', skillName: 'test_case_generation', outputBlackboardKeys: ['testCases'] },
  { taskType: 'generate_ops_checklist', skillName: 'ops_checklist', outputBlackboardKeys: ['opsChecklist'] },
  { taskType: 'normalize_evidence', skillName: 'evidence_normalization', outputBlackboardKeys: ['normalizedEvidence'] },
  { taskType: 'classify_severity', skillName: 'severity_classification', outputBlackboardKeys: ['severityClassifications'] },
  { taskType: 'analyze_defect', skillName: 'defect_analysis', outputBlackboardKeys: ['defectAnalyses'] },
  { taskType: 'suggest_regression', skillName: 'regression_suggestion', outputBlackboardKeys: ['regressionSuggestions'] },
  { taskType: 'recommend_release', skillName: 'release_recommendation', outputBlackboardKeys: ['releaseRecommendation'] },
  { taskType: 'generate_report', skillName: 'report_generation', outputBlackboardKeys: ['report'] },
  { taskType: 'request_mcp_read', skillName: 'placeholder', outputBlackboardKeys: ['mcpRequests', 'unknowns'] },
  { taskType: 'request_controlled_execution', skillName: 'placeholder', outputBlackboardKeys: ['controlledExecutionRequests', 'unknowns'] },
  { taskType: 'review_evidence_gap', skillName: 'placeholder', outputBlackboardKeys: ['unknowns'] },
  { taskType: 'summarize_session', skillName: 'placeholder', outputBlackboardKeys: ['report'] },
];

const SHARED_BLACKBOARD_KEYS: readonly SharedBlackboardKey[] = [
  'sessionId',
  'requirements',
  'context',
  'acceptancePoints',
  'testCases',
  'rawEvidence',
  'normalizedEvidence',
  'severityClassifications',
  'defects',
  'defectAnalyses',
  'regressionSuggestions',
  'opsChecklist',
  'releaseRecommendation',
  'report',
  'approvalRequests',
  'auditEvents',
  'observabilityMetrics',
  'mcpRequests',
  'mcpResults',
  'controlledExecutionRequests',
  'controlledExecutionResults',
  'unknowns',
  'limitations',
];

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';
const M3_TYPED_INPUT_LIMITATION =
  'M3 could not build typed input from current blackboard.';
const M3_PLACEHOLDER_LIMITATION =
  'M3 placeholder; no real MCP/controlled execution/evidence-gap review/session summarization executed.';

function createSkillContext(
  request: SkillRouterInvocationRequest
): SkillExecutionContext {
  return {
    runId: request.sessionId,
    invokedByAgent: request.agentRole,
    createdAt: request.now ?? DEFAULT_NOW,
    source: 'agent-testing/src/agent-runtime/skillRouter.ts',
    limitations: [
      ...(request.limitations ?? []),
      'SkillRouter invocation is deterministic and in-memory only; it does not call LLM, MCP, network, browser, database, or filesystem.',
    ],
  };
}

function createResult(params: {
  request: SkillRouterInvocationRequest;
  status: SkillRouterStatus;
  output: unknown;
  outputSummary: string;
  writes?: SkillRouterWrite[];
  artifacts?: AgentArtifactRef[];
  warnings?: string[];
  limitations?: string[];
}): SkillRouterInvocationResult {
  return {
    id: params.request.id ?? `skill-router-${params.request.taskId}`,
    sessionId: params.request.sessionId,
    traceId: params.request.traceId,
    agentRole: params.request.agentRole,
    taskId: params.request.taskId,
    taskType: params.request.taskType,
    skillName: params.request.skillName,
    status: params.status,
    output: params.output,
    outputSummary: params.outputSummary,
    writes: params.writes ?? [],
    artifacts: params.artifacts ?? [],
    warnings: params.warnings ?? [],
    limitations: params.limitations ?? [],
  };
}

function artifact(
  taskType: AgentTaskType,
  kind: AgentArtifactRef['kind'],
  summary: string
): AgentArtifactRef {
  return {
    id: `artifact-${taskType}`,
    kind,
    summary,
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

function unsupportedPlaceholder(
  request: SkillRouterInvocationRequest
): SkillRouterInvocationResult {
  const output = {
    taskId: request.taskId,
    status: 'not_executed',
    reason: M3_PLACEHOLDER_LIMITATION,
  };

  const writeKey: SharedBlackboardKey =
    request.taskType === 'request_mcp_read'
      ? 'mcpRequests'
      : request.taskType === 'request_controlled_execution'
        ? 'controlledExecutionRequests'
        : request.taskType === 'summarize_session'
          ? 'report'
          : 'unknowns';

  const writeValue = writeKey === 'unknowns'
    ? `Placeholder task ${request.taskType} was not executed in M3.`
    : output;

  return createResult({
    request,
    status: 'unsupported',
    output,
    outputSummary: `Task ${request.taskType} is a M3 placeholder and was not executed.`,
    writes: [
      {
        key: writeKey,
        value: writeValue,
        summary: `Placeholder output for ${request.taskType}.`,
      },
    ],
    artifacts: [artifact(request.taskType, 'unknown', `Placeholder for ${request.taskType}.`)],
    warnings: [M3_PLACEHOLDER_LIMITATION],
    limitations: [M3_PLACEHOLDER_LIMITATION],
  });
}

function blockedResult(
  request: SkillRouterInvocationRequest,
  summary: string,
  warnings: string[] = [],
  limitations: string[] = []
): SkillRouterInvocationResult {
  return createResult({
    request,
    status: 'blocked',
    output: {
      taskId: request.taskId,
      status: 'blocked',
      reason: summary,
    },
    outputSummary: summary,
    writes: [
      {
        key: 'unknowns',
        value: summary,
        summary,
      },
    ],
    artifacts: [artifact(request.taskType, 'unknown', summary)],
    warnings,
    limitations: [
      M3_TYPED_INPUT_LIMITATION,
      ...limitations,
    ],
  });
}

function mapMcpResult(
  mcpResult: AgentMcpActionResult,
  request: SkillRouterInvocationRequest
): SkillRouterInvocationResult {
  const status: SkillRouterStatus =
    mcpResult.status === 'executed_fake' ? 'completed' :
    mcpResult.status === 'pending_approval' ? 'blocked' :
    mcpResult.status === 'forbidden' ? 'refused' :
    mcpResult.status === 'blocked' ? 'refused' :
    'unsupported';

  return createResult({
    request,
    status,
    output: {
      actionType: mcpResult.actionType,
      mcpStatus: mcpResult.status,
      mcpRequest: mcpResult.mcpRequest,
      mcpResult: mcpResult.mcpResult,
      controlledRequest: mcpResult.controlledRequest,
      controlledResult: mcpResult.controlledResult,
      approvalResult: mcpResult.approvalResult,
      rawEvidenceDraft: mcpResult.rawEvidenceDraft,
    },
    outputSummary: mcpResult.outputSummary,
    writes: mcpResult.writes.map((write) => ({
      key: write.key,
      value: write.value,
      summary: write.summary,
    })),
    artifacts: [artifact(request.taskType, 'mcp_request', mcpResult.outputSummary)],
    warnings: mcpResult.warnings,
    limitations: [
      ...mcpResult.limitations,
      'MCP action was routed through mcpActionRouter in M5.',
    ],
  });
}

export function getSkillNameForTaskType(
  taskType: AgentTaskType
): AgentRuntimeSkillName | 'placeholder' {
  return AGENT_TASK_SKILL_CONTRACTS.find(
    (contract) => contract.taskType === taskType
  )?.skillName ?? 'placeholder';
}

export function validateSkillInvocation(
  profile: AgentProfile,
  request: SkillRouterInvocationRequest
): SkillRouterValidationResult {
  const issues: SkillRouterValidationIssue[] = [];
  const contract = AGENT_TASK_BLACKBOARD_CONTRACTS.find(
    (item) => item.taskType === request.taskType
  );

  if (request.agentRole !== profile.role) {
    issues.push({
      field: 'agentRole',
      message: `Request agentRole ${request.agentRole} does not match profile role ${profile.role}.`,
    });
  }

  if (!profile.allowedTaskTypes.includes(request.taskType)) {
    issues.push({
      field: 'taskType',
      message: `Agent ${profile.role} is not allowed to run task type ${request.taskType}.`,
    });
  }

  if (!AGENT_TASK_SKILL_CONTRACTS.some((item) => item.taskType === request.taskType)) {
    issues.push({
      field: 'taskType',
      message: `No SkillRouter contract is registered for task type ${request.taskType}.`,
    });
  }

  if (request.skillName !== 'placeholder' && !profile.allowedSkills.includes(request.skillName)) {
    issues.push({
      field: 'skillName',
      message: `Agent ${profile.role} is not allowed to invoke skill ${request.skillName}.`,
    });
  }

  for (const inputRef of request.inputRefs) {
    if (!SHARED_BLACKBOARD_KEYS.includes(inputRef.key)) {
      issues.push({
        field: 'inputRefs',
        message: `Input ref key ${String(inputRef.key)} is not a SharedBlackboardKey.`,
      });
    }

    if (contract && !contract.reads.includes(inputRef.key)) {
      issues.push({
        field: 'inputRefs',
        message: `Input ref key ${inputRef.key} is not declared as readable by task type ${request.taskType}.`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function invokeSkillThroughRouter(
  profile: AgentProfile,
  request: SkillRouterInvocationRequest
): SkillRouterInvocationResult {
  const validation = validateSkillInvocation(profile, request);

  if (!validation.valid) {
    const summary = validation.issues.map((issue) => issue.message).join(' ');

    return createResult({
      request,
      status: 'refused',
      output: {
        taskId: request.taskId,
        status: 'refused',
        issues: validation.issues,
      },
      outputSummary: summary,
      writes: [
        {
          key: 'unknowns',
          value: summary,
          summary: 'SkillRouter validation refused invocation.',
        },
      ],
      artifacts: [artifact(request.taskType, 'unknown', 'SkillRouter validation refused invocation.')],
      warnings: validation.issues.map((issue) => issue.message),
      limitations: ['SkillRouter refused invocation before skill execution.'],
    });
  }

  if (request.skillName === 'placeholder' || getSkillNameForTaskType(request.taskType) === 'placeholder') {
    return unsupportedPlaceholder(request);
  }

  const blackboard = request.blackboard;
  const context = createSkillContext(request);
  const typedInput = buildTypedSkillInputFromBlackboard({
    skillName: request.skillName,
    taskType: request.taskType,
    blackboard: request.blackboard,
    inputRefs: request.inputRefs,
  });

  if (typedInput.status !== 'ready') {
    const summary = typedInput.issues.length > 0
      ? typedInput.issues.map((issue) => issue.message).join(' ')
      : typedInput.inputSummary;

    return blockedResult(
      request,
      summary,
      typedInput.warnings,
      typedInput.limitations
    );
  }

  try {
    switch (request.taskType) {
      case 'build_context': {
        const result = buildContext(
          typedInput.input as ContextBuildingInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output,
          outputSummary: `Built context with ${result.output.moduleMap.length} module(s).`,
          writes: [{ key: 'context', value: result.output, summary: 'Context object.' }],
          artifacts: [artifact(request.taskType, 'blackboard', 'Context object written to blackboard.')],
          warnings: result.issues.map((issue) => issue.message),
          limitations: result.limitations,
        });
      }

      case 'extract_acceptance': {
        const result = extractAcceptancePoints(
          typedInput.input as AcceptanceExtractionInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.acceptancePoints,
          outputSummary: `Extracted ${result.output.acceptancePoints.length} acceptance point(s).`,
          writes: [{ key: 'acceptancePoints', value: result.output.acceptancePoints, summary: 'Acceptance points.' }],
          artifacts: [artifact(request.taskType, 'acceptance_point', 'Acceptance points written to blackboard.')],
          warnings: [...result.output.ambiguities, ...result.issues.map((issue) => issue.message)],
          limitations: result.limitations,
        });
      }

      case 'generate_test_cases': {
        const result = generateSystemTestCases(
          typedInput.input as TestCaseGenerationInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.testCases,
          outputSummary: `Generated ${result.output.testCases.length} planned test case(s).`,
          writes: [{ key: 'testCases', value: result.output.testCases, summary: 'Planned system test cases.' }],
          artifacts: [artifact(request.taskType, 'test_case', 'Planned test cases written to blackboard.')],
          warnings: [...result.output.unknowns, ...result.issues.map((issue) => issue.message)],
          limitations: result.limitations,
        });
      }

      case 'generate_ops_checklist': {
        const result = generateOpsChecklistSkill(
          typedInput.input as OpsChecklistSkillInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.items,
          outputSummary: `Generated ${result.output.items.length} ops checklist item(s).`,
          writes: [{ key: 'opsChecklist', value: result.output.items, summary: 'Ops checklist items.' }],
          artifacts: [artifact(request.taskType, 'blackboard', 'Ops checklist written to blackboard.')],
          warnings: result.output.warnings,
          limitations: result.limitations,
        });
      }

      case 'normalize_evidence': {
        const result = normalizeEvidenceSkill(
          typedInput.input as EvidenceNormalizationSkillInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.evidence,
          outputSummary: `Normalized ${result.output.evidence.length} evidence item(s).`,
          writes: [{ key: 'normalizedEvidence', value: result.output.evidence, summary: 'Normalized evidence.' }],
          artifacts: [artifact(request.taskType, 'evidence', 'Normalized evidence written to blackboard.')],
          warnings: [...result.output.warnings, ...result.output.issues],
          limitations: result.limitations,
        });
      }

      case 'classify_severity': {
        const result = classifySeveritySkill(
          typedInput.input as SeverityClassificationSkillInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.classifications,
          outputSummary: `Classified ${result.output.classifications.length} severity item(s).`,
          writes: [{ key: 'severityClassifications', value: result.output.classifications, summary: 'Severity classifications.' }],
          artifacts: [artifact(request.taskType, 'severity', 'Severity classifications written to blackboard.')],
          warnings: result.output.warnings,
          limitations: result.limitations,
        });
      }

      case 'analyze_defect': {
        const result = analyzeDefectSkill(
          typedInput.input as DefectAnalysisSkillInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.analyses,
          outputSummary: `Generated ${result.output.analyses.length} defect analysis draft(s).`,
          writes: [{ key: 'defectAnalyses', value: result.output.analyses, summary: 'Defect analysis drafts.' }],
          artifacts: [artifact(request.taskType, 'defect', 'Defect analysis drafts written to blackboard.')],
          warnings: result.output.warnings,
          limitations: result.limitations,
        });
      }

      case 'suggest_regression': {
        const result = suggestRegressionSkill(
          typedInput.input as RegressionSuggestionSkillInput,
          context
        );
        const suggestions = result.output.suggestions.flatMap((item) => item.items);

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: suggestions,
          outputSummary: `Generated ${suggestions.length} regression suggestion item(s).`,
          writes: [{ key: 'regressionSuggestions', value: suggestions, summary: 'Regression suggestions.' }],
          artifacts: [artifact(request.taskType, 'regression', 'Regression suggestions written to blackboard.')],
          warnings: result.output.warnings,
          limitations: result.limitations,
        });
      }

      case 'recommend_release': {
        const result = recommendReleaseSkill(
          typedInput.input as ReleaseRecommendationSkillInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output,
          outputSummary: `Recommended release status: ${result.output.recommendation}.`,
          writes: [{ key: 'releaseRecommendation', value: result.output, summary: 'Advisory release recommendation.' }],
          artifacts: [artifact(request.taskType, 'blackboard', 'Release recommendation written to blackboard.')],
          warnings: result.issues.map((issue) => issue.message),
          limitations: result.limitations,
        });
      }

      case 'generate_report': {
        const result = generateReportSkill(
          typedInput.input as ReportGenerationSkillInput,
          context
        );

        return createResult({
          request,
          status: result.success ? 'completed' : 'blocked',
          output: result.output.markdown,
          outputSummary: `Generated report with ${result.output.sections.length} section summary entries.`,
          writes: [{ key: 'report', value: result.output.markdown, summary: 'Markdown report text.' }],
          artifacts: [artifact(request.taskType, 'report', 'Markdown report written to blackboard.')],
          warnings: [...result.output.warnings, ...result.output.missingInputs],
          limitations: result.limitations,
        });
      }

      case 'review_evidence_gap': {
        const summary = summarizeSharedBlackboard(blackboard);
        const gaps = [
          summary.normalizedEvidenceCount === 0
            ? 'No normalized evidence is available in the shared blackboard.'
            : undefined,
          summary.testCaseCount > 0 && summary.normalizedEvidenceCount === 0
            ? `${summary.testCaseCount} planned test case(s) have no normalized evidence in M3.`
            : undefined,
        ].filter((item): item is string => Boolean(item));

        return createResult({
          request,
          status: 'completed',
          output: gaps.length > 0 ? gaps : ['No deterministic evidence gap was detected from blackboard counts.'],
          outputSummary: `Reviewed evidence gaps from blackboard counts: ${gaps.length} gap(s).`,
          writes: [{ key: 'unknowns', value: gaps.length > 0 ? gaps : ['No deterministic evidence gap detected.'], summary: 'Evidence gap notes.' }],
          artifacts: [artifact(request.taskType, 'unknown', 'Evidence gap placeholder review.')],
          warnings: gaps,
          limitations: [M3_PLACEHOLDER_LIMITATION],
        });
      }

      case 'summarize_session': {
        const summary = summarizeSharedBlackboard(blackboard);
        const output = [
          `Session ${request.sessionId} blackboard summary: ${summary.testCaseCount} test case(s), ${summary.normalizedEvidenceCount} evidence item(s), ${summary.unknownCount} unknown(s).`,
          `Release recommendation: ${releaseRecommendationValue(blackboard) ?? 'not provided'}.`,
        ].join('\n');

        return createResult({
          request,
          status: 'completed',
          output,
          outputSummary: 'Summarized session state from in-memory blackboard counts.',
          writes: [{ key: 'report', value: output, summary: 'Session summary text.' }],
          artifacts: [artifact(request.taskType, 'report', 'Session summary placeholder.')],
          warnings: [],
          limitations: [M3_PLACEHOLDER_LIMITATION],
        });
      }

      case 'request_mcp_read': {
        const mcpRequest = createAgentMcpActionRequest({
          sessionId: request.sessionId,
          traceId: request.traceId,
          agentRole: request.agentRole,
          taskId: request.taskId,
          taskType: request.taskType,
          actionType: 'read_only_mcp',
          purpose: `Read-only MCP pilot: ${request.expectedOutput}`,
          inputSummary: request.inputRefs.map((ref) => ref.key).join(', '),
          expectedOutput: request.expectedOutput,
          blackboard: request.blackboard,
          limitations: request.limitations,
        });
        const mcpResult = routeAgentMcpAction(mcpRequest, profile);
        return mapMcpResult(mcpResult, request);
      }

      case 'request_controlled_execution': {
        const ceRequest = createAgentMcpActionRequest({
          sessionId: request.sessionId,
          traceId: request.traceId,
          agentRole: request.agentRole,
          taskId: request.taskId,
          taskType: request.taskType,
          actionType: 'controlled_execution',
          purpose: `Controlled execution preview: ${request.expectedOutput}`,
          inputSummary: request.inputRefs.map((ref) => ref.key).join(', '),
          expectedOutput: request.expectedOutput,
          blackboard: request.blackboard,
          limitations: request.limitations,
        });
        const ceResult = routeAgentMcpAction(ceRequest, profile);
        return mapMcpResult(ceResult, request);
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown SkillRouter failure.';

    return createResult({
      request,
      status: 'failed',
      output: {
        taskId: request.taskId,
        status: 'failed',
        reason,
      },
      outputSummary: reason,
      writes: [
        {
          key: 'unknowns',
          value: reason,
          summary: 'SkillRouter failed before producing typed output.',
        },
      ],
      artifacts: [artifact(request.taskType, 'unknown', 'SkillRouter failure.')],
      warnings: [reason],
      limitations: ['SkillRouter failure was captured in-memory only.'],
    });
  }
}

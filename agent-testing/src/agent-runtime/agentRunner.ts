import type {
  OpsChecklistInput,
} from '../ops';
import {
  smallNoteSystemOrchestrationInput,
} from '../examples/smallNoteSystemFixture';
import type {
  AgentProfile,
  AgentProfileValidationResult,
} from './agentProfileTypes';
import {
  DEFAULT_AGENT_PROFILES,
  validateAgentProfiles,
} from './agentProfileTypes';
import type {
  AgentArtifactRef,
  AgentRuntimeRole,
  AgentSession,
  AgentTask,
  AgentTaskType,
  SharedBlackboard,
  SharedBlackboardKey,
} from './agentRuntimeTypes';
import {
  createDefaultAgentRegistry,
} from './agentRegistry';
import {
  createAgentSession,
  transitionAgentSessionStatus,
} from './agentSession';
import {
  blockAgentTask,
  completeAgentTask,
  createAgentTask,
  failAgentTask,
  pickNextAgentTask,
  refuseAgentTask,
  validateTaskBlackboardContract,
} from './agentTaskQueue';
import {
  createAgentMessage,
  sendAgentMessage,
  summarizeAgentMessages,
} from './agentMessageBus';
import {
  appendBlackboardArrayValue,
  appendBlackboardUnknowns,
  mergeBlackboardEvidenceSummary,
  summarizeSharedBlackboard,
  writeBlackboardValue,
} from './sharedBlackboard';
import {
  buildEvidenceAwareBlackboardNotes,
  collectEvidenceFromBlackboard,
} from './evidenceCollector';
import {
  getSkillNameForTaskType,
  invokeSkillThroughRouter,
  type SkillRouterInvocationResult,
  type SkillRouterStatus,
} from './skillRouter';

export type AgentRunnerStepStatus =
  | 'idle'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'refused';

export interface AgentRunnerStepResult {
  agent: AgentRuntimeRole;
  status: AgentRunnerStepStatus;
  taskId?: string;
  taskType?: AgentTaskType;
  summary: string;
  warnings: string[];
  limitations: string[];
}

export interface RunAgentOnceInput {
  session: AgentSession;
  profile: AgentProfile;
  now?: string;
}

export interface RunAgentOnceResult {
  session: AgentSession;
  step: AgentRunnerStepResult;
}

export interface RunAllAgentsOnceResult {
  session: AgentSession;
  steps: AgentRunnerStepResult[];
  evidenceWarnings: string[];
  evidenceLimitations: string[];
}

export interface SmallNoteMultiAgentRuntimeDemoResult {
  session: AgentSession;
  steps: AgentRunnerStepResult[];
  blackboardSummary: ReturnType<typeof summarizeSharedBlackboard>;
  messageSummary: ReturnType<typeof summarizeAgentMessages>;
  profileValidation: AgentProfileValidationResult;
  warnings: string[];
  limitations: string[];
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

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

function replaceTask(session: AgentSession, task: AgentTask): AgentSession {
  return {
    ...session,
    tasks: session.tasks.map((item) => item.id === task.id ? task : item),
    updatedAt: task.updatedAt,
  };
}

function writeInvocationOutput(
  session: AgentSession,
  invocation: SkillRouterInvocationResult
): {
  session: AgentSession;
  warnings: string[];
  limitations: string[];
} {
  let nextBlackboard: SharedBlackboard = session.blackboard;
  const warnings = [...invocation.warnings];
  const limitations = [...invocation.limitations];

  for (const write of invocation.writes) {
    if (write.key === 'unknowns' || write.key === 'limitations') {
      const values = Array.isArray(write.value) ? write.value : [write.value];

      for (const value of values) {
        const result = appendBlackboardArrayValue(nextBlackboard, {
          taskType: invocation.taskType,
          key: write.key,
          value: String(value),
        });
        nextBlackboard = result.blackboard;
        warnings.push(...result.warnings);
        limitations.push(...result.limitations);
      }
    } else {
      const result = writeBlackboardValue(nextBlackboard, {
        taskType: invocation.taskType,
        key: write.key,
        value: write.value,
      });
      nextBlackboard = result.blackboard;
      warnings.push(...result.warnings);
      limitations.push(...result.limitations);
    }
  }

  return {
    session: {
      ...session,
      blackboard: nextBlackboard,
    },
    warnings,
    limitations,
  };
}

function resultRecipient(profile: AgentProfile): AgentRuntimeRole | 'broadcast' {
  return profile.role === 'test_lead' ? 'broadcast' : 'test_lead';
}

function payloadKeyForInvocation(
  invocation: SkillRouterInvocationResult
): SharedBlackboardKey {
  return invocation.writes[0]?.key ?? 'unknowns';
}

function appendResultMessage(
  session: AgentSession,
  task: AgentTask,
  profile: AgentProfile,
  messageType: 'task_result' | 'blocked_notice' | 'risk_warning',
  summary: string,
  now: string,
  limitations: string[],
  artifacts: AgentArtifactRef[] = [],
  payloadKey: SharedBlackboardKey = 'unknowns'
): AgentSession {
  return sendAgentMessage(
    session,
    createAgentMessage({
      sessionId: session.id,
      traceId: task.traceId,
      fromAgent: profile.role,
      toAgent: resultRecipient(profile),
      messageType,
      summary,
      payloadRef: {
        key: payloadKey,
        summary: `Result for task ${task.id}`,
      },
      artifacts,
      relatedTaskId: task.id,
      relatedEvidenceIds: task.relatedEvidenceIds,
      relatedTestCaseIds: task.relatedTestCaseIds,
      now,
      limitations,
    })
  );
}

function taskFromRouterStatus(
  task: AgentTask,
  status: SkillRouterStatus,
  summary: string,
  now: string
): AgentTask {
  if (status === 'completed') {
    return completeAgentTask(task, now);
  }

  if (status === 'refused') {
    return refuseAgentTask(task, summary, now);
  }

  if (status === 'blocked' || status === 'unsupported') {
    return blockAgentTask(task, summary, now);
  }

  return failAgentTask(task, summary, now);
}

function stepStatusFromRouterStatus(status: SkillRouterStatus): AgentRunnerStepStatus {
  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'refused') {
    return 'refused';
  }

  if (status === 'failed') {
    return 'failed';
  }

  return 'blocked';
}

function messageTypeFromInvocation(
  invocation: SkillRouterInvocationResult
): 'task_result' | 'blocked_notice' | 'risk_warning' {
  if (invocation.status !== 'completed') {
    return 'blocked_notice';
  }

  return invocation.warnings.length > 0 ? 'risk_warning' : 'task_result';
}

function updateEvidenceAwareBlackboard(session: AgentSession): {
  session: AgentSession;
  warnings: string[];
  limitations: string[];
} {
  const summary = collectEvidenceFromBlackboard(session.blackboard);
  const evidenceNotes = buildEvidenceAwareBlackboardNotes(session.blackboard);
  const withNotes = appendBlackboardUnknowns(session.blackboard, evidenceNotes);
  const mergedBlackboard = mergeBlackboardEvidenceSummary(withNotes, summary);

  return {
    session: {
      ...session,
      blackboard: mergedBlackboard,
    },
    warnings: summary.warnings,
    limitations: summary.limitations,
  };
}

export function runAgentOnce(input: RunAgentOnceInput): RunAgentOnceResult {
  const now = input.now ?? DEFAULT_NOW;
  const task = pickNextAgentTask(input.session.tasks, input.profile.role);

  if (!task) {
    return {
      session: input.session,
      step: {
        agent: input.profile.role,
        status: 'idle',
        summary: 'No pending or assigned task is available for this Agent.',
        warnings: [],
        limitations: [],
      },
    };
  }

  const contractValidation = validateTaskBlackboardContract(task);
  const skillName = getSkillNameForTaskType(task.taskType);
  const invocation = invokeSkillThroughRouter(input.profile, {
    sessionId: input.session.id,
    traceId: task.traceId,
    agentRole: input.profile.role,
    taskId: task.id,
    taskType: task.taskType,
    skillName,
    inputRefs: task.inputRefs,
    blackboard: input.session.blackboard,
    expectedOutput: task.expectedOutput,
    now,
    limitations: input.profile.limitations,
  });
  const writeResult = writeInvocationOutput(input.session, invocation);
  const updatedTask = taskFromRouterStatus(
    task,
    invocation.status,
    invocation.outputSummary,
    now
  );
  const withUpdatedTask = replaceTask(writeResult.session, updatedTask);
  const withMessage = appendResultMessage(
    withUpdatedTask,
    updatedTask,
    input.profile,
    messageTypeFromInvocation(invocation),
    invocation.outputSummary,
    now,
    writeResult.limitations,
    invocation.artifacts,
    payloadKeyForInvocation(invocation)
  );

  return {
    session: withMessage,
    step: {
      agent: input.profile.role,
      status: stepStatusFromRouterStatus(invocation.status),
      taskId: task.id,
      taskType: task.taskType,
      summary: invocation.outputSummary,
      warnings: [...contractValidation.issues, ...writeResult.warnings],
      limitations: writeResult.limitations,
    },
  };
}

export function runAllAgentsOnce(
  session: AgentSession,
  profiles: readonly AgentProfile[],
  now: string = DEFAULT_NOW
): RunAllAgentsOnceResult {
  let nextSession = session;
  const steps: AgentRunnerStepResult[] = [];

  for (const profile of profiles) {
    const result = runAgentOnce({
      session: nextSession,
      profile,
      now,
    });
    nextSession = result.session;
    steps.push(result.step);
  }

  const evidenceUpdate = updateEvidenceAwareBlackboard(nextSession);

  return {
    session: evidenceUpdate.session,
    steps,
    evidenceWarnings: evidenceUpdate.warnings,
    evidenceLimitations: evidenceUpdate.limitations,
  };
}

function createDraftTask(params: {
  index: number;
  sessionId: string;
  assignedTo: AgentRuntimeRole;
  taskType: AgentTaskType;
  goal: string;
  expectedOutput: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  inputRefs?: Array<{ key: SharedBlackboardKey; summary?: string }>;
  now: string;
}): AgentTask {
  return createAgentTask({
    id: `agent-task-${String(params.index).padStart(2, '0')}-${params.taskType}`,
    sessionId: params.sessionId,
    assignedTo: params.assignedTo,
    createdBy: 'test_lead',
    taskType: params.taskType,
    goal: params.goal,
    expectedOutput: params.expectedOutput,
    priority: params.priority,
    inputRefs: params.inputRefs,
    now: params.now,
  });
}

export function createSmallNoteMultiAgentSessionDraft(
  now: string = '2026-06-11T00:00:00.000Z'
): AgentSession {
  const fixture = smallNoteSystemOrchestrationInput;
  const targetSystemName = fixture.targetSystemName ?? 'Small Team Notes';
  const targetSystemType = fixture.targetSystemType ?? 'unknown';
  const runId = fixture.runId ?? 'offline-small-note-system';
  const modules = fixture.modules ?? [];
  const contextSources = fixture.contextSources ?? [];
  const knownConstraints = fixture.knownConstraints ?? [];
  const draft = createAgentSession({
    id: `agent-session-${runId}`,
    runId,
    targetSystemName,
    now,
    limitations: [
      'M2 demo uses static in-memory fixture data only.',
      'No real system test is executed by the runtime draft.',
    ],
  });
  const requirements: RuntimeRequirements = {
    targetSystemName,
    targetSystemType,
    systemDescription: fixture.systemDescription,
    requirementsText: fixture.requirementsText,
    modules,
    contextSources,
    knownConstraints,
    opsProfile: fixture.opsProfile as OpsChecklistInput | undefined,
    notes: fixture.notes,
    options: fixture.options,
  };
  const tasks = [
    createDraftTask({
      index: 1,
      sessionId: draft.id,
      assignedTo: 'test_lead',
      taskType: 'build_context',
      goal: 'Build bounded system context for the small note fixture.',
      expectedOutput: 'Context object on shared blackboard.',
      priority: 'critical',
      inputRefs: [{ key: 'requirements' }],
      now,
    }),
    createDraftTask({
      index: 2,
      sessionId: draft.id,
      assignedTo: 'product_acceptance',
      taskType: 'extract_acceptance',
      goal: 'Extract acceptance points from supplied requirements text.',
      expectedOutput: 'Acceptance points on shared blackboard.',
      priority: 'high',
      inputRefs: [{ key: 'requirements' }, { key: 'context' }],
      now,
    }),
    createDraftTask({
      index: 3,
      sessionId: draft.id,
      assignedTo: 'test_design',
      taskType: 'generate_test_cases',
      goal: 'Generate planned system test cases without marking them pass.',
      expectedOutput: 'Planned test cases on shared blackboard.',
      priority: 'normal',
      inputRefs: [{ key: 'acceptancePoints' }, { key: 'context' }],
      now,
    }),
    createDraftTask({
      index: 4,
      sessionId: draft.id,
      assignedTo: 'ops_check',
      taskType: 'generate_ops_checklist',
      goal: 'Generate operational readiness checklist from provided ops profile.',
      expectedOutput: 'Ops checklist on shared blackboard.',
      priority: 'normal',
      inputRefs: [{ key: 'context' }, { key: 'testCases' }],
      now,
    }),
    createDraftTask({
      index: 5,
      sessionId: draft.id,
      assignedTo: 'developer_analysis',
      taskType: 'normalize_evidence',
      goal: 'Normalize static fixture evidence without executing tests.',
      expectedOutput: 'Normalized evidence on shared blackboard.',
      priority: 'normal',
      inputRefs: [{ key: 'rawEvidence' }, { key: 'testCases' }],
      now,
    }),
    createDraftTask({
      index: 6,
      sessionId: draft.id,
      assignedTo: 'developer_analysis',
      taskType: 'classify_severity',
      goal: 'Classify severity from normalized evidence only.',
      expectedOutput: 'Severity classifications on shared blackboard.',
      priority: 'normal',
      inputRefs: [{ key: 'normalizedEvidence' }, { key: 'testCases' }],
      now,
    }),
    createDraftTask({
      index: 7,
      sessionId: draft.id,
      assignedTo: 'developer_analysis',
      taskType: 'analyze_defect',
      goal: 'Analyze existing draft defects without claiming confirmed root cause.',
      expectedOutput: 'Defect analysis drafts on shared blackboard.',
      priority: 'normal',
      inputRefs: [{ key: 'normalizedEvidence' }, { key: 'severityClassifications' }, { key: 'defects' }],
      now,
    }),
    createDraftTask({
      index: 8,
      sessionId: draft.id,
      assignedTo: 'test_design',
      taskType: 'suggest_regression',
      goal: 'Suggest regression coverage from defects and analysis drafts.',
      expectedOutput: 'Regression suggestions on shared blackboard.',
      priority: 'normal',
      inputRefs: [{ key: 'defectAnalyses' }, { key: 'severityClassifications' }, { key: 'testCases' }],
      now,
    }),
    createDraftTask({
      index: 9,
      sessionId: draft.id,
      assignedTo: 'test_lead',
      taskType: 'recommend_release',
      goal: 'Produce advisory release recommendation from current blackboard state.',
      expectedOutput: 'Release recommendation on shared blackboard.',
      priority: 'normal',
      inputRefs: [
        { key: 'testCases' },
        { key: 'normalizedEvidence' },
        { key: 'severityClassifications' },
        { key: 'defects' },
        { key: 'defectAnalyses' },
        { key: 'regressionSuggestions' },
        { key: 'opsChecklist' },
        { key: 'unknowns' },
      ],
      now,
    }),
    createDraftTask({
      index: 10,
      sessionId: draft.id,
      assignedTo: 'test_lead',
      taskType: 'generate_report',
      goal: 'Generate an in-memory Markdown report artifact.',
      expectedOutput: 'Markdown report text on shared blackboard.',
      priority: 'low',
      inputRefs: [
        { key: 'context' },
        { key: 'acceptancePoints' },
        { key: 'testCases' },
        { key: 'normalizedEvidence' },
        { key: 'severityClassifications' },
        { key: 'defectAnalyses' },
        { key: 'regressionSuggestions' },
        { key: 'opsChecklist' },
        { key: 'releaseRecommendation' },
      ],
      now,
    }),
    createDraftTask({
      index: 11,
      sessionId: draft.id,
      assignedTo: 'test_lead',
      taskType: 'summarize_session',
      goal: 'Summarize current in-memory session state.',
      expectedOutput: 'Session summary text on shared blackboard.',
      priority: 'low',
      inputRefs: [
        { key: 'report' },
        { key: 'releaseRecommendation' },
        { key: 'auditEvents' },
        { key: 'observabilityMetrics' },
      ],
      now,
    }),
  ];
  const withBlackboard: AgentSession = {
    ...draft,
    tasks,
    blackboard: {
      ...draft.blackboard,
      requirements,
      rawEvidence: [...(fixture.rawEvidence ?? [])],
      defects: [...(fixture.existingDefects ?? [])],
      limitations: [
        ...(draft.blackboard.limitations ?? []),
        'Small note fixture raw evidence is static and is not produced by live system execution.',
      ],
    },
    updatedAt: now,
  };

  return transitionAgentSessionStatus(withBlackboard, 'running', now);
}

export function runSmallNoteMultiAgentRuntimeDemo(
  now: string = '2026-06-11T00:00:00.000Z'
): SmallNoteMultiAgentRuntimeDemoResult {
  const registry = createDefaultAgentRegistry();
  const profileValidation = validateAgentProfiles(DEFAULT_AGENT_PROFILES);
  let session = createSmallNoteMultiAgentSessionDraft(now);
  const steps: AgentRunnerStepResult[] = [];

  for (let round = 0; round < 3; round += 1) {
    const result = runAllAgentsOnce(session, registry.list(), now);
    session = result.session;
    steps.push(
      ...result.steps,
      {
        agent: 'test_lead',
        status: 'completed',
        summary: `M3 evidence-aware blackboard update recorded ${result.evidenceWarnings.length} warning(s).`,
        warnings: result.evidenceWarnings,
        limitations: result.evidenceLimitations,
      }
    );

    if (!session.tasks.some((task) => task.status === 'pending' || task.status === 'assigned')) {
      break;
    }
  }

  const evidenceSummary = collectEvidenceFromBlackboard(session.blackboard);

  return {
    session,
    steps,
    blackboardSummary: summarizeSharedBlackboard(session.blackboard),
    messageSummary: summarizeAgentMessages(session.messages),
    profileValidation,
    warnings: [
      ...steps.flatMap((step) => step.warnings),
      ...evidenceSummary.warnings,
    ],
    limitations: [
      'M3 demo is pure in-memory orchestration and does not execute real tests.',
      'AgentRunner invokes skills only through SkillRouter.',
      ...steps.flatMap((step) => step.limitations),
      ...evidenceSummary.limitations,
    ],
  };
}

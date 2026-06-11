import type {
  AgentProfile,
} from './agentProfileTypes';
import type {
  AgentArtifactRef,
  AgentRuntimeRole,
  AgentTaskType,
  SharedBlackboard,
  SharedBlackboardKey,
} from './agentRuntimeTypes';
import {
  evaluateAgentRuntimeApproval,
  type AgentRuntimeApprovalBridgeResult,
} from './approvalBridge';
import {
  createMcpToolRequest,
  evaluateMcpToolRequestApproval,
  buildNotExecutedMcpToolResult,
  mapMcpResultToRawEvidenceDraft,
  type McpToolRequest,
  type McpToolResult,
} from '../mcp';
import {
  runReadOnlyMcpPilot,
  type ReadOnlyPilotSnapshot,
  type ReadOnlyPilotExecutionOutput,
} from '../mcp-pilot';
import {
  createControlledExecutionRequest,
  buildDryRunExecutionPlan,
  simulateControlledExecution,
  evaluateControlledExecutionSafety,
  type ControlledExecutionRequest,
  type ControlledExecutionPlan,
  type ControlledExecutionResult,
} from '../controlled-execution';
import {
  buildAuditEvent,
  type AuditEvent,
} from '../audit';

export type AgentMcpActionType =
  | 'read_only_mcp'
  | 'controlled_execution'
  | 'unsupported';

export interface AgentMcpActionRequest {
  id?: string;
  sessionId: string;
  traceId: string;
  agentRole: AgentRuntimeRole;
  taskId: string;
  taskType: AgentTaskType;
  actionType: AgentMcpActionType;
  targetToolName?: string;
  purpose: string;
  inputSummary: string;
  expectedOutput: string;
  blackboard: SharedBlackboard;
  environment?: string;
  limitations?: string[];
}

export interface AgentMcpActionResult {
  id: string;
  sessionId: string;
  traceId: string;
  agentRole: AgentRuntimeRole;
  taskId: string;
  taskType: AgentTaskType;
  actionType: AgentMcpActionType;
  status: 'executed_fake' | 'pending_approval' | 'forbidden' | 'blocked' | 'unsupported';
  approvalResult?: AgentRuntimeApprovalBridgeResult;
  mcpRequest?: McpToolRequest;
  mcpResult?: McpToolResult;
  pilotOutput?: ReadOnlyPilotExecutionOutput;
  controlledRequest?: ControlledExecutionRequest;
  controlledPlan?: ControlledExecutionPlan;
  controlledResult?: ControlledExecutionResult;
  rawEvidenceDraft?: unknown;
  auditDrafts: AuditEvent[];
  writes: Array<{ key: SharedBlackboardKey; value: unknown; summary: string }>;
  outputSummary: string;
  warnings: string[];
  limitations: string[];
}

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

const FAKE_SNAPSHOT: ReadOnlyPilotSnapshot = {
  id: 'm5-fake-snapshot',
  name: 'M5 Fake In-Memory Snapshot',
  description: 'Fake read-only snapshot for M5 approval-gated MCP preview.',
  files: [],
  gitDiffs: [],
  httpResponses: [],
  databaseRows: [],
  logExcerpts: [],
  screenshotMetadata: [],
  limitations: [
    'M5 fake snapshot; no real filesystem, git, HTTP, database, log, or screenshot data is accessed.',
  ],
};

function stableId(parts: readonly string[]): string {
  return parts
    .join('-')
    .replace(/[^0-9A-Za-z_-]+/g, '-')
    .replace(/-+/g, '-');
}

function buildAuditDraft(params: {
  id: string;
  sessionId: string;
  traceId: string;
  agentRole: AgentRuntimeRole;
  eventType: string;
  summary: string;
  taskId: string;
  limitations?: string[];
}): AuditEvent {
  const eventTypeMap: Record<string, string> = {
    mcp_requested: 'mcp_requested',
    mcp_completed: 'mcp_completed',
    mcp_forbidden: 'mcp_failed',
    mcp_pending: 'approval_required',
    controlled_requested: 'trace_checkpoint',
    controlled_completed: 'trace_checkpoint',
    controlled_forbidden: 'policy_violation',
    controlled_pending: 'approval_required',
  };

  return buildAuditEvent({
    id: params.id,
    runId: params.sessionId,
    traceId: params.traceId,
    eventType: (eventTypeMap[params.eventType] ?? 'trace_checkpoint') as AuditEvent['eventType'],
    actor: { agentRole: params.agentRole },
    outcome: params.eventType.includes('forbidden')
      ? 'forbidden'
      : params.eventType.includes('pending')
        ? 'pending'
        : 'success',
    summary: params.summary,
    inputSummary: `Task ${params.taskId} MCP action.`,
    outputSummary: params.summary,
    limitations: params.limitations ?? [],
  });
}

export function createAgentMcpActionRequest(params: {
  sessionId: string;
  traceId: string;
  agentRole: AgentRuntimeRole;
  taskId: string;
  taskType: AgentTaskType;
  actionType: AgentMcpActionType;
  purpose: string;
  inputSummary: string;
  expectedOutput: string;
  blackboard: SharedBlackboard;
  targetToolName?: string;
  environment?: string;
  limitations?: string[];
}): AgentMcpActionRequest {
  return {
    id: stableId(['mcp-action', params.sessionId, params.traceId, params.agentRole, params.taskId]),
    sessionId: params.sessionId,
    traceId: params.traceId,
    agentRole: params.agentRole,
    taskId: params.taskId,
    taskType: params.taskType,
    actionType: params.actionType,
    targetToolName: params.targetToolName,
    purpose: params.purpose,
    inputSummary: params.inputSummary,
    expectedOutput: params.expectedOutput,
    blackboard: params.blackboard,
    environment: params.environment ?? 'offline-m5-preview',
    limitations: params.limitations ?? [],
  };
}

function routeReadOnlyMcp(
  request: AgentMcpActionRequest,
  profile: AgentProfile
): AgentMcpActionResult {
  const auditDrafts: AuditEvent[] = [];

  // Check permission
  if (!profile.canRequestMcp) {
    auditDrafts.push(buildAuditDraft({
      id: stableId(['audit', request.sessionId, request.traceId, 'mcp-refused-permission']),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      eventType: 'mcp_forbidden',
      summary: `Agent ${request.agentRole} is not allowed to request MCP.`,
      taskId: request.taskId,
      limitations: ['MCP request denied by agent profile permission.'],
    }));

    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'read_only_mcp',
      status: 'blocked',
      auditDrafts,
      writes: [
        {
          key: 'unknowns',
          value: `Agent ${request.agentRole} is not allowed to request MCP.`,
          summary: 'MCP permission denied.',
        },
      ],
      outputSummary: `MCP read-only request blocked: agent ${request.agentRole} has no MCP permission.`,
      warnings: [`Agent ${request.agentRole} cannot request MCP.`],
      limitations: ['MCP request blocked by agent profile.', ...(request.limitations ?? [])],
    };
  }

  // Build MCP tool request
  const mcpRequest = createMcpToolRequest({
    runId: request.sessionId,
    requestedByAgent: request.agentRole,
    adapterKind: 'filesystem_repository',
    serverName: 'fake-filesystem-m5',
    toolName: request.targetToolName ?? 'read_fixture_file',
    purpose: request.purpose,
    inputSummary: request.inputSummary,
    expectedOutput: request.expectedOutput,
    permissionLevel: 'READ_ONLY',
    sideEffectLevel: 'NONE',
  });

  // Approval gate
  const approvalEvaluation = evaluateMcpToolRequestApproval(mcpRequest);
  const bridgeRequest = {
    sessionId: request.sessionId,
    traceId: request.traceId,
    requestedByAgent: request.agentRole,
    actionType: 'mcp_tool_call' as const,
    target: `${mcpRequest.serverName}/${mcpRequest.toolName}`,
    purpose: request.purpose,
    permissionLevel: 'READ_ONLY',
    sideEffectLevel: 'NONE',
    inputSummary: request.inputSummary,
    expectedOutput: request.expectedOutput,
    environment: request.environment,
  };
  const approvalResult = evaluateAgentRuntimeApproval(bridgeRequest);

  // Forbidden
  if (approvalResult.forbidden || approvalEvaluation.forbidden) {
    const notExecutedResult = buildNotExecutedMcpToolResult(
      mcpRequest,
      `Forbidden by approval policy: ${approvalResult.reason}`
    );
    auditDrafts.push(buildAuditDraft({
      id: stableId(['audit', request.sessionId, request.traceId, 'mcp-forbidden']),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      eventType: 'mcp_forbidden',
      summary: approvalResult.reason,
      taskId: request.taskId,
      limitations: approvalResult.limitations,
    }));

    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'read_only_mcp',
      status: 'forbidden',
      approvalResult,
      mcpRequest,
      mcpResult: notExecutedResult,
      auditDrafts,
      writes: [
        {
          key: 'mcpRequests',
          value: mcpRequest,
          summary: `MCP read-only request (forbidden): ${approvalResult.reason}`,
        },
        {
          key: 'mcpResults',
          value: notExecutedResult,
          summary: `MCP result (forbidden): ${approvalResult.reason}`,
        },
      ],
      outputSummary: `MCP read-only request forbidden: ${approvalResult.reason}`,
      warnings: approvalResult.policyViolations,
      limitations: [
        'MCP request was forbidden by approval policy.',
        'No MCP tool was called.',
        ...(request.limitations ?? []),
      ],
    };
  }

  // Pending approval
  if (approvalResult.requiresHumanApproval || approvalResult.status === 'pending') {
    const pendingResult = buildNotExecutedMcpToolResult(
      mcpRequest,
      `Pending human approval: ${approvalResult.reason}`
    );
    auditDrafts.push(buildAuditDraft({
      id: stableId(['audit', request.sessionId, request.traceId, 'mcp-pending']),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      eventType: 'mcp_pending',
      summary: `MCP request pending approval: ${approvalResult.reason}`,
      taskId: request.taskId,
      limitations: approvalResult.limitations,
    }));

    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'read_only_mcp',
      status: 'pending_approval',
      approvalResult,
      mcpRequest,
      mcpResult: pendingResult,
      auditDrafts,
      writes: [
        {
          key: 'mcpRequests',
          value: mcpRequest,
          summary: `MCP read-only request (pending approval).`,
        },
        {
          key: 'mcpResults',
          value: pendingResult,
          summary: `MCP result (pending approval).`,
        },
        {
          key: 'approvalRequests',
          value: approvalResult,
          summary: `Approval pending: ${approvalResult.reason}`,
        },
      ],
      outputSummary: `MCP read-only request pending human approval.`,
      warnings: [`Approval is required before MCP execution.`],
      limitations: [
        'MCP execution is paused pending human approval.',
        ...(request.limitations ?? []),
      ],
    };
  }

  // Execute fake read-only pilot
  const pilotOutput = runReadOnlyMcpPilot({
    request: mcpRequest,
    snapshot: FAKE_SNAPSHOT,
    options: {
      allowMediumRiskRead: false,
      requireApprovalGate: true,
      mapResultToEvidenceDraft: true,
      mapResultToAuditDraft: true,
    },
  });

  const rawEvidenceDraft = pilotOutput.rawEvidenceDraft;

  auditDrafts.push(buildAuditDraft({
    id: stableId(['audit', request.sessionId, request.traceId, 'mcp-fake-executed']),
    sessionId: request.sessionId,
    traceId: request.traceId,
    agentRole: request.agentRole,
    eventType: 'mcp_completed',
    summary: `Fake read-only MCP pilot executed: ${pilotOutput.result.outputSummary}`,
    taskId: request.taskId,
    limitations: [
      'M5 fake MCP execution; no real MCP server was contacted.',
      'Fake snapshot data is not real system evidence.',
    ],
  }));

  return {
    id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
    sessionId: request.sessionId,
    traceId: request.traceId,
    agentRole: request.agentRole,
    taskId: request.taskId,
    taskType: request.taskType,
    actionType: 'read_only_mcp',
    status: 'executed_fake',
    approvalResult,
    mcpRequest,
    mcpResult: pilotOutput.result,
    pilotOutput,
    rawEvidenceDraft,
    auditDrafts,
    writes: [
      {
        key: 'mcpRequests',
        value: mcpRequest,
        summary: `Fake MCP read-only request executed via pilot.`,
      },
      {
        key: 'mcpResults',
        value: pilotOutput.result,
        summary: `Fake MCP result: ${pilotOutput.result.outputSummary}`,
      },
      ...(rawEvidenceDraft
        ? [
            {
              key: 'rawEvidence' as SharedBlackboardKey,
              value: rawEvidenceDraft,
              summary: 'Fake MCP evidence draft (not real pass evidence).',
            },
          ]
        : []),
    ],
    outputSummary: `Fake read-only MCP pilot completed: ${pilotOutput.result.outputSummary}`,
    warnings: pilotOutput.warnings,
    limitations: [
      'M5 fake MCP execution; no real MCP server was contacted.',
      'Fake MCP result is not real evidence and must not be treated as pass.',
      ...pilotOutput.limitations,
      ...(request.limitations ?? []),
    ],
  };
}

function routeControlledExecution(
  request: AgentMcpActionRequest,
  profile: AgentProfile
): AgentMcpActionResult {
  const auditDrafts: AuditEvent[] = [];

  if (!profile.canRequestControlledExecution) {
    auditDrafts.push(buildAuditDraft({
      id: stableId(['audit', request.sessionId, request.traceId, 'controlled-refused']),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      eventType: 'controlled_forbidden',
      summary: `Agent ${request.agentRole} is not allowed to request controlled execution.`,
      taskId: request.taskId,
    }));

    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'controlled_execution',
      status: 'blocked',
      auditDrafts,
      writes: [
        {
          key: 'unknowns',
          value: `Agent ${request.agentRole} is not allowed to request controlled execution.`,
          summary: 'Controlled execution permission denied.',
        },
      ],
      outputSummary: `Controlled execution blocked: agent lacks permission.`,
      warnings: [`Agent ${request.agentRole} cannot request controlled execution.`],
      limitations: ['Controlled execution blocked by agent profile.', ...(request.limitations ?? [])],
    };
  }

  const controlledRequest = createControlledExecutionRequest({
    runId: request.sessionId,
    requestedByAgent: request.agentRole,
    kind: 'command',
    mode: 'simulated',
    purpose: request.purpose,
    target: request.targetToolName ?? 'typecheck-preview',
    inputSummary: request.inputSummary,
    expectedOutput: request.expectedOutput,
  });

  const safety = evaluateControlledExecutionSafety(controlledRequest);

  if (safety.forbidden) {
    auditDrafts.push(buildAuditDraft({
      id: stableId(['audit', request.sessionId, request.traceId, 'controlled-forbidden']),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      eventType: 'controlled_forbidden',
      summary: safety.reason,
      taskId: request.taskId,
      limitations: safety.limitations,
    }));

    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'controlled_execution',
      status: 'forbidden',
      controlledRequest,
      auditDrafts,
      writes: [
        {
          key: 'controlledExecutionRequests',
          value: controlledRequest,
          summary: `Controlled execution request (forbidden): ${safety.reason}`,
        },
      ],
      outputSummary: `Controlled execution forbidden: ${safety.reason}`,
      warnings: safety.policyViolations,
      limitations: [
        'Controlled execution was forbidden by safety policy.',
        'No command, HTTP, browser, or filesystem action was executed.',
        ...(request.limitations ?? []),
      ],
    };
  }

  if (safety.requiresHumanApproval || safety.status === 'approval_pending') {
    auditDrafts.push(buildAuditDraft({
      id: stableId(['audit', request.sessionId, request.traceId, 'controlled-pending']),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      eventType: 'controlled_pending',
      summary: `Controlled execution pending approval: ${safety.reason}`,
      taskId: request.taskId,
      limitations: safety.limitations,
    }));

    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'controlled_execution',
      status: 'pending_approval',
      controlledRequest,
      auditDrafts,
      writes: [
        {
          key: 'controlledExecutionRequests',
          value: controlledRequest,
          summary: `Controlled execution request (pending approval).`,
        },
        {
          key: 'approvalRequests',
          value: { requestId: controlledRequest.id, status: 'pending', reason: safety.reason },
          summary: `Approval pending for controlled execution.`,
        },
      ],
      outputSummary: `Controlled execution pending human approval.`,
      warnings: [`Approval is required before controlled execution.`],
      limitations: [
        'Controlled execution is paused pending human approval.',
        ...(request.limitations ?? []),
      ],
    };
  }

  // Dry-run + simulation
  const plan = buildDryRunExecutionPlan(controlledRequest);
  const result = simulateControlledExecution(controlledRequest);

  auditDrafts.push(buildAuditDraft({
    id: stableId(['audit', request.sessionId, request.traceId, 'controlled-simulated']),
    sessionId: request.sessionId,
    traceId: request.traceId,
    agentRole: request.agentRole,
    eventType: 'controlled_completed',
    summary: `Controlled execution simulated: ${result.outputSummary}`,
    taskId: request.taskId,
    limitations: [
      'M5 simulated controlled execution; no real command, HTTP, or browser action executed.',
    ],
  }));

  return {
    id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
    sessionId: request.sessionId,
    traceId: request.traceId,
    agentRole: request.agentRole,
    taskId: request.taskId,
    taskType: request.taskType,
    actionType: 'controlled_execution',
    status: 'executed_fake',
    controlledRequest,
    controlledPlan: plan,
    controlledResult: result,
    rawEvidenceDraft: result.rawEvidenceDraft,
    auditDrafts,
    writes: [
      {
        key: 'controlledExecutionRequests',
        value: controlledRequest,
        summary: `Controlled execution request (simulated).`,
      },
      {
        key: 'controlledExecutionResults',
        value: result,
        summary: `Controlled execution result (simulated): ${result.outputSummary}`,
      },
      ...(result.rawEvidenceDraft
        ? [
            {
              key: 'rawEvidence' as SharedBlackboardKey,
              value: result.rawEvidenceDraft,
              summary: 'Simulated controlled execution evidence draft (not real pass evidence).',
            },
          ]
        : []),
    ],
    outputSummary: `Controlled execution simulated: ${result.outputSummary}`,
    warnings: result.limitations,
    limitations: [
      'M5 simulated controlled execution; no real command, HTTP, browser, or filesystem action was executed.',
      'Simulated result is not real evidence and must not be treated as pass.',
      ...(request.limitations ?? []),
    ],
  };
}

export function routeAgentMcpAction(
  request: AgentMcpActionRequest,
  profile: AgentProfile
): AgentMcpActionResult {
  if (request.actionType === 'unsupported') {
    return {
      id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
      sessionId: request.sessionId,
      traceId: request.traceId,
      agentRole: request.agentRole,
      taskId: request.taskId,
      taskType: request.taskType,
      actionType: 'unsupported',
      status: 'unsupported',
      auditDrafts: [],
      writes: [
        {
          key: 'unknowns',
          value: `MCP action type ${request.actionType} is unsupported in M5.`,
          summary: 'Unsupported MCP action.',
        },
      ],
      outputSummary: `MCP action type '${request.actionType}' is unsupported.`,
      warnings: [`Unsupported MCP action type: ${request.actionType}`],
      limitations: ['M5 only supports read_only_mcp and controlled_execution actions.', ...(request.limitations ?? [])],
    };
  }

  if (request.actionType === 'read_only_mcp') {
    return routeReadOnlyMcp(request, profile);
  }

  if (request.actionType === 'controlled_execution') {
    return routeControlledExecution(request, profile);
  }

  return {
    id: request.id ?? stableId(['mcp-result', request.sessionId, request.taskId]),
    sessionId: request.sessionId,
    traceId: request.traceId,
    agentRole: request.agentRole,
    taskId: request.taskId,
    taskType: request.taskType,
    actionType: 'unsupported',
    status: 'unsupported',
    auditDrafts: [],
    writes: [
      {
        key: 'unknowns',
        value: `Unknown MCP action type: ${request.actionType}`,
        summary: 'Unknown MCP action type.',
      },
    ],
    outputSummary: `Unknown MCP action type: ${request.actionType}`,
    warnings: [`Unknown MCP action type: ${request.actionType}`],
    limitations: ['M5 cannot route unknown action types.', ...(request.limitations ?? [])],
  };
}

export interface AgentMcpActionSummary {
  id: string;
  sessionId: string;
  actionType: AgentMcpActionType;
  status: AgentMcpActionResult['status'];
  approvalRequired: boolean;
  forbidden: boolean;
  fakeExecuted: boolean;
  auditDraftCount: number;
  writeCount: number;
  warningCount: number;
  limitationCount: number;
}

export function summarizeAgentMcpActionResult(
  result: AgentMcpActionResult
): AgentMcpActionSummary {
  return {
    id: result.id,
    sessionId: result.sessionId,
    actionType: result.actionType,
    status: result.status,
    approvalRequired: result.status === 'pending_approval',
    forbidden: result.status === 'forbidden',
    fakeExecuted: result.status === 'executed_fake',
    auditDraftCount: result.auditDrafts.length,
    writeCount: result.writes.length,
    warningCount: result.warnings.length,
    limitationCount: result.limitations.length,
  };
}

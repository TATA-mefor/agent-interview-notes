// ============================================================
// Track A: Agent Testing Service Layer
// ============================================================
// Bridges V2 runtime + B1 persistence behind a unified API.
// Does NOT make auth decisions — auth is handled in route layer.
// Does NOT call real MCP / LLM / command / browser.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentSession,
  AgentTask,
  AgentMessage,
  AgentSessionStatus,
  AgentRuntimeRole,
  AgentTaskType,
  AgentTaskPriority,
} from '../../../agent-testing/src/agent-runtime/agentRuntimeTypes';
import { createAgentSession } from '../../../agent-testing/src/agent-runtime/agentSession';
import {
  transitionAgentSessionStatus,
  canTransitionAgentSessionStatus,
} from '../../../agent-testing/src/agent-runtime/agentSession';
import {
  createAgentTask,
  sortAgentTasksByPriority,
} from '../../../agent-testing/src/agent-runtime/agentTaskQueue';
import {
  runAllAgentsOnce,
} from '../../../agent-testing/src/agent-runtime/agentRunner';
import {
  DEFAULT_AGENT_PROFILES,
} from '../../../agent-testing/src/agent-runtime/agentProfileTypes';

import * as persistence from '@/lib/services/agentTestingPersistenceService';

// ── Result type ──

export type AgentTestingServiceResult<T> =
  | { ok: true; data: T; limitations?: string[] }
  | { ok: false; error: string; status?: number; limitations?: string[] };

// ── Helpers ──

function ok<T>(data: T, limitations?: string[]): AgentTestingServiceResult<T> {
  return { ok: true, data, limitations };
}

function fail<T>(error: string, status?: number, limitations?: string[]): AgentTestingServiceResult<T> {
  return { ok: false, error, status, limitations };
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── Valid enums for API input validation ──

const VALID_TASK_TYPES: readonly AgentTaskType[] = [
  'build_context', 'extract_acceptance', 'generate_test_cases',
  'generate_ops_checklist', 'normalize_evidence', 'classify_severity',
  'analyze_defect', 'suggest_regression', 'recommend_release',
  'generate_report', 'request_mcp_read', 'request_controlled_execution',
  'review_evidence_gap', 'summarize_session',
];

const VALID_AGENT_ROLES: readonly AgentRuntimeRole[] = [
  'test_lead', 'product_acceptance', 'test_design',
  'developer_analysis', 'ops_check', 'user_representative',
];

const VALID_TASK_PRIORITIES: readonly AgentTaskPriority[] = [
  'low', 'normal', 'high', 'critical',
];

// ── Blackboard patch validation ──

const MAX_PATCH_KEYS = 20;
const MAX_PATCH_PAYLOAD_BYTES = 500_000;

const FORBIDDEN_PATCH_KEYS = new Set([
  'password', 'token', 'secret', 'api_key', 'apikey',
  'authorization', 'cookie', 'credential', 'access_token',
  'accesstoken', 'refresh_token', 'refreshtoken',
  'raw_logs', 'rawlogs', 'full_log', 'fulllog',
  'http_response', 'httpresponse', 'db_row', 'dbrow',
]);

const MAX_PATCH_NESTING_DEPTH = 5;

function validateBlackboardPatch(
  patch: Record<string, unknown>,
): { valid: true } | { valid: false; error: string } {
  const keys = Object.keys(patch);
  if (keys.length === 0) {
    return { valid: false, error: 'Patch must contain at least one key.' };
  }
  if (keys.length > MAX_PATCH_KEYS) {
    return { valid: false, error: `Patch exceeds max keys (${MAX_PATCH_KEYS}).` };
  }
  try {
    const json = JSON.stringify(patch);
    if (json.length > MAX_PATCH_PAYLOAD_BYTES) {
      return { valid: false, error: 'Patch payload too large.' };
    }
  } catch {
    return { valid: false, error: 'Patch contains unserializable values.' };
  }
  // Recursive forbidden-key scan
  const scanResult = scanForbiddenKeys(patch, 0);
  if (!scanResult.valid) return scanResult;
  return { valid: true };
}

function scanForbiddenKeys(
  value: unknown,
  depth: number,
): { valid: true } | { valid: false; error: string } {
  if (depth > MAX_PATCH_NESTING_DEPTH) {
    return { valid: false, error: `Patch exceeds max nesting depth (${MAX_PATCH_NESTING_DEPTH}).` };
  }
  if (value === null || value === undefined) return { valid: true };
  if (typeof value !== 'object') return { valid: true };

  if (Array.isArray(value)) {
    for (const item of value) {
      const r = scanForbiddenKeys(item, depth + 1);
      if (!r.valid) return r;
    }
    return { valid: true };
  }

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_PATCH_KEYS.has(key.toLowerCase())) {
      return { valid: false, error: `Forbidden key in blackboard patch: "${key}".` };
    }
    const r = scanForbiddenKeys(obj[key], depth + 1);
    if (!r.valid) return r;
  }
  return { valid: true };
}

// ════════════════════════════════════════════════════════════
// Session CRUD
// ════════════════════════════════════════════════════════════

export async function listAgentTestingSessions(
  params?: { status?: string; limit?: number },
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<AgentSession[]>> {
  const result = await persistence.listSessions(params, client);
  if (!result.ok) return fail(result.error, 500);
  return ok(result.data, result.limitations);
}

export async function createAgentTestingSession(
  input: { targetSystemName: string; runId?: string },
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<AgentSession>> {
  const session = createAgentSession({
    runId: input.runId ?? `run-${nowISO().replace(/[^0-9A-Za-z-]+/g, '-')}`,
    targetSystemName: input.targetSystemName,
    now: nowISO(),
  });

  const result = await persistence.saveSession(session, client);
  if (!result.ok) return fail(result.error, 500);

  return ok(session, result.limitations);
}

export async function getAgentTestingSession(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<AgentSession | null>> {
  const result = await persistence.loadSession(sessionId, client);
  if (!result.ok) return fail(result.error, 500);
  return ok(result.data, result.limitations);
}

// ════════════════════════════════════════════════════════════
// Tasks
// ════════════════════════════════════════════════════════════

export async function listAgentTestingTasks(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<AgentTask[]>> {
  const sessionResult = await persistence.loadSession(sessionId, client);
  if (!sessionResult.ok) return fail(sessionResult.error, 500);
  if (!sessionResult.data) return fail('Session not found', 404);

  const tasks = sortAgentTasksByPriority(sessionResult.data.tasks);
  return ok(tasks, sessionResult.limitations);
}

export async function createAgentTestingTask(
  sessionId: string,
  input: {
    assignedTo: string;
    taskType: string;
    goal: string;
    expectedOutput: string;
    priority?: string;
  },
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<AgentTask>> {
  // Validate enums
  if (!VALID_AGENT_ROLES.includes(input.assignedTo as AgentRuntimeRole)) {
    return fail(`Invalid assignedTo: "${input.assignedTo}".`, 400);
  }
  if (!VALID_TASK_TYPES.includes(input.taskType as AgentTaskType)) {
    return fail(`Invalid taskType: "${input.taskType}".`, 400);
  }
  if (!input.goal.trim()) {
    return fail('goal is required.', 400);
  }
  if (!input.expectedOutput.trim()) {
    return fail('expectedOutput is required.', 400);
  }
  const priority: AgentTaskPriority = VALID_TASK_PRIORITIES.includes(input.priority as AgentTaskPriority)
    ? (input.priority as AgentTaskPriority)
    : 'normal';

  const sessionResult = await persistence.loadSession(sessionId, client);
  if (!sessionResult.ok) return fail(sessionResult.error, 500);
  if (!sessionResult.data) return fail('Session not found', 404);

  const session = sessionResult.data;

  const task = createAgentTask({
    sessionId: session.id,
    assignedTo: input.assignedTo as AgentRuntimeRole,
    createdBy: input.assignedTo as AgentRuntimeRole,
    taskType: input.taskType as AgentTaskType,
    goal: input.goal.trim(),
    expectedOutput: input.expectedOutput.trim(),
    priority,
    now: nowISO(),
  });

  session.tasks = [...session.tasks, task];
  const saveResult = await persistence.saveSession(session, client);
  if (!saveResult.ok) return fail(saveResult.error, 500);

  return ok(task, [
    ...(sessionResult.limitations ?? []),
    ...(saveResult.limitations ?? []),
  ]);
}

// ════════════════════════════════════════════════════════════
// Round Execution
// ════════════════════════════════════════════════════════════

export async function runAgentTestingRound(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<{
  status: string;
  taskCount: number;
  messageCount: number;
  steps: unknown[];
  blackboardSummary: Record<string, unknown>;
}>> {
  const loadResult = await persistence.loadSession(sessionId, client);
  if (!loadResult.ok) return fail(loadResult.error, 500);
  if (!loadResult.data) return fail('Session not found', 404);

  const session = loadResult.data;

  // Safe V2 offline runtime — no real MCP / LLM / command / browser
  const roundResult = runAllAgentsOnce(session, DEFAULT_AGENT_PROFILES, nowISO());

  const saveResult = await persistence.saveSession(roundResult.session, client);
  if (!saveResult.ok) return fail(saveResult.error, 500);

  // Reload to get sanitized state — if reload fails, fail the request
  const reloaded = await persistence.loadSession(sessionId, client);
  if (!reloaded.ok || !reloaded.data) {
    return fail('Failed to reload session after round — cannot return sanitized state.', 500);
  }
  const sanitized = reloaded.data;

  const steps = roundResult.steps.map((s) => ({
    agent: s.agent,
    status: s.status,
    summary: s.summary,
    taskId: s.taskId,
    taskType: s.taskType,
    warnings: s.warnings,
  }));

  return ok(
    {
      status: sanitized.status,
      taskCount: sanitized.tasks.length,
      messageCount: sanitized.messages.length,
      steps,
      blackboardSummary: buildBlackboardSummary(
        sanitized.blackboard as unknown as Record<string, unknown>,
      ),
    },
    [
      ...(loadResult.limitations ?? []),
      ...(saveResult.limitations ?? []),
      'round_execution_uses_safe_offline_runtime_only',
      'no_real_mcp_llm_command_browser',
      'response_contains_summary_only_not_raw_blackboard',
    ],
  );
}

// ════════════════════════════════════════════════════════════
// Messages
// ════════════════════════════════════════════════════════════

export async function listAgentTestingMessages(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<AgentMessage[]>> {
  const result = await persistence.loadSession(sessionId, client);
  if (!result.ok) return fail(result.error, 500);
  if (!result.data) return fail('Session not found', 404);

  return ok(result.data.messages, result.limitations);
}

// ════════════════════════════════════════════════════════════
// Evidence Gaps
// ════════════════════════════════════════════════════════════

export async function listAgentTestingEvidenceGaps(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<unknown[]>> {
  const result = await persistence.loadSession(sessionId, client);
  if (!result.ok) return fail(result.error, 500);
  if (!result.data) return fail('Session not found', 404);

  const gaps = (result.data as unknown as Record<string, unknown>).evidenceGapRows;
  return ok(
    (Array.isArray(gaps) ? gaps : []),
    [...(result.limitations ?? []), 'evidence_gaps_restored_as_raw_rows'],
  );
}

// ════════════════════════════════════════════════════════════
// Report
// ════════════════════════════════════════════════════════════

export async function getAgentTestingReport(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<unknown>> {
  const result = await persistence.loadSession(sessionId, client);
  if (!result.ok) return fail(result.error, 500);
  if (!result.data) return fail('Session not found', 404);

  const bb = result.data.blackboard as unknown as Record<string, unknown>;
  const report = bb.report ?? null;

  if (!report) {
    return ok(
      { report: null },
      [...(result.limitations ?? []), 'no_report_available_in_blackboard'],
    );
  }

  return ok({ report }, result.limitations);
}

// ════════════════════════════════════════════════════════════
// Blackboard Summary (for UI)
// ════════════════════════════════════════════════════════════

export function buildBlackboardSummary(
  bb: Record<string, unknown>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    sessionId: bb.sessionId,
    summaryKeys: Object.keys(bb).filter((k) => k !== 'sessionId').slice(0, 30),
  };

  // Include small scalar values, skip large arrays/objects
  for (const [key, val] of Object.entries(bb)) {
    if (key === 'sessionId') continue;
    if (typeof val === 'string' && val.length <= 500) {
      summary[key] = val;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      summary[key] = val;
    } else if (Array.isArray(val)) {
      summary[`${key}_count`] = val.length;
    } else if (val === null) {
      summary[key] = null;
    }
    // Skip large objects/arrays — display count only
  }

  return summary;
}

// ════════════════════════════════════════════════════════════
// Blackboard Write
// ════════════════════════════════════════════════════════════

export async function writeAgentTestingBlackboard(
  sessionId: string,
  patch: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<{ updated: boolean; blackboardSummary: Record<string, unknown> | null }>> {
  // Recursive forbidden-key + size/depth validation → 400
  const patchValidation = validateBlackboardPatch(patch);
  if (!patchValidation.valid) {
    return fail(patchValidation.error, 400);
  }

  const result = await persistence.loadSession(sessionId, client);
  if (!result.ok) return fail(result.error, 500);
  if (!result.data) return fail('Session not found', 404);

  const session = result.data;
  const currentBb = session.blackboard as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    currentBb[key] = value;
  }

  const saveResult = await persistence.saveSession(session, client);
  if (!saveResult.ok) return fail(saveResult.error, 500);

  // Reload to get the sanitized/stored version
  const reloaded = await persistence.loadSession(sessionId, client);
  if (!reloaded.ok || !reloaded.data) {
    return ok(
      { updated: true, blackboardSummary: null },
      [
        ...(result.limitations ?? []),
        ...(saveResult.limitations ?? []),
        'blackboard_patch_passes_through_redaction_on_save',
        'blackboard_summary_unavailable_reload_failed_after_save',
      ],
    );
  }

  const storedBb = reloaded.data.blackboard as unknown as Record<string, unknown>;

  return ok(
    { updated: true, blackboardSummary: buildBlackboardSummary(storedBb) },
    [
      ...(result.limitations ?? []),
      ...(saveResult.limitations ?? []),
      'blackboard_patch_passes_through_redaction_on_save',
      'response_contains_summary_only_not_raw_blackboard',
    ],
  );
}

// ════════════════════════════════════════════════════════════
// Transition
// ════════════════════════════════════════════════════════════

export async function transitionAgentTestingSession(
  sessionId: string,
  targetStatus: string,
  client?: SupabaseClient,
): Promise<AgentTestingServiceResult<{
  previousStatus: string;
  newStatus: string;
  blackboardSummary: Record<string, unknown>;
}>> {
  const result = await persistence.loadSession(sessionId, client);
  if (!result.ok) return fail(result.error, 500);
  if (!result.data) return fail('Session not found', 404);

  const session = result.data;

  if (!canTransitionAgentSessionStatus(session.status, targetStatus as AgentSessionStatus)) {
    return fail(
      `Invalid transition: ${session.status} -> ${targetStatus}`,
      400,
    );
  }

  const previousStatus = session.status;
  const updated = transitionAgentSessionStatus(session, targetStatus as AgentSessionStatus, nowISO());
  const saveResult = await persistence.saveSession(updated, client);
  if (!saveResult.ok) return fail(saveResult.error, 500);

  // Reload to get sanitized state — if reload fails, fail the request
  const reloaded = await persistence.loadSession(sessionId, client);
  if (!reloaded.ok || !reloaded.data) {
    return fail('Failed to reload session after transition — cannot return sanitized state.', 500);
  }
  const sanitized = reloaded.data;

  return ok(
    {
      previousStatus,
      newStatus: sanitized.status,
      blackboardSummary: buildBlackboardSummary(
        sanitized.blackboard as unknown as Record<string, unknown>,
      ),
    },
    [
      ...(result.limitations ?? []),
      ...(saveResult.limitations ?? []),
      'response_contains_summary_only_not_raw_blackboard',
    ],
  );
}

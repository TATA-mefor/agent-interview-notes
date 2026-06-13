// ============================================================
// Track B1: Agent Testing Repository Types
// ============================================================
// DB row types (snake_case) mirror supabase/schema.sql columns.
// Domain types are in agent-testing/src/agent-runtime/agentRuntimeTypes.ts.
// ============================================================

// ── DB Row Types ──

export interface AgentTestingSessionRow {
  id: string;
  run_id: string;
  target_system_name: string;
  status: string;
  agents: unknown; // JSONB
  limitations: unknown; // JSONB
  created_by: string | null;
  completed_at: string | null;
  metadata: unknown; // JSONB
  created_at: string;
  updated_at: string;
}

export interface AgentTestingTaskRow {
  id: string;
  session_id: string;
  trace_id: string;
  assigned_to: string;
  created_by: string;
  task_type: string;
  goal: string;
  input_refs: unknown; // JSONB
  expected_output: string | null;
  status: string;
  priority: string;
  requires_approval: boolean;
  related_evidence_ids: unknown; // JSONB
  related_test_case_ids: unknown; // JSONB
  limitations: unknown; // JSONB
  error_summary: string | null;
  metadata: unknown; // JSONB
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AgentTestingMessageRow {
  id: string;
  session_id: string;
  trace_id: string;
  from_agent: string;
  to_agent: string;
  message_type: string;
  summary: string;
  payload_ref: unknown; // JSONB | null
  artifacts: unknown; // JSONB
  related_task_id: string | null;
  related_evidence_ids: unknown; // JSONB
  related_test_case_ids: unknown; // JSONB
  limitations: unknown; // JSONB
  metadata: unknown; // JSONB
  created_at: string;
}

export interface AgentTestingBlackboardRow {
  session_id: string;
  data: unknown; // JSONB — full blackboard snapshot
  unknowns: unknown; // JSONB
  limitations: unknown; // JSONB
  version: number;
  metadata: unknown; // JSONB
  updated_at: string;
}

export interface AgentTestingEvidenceGapRow {
  id: string;
  session_id: string;
  test_case_id: string | null;
  related_evidence_ids: unknown; // JSONB
  reason: string;
  status: string;
  summary: string;
  recommended_action: string | null;
  severity_hint: string | null;
  limitations: unknown; // JSONB
  metadata: unknown; // JSONB
  created_at: string;
  updated_at: string;
}

export interface AgentTestingApprovalRow {
  id: string;
  session_id: string;
  agent_role: string | null;
  action_type: string;
  risk_level: string;
  status: string;
  reason: string | null;
  decision: string | null;
  decided_by: string | null;
  decided_at: string | null;
  related_task_id: string | null;
  related_mcp_request_id: string | null;
  limitations: unknown; // JSONB
  metadata: unknown; // JSONB
  created_at: string;
  updated_at: string;
}

export interface AgentTestingAuditRow {
  id: string;
  session_id: string | null;
  event_type: string;
  actor: unknown; // JSONB | null
  outcome: string;
  summary: string;
  privacy_level: string | null;
  artifact_refs: unknown; // JSONB
  related_task_id: string | null;
  related_approval_request_id: string | null;
  related_mcp_request_id: string | null;
  limitations: unknown; // JSONB
  metadata: unknown; // JSONB
  created_at: string;
}

// ── JSONB helper ──

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export function safeJsonParse<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

// ── Forbidden keys for audit/redaction ──

export const FORBIDDEN_AUDIT_KEYS = new Set([
  'password', 'token', 'cookie', 'authorization', 'secret',
  'api_key', 'apikey', 'access_token', 'accesstoken',
  'refresh_token', 'refreshtoken', 'credential',
  'raw_logs', 'rawlogs', 'full_log', 'fulllog',
  'http_response', 'httpresponse', 'db_row', 'dbrow',
  'authtoken', 'auth_token',
]);

export function checkForbiddenKeys(obj: unknown, context: string): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      checkForbiddenKeys(item, context);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_AUDIT_KEYS.has(key.toLowerCase())) {
      throw new Error(`${context}: forbidden key detected: "${key}"`);
    }
    // Recurse into nested objects and arrays
    const value = record[key];
    if (typeof value === 'object' && value !== null) {
      checkForbiddenKeys(value, `${context}.${key}`);
    }
  }
}

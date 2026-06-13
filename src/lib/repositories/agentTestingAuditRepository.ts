// ============================================================
// Track B1: agent_testing_audit_events Repository
// ============================================================
// Insert-only at service level (Track C audit draft service defines
// allowed fields). This repository enforces:
//   - Forbidden key check before insert/upsert
//   - No update method (insert-only)
//   - No raw secrets / tokens / full HTTP responses / raw DB rows
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingAuditRow } from './agentTestingRepositoryTypes';
import { checkForbiddenKeys } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_audit_events';

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

// ── Sanitise before insert ──

function sanitiseAuditRow(row: AgentTestingAuditRow): AgentTestingAuditRow {
  // Check summary for secret patterns
  const summaryLower = (row.summary ?? '').toLowerCase();
  for (const key of ['password', 'token', 'secret', 'bearer']) {
    if (summaryLower.includes(key)) {
      throw new Error(
        `insertAuditEvent: summary may contain sensitive data matching "${key}"`,
      );
    }
  }

  // Recursively check row + all nested JSONB for forbidden keys
  checkForbiddenKeys(row, 'insertAuditEvent');

  return row;
}

// ── Insert-only (no update — audit is append-only) ──

export async function insertAuditEvent(
  row: AgentTestingAuditRow,
  client?: SupabaseClient,
): Promise<AgentTestingAuditRow> {
  const sanitised = sanitiseAuditRow(row);

  const { data, error } = await dbClient(client)
    .from(TABLE)
    .insert(sanitised as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(`insertAuditEvent failed: ${error.message}`);
  return data as AgentTestingAuditRow;
}

// ── Read ──

export async function findAuditEventsBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingAuditRow[]> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`findAuditEventsBySessionId failed: ${error.message}`);
  return (data ?? []) as AgentTestingAuditRow[];
}

export async function findAuditEventById(
  id: string,
  client?: SupabaseClient,
): Promise<AgentTestingAuditRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findAuditEventById failed: ${error.message}`);
  }
  return data as AgentTestingAuditRow;
}

export async function deleteAuditEventsBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) throw new Error(`deleteAuditEventsBySessionId failed: ${error.message}`);
  return true;
}

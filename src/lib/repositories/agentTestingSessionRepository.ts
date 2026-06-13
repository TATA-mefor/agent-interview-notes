// ============================================================
// Track B1: agent_testing_sessions Repository
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingSessionRow } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_sessions';

// ── Helpers ──

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

// ── CRUD ──

export async function insertSession(
  row: AgentTestingSessionRow,
  client?: SupabaseClient,
): Promise<AgentTestingSessionRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .insert(row as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(`insertSession failed: ${error.message}`);
  return data as AgentTestingSessionRow;
}

export async function upsertSession(
  row: AgentTestingSessionRow,
  client?: SupabaseClient,
): Promise<AgentTestingSessionRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .upsert(row as unknown as Record<string, unknown>, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`upsertSession failed: ${error.message}`);
  return data as AgentTestingSessionRow;
}

export async function findSessionById(
  id: string,
  client?: SupabaseClient,
): Promise<AgentTestingSessionRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findSessionById failed: ${error.message}`);
  }
  return data as AgentTestingSessionRow;
}

export async function listSessions(
  params?: {
    status?: string;
    limit?: number;
  },
  client?: SupabaseClient,
): Promise<AgentTestingSessionRow[]> {
  let query = dbClient(client).from(TABLE).select('*');

  if (params?.status) query = query.eq('status', params.status);
  query = query
    .order('created_at', { ascending: false })
    .limit(params?.limit ?? 50);

  const { data, error } = await query;
  if (error) throw new Error(`listSessions failed: ${error.message}`);
  return (data ?? []) as AgentTestingSessionRow[];
}

export async function updateSession(
  id: string,
  updates: Partial<AgentTestingSessionRow>,
  client?: SupabaseClient,
): Promise<AgentTestingSessionRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .update(updates as unknown as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateSession failed: ${error.message}`);
  return data as AgentTestingSessionRow;
}

export async function deleteSessionById(
  id: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`deleteSessionById failed: ${error.message}`);
  }
  return true;
}

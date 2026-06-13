// ============================================================
// Track B1: agent_testing_tasks Repository
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingTaskRow } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_tasks';

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

export async function insertTask(
  row: AgentTestingTaskRow,
  client?: SupabaseClient,
): Promise<AgentTestingTaskRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .insert(row as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(`insertTask failed: ${error.message}`);
  return data as AgentTestingTaskRow;
}

export async function upsertTask(
  row: AgentTestingTaskRow,
  client?: SupabaseClient,
): Promise<AgentTestingTaskRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .upsert(row as unknown as Record<string, unknown>, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`upsertTask failed: ${error.message}`);
  return data as AgentTestingTaskRow;
}

export async function findTaskById(
  id: string,
  client?: SupabaseClient,
): Promise<AgentTestingTaskRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findTaskById failed: ${error.message}`);
  }
  return data as AgentTestingTaskRow;
}

export async function findTasksBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingTaskRow[]> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`findTasksBySessionId failed: ${error.message}`);
  return (data ?? []) as AgentTestingTaskRow[];
}

export async function updateTask(
  id: string,
  updates: Partial<AgentTestingTaskRow>,
  client?: SupabaseClient,
): Promise<AgentTestingTaskRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .update(updates as unknown as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateTask failed: ${error.message}`);
  return data as AgentTestingTaskRow;
}

export async function deleteTasksBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) throw new Error(`deleteTasksBySessionId failed: ${error.message}`);
  return true;
}

export async function deleteTaskById(
  id: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw new Error(`deleteTaskById failed: ${error.message}`);
  return true;
}

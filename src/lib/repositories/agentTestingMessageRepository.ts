// ============================================================
// Track B1: agent_testing_messages Repository
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingMessageRow } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_messages';

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

export async function insertMessage(
  row: AgentTestingMessageRow,
  client?: SupabaseClient,
): Promise<AgentTestingMessageRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .insert(row as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(`insertMessage failed: ${error.message}`);
  return data as AgentTestingMessageRow;
}

export async function upsertMessage(
  row: AgentTestingMessageRow,
  client?: SupabaseClient,
): Promise<AgentTestingMessageRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .upsert(row as unknown as Record<string, unknown>, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`upsertMessage failed: ${error.message}`);
  return data as AgentTestingMessageRow;
}

export async function findMessagesBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingMessageRow[]> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`findMessagesBySessionId failed: ${error.message}`);
  return (data ?? []) as AgentTestingMessageRow[];
}

export async function findMessageById(
  id: string,
  client?: SupabaseClient,
): Promise<AgentTestingMessageRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findMessageById failed: ${error.message}`);
  }
  return data as AgentTestingMessageRow;
}

export async function deleteMessagesBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) throw new Error(`deleteMessagesBySessionId failed: ${error.message}`);
  return true;
}

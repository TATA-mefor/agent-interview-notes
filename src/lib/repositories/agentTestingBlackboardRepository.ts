// ============================================================
// Track B1: agent_testing_blackboards Repository
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingBlackboardRow } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_blackboards';

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

export async function upsertBlackboard(
  row: AgentTestingBlackboardRow,
  client?: SupabaseClient,
): Promise<AgentTestingBlackboardRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .upsert(row as unknown as Record<string, unknown>, { onConflict: 'session_id' })
    .select()
    .single();

  if (error) throw new Error(`upsertBlackboard failed: ${error.message}`);
  return data as AgentTestingBlackboardRow;
}

export async function findBlackboardBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingBlackboardRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findBlackboardBySessionId failed: ${error.message}`);
  }
  return data as AgentTestingBlackboardRow;
}

export async function deleteBlackboardBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) throw new Error(`deleteBlackboardBySessionId failed: ${error.message}`);
  return true;
}

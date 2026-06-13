// ============================================================
// Track B1: agent_testing_evidence_gaps Repository
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingEvidenceGapRow } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_evidence_gaps';

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

export async function insertEvidenceGap(
  row: AgentTestingEvidenceGapRow,
  client?: SupabaseClient,
): Promise<AgentTestingEvidenceGapRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .insert(row as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(`insertEvidenceGap failed: ${error.message}`);
  return data as AgentTestingEvidenceGapRow;
}

export async function upsertEvidenceGap(
  row: AgentTestingEvidenceGapRow,
  client?: SupabaseClient,
): Promise<AgentTestingEvidenceGapRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .upsert(row as unknown as Record<string, unknown>, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`upsertEvidenceGap failed: ${error.message}`);
  return data as AgentTestingEvidenceGapRow;
}

export async function findEvidenceGapsBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingEvidenceGapRow[]> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`findEvidenceGapsBySessionId failed: ${error.message}`);
  return (data ?? []) as AgentTestingEvidenceGapRow[];
}

export async function findEvidenceGapById(
  id: string,
  client?: SupabaseClient,
): Promise<AgentTestingEvidenceGapRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findEvidenceGapById failed: ${error.message}`);
  }
  return data as AgentTestingEvidenceGapRow;
}

export async function updateEvidenceGap(
  id: string,
  updates: Partial<AgentTestingEvidenceGapRow>,
  client?: SupabaseClient,
): Promise<AgentTestingEvidenceGapRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .update(updates as unknown as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateEvidenceGap failed: ${error.message}`);
  return data as AgentTestingEvidenceGapRow;
}

export async function deleteEvidenceGapsBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) throw new Error(`deleteEvidenceGapsBySessionId failed: ${error.message}`);
  return true;
}

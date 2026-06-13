// ============================================================
// Track B1: agent_testing_approval_requests Repository
// ============================================================

import { db as defaultDb } from '@/lib/db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentTestingApprovalRow } from './agentTestingRepositoryTypes';

const TABLE = 'agent_testing_approval_requests';

function dbClient(client?: SupabaseClient): SupabaseClient {
  return client ?? defaultDb;
}

export async function insertApproval(
  row: AgentTestingApprovalRow,
  client?: SupabaseClient,
): Promise<AgentTestingApprovalRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .insert(row as unknown as Record<string, unknown>)
    .select()
    .single();

  if (error) throw new Error(`insertApproval failed: ${error.message}`);
  return data as AgentTestingApprovalRow;
}

export async function upsertApproval(
  row: AgentTestingApprovalRow,
  client?: SupabaseClient,
): Promise<AgentTestingApprovalRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .upsert(row as unknown as Record<string, unknown>, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`upsertApproval failed: ${error.message}`);
  return data as AgentTestingApprovalRow;
}

export async function findApprovalsBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<AgentTestingApprovalRow[]> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`findApprovalsBySessionId failed: ${error.message}`);
  return (data ?? []) as AgentTestingApprovalRow[];
}

export async function findApprovalById(
  id: string,
  client?: SupabaseClient,
): Promise<AgentTestingApprovalRow | null> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`findApprovalById failed: ${error.message}`);
  }
  return data as AgentTestingApprovalRow;
}

export async function updateApproval(
  id: string,
  updates: Partial<AgentTestingApprovalRow>,
  client?: SupabaseClient,
): Promise<AgentTestingApprovalRow> {
  const { data, error } = await dbClient(client)
    .from(TABLE)
    .update(updates as unknown as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateApproval failed: ${error.message}`);
  return data as AgentTestingApprovalRow;
}

export async function deleteApprovalsBySessionId(
  sessionId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const { error } = await dbClient(client)
    .from(TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) throw new Error(`deleteApprovalsBySessionId failed: ${error.message}`);
  return true;
}

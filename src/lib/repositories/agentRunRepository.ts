import { db } from '@/lib/db/client'
import type { AgentRun } from '@/lib/types'

const TABLE = 'agent_runs'

export async function createAgentRun(input: {
  agent_type: string
  input?: Record<string, unknown>
  provider?: string
  model?: string
  status?: string
}): Promise<AgentRun> {
  const { data, error } = await db
    .from(TABLE)
    .insert({
      ...input,
      status: input.status ?? 'pending',
      started_at: input.status === 'running' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) throw new Error(`createAgentRun failed: ${error.message}`)
  return data as AgentRun
}

export async function updateAgentRun(
  id: string,
  updates: {
    status?: string
    output?: Record<string, unknown>
    error?: string
    tokens_used?: number
  }
): Promise<AgentRun> {
  const updateData: Record<string, unknown> = { ...updates }

  if (updates.status === 'running' && !updateData.started_at) {
    updateData.started_at = new Date().toISOString()
  }
  if (updates.status === 'completed' || updates.status === 'failed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await db.from(TABLE).update(updateData).eq('id', id).select().single()
  if (error) throw new Error(`updateAgentRun failed: ${error.message}`)
  return data as AgentRun
}

export async function getAgentRun(id: string): Promise<AgentRun | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getAgentRun failed: ${error.message}`)
  }
  return data as AgentRun
}

export async function listAgentRuns(agentType?: string, limit: number = 20): Promise<AgentRun[]> {
  let query = db.from(TABLE).select('*')

  if (agentType) query = query.eq('agent_type', agentType)
  query = query.order('created_at', { ascending: false }).limit(limit)

  const { data, error } = await query
  if (error) throw new Error(`listAgentRuns failed: ${error.message}`)
  return (data ?? []) as AgentRun[]
}

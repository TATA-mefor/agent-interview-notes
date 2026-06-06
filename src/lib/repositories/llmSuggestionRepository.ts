import { db } from '@/lib/db/client'
import type { LlmSuggestion } from '@/lib/types'

const TABLE = 'llm_suggestions'

export async function getSuggestionsForCard(cardId: string): Promise<LlmSuggestion[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getSuggestionsForCard failed: ${error.message}`)
  return (data ?? []) as LlmSuggestion[]
}

export async function getSuggestionById(id: string): Promise<LlmSuggestion | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getSuggestionById failed: ${error.message}`)
  }
  return data as LlmSuggestion
}

export async function createSuggestion(input: {
  card_id?: string
  suggestion_type: string
  input_context?: Record<string, unknown>
  output_content?: Record<string, unknown>
  provider?: string
  model?: string
  tokens_used?: number
}): Promise<LlmSuggestion> {
  const { data, error } = await db.from(TABLE).insert(input).select().single()
  if (error) throw new Error(`createSuggestion failed: ${error.message}`)
  return data as LlmSuggestion
}

export async function markSuggestionAccepted(
  id: string,
  acceptedFields: string[]
): Promise<LlmSuggestion> {
  const { data, error } = await db
    .from(TABLE)
    .update({ accepted: true, accepted_fields: acceptedFields })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`markSuggestionAccepted failed: ${error.message}`)
  return data as LlmSuggestion
}

export async function getPendingSuggestions(cardId: string): Promise<LlmSuggestion[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('card_id', cardId)
    .eq('accepted', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getPendingSuggestions failed: ${error.message}`)
  return (data ?? []) as LlmSuggestion[]
}

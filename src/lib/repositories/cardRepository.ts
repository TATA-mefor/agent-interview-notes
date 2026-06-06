import { db } from '@/lib/db/client'
import type { Card, CardInput, CardUpdate } from '@/lib/types'

const TABLE = 'cards'

export async function listCards(params?: {
  topic?: string
  difficulty?: string
  frequency?: string
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
}): Promise<Card[]> {
  let query = db.from(TABLE).select('*')

  if (params?.topic) query = query.eq('topic', params.topic)
  if (params?.difficulty) query = query.eq('difficulty', params.difficulty)
  if (params?.frequency) query = query.eq('frequency', params.frequency)
  if (params?.search) query = query.or(`question.ilike.%${params.search}%,answer.ilike.%${params.search}%`)
  if (params?.tags && params.tags.length > 0) query = query.contains('tags', params.tags)
  if (params?.limit) query = query.limit(params.limit)
  if (params?.offset) query = query.range(params.offset, params.offset + (params.limit ?? 25) - 1)

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(`listCards failed: ${error.message}`)
  return (data ?? []) as Card[]
}

export async function getCardById(id: string): Promise<Card | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw new Error(`getCardById failed: ${error.message}`)
  }
  return data as Card
}

export async function getCardByHash(hash: string): Promise<Card | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('question_hash', hash).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getCardByHash failed: ${error.message}`)
  }
  return data as Card
}

export async function createCard(input: CardInput): Promise<Card> {
  const { data, error } = await db.from(TABLE).insert(input).select().single()
  if (error) throw new Error(`createCard failed: ${error.message}`)
  return data as Card
}

export async function updateCard(id: string, input: CardUpdate): Promise<Card> {
  const { data, error } = await db.from(TABLE).update(input).eq('id', id).select().single()
  if (error) throw new Error(`updateCard failed: ${error.message}`)
  return data as Card
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await db.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`deleteCard failed: ${error.message}`)
}

export async function getCardsByIds(ids: string[]): Promise<Card[]> {
  if (ids.length === 0) return []
  const { data, error } = await db.from(TABLE).select('*').in('id', ids)
  if (error) throw new Error(`getCardsByIds failed: ${error.message}`)
  return (data ?? []) as Card[]
}

export async function batchUpdateCards(
  ids: string[],
  input: CardUpdate
): Promise<number> {
  if (ids.length === 0) return 0
  const { error } = await db.from(TABLE).update(input).in('id', ids)
  if (error) throw new Error(`batchUpdateCards failed: ${error.message}`)
  return ids.length
}

export async function countCards(params?: {
  topic?: string
  difficulty?: string
  frequency?: string
}): Promise<number> {
  let query = db.from(TABLE).select('*', { count: 'exact', head: true })
  if (params?.topic) query = query.eq('topic', params.topic)
  if (params?.difficulty) query = query.eq('difficulty', params.difficulty)
  if (params?.frequency) query = query.eq('frequency', params.frequency)
  const { count, error } = await query
  if (error) throw new Error(`countCards failed: ${error.message}`)
  return count ?? 0
}

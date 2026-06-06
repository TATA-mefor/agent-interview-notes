import { db } from '@/lib/db/client'
import type { CardLink, CardLinkInput } from '@/lib/types'

const TABLE = 'card_links'

export async function getLinksForCard(cardId: string): Promise<CardLink[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .or(`from_card_id.eq.${cardId},to_card_id.eq.${cardId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getLinksForCard failed: ${error.message}`)
  return (data ?? []) as CardLink[]
}

export async function getOutgoingLinks(cardId: string): Promise<CardLink[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('from_card_id', cardId)
    .order('score', { ascending: false })

  if (error) throw new Error(`getOutgoingLinks failed: ${error.message}`)
  return (data ?? []) as CardLink[]
}

export async function createLink(input: CardLinkInput): Promise<CardLink> {
  const { data, error } = await db.from(TABLE).insert(input).select().single()
  if (error) {
    if (error.code === '23505') throw new Error('Link already exists')
    throw new Error(`createLink failed: ${error.message}`)
  }
  return data as CardLink
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await db.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`deleteLink failed: ${error.message}`)
}

export async function deleteLinksBetween(
  fromCardId: string,
  toCardId: string
): Promise<void> {
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('from_card_id', fromCardId)
    .eq('to_card_id', toCardId)

  if (error) throw new Error(`deleteLinksBetween failed: ${error.message}`)
}

export async function getRelatedCardsByType(
  cardId: string,
  relationType?: string
): Promise<{ link: CardLink; card: { id: string; topic: string; question: string; difficulty: string } }[]> {
  let query = db.from(TABLE).select(
    `*, to_card:cards!card_links_to_card_id_fkey(id, topic, question, difficulty)`
  )

  query = query.eq('from_card_id', cardId)
  if (relationType) query = query.eq('relation_type', relationType)

  const { data, error } = await query
  if (error) throw new Error(`getRelatedCardsByType failed: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    link: {
      id: row.id,
      from_card_id: row.from_card_id,
      to_card_id: row.to_card_id,
      relation_type: row.relation_type,
      reason: row.reason,
      score: row.score,
      source: row.source,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as CardLink,
    card: row.to_card as { id: string; topic: string; question: string; difficulty: string },
  }))
}

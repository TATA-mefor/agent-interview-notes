/**
 * Card Service — Domain business logic for card operations.
 *
 * Responsibilities:
 * - Create card with auto-generated ID, weight, and question_hash
 * - Update card with version snapshot
 * - Duplicate card
 * - Batch update with weight recalculation
 * - Soft delete preparation (version snapshot before delete)
 */

import * as cardRepo from '@/lib/repositories/cardRepository'
import * as cardLinkRepo from '@/lib/repositories/cardLinkRepository'
import { calcWeight } from '@/lib/probability'
import type { Card, CardInput, CardUpdate, CardLink } from '@/lib/types'

// ---- Create ----

export async function createCard(input: CardInput): Promise<Card> {
  const cardInput: CardInput = {
    ...input,
    id: input.id || generateCardId(),
    difficulty: input.difficulty || '中级',
    frequency: input.frequency || '中频',
    mastery: input.mastery ?? 0.2,
    source: input.source || 'manual',
  }

  const card = await cardRepo.createCard(cardInput)

  // Recalculate weight (trigger handles question_hash)
  const weight = calcWeight(card)
  const updated = await cardRepo.updateCard(card.id, {
    probability_weight: weight,
    review_priority: weight, // initial priority = base weight
  } as CardUpdate)

  return updated
}

// ---- Update with Versioning ----

export async function updateCard(
  id: string,
  input: CardUpdate,
  changeSummary?: string
): Promise<Card> {
  // Snapshot current state before update (version history)
  const current = await cardRepo.getCardById(id)
  if (!current) throw new Error(`Card not found: ${id}`)

  // If mastery or difficulty/frequency changed, recalculate weight
  let weightUpdate: Partial<CardUpdate> = {}
  if (
    input.mastery !== undefined ||
    input.difficulty !== undefined ||
    input.frequency !== undefined
  ) {
    const effective = {
      difficulty: input.difficulty || current.difficulty,
      frequency: input.frequency || current.frequency,
      mastery: input.mastery ?? current.mastery,
    }
    weightUpdate.probability_weight = calcWeight(effective)
  }

  const mergedUpdate = { ...input, ...weightUpdate }
  const updated = await cardRepo.updateCard(id, mergedUpdate)

  // Save version snapshot (fire-and-forget — don't block the update)
  saveVersionSnapshot(id, current, changeSummary).catch((err) =>
    console.error('Failed to save card version:', err)
  )

  return updated
}

// ---- Duplicate ----

export async function duplicateCard(id: string): Promise<Card> {
  const original = await cardRepo.getCardById(id)
  if (!original) throw new Error(`Card not found: ${id}`)

  const newId = generateCardId()
  const duplicate: CardInput = {
    id: newId,
    topic: original.topic,
    question: `${original.question} (副本)`,
    answer: original.answer,
    personal_notes: original.personal_notes,
    extended_notes: original.extended_notes,
    interview_script: original.interview_script,
    common_mistakes: original.common_mistakes,
    references_links: original.references_links,
    difficulty: original.difficulty,
    frequency: original.frequency,
    mastery: 0.2, // reset mastery for duplicate
    tags: original.tags,
    source: 'manual',
  }

  const card = await cardRepo.createCard(duplicate)
  const weight = calcWeight(card)
  return await cardRepo.updateCard(card.id, {
    probability_weight: weight,
    review_priority: weight,
  } as CardUpdate)
}

// ---- Delete ----

export async function deleteCard(id: string): Promise<void> {
  // Save final snapshot before delete
  const current = await cardRepo.getCardById(id)
  if (current) {
    await saveVersionSnapshot(id, current, 'Card deleted').catch((err) =>
      console.error('Failed to save delete snapshot:', err)
    )
  }
  await cardRepo.deleteCard(id)
}

// ---- Batch Operations ----

export async function batchUpdateCards(
  ids: string[],
  input: CardUpdate
): Promise<number> {
  return cardRepo.batchUpdateCards(ids, input)
}

// ---- Card Relationships ----

export async function linkCards(
  fromCardId: string,
  toCardId: string,
  relationType: string,
  source: string = 'manual',
  reason?: string
): Promise<void> {
  await cardLinkRepo.createLink({
    from_card_id: fromCardId,
    to_card_id: toCardId,
    relation_type: relationType as CardLink['relation_type'],
    source: source as CardLink['source'],
    reason: reason || '',
    score: source === 'manual' ? 1.0 : 0.7,
  })
}

// ---- Helpers ----

function generateCardId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 6)
  return `card_${timestamp}${random}`
}

async function saveVersionSnapshot(
  cardId: string,
  snapshot: Card,
  changeSummary?: string
): Promise<void> {
  const { db } = await import('@/lib/db/client')

  // Get current max version number
  const { data: versions } = await db
    .from('card_versions')
    .select('version_number')
    .eq('card_id', cardId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1

  const { error } = await db.from('card_versions').insert({
    card_id: cardId,
    version_number: nextVersion,
    snapshot,
    change_summary: changeSummary || 'Manual update',
  })

  if (error) throw new Error(`saveVersionSnapshot failed: ${error.message}`)
}

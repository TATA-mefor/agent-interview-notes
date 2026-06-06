/**
 * Review Service — Review scheduling, mastery tracking, and priority calculation.
 *
 * Responsibilities:
 * - Schedule review tasks based on priority
 * - Complete a review and update mastery
 * - Recalculate review priorities after review
 * - Generate daily/weekly review plans
 */

import * as cardRepo from '@/lib/repositories/cardRepository'
import * as reviewRepo from '@/lib/repositories/reviewRepository'
import {
  calcWeight,
  calcReviewPriority,
  calcNewMastery,
  calcForgettingFactor,
} from '@/lib/probability'
import type { Card, ReviewTask, ReviewTaskInput } from '@/lib/types'

// ---- Schedule Review Tasks ----

export async function scheduleReviewForCard(
  cardId: string,
  scheduledDate: string, // YYYY-MM-DD
  priorityScore?: number
): Promise<ReviewTask> {
  const card = await cardRepo.getCardById(cardId)
  if (!card) throw new Error(`Card not found: ${cardId}`)

  const score =
    priorityScore ??
    calcReviewPriority({
      difficulty: card.difficulty,
      frequency: card.frequency,
      mastery: card.mastery,
      days_since_last_review: daysSince(card.last_review),
      manual_boost: card.manual_boost,
    }).review_priority

  return reviewRepo.createReviewTask({
    card_id: cardId,
    scheduled_date: scheduledDate,
    priority_score: score,
    task_type: score > 0.7 ? 'cram' : score > 0.4 ? 'review' : 'retest',
  })
}

export async function generateDailyReviewPlan(
  dateStr?: string
): Promise<ReviewTask[]> {
  const today = dateStr || new Date().toISOString().split('T')[0]

  // Get all cards that need review (sorted by priority)
  const allCards = await cardRepo.listCards({ limit: 50 })
  const existingTasks = await reviewRepo.getReviewTasks({ scheduledDate: today })

  const existingCardIds = new Set(existingTasks.map((t) => t.card_id))

  // Create tasks for cards not yet scheduled today (up to 10 most urgent)
  const unscheduled = allCards
    .filter((c) => !existingCardIds.has(c.id))
    .sort((a, b) => b.review_priority - a.review_priority)
    .slice(0, 10)

  const newTasks: ReviewTaskInput[] = unscheduled.map((card) => {
    const priority = calcReviewPriority({
      difficulty: card.difficulty,
      frequency: card.frequency,
      mastery: card.mastery,
      days_since_last_review: daysSince(card.last_review),
      manual_boost: card.manual_boost,
    })

    return {
      card_id: card.id,
      scheduled_date: today,
      priority_score: priority.review_priority,
      task_type: priority.review_priority > 0.7 ? 'cram' : 'review',
    }
  })

  const created = await reviewRepo.createReviewTasksBatch(newTasks)
  return [...existingTasks, ...created].sort(
    (a, b) => b.priority_score - a.priority_score
  )
}

// ---- Complete Review ----

export async function completeReview(
  taskId: string,
  isCorrect: boolean,
  notes?: string,
  durationSeconds?: number
): Promise<{ task: ReviewTask; card: Card }> {
  // Get the task
  const tasks = await reviewRepo.getReviewTasks({})
  const task = tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`Review task not found: ${taskId}`)

  // Get the card
  const card = await cardRepo.getCardById(task.card_id)
  if (!card) throw new Error(`Card not found: ${task.card_id}`)

  // Calculate new mastery
  const newMastery = calcNewMastery(card.mastery, isCorrect, card.difficulty)

  // Calculate new weight
  const newWeight = calcWeight({
    difficulty: card.difficulty,
    frequency: card.frequency,
    mastery: newMastery,
  })

  // Update card
  const now = new Date().toISOString()
  const updatedCard = await cardRepo.updateCard(task.card_id, {
    mastery: newMastery,
    probability_weight: newWeight,
    review_count: card.review_count + 1,
    last_review: now,
    next_review_date: suggestNextReviewDate(card.difficulty, newMastery),
  })

  // Mark task complete
  const updatedTask = await reviewRepo.completeReviewTask(taskId, newMastery)

  // Write review log
  await reviewRepo.createReviewLog({
    card_id: task.card_id,
    mastery_before: card.mastery,
    mastery_after: newMastery,
    notes: notes || '',
    review_duration_seconds: durationSeconds,
  })

  // Recalculate review priority
  const newPriority = calcReviewPriority({
    difficulty: updatedCard.difficulty,
    frequency: updatedCard.frequency,
    mastery: updatedCard.mastery,
    days_since_last_review: 0, // just reviewed
    manual_boost: updatedCard.manual_boost,
  })

  await cardRepo.updateCard(task.card_id, {
    review_priority: newPriority.review_priority,
  })

  return { task: updatedTask, card: updatedCard }
}

// ---- Priority Recalculation ----

export async function recalculateAllPriorities(): Promise<number> {
  const cards = await cardRepo.listCards({ limit: 1000 })
  let updated = 0

  for (const card of cards) {
    const priority = calcReviewPriority({
      difficulty: card.difficulty,
      frequency: card.frequency,
      mastery: card.mastery,
      days_since_last_review: daysSince(card.last_review),
      manual_boost: card.manual_boost,
    })

    const weight = calcWeight(card)

    await cardRepo.updateCard(card.id, {
      probability_weight: weight,
      review_priority: priority.review_priority,
    })

    updated++
  }

  return updated
}

// ---- Stats ----

export async function getReviewStats() {
  const cards = await cardRepo.listCards({ limit: 1000 })
  const todayStr = new Date().toISOString().split('T')[0]
  const todayTasks = await reviewRepo.getReviewTasks({ scheduledDate: todayStr })

  const totalCards = cards.length
  const avgMastery =
    totalCards > 0
      ? parseFloat(
          (cards.reduce((sum, c) => sum + c.mastery, 0) / totalCards).toFixed(3)
        )
      : 0
  const todayTotal = todayTasks.length
  const todayCompleted = todayTasks.filter((t) => t.completed).length

  return {
    totalCards,
    avgMastery,
    todayTotal,
    todayCompleted,
  }
}

// ---- Helpers ----

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 30 // default: treat as 30 days ago
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function suggestNextReviewDate(difficulty: string, mastery: number): string {
  // Higher mastery → longer interval; harder difficulty → shorter interval
  const baseDays = mastery > 0.8 ? 7 : mastery > 0.5 ? 3 : 1
  const diffMultiplier = difficulty === '高级' ? 0.7 : difficulty === '中级' ? 1.0 : 1.5
  const days = Math.max(1, Math.round(baseDays * diffMultiplier))
  const next = new Date()
  next.setDate(next.getDate() + days)
  return next.toISOString().split('T')[0]
}

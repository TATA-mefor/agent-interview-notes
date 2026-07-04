import type { Card } from '@/lib/types'

export type TodoPhase = 'preview' | 'study' | 'review'

export interface PhaseGroups {
  preview: Card[]
  study: Card[]
  review: Card[]
}

/**
 * 把卡片按学习阶段分成三组：
 * - preview: 从未学习过的新卡片（review_count = 0）
 * - study: 已经学过，但还没到复习日期
 * - review: 今天需要复习的卡片
 */
export function classifyCardsByPhase(cards: Card[], todayStr?: string): PhaseGroups {
  const today = todayStr ?? new Date().toISOString().split('T')[0]

  const groups: PhaseGroups = {
    preview: [],
    study: [],
    review: [],
  }

  for (const card of cards) {
    if (card.review_count === 0) {
      groups.preview.push(card)
    } else if (card.next_review_date && card.next_review_date <= today) {
      groups.review.push(card)
    } else {
      groups.study.push(card)
    }
  }

  return groups
}

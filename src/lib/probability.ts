import { Card, ReviewFormulaParams, ReviewFormulaResult } from './types'

const DIFFICULTY_COEFF: Record<string, number> = { '初级': 0.8, '中级': 1.0, '高级': 1.2 }
const FREQUENCY_COEFF: Record<string, number> = { '高频': 1.0, '中频': 0.7, '低频': 0.4 }

/**
 * Calculate base probability weight.
 * Formula: difficulty_factor × frequency_factor × (1 - mastery)
 */
export function calcWeight(card: Pick<Card, 'difficulty' | 'frequency' | 'mastery'>): number {
  const d = DIFFICULTY_COEFF[card.difficulty] ?? 1.0
  const f = FREQUENCY_COEFF[card.frequency] ?? 0.7
  return parseFloat((d * f * (1 - card.mastery)).toFixed(4))
}

/**
 * Calculate forgetting factor based on days since last review.
 * Uses a simplified Ebbinghaus forgetting curve:
 *   forgetting = 1 - e^(-days / 7)
 * After 7 days without review, forgetting is ~63%.
 */
export function calcForgettingFactor(daysSinceLastReview: number): number {
  if (daysSinceLastReview <= 0) return 0.0
  const factor = 1 - Math.exp(-daysSinceLastReview / 7)
  return parseFloat(factor.toFixed(4))
}

/**
 * Calculate full review priority.
 * Formula:
 *   review_priority = base_weight × 0.7 + forgetting_factor × 0.2 + manual_boost × 0.1
 */
export function calcReviewPriority(params: ReviewFormulaParams): ReviewFormulaResult {
  const base_weight = calcWeight({
    difficulty: params.difficulty,
    frequency: params.frequency,
    mastery: params.mastery,
  })

  const forgetting_factor = calcForgettingFactor(params.days_since_last_review)

  const review_priority = parseFloat(
    (
      base_weight * 0.7 +
      forgetting_factor * 0.2 +
      params.manual_boost * 0.1
    ).toFixed(4)
  )

  return { base_weight, forgetting_factor, review_priority }
}

/**
 * Calculate mastery update after a review.
 * A correct review increases mastery; an incorrect one decreases it.
 * Uses a simple weighted update with diminishing returns at high mastery.
 */
export function calcNewMastery(
  currentMastery: number,
  isCorrect: boolean,
  difficulty: string
): number {
  const diffFactor = DIFFICULTY_COEFF[difficulty] ?? 1.0
  // Gain is larger for harder questions and lower current mastery
  const gain = isCorrect
    ? 0.15 * diffFactor * (1 - currentMastery)
    : -0.1 * diffFactor * currentMastery

  const newMastery = Math.max(0, Math.min(1, currentMastery + gain))
  return parseFloat(newMastery.toFixed(3))
}

export { DIFFICULTY_COEFF, FREQUENCY_COEFF }

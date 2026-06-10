// ============================================================
// Confidence Scorer — assign confidence to each extracted Q&A candidate
// ============================================================

import type { ExtractedQaCandidate } from './types'

interface ConfidenceInput {
  matchType: string         // 'qa_marker' | 'heading' | 'numbered' | 'question_mark' | 'bullet' | 'llm'
  hasExplicitAnswer: boolean
  hasExplicitMarker: boolean
  answerLength: number
  questionLength: number
  isMultiParagraph: boolean
  topicConfidence: number   // 0-1 from topicClassifier
  answerStatus: string
}

/**
 * Score a single candidate's confidence (0-1).
 */
export function scoreConfidence(input: ConfidenceInput): number {
  let score = 0.5 // baseline

  // Match type base score
  switch (input.matchType) {
    case 'qa_marker':
      score = input.hasExplicitAnswer ? 0.95 : 0.90
      break
    case 'heading':
      score = 0.90
      break
    case 'numbered':
      score = input.hasExplicitAnswer ? 0.85 : 0.80
      break
    case 'question_mark':
      score = 0.75
      break
    case 'bullet':
      score = 0.70
      break
    case 'llm':
      score = 0.70
      break
    default:
      score = 0.50
  }

  // Boost for explicit answer markers
  if (input.hasExplicitMarker) {
    score = Math.max(score, 0.93)
  }

  // Boost for multi-paragraph (suggests a real answer, not just a fragment)
  if (input.isMultiParagraph && input.answerLength > 200) {
    score = Math.min(score + 0.03, 0.97)
  }

  // Penalize short answers
  if (input.answerStatus === 'present' && input.answerLength < 50) {
    score -= 0.10
  }
  if (input.answerStatus === 'partial') {
    score -= 0.15
  }
  if (input.answerStatus === 'missing') {
    score = Math.min(score, 0.70)
  }

  // Penalize very short questions (likely noise)
  if (input.questionLength < 10) {
    score -= 0.10
  }

  // Penalize very long questions (likely not a real question)
  if (input.questionLength > 250) {
    score -= 0.10
  }

  // Topic classification uncertainty
  if (input.topicConfidence < 0.5) {
    score -= 0.05
  }

  return Math.min(0.99, Math.max(0.30, parseFloat(score.toFixed(2))))
}

/**
 * Get the recommended import action based on confidence.
 */
export function getConfidenceTier(confidence: number): 'auto_select' | 'show' | 'low_priority' {
  if (confidence >= 0.80) return 'auto_select'
  if (confidence >= 0.60) return 'show'
  return 'low_priority'
}

/**
 * Apply confidence to all candidates in a batch.
 */
export function applyConfidenceScores(
  candidates: ExtractedQaCandidate[],
  topicConfidences: Map<string, number>
): ExtractedQaCandidate[] {
  return candidates.map(c => {
    const tc = topicConfidences.get(c.id) || 0.5
    const conf = scoreConfidence({
      matchType: c.extractionMethod === 'llm' ? 'llm' :
        c.confidence >= 0.9 ? 'qa_marker' :
        c.confidence >= 0.8 ? 'numbered' : 'question_mark',
      hasExplicitAnswer: c.answerStatus === 'present',
      hasExplicitMarker: c.confidence >= 0.9,
      answerLength: c.answer?.length || 0,
      questionLength: c.question?.length || 0,
      isMultiParagraph: (c.answer?.split(/\n\n+/) || []).length > 1,
      topicConfidence: tc,
      answerStatus: c.answerStatus,
    })
    return { ...c, confidence: conf }
  })
}

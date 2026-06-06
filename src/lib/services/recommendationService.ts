/**
 * Recommendation Service — Hybrid card recommendation.
 *
 * Combines:
 *   1. Tag similarity (fast, always available)
 *   2. LLM judgment (accurate, requires API key)
 *   3. Future: vector similarity (requires embeddings)
 */

import type { Card } from '@/lib/types'

export interface RecommendationResult {
  card: Card
  relationType: string
  reason: string
  score: number
  source: 'tag' | 'llm' | 'hybrid'
}

/**
 * Tag-based recommendation — always works offline.
 */
export function recommendByTags(
  source: Card,
  allCards: Card[],
  limit: number = 5
): RecommendationResult[] {
  const sourceTags = new Set(source.tags || [])
  if (sourceTags.size === 0) return []

  const scored = allCards
    .filter((c) => c.id !== source.id)
    .map((card) => {
      const cardTags = card.tags || []
      const overlap = cardTags.filter((t) => sourceTags.has(t)).length
      const union = new Set([...sourceTags, ...cardTags]).size
      const score = union > 0 ? overlap / union : 0 // Jaccard similarity

      return {
        card,
        relationType: score > 0.7 ? 'same_topic' : 'related',
        reason: `标签重合: ${cardTags.filter((t) => sourceTags.has(t)).join(', ')}`,
        score,
        source: 'tag' as const,
      }
    })
    .filter((r) => r.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

/**
 * Hybrid recommendation: tags + LLM (if available).
 */
export async function recommendCards(
  source: Card,
  allCards: Card[],
  limit: number = 5
): Promise<RecommendationResult[]> {
  // 1. Always run tag-based (fast, offline-safe)
  const tagResults = recommendByTags(source, allCards, limit * 2)

  // 2. Try LLM-based refinement if configured
  if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || process.env.ZHIPU_API_KEY) {
    try {
      const { runRelatedQuestionAgent } = await import('@/lib/agents/relatedQuestionAgent')
      const llmOutput = await runRelatedQuestionAgent(
        source,
        tagResults.map((r) => ({
          id: r.card.id,
          topic: r.card.topic,
          question: r.card.question,
          tags: r.card.tags,
        }))
      )

      // Merge LLM results with tag results
      const llmMap = new Map(llmOutput.recommendations.map((r) => [r.card_id, r]))
      const merged = tagResults.map((r) => {
        const llm = llmMap.get(r.card.id)
        if (llm) {
          return {
            ...r,
            relationType: llm.relation_type,
            reason: llm.reason,
            score: (r.score + llm.score) / 2,
            source: 'hybrid' as const,
          }
        }
        return r
      })

      return merged.sort((a, b) => b.score - a.score).slice(0, limit)
    } catch {
      // LLM not available — fall through to tag-only
    }
  }

  return tagResults.slice(0, limit)
}

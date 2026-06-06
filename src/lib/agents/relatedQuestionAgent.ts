/**
 * RelatedQuestionAgent — LLM-powered related question finder.
 * Identifies prerequisite, comparison, follow-up, and same-topic relationships.
 */

import { callLLMStructured } from '@/lib/llm'
import type { Card } from '@/lib/types'

interface RelatedRecommendation {
  relation_type: 'prerequisite' | 'compare' | 'follow_up' | 'same_topic' | 'related'
  reason: string
  score: number // 0-1
}

interface RelatedOutput {
  recommendations: Array<{
    card_id: string
    relation_type: string
    reason: string
    score: number
  }>
}

const SYSTEM_PROMPT = `You are an expert Agent Engineering interview coach.
Given a card and a list of candidate cards, identify which ones are related and how.

Relationship types:
- prerequisite: the candidate card is foundational knowledge needed before understanding the source card
- compare: the two cards cover opposing or contrasting concepts worth comparing
- follow_up: the candidate is a natural follow-up question after the source
- same_topic: both cards belong to the same sub-topic
- related: general connection

Return a JSON object:
{
  "recommendations": [
    { "card_id": "...", "relation_type": "...", "reason": "中文理由", "score": 0.85 }
  ]
}

Only include cards that are genuinely related (score >= 0.6).
Provide reasons in Chinese.`

function buildPrompt(source: Card, candidates: Array<{ id: string; topic: string; question: string; tags: string[] }>): string {
  const candidateList = candidates
    .map((c) => `- [${c.id}] (${c.topic}) ${c.question} | tags: ${c.tags?.join(', ') || ''}`)
    .join('\n')

  return `源卡片:
主题: ${source.topic}
题目: ${source.question}
标签: ${source.tags?.join(', ') || '无'}
难度: ${source.difficulty}

候选卡片列表 (${candidates.length} 张):
${candidateList}

请找出与源卡片相关的候选卡片，说明关系类型和理由。`
}

export async function runRelatedQuestionAgent(
  source: Card,
  candidates: Array<{ id: string; topic: string; question: string; tags: string[] }>
): Promise<RelatedOutput> {
  if (candidates.length === 0) return { recommendations: [] }

  const prompt = buildPrompt(source, candidates)

  const output = await callLLMStructured<RelatedOutput>(prompt, SYSTEM_PROMPT, {
    temperature: 0.3,
    maxTokens: 2000,
  })

  // Validate
  return {
    recommendations: (output.recommendations || [])
      .filter((r) => r.score >= 0.6)
      .map((r) => ({
        card_id: r.card_id,
        relation_type: r.relation_type || 'related',
        reason: r.reason || '',
        score: r.score || 0.7,
      })),
  }
}

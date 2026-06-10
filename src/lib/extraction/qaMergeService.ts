// ============================================================
// QA Merge Service — merge rule-based and LLM extraction results
// ============================================================

import { normalizeQuestion, generateQuestionHash } from './qaDedupService'
import type { ExtractedQaCandidate } from './types'

/**
 * Merge two candidate lists, keeping the higher-confidence version of each question.
 * Rule-based results take priority over LLM at equal confidence (they're more reliable).
 */
export function mergeResults(
  ruleCandidates: ExtractedQaCandidate[],
  llmCandidates: ExtractedQaCandidate[]
): ExtractedQaCandidate[] {
  const map = new Map<string, ExtractedQaCandidate>()

  // Add rule results first (higher priority at equal confidence)
  for (const c of ruleCandidates) {
    map.set(c.id, c)
  }

  // Add LLM results — only if not already found by rules, or LLM is more confident
  for (const c of llmCandidates) {
    const existing = map.get(c.id)
    if (!existing) {
      // New question found by LLM — mark as hybrid if there's any rule result for same topic
      map.set(c.id, { ...c, extractionMethod: 'llm' })
    } else if (c.confidence > existing.confidence + 0.1) {
      // LLM significantly more confident — use LLM version but keep rule extraction data
      map.set(c.id, {
        ...c,
        extractionMethod: 'hybrid' as const,
        startOffset: existing.startOffset ?? c.startOffset,
        endOffset: existing.endOffset ?? c.endOffset,
        evidenceText: existing.evidenceText || c.evidenceText,
      })
    }
    // Otherwise keep rule version (more reliable source)
  }

  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence)
}

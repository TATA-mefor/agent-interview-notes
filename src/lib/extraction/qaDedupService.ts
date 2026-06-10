// ============================================================
// QA Dedup Service — question normalization and hash-based dedup
// ============================================================

import { createHash } from 'crypto'

/**
 * Normalize a question string for dedup comparison.
 * Strips numbering, punctuation variance, whitespace differences.
 */
export function normalizeQuestion(q: string): string {
  let normalized = q.trim()

  // Remove leading numbering
  normalized = normalized.replace(/^[\d]+[\.\、\)]\s*/, '')
  normalized = normalized.replace(/^[（(]\s*\d+\s*[）)]\s*/, '')
  normalized = normalized.replace(/^(Q|Question|问题|题目|问)\s*\d*\s*[:：]?\s*/i, '')

  // Remove Markdown heading markers
  normalized = normalized.replace(/^#{1,4}\s+/, '')

  // Remove bullet markers
  normalized = normalized.replace(/^[-*+]\s+/, '')

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Normalize Chinese/English punctuation to a canonical form
  normalized = normalized
    .replace(/[？?]/g, '?')
    .replace(/[！!]/g, '!')
    .replace(/[：:]/g, ':')
    .replace(/[，,]/g, ',')
    .replace(/[。.]/g, '.')
    .replace(/[；;]/g, ';')
    .replace(/[（）]/g, (m) => m === '（' ? '(' : ')')
    .replace(/[「」""]/g, '"')
    .replace(/[『』'']/g, "'")

  // Lowercase English parts only (preserve Chinese)
  normalized = normalized.replace(/[A-Z]+/g, (m) => m.toLowerCase())

  return normalized.trim()
}

/**
 * Generate SHA256 hash for a normalized question.
 */
export function generateQuestionHash(question: string, topic?: string): string {
  const input = topic ? `${topic}:${question}` : question
  return createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 16)
}

/**
 * Calculate text similarity between two strings (0-1).
 * Uses character trigram Jaccard — fast, language-agnostic,
 * works well for Chinese where word boundaries are ambiguous.
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const na = normalizeQuestion(a)
  const nb = normalizeQuestion(b)

  if (na === nb) return 1.0
  if (!na || !nb) return 0

  // Substring containment = high similarity
  if (na.length > 10 && nb.length > 10) {
    if (na.includes(nb) || nb.includes(na)) return 0.95
  }

  // Character trigram Jaccard similarity
  const trigramsA = extractTrigrams(na)
  const trigramsB = extractTrigrams(nb)

  if (trigramsA.size === 0 && trigramsB.size === 0) return 0
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0

  const intersection = new Set([...trigramsA].filter(t => trigramsB.has(t)))
  const union = new Set([...trigramsA, ...trigramsB])

  const jaccardScore = intersection.size / union.size

  // Blend with length ratio penalty
  const lenRatio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length)

  return parseFloat(((jaccardScore * 0.7 + lenRatio * 0.3)).toFixed(3))
}

/**
 * Extract character trigrams from text.
 * For Chinese, each character is a unit. For English, use 3-char sliding window.
 */
function extractTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>()
  const chars = [...text] // Unicode-aware split

  for (let i = 0; i <= chars.length - 3; i++) {
    trigrams.add(chars.slice(i, i + 3).join(''))
  }

  // Also include bigrams for shorter texts
  if (chars.length < 6) {
    for (let i = 0; i <= chars.length - 2; i++) {
      trigrams.add(chars.slice(i, i + 2).join(''))
    }
  }

  return trigrams
}

/**
 * Edit distance (Levenshtein) — fallback for short text comparison.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }

  return dp[m][n]
}

/**
 * Levenshtein-based similarity (0-1).
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const dist = levenshteinDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  return parseFloat((1 - dist / maxLen).toFixed(3))
}

/**
 * Combined similarity: Jaccard trigrams + Levenshtein, take the max.
 */
export function combinedSimilarity(a: string, b: string): number {
  const jaccard = calculateTextSimilarity(a, b)
  const levenshtein = levenshteinSimilarity(a, b)
  return Math.max(jaccard, levenshtein)
}

/**
 * Check if two questions are likely duplicates above a similarity threshold.
 */
export function areQuestionsDuplicate(a: string, b: string, threshold = 0.80): boolean {
  return combinedSimilarity(a, b) >= threshold
}

/**
 * Find duplicate candidates among existing cards.
 * Returns matches above the similarity threshold with scores.
 */
export function findSimilarCards(
  question: string,
  existingCards: Array<{ id: string; question: string; question_hash?: string | null }>,
  threshold = 0.80
): Array<{ cardId: string; similarity: number; existingQuestion: string }> {
  const matches: Array<{ cardId: string; similarity: number; existingQuestion: string }> = []

  for (const card of existingCards) {
    const sim = combinedSimilarity(question, card.question)
    if (sim >= threshold) {
      matches.push({
        cardId: card.id,
        similarity: sim,
        existingQuestion: card.question,
      })
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity)
}

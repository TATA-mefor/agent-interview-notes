/**
 * Hybrid RAG retriever.
 *
 * Combines:
 *   - Vector search (cosine similarity via pgvector)
 *   - Keyword search (PostgreSQL full-text or ILIKE)
 *   - Hybrid merge (weighted combination)
 */

import { db } from '@/lib/db/client'
import { generateEmbedding } from './embedder'

export interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  score: number
  source: 'vector' | 'keyword' | 'hybrid'
  metadata: Record<string, unknown>
}

export interface SearchOptions {
  limit?: number
  vectorWeight?: number    // 0-1, default 0.7
  keywordWeight?: number   // 0-1, default 0.3
  matchThreshold?: number  // min similarity, default 0.3
}

/**
 * Hybrid search: vector + keyword.
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 5,
    vectorWeight = 0.7,
    keywordWeight = 0.3,
    matchThreshold = 0.3,
  } = options

  // Run vector and keyword searches in parallel
  const [vectorResults, keywordResults] = await Promise.allSettled([
    vectorSearch(query, limit * 2, matchThreshold),
    keywordSearch(query, limit * 2),
  ])

  const vectors = vectorResults.status === 'fulfilled' ? vectorResults.value : []
  const keywords = keywordResults.status === 'fulfilled' ? keywordResults.value : []

  // Merge with weighted scores
  const merged = mergeResults(vectors, keywords, vectorWeight, keywordWeight)

  // Dedup by chunkId and sort
  const seen = new Set<string>()
  const deduped = merged.filter((r) => {
    if (seen.has(r.chunkId)) return false
    seen.add(r.chunkId)
    return r.score >= matchThreshold
  })

  return deduped.sort((a, b) => b.score - a.score).slice(0, limit)
}

// ---- Vector Search ----
async function vectorSearch(
  query: string,
  limit: number,
  threshold: number
): Promise<SearchResult[]> {
  try {
    const embedding = await generateEmbedding(query)

    // Try to use RPC function (if created in DB)
    try {
      const { data, error } = await db.rpc('search_chunks', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit,
      })

      if (!error && data) {
        return (data as Array<Record<string, unknown>>).map(mapRpcResult)
      }
    } catch {
      // RPC not available — fall back to in-memory calculation
    }

    // Fallback: fetch all chunks and compute similarity in memory
    const { data: chunks } = await db
      .from('knowledge_chunks')
      .select('id, document_id, content, embedding, metadata')
      .limit(500)

    if (!chunks) return []

    const results = (chunks as Array<Record<string, unknown>>)
      .map((chunk) => {
        const chunkEmbedding = chunk.embedding as number[] | null
        if (!chunkEmbedding || chunkEmbedding.length === 0) return null
        const similarity = cosineSimilarity(embedding, chunkEmbedding)
        if (similarity < threshold) return null
        return {
          chunkId: chunk.id as string,
          documentId: chunk.document_id as string,
          documentTitle: '',
          content: chunk.content as string,
          score: similarity,
          source: 'vector' as const,
          metadata: (chunk.metadata as Record<string, unknown>) || {},
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit)

    return results as SearchResult[]
  } catch (err) {
    console.error('Vector search failed:', err)
    return []
  }
}

// ---- Keyword Search ----
async function keywordSearch(
  query: string,
  limit: number
): Promise<SearchResult[]> {
  try {
    const { data, error } = await db
      .from('knowledge_chunks')
      .select('id, document_id, content, metadata')
      .ilike('content', `%${query}%`)
      .limit(limit)

    if (error || !data) return []

    // Simple TF-based scoring: count occurrences / length
    const queryLower = query.toLowerCase()
    return (data as Array<Record<string, unknown>>).map((chunk) => {
      const content = (chunk.content as string) || ''
      const contentLower = content.toLowerCase()
      const occurrences = contentLower.split(queryLower).length - 1
      const score = Math.min(1, (occurrences * query.length) / Math.max(1, content.length))

      return {
        chunkId: chunk.id as string,
        documentId: chunk.document_id as string,
        documentTitle: '',
        content,
        score,
        source: 'keyword' as const,
        metadata: (chunk.metadata as Record<string, unknown>) || {},
      }
    })
  } catch {
    return []
  }
}

// ---- Merge ----
function mergeResults(
  vectors: SearchResult[],
  keywords: SearchResult[],
  vw: number,
  kw: number
): SearchResult[] {
  const map = new Map<string, SearchResult>()

  for (const r of vectors) {
    map.set(r.chunkId, { ...r, score: r.score * vw, source: 'hybrid' })
  }

  for (const r of keywords) {
    const existing = map.get(r.chunkId)
    if (existing) {
      existing.score += r.score * kw
    } else {
      map.set(r.chunkId, { ...r, score: r.score * kw })
    }
  }

  return Array.from(map.values())
}

// ---- Helpers ----

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function mapRpcResult(row: Record<string, unknown>): SearchResult {
  return {
    chunkId: row.id as string,
    documentId: row.document_id as string,
    documentTitle: (row.document_title as string) || '',
    content: row.content as string,
    score: (row.similarity as number) || 0,
    source: 'vector',
    metadata: (row.metadata as Record<string, unknown>) || {},
  }
}

/**
 * Retrieve context for a card understanding query.
 * Returns formatted context string to inject into LLM prompt.
 */
export async function retrieveCardContext(
  question: string,
  limit: number = 3
): Promise<string> {
  const results = await search(question, { limit, matchThreshold: 0.3 })

  if (results.length === 0) return ''

  return results
    .map(
      (r, i) =>
        `[参考 ${i + 1}] (相关度: ${r.score.toFixed(2)})\n${r.content.slice(0, 1000)}`
    )
    .join('\n\n---\n\n')
}

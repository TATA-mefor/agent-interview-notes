/**
 * Hybrid RAG retriever — complete retrieval pipeline.
 *
 * Online Q&A chain:
 *   User Query → Query Rewrite (optional) → Vector + BM25 Hybrid →
 *   Weighted Merge → Dedup → [Rerank] → Formatted Context
 *
 * Offline indexing (see chunker.ts + embedder.ts + knowledge API).
 */

import { db } from '@/lib/db/client'
import { generateEmbedding } from './embedder'
import type { SourceReference } from '@/lib/types'

// ============================================================
// Types
// ============================================================

export interface SearchResult {
  chunkId: string
  documentId: string
  documentTitle: string
  content: string
  score: number
  vectorScore?: number
  keywordScore?: number
  source: 'vector' | 'keyword' | 'hybrid'
  metadata: Record<string, unknown>
}

export interface SearchOptions {
  limit?: number
  vectorWeight?: number
  keywordWeight?: number
  matchThreshold?: number
  useRewrite?: boolean       // enable query rewriting
  rewriteLlm?: 'llm' | 'none' // how to rewrite
}

// ============================================================
// Main search entry point
// ============================================================

/**
 * Hybrid search: vector (cosine via pgvector) + BM25 (tsvector/tsquery).
 * Falls back gracefully when RPC or DB is unavailable.
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
    useRewrite = false,
  } = options

  // Step 0: Optional query rewriting
  let searchQuery = query
  if (useRewrite) {
    try {
      searchQuery = await rewriteQuery(query)
    } catch {
      // Fall back to original query
    }
  }

  // Step 1: Try database-side hybrid search (single RPC call)
  try {
    const embedding = await generateEmbedding(searchQuery)
    const { data, error } = await db.rpc('search_chunks_hybrid', {
      query_embedding: embedding,
      query_text: searchQuery,
      vector_weight: vectorWeight,
      keyword_weight: keywordWeight,
      match_threshold: matchThreshold,
      match_count: limit * 2, // fetch more for dedup margin
    })

    if (!error && data) {
      const results = (data as Array<Record<string, unknown>>).map(mapHybridResult)
      const deduped = dedupAndSort(results, matchThreshold).slice(0, limit)
      if (deduped.length > 0) return deduped
    }
  } catch {
    // RPC unavailable — fall through to client-side merge
  }

  // Step 2: Fallback — run vector + keyword separately and merge client-side
  const [vectorResults, keywordResults] = await Promise.allSettled([
    vectorSearchFallback(searchQuery, limit * 2, matchThreshold),
    bm25Search(searchQuery, limit * 2),
  ])

  const vectors = vectorResults.status === 'fulfilled' ? vectorResults.value : []
  const keywords = keywordResults.status === 'fulfilled' ? keywordResults.value : []

  const merged = mergeResults(vectors, keywords, vectorWeight, keywordWeight)
  return dedupAndSort(merged, matchThreshold).slice(0, limit)
}

// ============================================================
// Query Rewriting (LLM-based)
// ============================================================

const REWRITE_PROMPT = `You are a search query optimizer. Rewrite the user's question into a concise, keyword-rich search query optimized for BM25 + vector retrieval in a Chinese knowledge base.

Rules:
- Expand abbreviations and colloquialisms into formal technical terms
- Keep it concise (1 sentence max)
- Output ONLY the rewritten query, no explanation

User question: `

async function rewriteQuery(query: string): Promise<string> {
  try {
    const { callLLM } = await import('@/lib/llm')
    const rewritten = await callLLM(
      REWRITE_PROMPT + query,
      'You are a search query optimizer. Output only the rewritten query.',
      { temperature: 0.1, maxTokens: 200 }
    )
    return rewritten?.trim() || query
  } catch {
    return query
  }
}

// ============================================================
// Vector search fallback (when RPC unavailable)
// ============================================================

async function vectorSearchFallback(
  query: string,
  limit: number,
  threshold: number
): Promise<SearchResult[]> {
  try {
    const embedding = await generateEmbedding(query)

    // Fetch chunks with embeddings — use a reasonable page size
    const { data: chunks } = await db
      .from('knowledge_chunks')
      .select('id, document_id, content, embedding, metadata')
      .not('embedding', 'is', null)
      .limit(1000)

    if (!chunks || !Array.isArray(chunks)) return []

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
          vectorScore: similarity,
          keywordScore: 0,
          source: 'vector' as const,
          metadata: (chunk.metadata as Record<string, unknown>) || {},
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit)

    // Enrich with document titles
    return await enrichWithDocTitles(results as SearchResult[])
  } catch (err) {
    console.error('Vector search fallback failed:', err)
    return []
  }
}

// ============================================================
// BM25-style keyword search (PostgreSQL tsvector/tsquery)
// ============================================================

async function bm25Search(
  query: string,
  limit: number
): Promise<SearchResult[]> {
  try {
    // Use PostgreSQL full-text search with ts_rank (BM25-like relevance)
    const { data, error } = await db
      .from('knowledge_chunks')
      .select('id, document_id, content, metadata, fts')
      .textSearch('fts', query, {
        type: 'websearch',
        config: 'simple',
      })
      .limit(limit)

    if (error || !data) return []

    // Get ts_rank scores via a separate query if textSearch doesn't return scores
    // For simplicity, use occurrence count as fallback score
    const queryLower = query.toLowerCase()
    const results = (data as Array<Record<string, unknown>>).map((chunk) => {
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
        vectorScore: 0,
        keywordScore: score,
        source: 'keyword' as const,
        metadata: (chunk.metadata as Record<string, unknown>) || {},
      }
    })

    return await enrichWithDocTitles(results)
  } catch (err) {
    console.error('BM25 search failed:', err)
    return []
  }
}

// ============================================================
// Client-side merge (fallback)
// ============================================================

function mergeResults(
  vectors: SearchResult[],
  keywords: SearchResult[],
  vw: number,
  kw: number
): SearchResult[] {
  const map = new Map<string, SearchResult>()

  for (const r of vectors) {
    map.set(r.chunkId, {
      ...r,
      score: r.score * vw,
      vectorScore: r.score,
      keywordScore: 0,
      source: 'hybrid' as const,
    })
  }

  for (const r of keywords) {
    const existing = map.get(r.chunkId)
    if (existing) {
      existing.score += r.score * kw
      existing.keywordScore = r.score
      existing.source = 'hybrid'
    } else {
      map.set(r.chunkId, {
        ...r,
        score: r.score * kw,
        vectorScore: 0,
        keywordScore: r.score,
        source: 'keyword' as const,
      })
    }
  }

  return Array.from(map.values())
}

// ============================================================
// Enrich results with document titles
// ============================================================

async function enrichWithDocTitles(results: SearchResult[]): Promise<SearchResult[]> {
  if (results.length === 0) return results

  const docIds = [...new Set(results.map(r => r.documentId).filter(Boolean))]
  if (docIds.length === 0) return results

  try {
    const { data: docs } = await db
      .from('knowledge_documents')
      .select('id, title')
      .in('id', docIds)

    if (docs && Array.isArray(docs)) {
      const titleMap = new Map(
        (docs as Array<{ id: string; title: string }>).map(d => [d.id, d.title])
      )
      for (const r of results) {
        if (!r.documentTitle && r.documentId) {
          r.documentTitle = titleMap.get(r.documentId) || ''
        }
      }
    }
  } catch {
    // Non-critical — titles just won't be enriched
  }

  return results
}

// ============================================================
// Dedup & Sort helpers
// ============================================================

function dedupAndSort(results: SearchResult[], threshold: number): SearchResult[] {
  const seen = new Set<string>()
  return results
    .filter((r) => {
      if (seen.has(r.chunkId)) return false
      seen.add(r.chunkId)
      return r.score >= threshold
    })
    .sort((a, b) => b.score - a.score)
}

// ============================================================
// Cosine similarity (client-side fallback)
// ============================================================

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

// ============================================================
// RPC result mappers
// ============================================================

function mapHybridResult(row: Record<string, unknown>): SearchResult {
  return {
    chunkId: row.id as string,
    documentId: row.document_id as string,
    documentTitle: (row.document_title as string) || '',
    content: row.content as string,
    score: (row.similarity as number) || 0,
    vectorScore: (row.vector_score as number) || 0,
    keywordScore: (row.keyword_score as number) || 0,
    source: (row.source as SearchResult['source']) || 'hybrid',
    metadata: (row.metadata as Record<string, unknown>) || {},
  }
}

// ============================================================
// LLM-based Reranker (lightweight alternative to Cross-Encoder)
// ============================================================

/**
 * Rerank search results using the LLM.
 * Sends candidate chunks to the LLM and asks it to score relevance to the query.
 * Only use when high precision matters — adds latency and cost.
 */
export async function rerankWithLLM(
  query: string,
  results: SearchResult[],
  topN: number = 5
): Promise<SearchResult[]> {
  if (results.length <= topN) return results

  try {
    const { callLLMStructured } = await import('@/lib/llm')

    const candidates = results.map((r, i) =>
      `[${i}] 文档: ${r.documentTitle || '未知'}\n内容: ${r.content.slice(0, 500)}`
    ).join('\n\n')

    const prompt = `请评估以下文档块与查询的相关性。为每个块打分（0-1），返回 top ${topN} 个最相关的块索引。

查询: ${query}

候选文档块:
${candidates}

返回 JSON: { "ranked_indices": [3, 1, 5, ...] }`

    const output = await callLLMStructured<{ ranked_indices: number[] }>(
      prompt,
      'You are a relevance judge. Score each document chunk for relevance to the query. Return ONLY JSON.',
      { temperature: 0.1, maxTokens: 500 }
    )

    if (output.ranked_indices && Array.isArray(output.ranked_indices)) {
      const indexSet = new Set(output.ranked_indices.slice(0, topN))
      return results.filter((_, i) => indexSet.has(i)).slice(0, topN)
    }
  } catch {
    // Reranking unavailable — fall back to original order
  }

  return results.slice(0, topN)
}

// ============================================================
// High-level: Retrieve formatted context for LLM injection
// ============================================================

export interface RetrievedContext {
  /** Formatted context string ready for prompt injection */
  text: string
  /** Structured source references for citation */
  sources: SourceReference[]
}

/**
 * Retrieve context for LLM prompt injection.
 * Returns both formatted text AND structured source info for citations.
 */
export async function retrieveCardContext(
  question: string,
  limit: number = 3
): Promise<RetrievedContext> {
  const results = await search(question, { limit, matchThreshold: 0.3, useRewrite: true })

  if (results.length === 0) {
    return { text: '', sources: [] }
  }

  const sources: SourceReference[] = results.map((r) => ({
    chunkId: r.chunkId,
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    breadcrumb: (r.metadata?.breadcrumb as string) || '',
    score: r.score,
    source: r.source,
  }))

  const text = results
    .map(
      (r, i) => {
        const docLabel = r.documentTitle
          ? `[来源: ${r.documentTitle}${r.metadata?.breadcrumb ? ' > ' + r.metadata.breadcrumb : ''}]`
          : `[参考 ${i + 1}]`
        return `${docLabel} (相关度: ${r.score.toFixed(2)}, ${r.source})\n${r.content.slice(0, 1000)}`
      }
    )
    .join('\n\n---\n\n')

  return { text, sources }
}

// ============================================================
// Plain search (for API endpoints — returns raw results)
// ============================================================

export async function searchKnowledge(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  return search(query, { limit, useRewrite: true })
}

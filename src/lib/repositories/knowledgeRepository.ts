import { db } from '@/lib/db/client'
import type { KnowledgeDocument, KnowledgeDocumentInput, KnowledgeChunk } from '@/lib/types'

const DOC_TABLE = 'knowledge_documents'
const CHUNK_TABLE = 'knowledge_chunks'

// ---- Documents ----
export async function listDocuments(): Promise<KnowledgeDocument[]> {
  const { data, error } = await db
    .from(DOC_TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`listDocuments failed: ${error.message}`)
  return (data ?? []) as KnowledgeDocument[]
}

export async function getDocumentById(id: string): Promise<KnowledgeDocument | null> {
  const { data, error } = await db.from(DOC_TABLE).select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getDocumentById failed: ${error.message}`)
  }
  return data as KnowledgeDocument
}

export async function createDocument(input: KnowledgeDocumentInput): Promise<KnowledgeDocument> {
  const { data, error } = await db.from(DOC_TABLE).insert(input).select().single()
  if (error) throw new Error(`createDocument failed: ${error.message}`)
  return data as KnowledgeDocument
}

export async function updateDocumentStatus(
  id: string,
  status: KnowledgeDocument['status'],
  errorMessage?: string
): Promise<KnowledgeDocument> {
  const updates: Record<string, unknown> = { status }
  if (errorMessage !== undefined) updates.error_message = errorMessage

  const { data, error } = await db.from(DOC_TABLE).update(updates).eq('id', id).select().single()
  if (error) throw new Error(`updateDocumentStatus failed: ${error.message}`)
  return data as KnowledgeDocument
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await db.from(DOC_TABLE).delete().eq('id', id)
  if (error) throw new Error(`deleteDocument failed: ${error.message}`)
}

// ---- Chunks ----
export async function listChunks(documentId: string): Promise<KnowledgeChunk[]> {
  const { data, error } = await db
    .from(CHUNK_TABLE)
    .select('id, document_id, chunk_index, content, token_count, metadata, created_at')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })

  if (error) throw new Error(`listChunks failed: ${error.message}`)
  return (data ?? []) as KnowledgeChunk[]
}

export async function createChunk(chunk: {
  document_id: string
  chunk_index: number
  content: string
  embedding?: number[]
  token_count?: number
  metadata?: Record<string, unknown>
}): Promise<KnowledgeChunk> {
  const { data, error } = await db.from(CHUNK_TABLE).insert(chunk).select().single()
  if (error) throw new Error(`createChunk failed: ${error.message}`)
  return data as KnowledgeChunk
}

export async function createChunksBatch(
  chunks: Array<{
    document_id: string
    chunk_index: number
    content: string
    embedding?: number[]
    token_count?: number
    metadata?: Record<string, unknown>
  }>
): Promise<void> {
  if (chunks.length === 0) return
  // Insert in batches of 100 to avoid payload limits
  const batchSize = 100
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const { error } = await db.from(CHUNK_TABLE).insert(batch)
    if (error) throw new Error(`createChunksBatch failed at batch ${i}: ${error.message}`)
  }
}

export async function searchSimilarChunks(
  embedding: number[],
  limit: number = 5,
  matchThreshold: number = 0.7
): Promise<Array<KnowledgeChunk & { similarity: number }>> {
  const { data, error } = await db.rpc('search_chunks', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: limit,
  })

  if (error) throw new Error(`searchSimilarChunks failed: ${error.message}`)
  return (data ?? []) as Array<KnowledgeChunk & { similarity: number }>
}

export async function deleteChunksForDocument(documentId: string): Promise<void> {
  const { error } = await db.from(CHUNK_TABLE).delete().eq('document_id', documentId)
  if (error) throw new Error(`deleteChunksForDocument failed: ${error.message}`)
}

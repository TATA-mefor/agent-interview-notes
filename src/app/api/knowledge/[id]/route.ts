import { NextRequest, NextResponse } from 'next/server'
import * as knowledgeRepo from '@/lib/repositories/knowledgeRepository'
import { chunkText } from '@/lib/rag/chunker'
import { generateEmbeddings } from '@/lib/rag/embedder'
import { retrieveCardContext } from '@/lib/rag/retriever'

// GET /api/knowledge/[id] — Get document with chunks
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await knowledgeRepo.getDocumentById(params.id)
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const chunks = await knowledgeRepo.listChunks(params.id)
    return NextResponse.json({ data: { ...doc, chunks } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/knowledge/[id] — Delete document
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await knowledgeRepo.deleteDocument(params.id)
    return NextResponse.json({ data: { id: params.id, deleted: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/knowledge/[id]/process — Process document (chunk + embed)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await knowledgeRepo.getDocumentById(params.id)
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 1. Chunk
    const chunks = chunkText(doc.content, {
      strategy: doc.file_type === 'markdown' ? 'markdown' : 'paragraph',
    })

    await knowledgeRepo.deleteChunksForDocument(params.id)

    // 2. Generate embeddings (in batches of 10)
    const batchSize = 10
    let chunkIndex = 0

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      let embeddings: number[][]
      // Retry embedding up to 3 times
      for (let retry = 0; retry < 3; retry++) {
        try {
          embeddings = await generateEmbeddings(batch.map((c) => c.content))
          break
        } catch (e) {
          if (retry === 2) throw e
          await new Promise(r => setTimeout(r, 1000 * (retry + 1)))
        }
      }

      const chunkRecords = batch.map((c, j) => ({
        document_id: params.id,
        chunk_index: chunkIndex++,
        content: c.content,
        embedding: embeddings![j],
        token_count: c.tokenCount,
        metadata: c.metadata as Record<string, unknown>,
      }))

      await knowledgeRepo.createChunksBatch(chunkRecords)
    }

    // 3. Update status
    await knowledgeRepo.updateDocumentStatus(params.id, 'ready')

    return NextResponse.json({
      data: { documentId: params.id, chunkCount: chunks.length },
    })
  } catch (err) {
    await knowledgeRepo.updateDocumentStatus(
      params.id,
      'error',
      err instanceof Error ? err.message : 'Processing failed'
    )
    const message = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/knowledge/[id]/search — Search within a document
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { query } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }
    const context = await retrieveCardContext(query, 5)
    return NextResponse.json({ data: { context } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

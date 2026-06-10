/**
 * POST /api/knowledge/upload
 *
 * Full upload pipeline:
 *   File → Extract text → Create document → Chunk → Embed → Index → Ready
 *
 * Processing is synchronous — the response returns only after indexing completes.
 * This ensures the knowledge base is immediately searchable after upload.
 */
import { NextRequest, NextResponse } from 'next/server'
import { chunkText } from '@/lib/rag/chunker'
import { generateEmbeddings, getEmbedderConfig } from '@/lib/rag/embedder'
import { db } from '@/lib/db/client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    // ---- Step 1: Extract text ----
    const ext = file.name.split('.').pop()?.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let content: string
    let fileType: string

    if (ext === 'pdf') {
      const { extractPdfText } = await import('@/lib/importers/pdfImporter')
      content = await extractPdfText(buffer, 100)
      fileType = 'pdf'
    } else if (ext === 'docx' || ext === 'doc') {
      const { extractDocxText } = await import('@/lib/importers/wordImporter')
      content = await extractDocxText(buffer)
      fileType = 'markdown' // DOCX parsed as markdown for structured chunking
    } else if (ext === 'html' || ext === 'htm') {
      // Strip HTML tags for plain text extraction
      const html = await file.text()
      content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
      fileType = 'txt'
    } else {
      content = await file.text()
      fileType = ext === 'md' || ext === 'markdown' ? 'markdown'
        : ext === 'txt' ? 'txt'
        : 'other'
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '未能从文件中提取文本内容' }, { status: 400 })
    }

    // ---- Step 2: Create document ----
    const { data: doc, error: createErr } = await db
      .from('knowledge_documents')
      .insert({
        title: file.name.replace(/\.[^.]+$/, ''),
        content,
        file_type: fileType,
        source: file.name,
        status: 'processing',
      })
      .select()
      .single()

    if (createErr || !doc) {
      throw new Error(createErr?.message || '创建文档失败')
    }

    // ---- Step 3: Chunk ----
    const chunkStrategy = fileType === 'markdown' ? 'markdown' : 'paragraph'
    const chunks = chunkText(content, { strategy: chunkStrategy })

    // ---- Step 4: Embed in batches ----
    const embedConfig = getEmbedderConfig()
    const BATCH_SIZE = 10
    const MAX_EMBED_DIMS = 1536 // pgvector column width
    let chunkIndex = 0
    let totalTokens = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      let embeddings: number[][] = []

      try {
        embeddings = await generateEmbeddings(batch.map((c) => c.content))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(`Embedding 生成失败 (batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}): ${msg.slice(0, 200)}`)
      }

      if (embeddings.length !== batch.length) {
        throw new Error(`Embedding 数量不匹配: 期望 ${batch.length}, 实际 ${embeddings.length}`)
      }

      // Insert chunk batch — truncate embeddings to fit pgvector(1536)
      const chunkRecords = batch.map((c, j) => ({
        document_id: doc.id,
        chunk_index: chunkIndex++,
        content: c.content,
        embedding: embeddings[j].length > MAX_EMBED_DIMS
          ? embeddings[j].slice(0, MAX_EMBED_DIMS)
          : embeddings[j],
        token_count: c.tokenCount,
        metadata: c.metadata as Record<string, unknown>,
      }))

      await db.from('knowledge_chunks').insert(chunkRecords)
      totalTokens += batch.reduce((sum, c) => sum + c.tokenCount, 0)
    }

    // ---- Step 5: Update status to ready ----
    await db
      .from('knowledge_documents')
      .update({ status: 'ready', chunk_count: chunkIndex })
      .eq('id', doc.id)

    return NextResponse.json({
      data: {
        id: doc.id,
        title: doc.title,
        fileType,
        chunkCount: chunkIndex,
        tokenEstimate: totalTokens,
        status: 'ready',
        embedding: {
          provider: embedConfig.provider,
          model: embedConfig.model,
          dimensions: Math.min(embedConfig.dimensions, MAX_EMBED_DIMS),
        },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传处理失败'
    console.error('Knowledge upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

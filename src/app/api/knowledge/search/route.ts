/**
 * GET /api/knowledge/search?q=xxx&limit=10
 *
 * Global knowledge base search — hybrid retrieval across all documents.
 * Returns ranked results with document titles, chunk breadcrumbs, and scores.
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledge } from '@/lib/rag/retriever'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10', 10))

    if (!query || !query.trim()) {
      return NextResponse.json({ error: '缺少搜索关键词 (q)' }, { status: 400 })
    }

    const results = await searchKnowledge(query.trim(), limit)

    return NextResponse.json({
      data: {
        query,
        total: results.length,
        results: results.map((r) => ({
          chunkId: r.chunkId,
          documentId: r.documentId,
          documentTitle: r.documentTitle,
          content: r.content.slice(0, 800), // preview
          score: r.score,
          vectorScore: r.vectorScore,
          keywordScore: r.keywordScore,
          source: r.source,
          breadcrumb: (r.metadata?.breadcrumb as string) || '',
        })),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

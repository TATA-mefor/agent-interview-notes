import { NextRequest, NextResponse } from 'next/server'
import * as cardRepo from '@/lib/repositories/cardRepository'
import {
  filterCardsForMindMap,
  countCardsByCategory,
  buildMindMapTree,
  generateMermaidMindMap,
} from '@/lib/services/mindMapService'

// GET /api/mindmap — Query mind map data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'all'

    // Fetch all cards
    const cards = await cardRepo.listCards({ limit: 500 })

    // Build filters from query params
    const filters = {
      category: searchParams.get('category') as never || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      frequency: searchParams.get('frequency') || undefined,
      minMastery: searchParams.get('minMastery') ? parseFloat(searchParams.get('minMastery')!) : undefined,
      maxMastery: searchParams.get('maxMastery') ? parseFloat(searchParams.get('maxMastery')!) : undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      onlyHighPriority: searchParams.get('onlyHighPriority') === 'true',
      onlyTodayReview: searchParams.get('onlyTodayReview') === 'true',
      showEmptyCategories: searchParams.get('showEmptyCategories') === 'true',
    }

    // Filter and build
    const filtered = filterCardsForMindMap(cards, filters)
    const categoryCounts = countCardsByCategory(filtered)
    const tree = buildMindMapTree(filtered, { showEmptyCategories: filters.showEmptyCategories })
    const mermaid = generateMermaidMindMap(tree)

    const response: Record<string, unknown> = {
      cardCount: filtered.length,
      categoryCounts,
      updatedAt: new Date().toISOString(),
    }

    if (format === 'tree' || format === 'all') response.tree = tree
    if (format === 'mermaid' || format === 'all') response.mermaid = mermaid

    return NextResponse.json({ data: response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'MindMap API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

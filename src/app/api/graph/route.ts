import { NextRequest, NextResponse } from 'next/server'
import * as cardRepo from '@/lib/repositories/cardRepository'
import {
  buildGraphNodes,
  buildGraphEdges,
  generateTagBasedEdges,
  filterGraphData,
} from '@/lib/services/graphService'

// GET /api/graph — Query graph data with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Fetch all cards
    const cards = await cardRepo.listCards({ limit: 200 })

    // Build nodes
    const nodes = buildGraphNodes(cards)

    // Get edges: try card_links first, fall back to tag-based generation
    let edges = generateTagBasedEdges(cards)

    // Build graph data
    const graphData = { nodes, edges, stats: { nodeCount: 0, edgeCount: 0, categoryCounts: {}, relationTypeCounts: {} } }

    // Apply filters
    const filters = {
      category: searchParams.get('category') || undefined,
      relationType: searchParams.get('relationType') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      frequency: searchParams.get('frequency') || undefined,
      minMastery: searchParams.get('minMastery') ? parseFloat(searchParams.get('minMastery')!) : undefined,
      maxMastery: searchParams.get('maxMastery') ? parseFloat(searchParams.get('maxMastery')!) : undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      sourceType: searchParams.get('sourceType') || undefined,
      centerCardId: searchParams.get('centerCardId') || undefined,
      depth: searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : 1,
      onlyHighPriority: searchParams.get('onlyHighPriority') === 'true',
    }

    const result = filterGraphData(graphData, filters)

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Graph API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

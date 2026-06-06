/**
 * GraphService — Build and filter knowledge graph data.
 * Nodes: cards (6 categories). Edges: card_links (5 relation types).
 * Auto-generates tag-based edges when no manual links exist.
 */

import type { Card, CardLink } from '@/lib/types'

// ---- Types ----
export type GraphCategory = '基础概念' | '核心模块' | '工作模式' | '架构设计' | '工程实践' | '评估与多Agent'

export interface GraphCardNode {
  id: string
  label: string
  category: GraphCategory
  question: string
  difficulty: string
  frequency: string
  mastery: number
  reviewPriority: number
  tags: string[]
  relatedCount: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  relationType: 'related' | 'prerequisite' | 'compare' | 'follow_up' | 'same_topic'
  reason: string
  score: number
  sourceType: 'manual' | 'tag' | 'vector' | 'llm' | 'hybrid'
}

export interface GraphFilters {
  category?: string
  relationType?: string
  difficulty?: string
  frequency?: string
  minMastery?: number
  maxMastery?: number
  tags?: string[]
  sourceType?: string
  centerCardId?: string
  depth?: number
  onlyHighPriority?: boolean
}

export interface GraphStats {
  nodeCount: number
  edgeCount: number
  categoryCounts: Record<string, number>
  relationTypeCounts: Record<string, number>
}

export interface GraphData {
  nodes: GraphCardNode[]
  edges: GraphEdge[]
  stats: GraphStats
}

// ---- Category Colors ----
const CATEGORY_COLORS: Record<string, string> = {
  '基础概念': '#10B981',
  '核心模块': '#6366F1',
  '工作模式': '#F59E0B',
  '架构设计': '#EF4444',
  '工程实践': '#06B6D4',
  '评估与多Agent': '#8B5CF6',
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6B7280'
}

// ---- Build graph from cards + links ----
export function buildGraphNodes(cards: Card[]): GraphCardNode[] {
  return cards.map((c) => ({
    id: c.id,
    label: c.question.length > 20 ? c.question.slice(0, 18) + '...' : c.question,
    category: (c.topic as GraphCategory) || '核心模块',
    question: c.question,
    difficulty: c.difficulty,
    frequency: c.frequency,
    mastery: c.mastery,
    reviewPriority: c.review_priority,
    tags: c.tags || [],
    relatedCount: 0,
  }))
}

export function buildGraphEdges(cardLinks: CardLink[]): GraphEdge[] {
  return cardLinks.map((l) => ({
    id: l.id,
    source: l.from_card_id,
    target: l.to_card_id,
    relationType: l.relation_type,
    reason: l.reason,
    score: l.score,
    sourceType: l.source,
  }))
}

/** Auto-generate tag-based edges when no manual links exist */
export function generateTagBasedEdges(cards: Card[]): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const a of cards) {
    const aTags = new Set(a.tags || [])
    if (aTags.size === 0) continue

    for (const b of cards) {
      if (a.id >= b.id) continue // avoid duplicates
      const bTags = b.tags || []
      const shared = bTags.filter((t) => aTags.has(t))

      if (shared.length >= 3) {
        const key = `${a.id}|${b.id}`
        if (seen.has(key)) continue
        seen.add(key)

        edges.push({
          id: `tag-${a.id}-${b.id}`,
          source: a.id,
          target: b.id,
          relationType: 'same_topic',
          reason: `共享标签: ${shared.join(', ')}`,
          score: Math.min(1, shared.length / 5),
          sourceType: 'tag',
        })
      } else if (shared.length >= 2) {
        const key = `${a.id}|${b.id}`
        if (seen.has(key)) continue
        seen.add(key)

        edges.push({
          id: `tag-${a.id}-${b.id}`,
          source: a.id,
          target: b.id,
          relationType: 'related',
          reason: `共享标签: ${shared.join(', ')}`,
          score: shared.length / 3,
          sourceType: 'tag',
        })
      }
    }
  }

  return edges
}

// ---- Filtering ----
export function filterGraphData(graph: GraphData, filters: GraphFilters): GraphData {
  let { nodes, edges } = graph

  // Category filter
  if (filters.category) {
    nodes = nodes.filter((n) => n.category === filters.category)
    const nodeIds = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }

  // Relation type filter
  if (filters.relationType) {
    edges = edges.filter((e) => e.relationType === filters.relationType)
    const nodeIds = new Set<string>()
    edges.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target) })
    nodes = nodes.filter((n) => nodeIds.has(n.id))
  }

  // Difficulty filter
  if (filters.difficulty) {
    nodes = nodes.filter((n) => n.difficulty === filters.difficulty)
    const nodeIds = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }

  // Frequency filter
  if (filters.frequency) {
    nodes = nodes.filter((n) => n.frequency === filters.frequency)
    const nodeIds = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }

  // Mastery range
  if (filters.minMastery !== undefined) {
    nodes = nodes.filter((n) => n.mastery >= filters.minMastery!)
  }
  if (filters.maxMastery !== undefined) {
    nodes = nodes.filter((n) => n.mastery <= filters.maxMastery!)
  }

  // High priority only
  if (filters.onlyHighPriority) {
    nodes = nodes.filter((n) => n.reviewPriority >= 0.5)
    const nodeIds = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }

  // Tag filter
  if (filters.tags && filters.tags.length > 0) {
    nodes = nodes.filter((n) => n.tags.some((t) => filters.tags!.includes(t)))
    const nodeIds = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }

  // Source type filter
  if (filters.sourceType) {
    edges = edges.filter((e) => e.sourceType === filters.sourceType)
  }

  // Single card neighborhood
  if (filters.centerCardId) {
    const temp = { nodes, edges, stats: computeStats(nodes, edges) }
    return buildCardNeighborhoodGraph(filters.centerCardId, filters.depth || 1, temp)
  }

  // Recompute stats
  const stats = computeStats(nodes, edges)

  return { nodes, edges, stats }
}

export function buildCardNeighborhoodGraph(
  cardId: string,
  depth: number,
  graph: GraphData
): GraphData {
  const connectedIds = new Set<string>([cardId])
  let frontier = new Set<string>([cardId])

  for (let d = 0; d < depth; d++) {
    const next = new Set<string>()
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) && !connectedIds.has(edge.target)) {
        next.add(edge.target)
      }
      if (frontier.has(edge.target) && !connectedIds.has(edge.source)) {
        next.add(edge.source)
      }
    }
    next.forEach((id) => connectedIds.add(id))
    frontier = next
  }

  const nodes = graph.nodes.filter((n) => connectedIds.has(n.id))
  const edges = graph.edges.filter(
    (e) => connectedIds.has(e.source) && connectedIds.has(e.target)
  )

  return { nodes, edges, stats: computeStats(nodes, edges) }
}

// ---- Stats ----
function computeStats(nodes: GraphCardNode[], edges: GraphEdge[]): GraphStats {
  const categoryCounts: Record<string, number> = {}
  nodes.forEach((n) => {
    categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1
  })

  const relationTypeCounts: Record<string, number> = {}
  edges.forEach((e) => {
    relationTypeCounts[e.relationType] = (relationTypeCounts[e.relationType] || 0) + 1
  })

  // Fill in relatedCount on nodes
  nodes.forEach((n) => {
    n.relatedCount = edges.filter((e) => e.source === n.id || e.target === n.id).length
  })

  return { nodeCount: nodes.length, edgeCount: edges.length, categoryCounts, relationTypeCounts }
}

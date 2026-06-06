/**
 * MindMapService — Generate mind map tree from cards data.
 *
 * 4-level tree: Root → Category (6 fixed) → Group (from tags) → Card
 */

import type { Card } from '@/lib/types'

// ---- Types ----
export type MindMapCategory = '基础概念' | '核心模块' | '工作模式' | '架构设计' | '工程实践' | '评估与多Agent'

export const MINDMAP_CATEGORIES: MindMapCategory[] = [
  '基础概念', '核心模块', '工作模式', '架构设计', '工程实践', '评估与多Agent',
]

export interface MindMapCardNode {
  id: string
  question: string
  shortTitle: string
  difficulty: string
  frequency: string
  mastery: number
  reviewPriority: number
  icon: string
  tags: string[]
}

export interface MindMapGroupNode {
  name: string
  cardCount: number
  cards: MindMapCardNode[]
}

export interface MindMapCategoryNode {
  name: MindMapCategory
  label: string
  cardCount: number
  groups: MindMapGroupNode[]
}

export interface MindMapTree {
  root: 'Agent 面试题库'
  categories: MindMapCategoryNode[]
}

export interface MindMapFilters {
  category?: MindMapCategory
  difficulty?: string
  frequency?: string
  minMastery?: number
  maxMastery?: number
  tags?: string[]
  onlyHighPriority?: boolean
  onlyTodayReview?: boolean
  showEmptyCategories?: boolean
}

// ---- Category Normalization ----
const TOPIC_ALIASES: Record<string, MindMapCategory> = {
  '基础': '基础概念', '基础概念类': '基础概念', 'Agent基础': '基础概念', '概念类': '基础概念',
  '核心': '核心模块', '核心模块类': '核心模块', '模块': '核心模块', 'Agent模块': '核心模块', 'Agent组成': '核心模块', '执行循环': '核心模块',
  '工作模式': '工作模式', '工作模式类': '工作模式', '模式': '工作模式', 'ReAct模式': '工作模式', '执行模式': '工作模式', 'Workflow': '工作模式',
  '架构': '架构设计', '架构设计类': '架构设计', '系统设计': '架构设计', '多Agent架构': '架构设计',
  '工程': '工程实践', '工程实践类': '工程实践', '落地实践': '工程实践', '工程问题': '工程实践', '生产实践': '工程实践',
  '评估': '评估与多Agent', '多Agent': '评估与多Agent', 'Multi-Agent': '评估与多Agent', '评估与多Agent类': '评估与多Agent',
}

export function normalizeMindMapCategory(topic: string): MindMapCategory {
  for (const [alias, category] of Object.entries(TOPIC_ALIASES)) {
    if (topic.includes(alias)) return category
  }
  // Default fallback
  return '基础概念'
}

// ---- Filtering ----
export function filterCardsForMindMap(cards: Card[], filters: MindMapFilters): Card[] {
  let result = cards

  if (filters.category) {
    result = result.filter((c) => normalizeMindMapCategory(c.topic) === filters.category)
  }
  if (filters.difficulty) {
    result = result.filter((c) => c.difficulty === filters.difficulty)
  }
  if (filters.frequency) {
    result = result.filter((c) => c.frequency === filters.frequency)
  }
  if (filters.minMastery !== undefined) {
    result = result.filter((c) => c.mastery >= filters.minMastery!)
  }
  if (filters.maxMastery !== undefined) {
    result = result.filter((c) => c.mastery <= filters.maxMastery!)
  }
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter((c) => c.tags?.some((t) => filters.tags!.includes(t)))
  }
  if (filters.onlyHighPriority) {
    result = result.filter((c) => c.review_priority >= 0.8)
  }
  if (filters.onlyTodayReview) {
    // First pass: use review_priority >= 0.5 as proxy for today review
    result = result.filter((c) => c.review_priority >= 0.5)
  }

  return result
}

// ---- Counting ----
export function countCardsByCategory(cards: Card[]): Record<MindMapCategory, number> {
  const counts: Record<string, number> = {}
  for (const cat of MINDMAP_CATEGORIES) counts[cat] = 0

  cards.forEach((c) => {
    const cat = normalizeMindMapCategory(c.topic)
    counts[cat] = (counts[cat] || 0) + 1
  })

  return counts as Record<MindMapCategory, number>
}

// ---- Node Helpers ----
export function getMindMapNodeStatus(card: Pick<Card, 'review_priority'>): string {
  const p = card.review_priority
  if (p === undefined || p === null || p === 0) return '⚪'
  if (p >= 0.8) return '🔥'
  if (p >= 0.4) return '🟡'
  return '✅'
}

export function toMindMapShortTitle(question: string, maxLength = 48): string {
  const normalized = question.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return normalized.slice(0, maxLength) + '...'
}

// ---- Tree Building ----
export function buildMindMapTree(
  cards: Card[],
  options?: { showEmptyCategories?: boolean }
): MindMapTree {
  const showEmpty = options?.showEmptyCategories ?? false

  const categories: MindMapCategoryNode[] = []

  for (const cat of MINDMAP_CATEGORIES) {
    const catCards = cards.filter((c) => normalizeMindMapCategory(c.topic) === cat)
    if (catCards.length === 0 && !showEmpty) continue

    // Group by primary tag
    const groupMap = new Map<string, Card[]>()
    catCards.forEach((c) => {
      const primaryTag = c.tags?.[0] || '未分类知识点'
      if (!groupMap.has(primaryTag)) groupMap.set(primaryTag, [])
      groupMap.get(primaryTag)!.push(c)
    })

    const groups: MindMapGroupNode[] = []
    groupMap.forEach((groupCards, groupName) => {
      const cardNodes: MindMapCardNode[] = groupCards.map((c) => ({
        id: c.id,
        question: c.question,
        shortTitle: toMindMapShortTitle(c.question),
        difficulty: c.difficulty,
        frequency: c.frequency,
        mastery: c.mastery,
        reviewPriority: c.review_priority,
        icon: getMindMapNodeStatus(c),
        tags: c.tags || [],
      }))

      groups.push({
        name: groupName,
        cardCount: cardNodes.length,
        cards: cardNodes,
      })
    })

    categories.push({
      name: cat,
      label: `${cat} ${catCards.length}题`,
      cardCount: catCards.length,
      groups,
    })
  }

  return { root: 'Agent 面试题库', categories }
}

// ---- Mermaid Generation ----
export function generateMermaidMindMap(tree: MindMapTree): string {
  const lines: string[] = []
  lines.push('mindmap')
  lines.push(`  root((${tree.root}))`)

  for (const cat of tree.categories) {
    const catId = cat.name.replace(/[\s]/g, '')
    lines.push(`    ${catId}[${cat.label}]`)

    for (const group of cat.groups) {
      const groupId = `${catId}_${group.name.replace(/[^\w一-鿿]/g, '')}`
      lines.push(`      ${groupId}[${group.name}]`)

      for (const card of group.cards) {
        const escapedTitle = card.shortTitle
          .replace(/"/g, "'")
          .replace(/\(/g, '（')
          .replace(/\)/g, '）')
          .replace(/\[/g, '【')
          .replace(/\]/g, '】')
        const cardId = `card_${card.id.replace(/[^a-zA-Z0-9_]/g, '_')}`
        lines.push(`        ${cardId}[${card.icon} ${escapedTitle}]`)
      }
    }
  }

  return lines.join('\n')
}

'use client'

import { useState, useEffect } from 'react'
import type { Card } from '@/lib/types'

export default function GraphView() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch('/api/cards?limit=100')
        const { data } = await res.json()
        setCards(data ?? [])
      } catch { /* offline */ } finally {
        setLoading(false)
      }
    }
    fetchCards()
  }, [])

  // Build adjacency map: cards with shared tags are connected
  const adjacency = buildAdjacencyMap(cards)

  // Filter based on search
  const searchLower = search.toLowerCase()
  const visibleCards = search
    ? cards.filter(
        (c) =>
          c.question.toLowerCase().includes(searchLower) ||
          c.topic.toLowerCase().includes(searchLower) ||
          c.tags?.some((t) => t.toLowerCase().includes(searchLower))
      )
    : cards

  if (loading) {
    return <div className="text-gray-400 text-center py-12">加载中...</div>
  }

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索卡片..."
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-64"
        />
        <span className="text-xs text-gray-400">
          {visibleCards.length} / {cards.length} 张卡片
        </span>
        {selectedCard && (
          <span className="text-xs text-blue-600">
            已选: {selectedCard.question.slice(0, 30)}...
            <button
              onClick={() => setSelectedCard(null)}
              className="ml-1 text-gray-400 hover:text-red-500"
            >
              ✕
            </button>
          </span>
        )}
      </div>

      {/* Graph Visualization (text-based grid) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {visibleCards.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className={`text-left p-2 rounded border text-xs transition-all ${
                selectedCard?.id === card.id
                  ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  card.difficulty === '高级' ? 'bg-red-400' : card.difficulty === '中级' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
                <span className="text-gray-400 truncate">{card.topic}</span>
              </div>
              <div className="text-gray-700 leading-tight line-clamp-2">
                {card.question}
              </div>
              <div className="flex gap-1 mt-1">
                {card.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="px-1 py-0 bg-gray-100 text-gray-500 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Card Detail */}
      {selectedCard && (
        <div className="mt-4 bg-white rounded-lg border border-blue-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            {selectedCard.question}
          </h3>

          {/* Related cards (by shared tags) */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">标签关联卡片</h4>
            <div className="flex flex-wrap gap-1.5">
              {getRelatedCards(selectedCard, cards, adjacency).map((rel) => (
                <button
                  key={rel.card.id}
                  onClick={() => setSelectedCard(rel.card)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    rel.shareCount >= 3
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : rel.shareCount >= 2
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}
                >
                  {rel.card.question.slice(0, 25)}...
                  <span className="ml-1 text-xs opacity-50">({rel.shareCount})</span>
                </button>
              ))}
              {getRelatedCards(selectedCard, cards, adjacency).length === 0 && (
                <span className="text-xs text-gray-400">无共享标签的卡片</span>
              )}
            </div>
          </div>

          <a
            href={`/cards/${selectedCard.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            查看完整详情 →
          </a>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span>🟢 初级</span>
        <span>🟡 中级</span>
        <span>🔴 高级</span>
        <span className="ml-4">绿色边框 = 强关联 (≥3 共享标签)</span>
        <span>蓝色边框 = 中等关联 (2 共享标签)</span>
      </div>
    </div>
  )
}

// ---- Helpers ----

function buildAdjacencyMap(cards: Card[]): Map<string, Array<{ id: string; shareCount: number }>> {
  const map = new Map<string, Array<{ id: string; shareCount: number }>>()

  for (const a of cards) {
    const connections: Array<{ id: string; shareCount: number }> = []
    const aTags = new Set(a.tags || [])

    for (const b of cards) {
      if (a.id === b.id) continue
      const bTags = b.tags || []
      const shareCount = bTags.filter((t) => aTags.has(t)).length
      if (shareCount > 0) {
        connections.push({ id: b.id, shareCount })
      }
    }

    connections.sort((x, y) => y.shareCount - x.shareCount)
    map.set(a.id, connections)
  }

  return map
}

function getRelatedCards(
  card: Card,
  allCards: Card[],
  adjacency: Map<string, Array<{ id: string; shareCount: number }>>
): Array<{ card: Card; shareCount: number }> {
  const connections = adjacency.get(card.id) || []
  return connections
    .slice(0, 8)
    .map((conn) => ({
      card: allCards.find((c) => c.id === conn.id)!,
      shareCount: conn.shareCount,
    }))
    .filter((r) => r.card)
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Card } from '@/lib/types'

interface ReviewDeck {
  cards: Card[]
  title: string
}

const CATEGORY_ICONS: Record<string, string> = {
  '基础概念': '📘', '核心模块': '⚙️', '工作模式': '🔄', '架构设计': '🏗️', '工程实践': '🔧', '评估与多Agent': '🤝',
}

const CATEGORY_COLORS: Record<string, string> = {
  '基础概念': 'border-emerald-400 bg-emerald-50', '核心模块': 'border-indigo-400 bg-indigo-50',
  '工作模式': 'border-amber-400 bg-amber-50', '架构设计': 'border-rose-400 bg-rose-50',
  '工程实践': 'border-cyan-400 bg-cyan-50', '评估与多Agent': 'border-purple-400 bg-purple-50',
}

export default function ReviewSelector({ onStartReview }: { onStartReview: (deck: ReviewDeck) => void }) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/cards?limit=200')
        const { data } = await res.json()
        setCards(data ?? [])
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [])

  // Filter by search
  const filtered = search
    ? cards.filter(c =>
        c.question.toLowerCase().includes(search.toLowerCase()) ||
        c.topic?.toLowerCase().includes(search.toLowerCase()) ||
        c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : cards

  // Group by category (topic)
  const byCategory: Record<string, Card[]> = {}
  filtered.forEach(c => {
    const cat = c.topic || '其他'
    ;(byCategory[cat] ??= []).push(c)
  })

  // Group by tag within category
  function getGroups(catCards: Card[]): { name: string; cards: Card[] }[] {
    const groups: Record<string, Card[]> = {}
    catCards.forEach(c => {
      const tag = c.tags?.[0] || '未分类'
      ;(groups[tag] ??= []).push(c)
    })
    return Object.entries(groups)
      .map(([name, cards_]) => ({ name, cards: cards_ }))
      .sort((a, b) => b.cards.length - a.cards.length)
  }

  function startCategoryReview(cat: string) {
    const catCards = byCategory[cat] || []
    onStartReview({ cards: catCards, title: `${cat} · ${catCards.length} 题` })
  }

  function startGroupReview(cat: string, group: { name: string; cards: Card[] }) {
    onStartReview({ cards: group.cards, title: `${cat} › ${group.name} · ${group.cards.length} 题` })
  }

  function startSingleCard(card: Card) {
    onStartReview({ cards: [card], title: card.question.slice(0, 30) })
  }

  if (loading) return <div className="text-gray-400 text-center py-8">加载中...</div>

  return (
    <div className="max-w-2xl">
      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索题目、标签、模块..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {filtered.length} 题
          </span>
        )}
      </div>

      {/* Search results: direct card list */}
      {search && (
        <div className="mb-6">
          <div className="text-xs font-medium text-gray-500 mb-2">搜索结果</div>
          <div className="space-y-1.5">
            {filtered.slice(0, 20).map(card => (
              <button key={card.id} onClick={() => startSingleCard(card)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate group-hover:text-blue-700">{card.question}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{card.topic}</span>
              </button>
            ))}
          </div>
          {filtered.length > 20 && <div className="text-xs text-gray-400 mt-2">还有 {filtered.length - 20} 题，请缩小搜索范围</div>}
        </div>
      )}

      {/* Category list (一级目录) */}
      {!search && (
        <div className="space-y-3">
          {Object.entries(byCategory).map(([cat, catCards]) => {
            const isExpanded = expandedCategory === cat
            const groups = getGroups(catCards)
            return (
              <div key={cat} className={`rounded-xl border-2 overflow-hidden transition-all ${CATEGORY_COLORS[cat] || 'border-gray-200 bg-white'}`}>
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <button onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0">
                    <span className="text-lg">{CATEGORY_ICONS[cat] || '📋'}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{cat}</div>
                      <div className="text-xs text-gray-400">{catCards.length} 题 · {groups.length} 分组</div>
                    </div>
                    <span className="text-gray-400 text-xs ml-1">{isExpanded ? '▾' : '▸'}</span>
                  </button>
                  <button onClick={() => startCategoryReview(cat)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0">
                    复习全部
                  </button>
                </div>

                {/* Expanded: show groups (二级目录) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-2 bg-white/60 space-y-1">
                    {groups.map(group => {
                      const groupExpanded = expandedGroup === `${cat}-${group.name}`
                      return (
                        <div key={group.name}>
                          <div className="flex items-center justify-between py-1.5">
                            <button onClick={() => setExpandedGroup(groupExpanded ? null : `${cat}-${group.name}`)}
                              className="flex items-center gap-2 text-left flex-1 min-w-0">
                              <span className="text-xs text-gray-400">{groupExpanded ? '▾' : '▸'}</span>
                              <span className="text-sm text-gray-700 font-medium">{group.name}</span>
                              <span className="text-xs text-gray-400">{group.cards.length} 题</span>
                            </button>
                            <button onClick={() => startGroupReview(cat, group)}
                              className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0">
                              复习
                            </button>
                          </div>

                          {/* Expanded: show cards (三级目录) */}
                          {groupExpanded && (
                            <div className="ml-6 space-y-0.5 pb-1">
                              {group.cards.map(card => (
                                <button key={card.id} onClick={() => startSingleCard(card)}
                                  className="w-full text-left flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 transition-colors group">
                                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-blue-400 shrink-0" />
                                  <span className="text-xs text-gray-600 group-hover:text-blue-700 truncate">
                                    {card.question}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

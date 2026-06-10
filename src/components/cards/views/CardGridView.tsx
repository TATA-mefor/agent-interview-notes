'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Card } from '@/lib/types'

const DIFFICULTY_STYLE: Record<string, string> = {
  '初级': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '中级': 'bg-amber-50 text-amber-700 border-amber-200',
  '高级': 'bg-rose-50 text-rose-700 border-rose-200',
}

const FREQUENCY_DOT: Record<string, string> = {
  '高频': 'bg-rose-400', '中频': 'bg-amber-400', '低频': 'bg-emerald-400',
}

export default function CardGridView() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (topicFilter) params.set('topic', topicFilter)
      if (difficultyFilter) params.set('difficulty', difficultyFilter)
      const res = await fetch(`/api/cards?limit=200&${params}`)
      const { data } = await res.json()
      setCards(data ?? [])
    } catch { } finally { setLoading(false) }
  }, [search, topicFilter, difficultyFilter])

  useEffect(() => { fetchCards() }, [fetchCards])

  // Extract unique topics for filter
  const topics = [...new Set(cards.map(c => c.topic))].sort()

  return (
    <div>
      {/* Toolbar — 面试鸭风格 */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索题目、答案、标签..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">全部模块</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">全部难度</option>
          <option value="初级">初级</option><option value="中级">中级</option><option value="高级">高级</option>
        </select>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500'}`}>
            ▦ 网格
          </button>
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500'}`}>
            ☰ 列表
          </button>
        </div>
        <a href="/import" className="px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-xs hover:bg-blue-50 transition-colors font-medium">
          📥 导入
        </a>
        <span className="text-xs text-gray-400">{cards.length} 题</span>
      </div>

      {/* Card Grid / List */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">加载中...</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map(card => <GridCard key={card.id} card={card} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => <ListCard key={card.id} card={card} />)}
        </div>
      )}

      {!loading && cards.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">没有匹配的题目</div>
      )}
    </div>
  )
}

// ---- Grid Card (面试鸭风格) ----
function GridCard({ card }: { card: Card }) {
  const masteryColor = card.mastery >= 0.7 ? 'bg-emerald-500' : card.mastery >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <Link href={`/cards/${card.id}`}
      className="group block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all">
      {/* Header: topic + difficulty */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">{card.topic}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs border ${DIFFICULTY_STYLE[card.difficulty]}`}>{card.difficulty}</span>
        <span className={`w-2 h-2 rounded-full ml-auto ${FREQUENCY_DOT[card.frequency]}`} title={card.frequency} />
      </div>

      {/* Question */}
      <div className="text-sm font-medium text-gray-800 line-clamp-2 mb-3 leading-relaxed group-hover:text-blue-600 transition-colors">
        {card.question}
      </div>

      {/* Bottom: tags + mastery */}
      <div className="flex items-end justify-between">
        <div className="flex flex-wrap gap-1">
          {card.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0 text-gray-400 bg-gray-50 rounded text-xs">{tag}</span>
          ))}
          {card.tags?.length > 3 && <span className="text-xs text-gray-300">+{card.tags.length - 3}</span>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">{Math.round(card.mastery * 100)}%</div>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${masteryColor}`}
              style={{ width: `${card.mastery * 100}%` }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ---- List Card ----
function ListCard({ card }: { card: Card }) {
  const masteryColor = card.mastery >= 0.7 ? 'bg-emerald-500' : card.mastery >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <Link href={`/cards/${card.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-3.5 hover:border-blue-300 hover:shadow-sm transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-1.5 py-0 bg-blue-50 text-blue-600 rounded text-xs font-medium">{card.topic}</span>
          <span className={`px-1.5 py-0 rounded text-xs border ${DIFFICULTY_STYLE[card.difficulty]}`}>{card.difficulty}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${FREQUENCY_DOT[card.frequency]}`} />
        </div>
        <div className="text-sm text-gray-800 truncate group-hover:text-blue-600">{card.question}</div>
        <div className="flex items-center gap-2 mt-1">
          {card.tags?.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs text-gray-400">#{tag}</span>
          ))}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-gray-500">{Math.round(card.mastery * 100)}%</div>
        <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
          <div className={`h-full rounded-full ${masteryColor}`} style={{ width: `${card.mastery * 100}%` }} />
        </div>
      </div>
      <span className="text-gray-300 group-hover:text-blue-500 text-lg">→</span>
    </Link>
  )
}

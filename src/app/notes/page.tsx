'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Card } from '@/lib/types'

export default function NotesPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'with_notes' | 'no_notes'>('all')

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cards?limit=100')
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setCards(data ?? [])
    } catch {
      // DB not available
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const filteredCards = cards.filter((c) => {
    if (filter === 'with_notes' && !c.personal_notes) return false
    if (filter === 'no_notes' && c.personal_notes) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.question.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q) ||
        c.personal_notes.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Markdown 笔记</h1>
          <p className="text-gray-500 mt-1">编辑和浏览面试题的个人笔记，支持 [[双链]] 和 #标签</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索题目或笔记..."
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部</option>
          <option value="with_notes">有笔记</option>
          <option value="no_notes">无笔记</option>
        </select>
        <span className="text-xs text-gray-400">{filteredCards.length} 条</span>
      </div>

      {/* Card List */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">加载中...</div>
      ) : filteredCards.length === 0 ? (
        <div className="text-gray-400 text-center py-12">
          {filter === 'no_notes' ? '所有卡片都有笔记！' : '没有找到匹配的卡片'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCards.map((card) => (
            <Link
              key={card.id}
              href={`/notes/${card.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {card.topic}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {card.question}
                    </span>
                  </div>
                  {card.personal_notes ? (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {card.personal_notes.slice(0, 200)}
                      {card.personal_notes.length > 200 ? '...' : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 italic mt-1">暂无笔记，点击添加</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {card.personal_notes ? `${card.personal_notes.length} 字` : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { Card } from '@/lib/types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/cards?search=${encodeURIComponent(query)}&limit=50`)
      const { data } = await res.json()
      setResults(data ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">搜索</h1>
      <p className="text-gray-500 mb-6">关键词搜索题目、答案和笔记</p>

      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索 Agent 面试题..."
          className="flex-1 max-w-xl px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* Results */}
      {!searched ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>输入关键词搜索题库</p>
          <p className="text-xs mt-1">支持中文、英文、标签搜索</p>
        </div>
      ) : loading ? (
        <div className="text-gray-400 text-center py-12">搜索中...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">😕</div>
          <p>没有找到匹配 &ldquo;{query}&rdquo; 的结果</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-3">找到 {results.length} 条结果</p>
          <div className="space-y-2">
            {results.map((card) => (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {card.topic}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    card.difficulty === '高级'
                      ? 'bg-red-100 text-red-700'
                      : card.difficulty === '中级'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {card.difficulty}
                  </span>
                  {card.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-gray-400">#{tag}</span>
                  ))}
                </div>
                <div className="text-sm font-medium text-gray-800">
                  {highlightMatch(card.question, query)}
                </div>
                {card.answer && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {highlightMatch(card.answer.slice(0, 200), query)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  )
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

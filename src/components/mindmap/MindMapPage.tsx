'use client'

import { useState, useEffect, useCallback } from 'react'
import MarkmapMindMap from './MermaidMindMap'
import MindMapCardList from './MindMapCardList'
import MindMapCategorySummary from './MindMapCategorySummary'
import type { MindMapTree } from '@/lib/services/mindMapService'

export default function MindMapPage() {
  const [tree, setTree] = useState<MindMapTree | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [cardCount, setCardCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [showMarkmap, setShowMarkmap] = useState(true)

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState('')
  const [minMastery, setMinMastery] = useState('')
  const [maxMastery, setMaxMastery] = useState('')
  const [onlyHighPriority, setOnlyHighPriority] = useState(false)
  const [onlyTodayReview, setOnlyTodayReview] = useState(false)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    p.set('format', 'tree')
    if (categoryFilter) p.set('category', categoryFilter)
    if (difficultyFilter) p.set('difficulty', difficultyFilter)
    if (frequencyFilter) p.set('frequency', frequencyFilter)
    if (minMastery) p.set('minMastery', minMastery)
    if (maxMastery) p.set('maxMastery', maxMastery)
    if (onlyHighPriority) p.set('onlyHighPriority', 'true')
    if (onlyTodayReview) p.set('onlyTodayReview', 'true')
    return p
  }, [categoryFilter, difficultyFilter, frequencyFilter, minMastery, maxMastery, onlyHighPriority, onlyTodayReview])

  const fetchMindMap = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = buildParams()
      const res = await fetch(`/api/mindmap?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const data = json.data || json
      setTree(data.tree || null)
      setCategoryCounts(data.categoryCounts || {})
      setCardCount(data.cardCount || 0)
    } catch (err) {
      console.error('MindMap fetch error:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally { setLoading(false) }
  }, [buildParams])

  useEffect(() => { fetchMindMap() }, [fetchMindMap])

  function handleCategorySelect(cat: string | null) {
    setCategoryFilter(cat)
  }

  function handleClearFilters() {
    setCategoryFilter(null)
    setDifficultyFilter('')
    setFrequencyFilter('')
    setMinMastery('')
    setMaxMastery('')
    setOnlyHighPriority(false)
    setOnlyTodayReview(false)
  }

  const hasFilters = !!(categoryFilter || difficultyFilter || frequencyFilter || minMastery || maxMastery || onlyHighPriority || onlyTodayReview)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button type="button" onClick={fetchMindMap}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors">
          🔄 刷新
        </button>
        {hasFilters && (
          <button type="button" onClick={handleClearFilters}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1">
            ← 返回全视图
          </button>
        )}
        {hasFilters && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full cursor-pointer hover:bg-amber-100 transition-colors" onClick={handleClearFilters}>
            已筛选 · {cardCount} 题 ✕
          </span>
        )}
        <button type="button" onClick={() => setShowMarkmap(!showMarkmap)}
          className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${showMarkmap ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200'}`}>
          {showMarkmap ? '📊 导图视图' : '📊 列表视图'}
        </button>
        <button type="button" onClick={() => setFilterOpen(!filterOpen)}
          className="lg:hidden px-3 py-1.5 border border-gray-200 rounded-lg text-xs">
          {filterOpen ? '收起筛选' : '🔍 筛选'}
        </button>
      </div>

      {/* Category Summary - always visible, outside SVG area */}
      <div className="mb-6">
        <MindMapCategorySummary
          counts={categoryCounts}
          selected={categoryFilter}
          onSelect={handleCategorySelect}
        />
      </div>

      <div className="flex gap-4">
        {/* Filter Panel */}
        <div className={`${filterOpen ? 'block' : 'hidden'} lg:block shrink-0`} style={{ width: 180 }}>
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3 sticky top-4">
            <h4 className="text-xs font-semibold text-gray-600">筛选</h4>
            <div>
              <label className="text-xs text-gray-500">难度</label>
              <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-xs">
                <option value="">全部</option><option value="初级">初级</option><option value="中级">中级</option><option value="高级">高级</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">频率</label>
              <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)}
                className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-xs">
                <option value="">全部</option><option value="高频">高频</option><option value="中频">中频</option><option value="低频">低频</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-xs text-gray-500">掌握度 ≥</label>
                <input type="number" min="0" max="1" step="0.1" value={minMastery} onChange={(e) => setMinMastery(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-xs" /></div>
              <div className="flex-1"><label className="text-xs text-gray-500">≤</label>
                <input type="number" min="0" max="1" step="0.1" value={maxMastery} onChange={(e) => setMaxMastery(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-xs" /></div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={onlyHighPriority} onChange={(e) => setOnlyHighPriority(e.target.checked)} />仅高优先级 (≥0.8)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={onlyTodayReview} onChange={(e) => setOnlyTodayReview(e.target.checked)} />仅今日复习 (≥0.5)
            </label>
            {hasFilters && (
              <button type="button" onClick={handleClearFilters}
                className="w-full py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">清除所有筛选</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {loading && !tree ? (
            <div className="text-gray-400 text-center py-12">加载中...</div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-sm mb-2">{error}</div>
              <button type="button" onClick={fetchMindMap} className="text-blue-600 text-sm underline">重试</button>
            </div>
          ) : (
            <>
              {/* Markmap - wrapped in overflow container with explicit z-index */}
              {showMarkmap && tree && tree.categories.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ position: 'relative', zIndex: 0 }}>
                  <MarkmapMindMap tree={tree} />
                </div>
              )}
              {showMarkmap && tree && tree.categories.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  当前筛选条件下没有匹配题目
                </div>
              )}
              {/* Card list */}
              {tree && <MindMapCardList categories={tree.categories} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

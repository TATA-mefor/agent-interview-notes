'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Card } from '@/lib/types'

const RATING_BUTTONS = [
  { key: 'again', label: '重来', icon: '🔄', color: 'bg-rose-500 hover:bg-rose-600', masteryDelta: -0.1, desc: '完全不熟' },
  { key: 'hard', label: '困难', icon: '😅', color: 'bg-amber-500 hover:bg-amber-600', masteryDelta: 0.05, desc: '需要思考' },
  { key: 'good', label: '良好', icon: '👍', color: 'bg-emerald-500 hover:bg-emerald-600', masteryDelta: 0.15, desc: '基本掌握' },
  { key: 'easy', label: '简单', icon: '✨', color: 'bg-blue-500 hover:bg-blue-600', masteryDelta: 0.25, desc: '完全掌握' },
]

export default function AnkiReviewCard({ deckCards }: { deckCards?: Card[] }) {
  const [cards, setCards] = useState<Card[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ reviewed: 0, remaining: 0 })
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (deckCards && deckCards.length > 0) {
      setCards(deckCards)
      setStats({ reviewed: 0, remaining: deckCards.length })
      setLoading(false)
      return
    }
    async function load() {
      try {
        const res = await fetch('/api/cards?limit=200')
        const { data } = await res.json()
        const sorted = (data ?? []).sort((a: Card, b: Card) => b.review_priority - a.review_priority)
        setCards(sorted)
        setStats({ reviewed: 0, remaining: sorted.length })
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [deckCards])

  const currentCard = cards[currentIdx]

  const handleRate = useCallback((rating: (typeof RATING_BUTTONS)[0]) => {
    if (!currentCard) return
    setAnimating(true)
    fetch(`/api/cards/${currentCard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mastery: Math.min(1, Math.max(0, (currentCard.mastery || 0.2) + rating.masteryDelta)),
        review_count: (currentCard.review_count || 0) + 1,
        last_review: new Date().toISOString(),
      }),
    }).catch(() => {})

    setTimeout(() => {
      setAnimating(false)
      setFlipped(false)
      if (currentIdx < cards.length - 1) {
        setCurrentIdx(i => i + 1)
        setStats(s => ({ ...s, reviewed: s.reviewed + 1 }))
      } else {
        setStats(s => ({ reviewed: s.reviewed + 1, remaining: 0 }))
      }
    }, 250)
  }, [currentCard, currentIdx, cards.length])

  // Keyboard shortcuts
  useEffect(() => {
    if (!flipped || animating) return
    function onKey(e: KeyboardEvent) {
      if (e.key === '1') handleRate(RATING_BUTTONS[0])
      else if (e.key === '2') handleRate(RATING_BUTTONS[1])
      else if (e.key === '3') handleRate(RATING_BUTTONS[2])
      else if (e.key === '4') handleRate(RATING_BUTTONS[3])
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, animating, handleRate])

  if (loading) return <div className="text-gray-400 text-center py-12">加载中...</div>
  if (cards.length === 0) return <div className="text-center py-12 text-gray-400 text-sm">暂无题目，请先添加卡片</div>
  if (stats.remaining === 0 && stats.reviewed > 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🎉</div>
        <div className="text-lg font-bold text-gray-800 mb-2">复习完成！</div>
        <div className="text-sm text-gray-500">已复习 {stats.reviewed} 道题</div>
        <button onClick={() => { setCurrentIdx(0); setFlipped(false); setStats({ reviewed: 0, remaining: cards.length }) }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">重新开始</button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
        <span>{currentIdx + 1} / {cards.length}</span>
        <div className="flex-1 mx-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }} />
        </div>
        <span>{stats.reviewed} 已复习</span>
      </div>

      {/* Card — Anki style flip */}
      <div className="perspective-1000" style={{ minHeight: 320 }}>
        <div
          className={`relative w-full rounded-2xl shadow-lg border-2 transition-all duration-300 cursor-pointer ${flipped ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-white' : 'border-gray-200 bg-white hover:border-gray-300'} ${animating ? 'scale-95 opacity-50' : ''}`}
          style={{ minHeight: 300 }}
          onClick={() => !animating && setFlipped(!flipped)}
        >
          {/* Front: Question */}
          <div className={`p-8 flex flex-col items-center justify-center text-center transition-opacity duration-200 ${flipped ? 'hidden' : ''}`} style={{ minHeight: 300 }}>
            <div className="text-xs text-gray-400 mb-3">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">{currentCard?.topic}</span>
              <span className="mx-2">·</span>
              <span>{currentCard?.difficulty}</span>
            </div>
            <div className="text-lg font-bold text-gray-800 leading-relaxed max-w-md">
              {currentCard?.question}
            </div>
            <div className="mt-6 text-sm text-gray-400">👆 点击翻看答案</div>
            {currentCard?.tags?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-4">
                {currentCard.tags.map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{t}</span>)}
              </div>
            )}
          </div>

          {/* Back: Answer */}
          <div className={`p-8 transition-opacity duration-200 ${!flipped ? 'hidden' : ''}`} style={{ minHeight: 300 }}>
            <div className="text-xs text-gray-400 mb-3 text-center">📝 参考答案</div>
            <div className="text-sm text-gray-700 leading-relaxed max-w-lg mx-auto whitespace-pre-wrap">
              {currentCard?.answer || <span className="text-gray-400 italic">暂无答案</span>}
            </div>
            {currentCard?.extended_notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                {currentCard.extended_notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Buttons — Anki 4-button style */}
      {flipped && !animating && (
        <div className="flex justify-center gap-3 mt-6">
          {RATING_BUTTONS.map(btn => (
            <button key={btn.key} onClick={(e) => { e.stopPropagation(); handleRate(btn); }}
              className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl text-white text-xs font-medium shadow-sm transition-all active:scale-95 ${btn.color}`}>
              <span className="text-lg">{btn.icon}</span>
              <span>{btn.label}</span>
              <span className="text-white/70 text-xs">{btn.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      {flipped && !animating && (
        <div className="text-center mt-4 text-xs text-gray-400">
          快捷键: 1 重来 · 2 困难 · 3 良好 · 4 简单
        </div>
      )}
    </div>
  )
}

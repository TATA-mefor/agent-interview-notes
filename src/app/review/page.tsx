'use client'

import { useState } from 'react'
import ReviewSelector from '@/components/review/ReviewSelector'
import AnkiReviewCard from '@/components/cards/views/AnkiReviewCard'
import type { Card } from '@/lib/types'

interface ReviewDeck {
  cards: Card[]
  title: string
}

export default function ReviewPage() {
  const [activeDeck, setActiveDeck] = useState<ReviewDeck | null>(null)

  if (activeDeck) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveDeck(null)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors">
            ← 返回选题
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{activeDeck.title}</h1>
            <p className="text-xs text-gray-400">共 {activeDeck.cards.length} 题</p>
          </div>
        </div>
        <AnkiReviewCard deckCards={activeDeck.cards} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">复习中心</h1>
      <p className="text-gray-500 mb-6">选择复习范围：全文搜索或按模块逐级展开</p>
      <ReviewSelector onStartReview={setActiveDeck} />
    </div>
  )
}

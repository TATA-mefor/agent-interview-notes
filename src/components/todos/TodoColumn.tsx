'use client'

import Link from 'next/link'
import type { Card } from '@/lib/types'
import type { TodoPhase } from '@/lib/todos/classify'

interface TodoColumnProps {
  phase: TodoPhase
  label: string
  colorClass: string
  bgClass: string
  cards: Card[]
  actionLabel: string
  dailyLimit?: number
}

const PHASE_META: Record<TodoPhase, { label: string; action: string; colorClass: string; bgClass: string }> = {
  preview: { label: '预习', action: '开始预习', colorClass: 'text-blue-700', bgClass: 'bg-blue-50' },
  study: { label: '学习', action: '继续学习', colorClass: 'text-green-700', bgClass: 'bg-green-50' },
  review: { label: '复习', action: '开始复习', colorClass: 'text-orange-700', bgClass: 'bg-orange-50' },
}

export default function TodoColumn({ phase, cards, dailyLimit }: TodoColumnProps) {
  const meta = PHASE_META[phase]
  const isPreview = phase === 'preview'

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 flex flex-col min-h-[320px]">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <span className={`font-medium ${meta.colorClass}`}>{meta.label}</span>
        <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
          {cards.length}
        </span>
      </div>

      <div className="p-3">
        {isPreview && dailyLimit !== undefined && (
          <div className="text-xs text-gray-500 mb-2">
            今日可预习 {Math.min(cards.length, dailyLimit)} 题
          </div>
        )}

        <Link
          href={`/todos/study?phase=${phase}`}
          className={`block w-full text-center text-sm font-medium py-2 rounded-md border transition-colors mb-3 ${meta.bgClass} ${meta.colorClass} border-current hover:opacity-90`}
        >
          {meta.action}
        </Link>
      </div>

      <div className="flex-1 px-3 pb-3 overflow-y-auto">
        {cards.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm text-gray-400">本阶段暂无卡片</div>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {cards.map((card) => (
              <li
                key={card.id}
                className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow"
              >
                <div className="font-medium text-sm text-gray-800 line-clamp-2">{card.question}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{card.topic}</span>
                  <span className="text-xs text-gray-400">{card.difficulty}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

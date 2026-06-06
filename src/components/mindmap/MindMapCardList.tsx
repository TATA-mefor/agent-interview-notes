'use client'

import Link from 'next/link'
import type { MindMapCategoryNode } from '@/lib/services/mindMapService'

const DIFFICULTY_COLORS: Record<string, string> = {
  '高级': 'bg-red-100 text-red-700', '中级': 'bg-yellow-100 text-yellow-700', '初级': 'bg-green-100 text-green-700',
}

export default function MindMapCardList({ categories }: { categories: MindMapCategoryNode[] }) {
  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat.name}>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {cat.label}
          </h2>

          {cat.groups.map((group) => (
            <div key={group.name} className="mb-3 ml-4">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                {group.name} ({group.cardCount})
              </div>

              <div className="space-y-1.5">
                {group.cards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/cards/${card.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{card.icon}</span>
                        <span className="text-sm text-gray-800 truncate group-hover:text-blue-600">
                          {card.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-6">
                        <span className={`px-1 py-0 rounded text-xs ${DIFFICULTY_COLORS[card.difficulty] || 'bg-gray-100'}`}>
                          {card.difficulty}
                        </span>
                        <span className="text-xs text-gray-400">
                          掌握度 {Math.round(card.mastery * 100)}%
                        </span>
                        {card.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="text-xs text-gray-300">#{t}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-blue-500 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      查看 →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          当前筛选条件下没有匹配题目
        </div>
      )}
    </div>
  )
}

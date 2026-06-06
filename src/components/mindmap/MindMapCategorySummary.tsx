'use client'

import { MINDMAP_CATEGORIES } from '@/lib/services/mindMapService'
import type { MindMapCategory } from '@/lib/services/mindMapService'

const CATEGORY_COLORS: Record<string, string> = {
  '基础概念': 'border-l-green-500 bg-green-50/50',
  '核心模块': 'border-l-indigo-500 bg-indigo-50/50',
  '工作模式': 'border-l-amber-500 bg-amber-50/50',
  '架构设计': 'border-l-red-500 bg-red-50/50',
  '工程实践': 'border-l-cyan-500 bg-cyan-50/50',
  '评估与多Agent': 'border-l-purple-500 bg-purple-50/50',
}

export default function MindMapCategorySummary({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>
  selected: string | null
  onSelect: (cat: string | null) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {MINDMAP_CATEGORIES.map((cat) => {
        const count = counts[cat] || 0
        const isSelected = selected === cat
        return (
          <button
            key={cat}
            onClick={() => onSelect(isSelected ? null : cat)}
            className={`text-left p-3 rounded-lg border-l-4 transition-all ${
              CATEGORY_COLORS[cat] || 'border-l-gray-300'
            } ${isSelected ? 'ring-2 ring-blue-300 scale-105' : 'hover:shadow-sm'}`}
          >
            <div className="text-xs font-medium text-gray-700">{cat}</div>
            <div className={`text-lg font-bold mt-0.5 ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
              {count}
            </div>
            <div className="text-xs text-gray-400">题</div>
          </button>
        )
      })}
    </div>
  )
}

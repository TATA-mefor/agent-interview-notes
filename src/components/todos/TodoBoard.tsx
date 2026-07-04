'use client'

import TodoColumn from './TodoColumn'
import type { Card } from '@/lib/types'
import type { PhaseGroups } from '@/lib/todos/classify'

interface TodoBoardProps {
  groups: PhaseGroups
  dailyLimit: number
}

export default function TodoBoard({ groups, dailyLimit }: TodoBoardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <TodoColumn
        phase="preview"
        label="预习"
        actionLabel="开始预习"
        colorClass="text-blue-700"
        bgClass="bg-blue-50"
        cards={groups.preview.slice(0, dailyLimit)}
        dailyLimit={dailyLimit}
      />
      <TodoColumn
        phase="study"
        label="学习"
        actionLabel="继续学习"
        colorClass="text-green-700"
        bgClass="bg-green-50"
        cards={groups.study}
      />
      <TodoColumn
        phase="review"
        label="复习"
        actionLabel="开始复习"
        colorClass="text-orange-700"
        bgClass="bg-orange-50"
        cards={groups.review}
      />
    </div>
  )
}

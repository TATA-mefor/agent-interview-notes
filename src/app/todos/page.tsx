'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TodoBoard from '@/components/todos/TodoBoard'
import { classifyCardsByPhase, type PhaseGroups } from '@/lib/todos/classify'
import type { Card } from '@/lib/types'

const DEFAULT_DAILY_LIMIT = 10
const MIN_DAILY_LIMIT = 10
const MAX_DAILY_LIMIT = 20

export default function TodosPage() {
  const [groups, setGroups] = useState<PhaseGroups>({ preview: [], study: [], review: [] })
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_DAILY_LIMIT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [cardsRes, settingRes] = await Promise.all([
          fetch('/api/cards?limit=1000'),
          fetch('/api/settings?key=todo_preview_daily_limit'),
        ])

        const { data: cards } = await cardsRes.json()
        const { data: setting } = await settingRes.json()

        const limit = normalizeLimit(setting?.value?.limit)
        setDailyLimit(limit)
        setGroups(classifyCardsByPhase(cards ?? []))
      } catch {
        setGroups({ preview: [], study: [], review: [] })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">待办清单</h1>
          <p className="text-gray-500 mt-1">按预习 / 学习 / 复习三阶段管理学习任务</p>
        </div>
        <Link
          href="/settings/todos"
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          设置每日题量
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        <TodoBoard groups={groups} dailyLimit={dailyLimit} />
      </div>
    </div>
  )
}

function normalizeLimit(value: unknown): number {
  const num = typeof value === 'number' ? value : DEFAULT_DAILY_LIMIT
  return Math.max(MIN_DAILY_LIMIT, Math.min(MAX_DAILY_LIMIT, num))
}

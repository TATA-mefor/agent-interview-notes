'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Card, ReviewTask } from '@/lib/types'

export default function ReviewDashboard() {
  const [tasks, setTasks] = useState<(ReviewTask & { card?: Card })[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState({ totalCards: 0, avgMastery: 0, todayTotal: 0, todayCompleted: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch cards and review tasks in parallel
      const [cardsRes, tasksRes] = await Promise.all([
        fetch('/api/cards?limit=100'),
        fetch('/api/review?action=today'),
      ])

      const cardsData = cardsRes.ok ? await cardsRes.json() : { data: [] }
      const tasksData = tasksRes.ok ? await tasksRes.json() : { data: [] }

      const cards: Card[] = cardsData.data || []
      const tasks: ReviewTask[] = tasksData.data || []

      // Merge tasks with cards
      const merged = tasks.map((t) => ({
        ...t,
        card: cards.find((c) => c.id === t.card_id),
      }))

      setTasks(merged)
      setStats({
        totalCards: cards.length,
        avgMastery: cards.length > 0
          ? Math.round((cards.reduce((s, c) => s + c.mastery, 0) / cards.length) * 100)
          : 0,
        todayTotal: tasks.length,
        todayCompleted: tasks.filter((t) => t.completed).length,
      })
    } catch {
      // offline
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleGeneratePlan() {
    setGenerating(true)
    try {
      const res = await fetch('/api/review?action=plan')
      if (res.ok) {
        await fetchData()
      }
    } catch { /* ignore */ } finally {
      setGenerating(false)
    }
  }

  async function handleComplete(taskId: string, isCorrect: boolean) {
    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, isCorrect }),
      })
      fetchData()
    } catch { /* ignore */ }
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">加载中...</div>
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox label="题库总数" value={stats.totalCards} unit="题" />
        <StatBox label="平均掌握度" value={`${stats.avgMastery}%`} unit="" />
        <StatBox label="今日任务" value={stats.todayTotal} unit="项" />
        <StatBox label="已完成" value={stats.todayCompleted} unit="项" color="text-green-600" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? '生成中...' : '生成今日计划'}
        </button>
        <Link
          href="/review/gantt"
          className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
        >
          甘特图视图
        </Link>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">今日暂无复习计划</p>
          <p className="text-xs mt-1">点击「生成今日计划」基于优先级自动排期</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-lg border p-4 flex items-center justify-between ${
                task.completed ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    task.priority_score > 0.7
                      ? 'bg-red-100 text-red-700'
                      : task.priority_score > 0.4
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {task.priority_score > 0.7 ? '紧急' : task.priority_score > 0.4 ? '常规' : '巩固'}
                  </span>
                  {task.card && (
                    <span className="text-xs text-gray-400">{task.card.topic}</span>
                  )}
                  {task.completed && (
                    <span className="text-xs text-green-600 font-medium">✓ 已完成</span>
                  )}
                </div>
                {task.card && (
                  <Link
                    href={`/cards/${task.card.id}`}
                    className="text-sm text-gray-800 hover:text-blue-600 truncate block"
                  >
                    {task.card.question}
                  </Link>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>优先级: {task.priority_score.toFixed(2)}</span>
                  {task.card && <span>掌握度: {Math.round(task.card.mastery * 100)}%</span>}
                </div>
              </div>

              {!task.completed && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleComplete(task.id, true)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    掌握了
                  </button>
                  <button
                    onClick={() => handleComplete(task.id, false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300"
                  >
                    不熟
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Formula Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 text-xs text-gray-500 font-mono">
        <div className="font-medium text-gray-600 mb-1">复习优先级公式</div>
        <code>
          review_priority = base_weight × 0.7 + forgetting_factor × 0.2 + manual_boost × 0.1
        </code>
        <div className="mt-1">
          base_weight = difficulty_coeff × frequency_coeff × (1 - mastery)
        </div>
        <div>
          forgetting_factor = 1 - e<sup>-days/7</sup>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, unit, color }: { label: string; value: string | number; unit: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color || 'text-gray-900'}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>}
      </div>
    </div>
  )
}

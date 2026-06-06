'use client'

import { useState, useEffect } from 'react'
import type { Card, ReviewTask } from '@/lib/types'

const DAYS_TO_SHOW = 14

export default function GanttChart() {
  const [cards, setCards] = useState<Card[]>([])
  const [tasks, setTasks] = useState<ReviewTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [cardsRes, tasksRes] = await Promise.all([
          fetch('/api/cards?limit=50'),
          fetch('/api/review?action=today'),
        ])
        const cardsData = await cardsRes.json()
        const tasksData = await tasksRes.json()
        setCards(cardsData.data || [])
        setTasks(tasksData.data || [])
      } catch { /* offline */ } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Generate date headers
  const dates: Date[] = []
  const today = new Date()
  for (let i = 0; i < DAYS_TO_SHOW; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }

  // Sort cards by review priority (highest first)
  const sorted = [...cards].sort((a, b) => b.review_priority - a.review_priority).slice(0, 20)

  // Assign each card a scheduled day based on priority (simulated Gantt)
  const cardSchedule = sorted.map((card, idx) => {
    // Higher priority → earlier days
    const dayOffset = Math.floor((1 - card.review_priority) * (DAYS_TO_SHOW - 1))
    const clamped = Math.min(dayOffset, DAYS_TO_SHOW - 1)
    return { card, scheduledDay: clamped }
  })

  if (loading) {
    return <div className="text-gray-400 text-center py-12">加载中...</div>
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-400 rounded" /> 紧急 (&gt;0.7)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400 rounded" /> 常规 (0.4-0.7)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-400 rounded" /> 巩固 (&lt;0.4)
        </span>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div style={{ minWidth: dates.length * 70 + 250 }}>
          {/* Header row */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-[250px] shrink-0 px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200">
              题目
            </div>
            {dates.map((d, i) => {
              const isToday = i === 0
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[70px] px-1 py-2 text-center text-xs border-r border-gray-100 ${
                    isToday ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {d.getMonth() + 1}/{d.getDate()}
                  </div>
                  <div className="text-gray-400 text-[10px]">
                    {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Card rows */}
          {cardSchedule.map(({ card, scheduledDay }) => {
            const priorityColor =
              card.review_priority > 0.7
                ? 'bg-red-400'
                : card.review_priority > 0.4
                ? 'bg-yellow-400'
                : 'bg-green-400'

            return (
              <div key={card.id} className="flex border-b border-gray-50 hover:bg-gray-50/50">
                <div className="w-[250px] shrink-0 px-3 py-2 border-r border-gray-200">
                  <div className="text-xs text-gray-800 truncate">{card.question}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{card.topic}</span>
                    <span className="text-xs text-gray-400">{card.review_priority.toFixed(2)}</span>
                  </div>
                </div>

                {dates.map((_, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`flex-1 min-w-[70px] px-1 py-2 border-r border-gray-100 ${
                      dayIdx === 0 ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {dayIdx === scheduledDay && (
                      <div className={`h-6 ${priorityColor} rounded flex items-center justify-center`}>
                        <span className="text-white text-[10px] font-medium">
                          {card.mastery ? Math.round(card.mastery * 100) + '%' : '复习'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        基于 review_priority 自动排期（最高优先级排在最早日期）。
        点击「复习中心」生成实际复习任务。
      </div>
    </div>
  )
}

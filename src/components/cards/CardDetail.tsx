'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import AiSuggestionPanel from './AiSuggestionPanel'

const DIFFICULTY_COLORS: Record<string, string> = {
  '初级': 'bg-green-100 text-green-800',
  '中级': 'bg-yellow-100 text-yellow-800',
  '高级': 'bg-red-100 text-red-800',
}

const FREQUENCY_COLORS: Record<string, string> = {
  '高频': 'bg-red-100 text-red-800',
  '中频': 'bg-yellow-100 text-yellow-800',
  '低频': 'bg-green-100 text-green-800',
}

interface CardDetailProps {
  id: string
}

export default function CardDetail({ id }: CardDetailProps) {
  const router = useRouter()
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cards/${id}`)
      if (res.status === 404) {
        setError('卡片不存在')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { data } = await res.json()
      setCard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCard()
  }, [fetchCard])

  async function handleDelete() {
    if (!confirm('确定删除这张卡片？此操作不可撤销。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/cards')
    } catch {
      setError('删除失败')
      setDeleting(false)
    }
  }

  async function handleApplyField(field: string, value: string | string[]) {
    try {
      const updateData: Record<string, unknown> = {}

      if (field === 'key_points') {
        // Append to extended_notes
        const pointsStr = (value as string[]).map((p, i) => `${i + 1}. ${p}`).join('\n')
        const existing = card?.extended_notes || ''
        updateData.extended_notes = existing
          ? `${existing}\n\n## 关键要点\n${pointsStr}`
          : `## 关键要点\n${pointsStr}`
      } else if (field === 'common_mistakes') {
        const mistakesStr = (value as string[]).map((m, i) => `${i + 1}. ${m}`).join('\n')
        const existing = card?.common_mistakes || ''
        updateData.common_mistakes = existing
          ? `${existing}\n${mistakesStr}`
          : mistakesStr
      } else if (field === 'tags') {
        const existing = card?.tags || []
        updateData.tags = [...new Set([...existing, ...(value as string[])])]
      } else {
        updateData[field] = value as string
      }

      const res = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (!res.ok) throw new Error('Update failed')
      const { data } = await res.json()
      setCard(data)
    } catch {
      alert('采纳失败，请重试')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
        <Link href="/cards" className="text-blue-600 text-sm underline mt-2 inline-block">
          返回题库
        </Link>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">{card.id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[card.difficulty]}`}>
              {card.difficulty}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${FREQUENCY_COLORS[card.frequency]}`}>
              {card.frequency}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{card.question}</h1>
          <p className="text-sm text-gray-500 mt-1">主题：{card.topic}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/cards/${card.id}?edit=1`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            编辑
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? '删除中...' : '删除'}
          </button>
        </div>
      </div>

      {/* Answer */}
      <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📝 标准答案</h2>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {card.answer || <span className="text-gray-400 italic">暂无答案</span>}
        </div>
      </section>

      {/* Personal Notes */}
      <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📒 个人笔记</h2>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {card.personal_notes || <span className="text-gray-400 italic">暂无笔记，点击编辑添加</span>}
        </div>
      </section>

      {/* Extended Notes */}
      {card.extended_notes && (
        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📚 扩展知识</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {card.extended_notes}
          </div>
        </section>
      )}

      {/* Interview Script */}
      {card.interview_script && (
        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">🎤 面试话术</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {card.interview_script}
          </div>
        </section>
      )}

      {/* Common Mistakes */}
      {card.common_mistakes && (
        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">⚠️ 易错点</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {card.common_mistakes}
          </div>
        </section>
      )}

      {/* Review Stats */}
      <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 复习统计</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{card.mastery ? Math.round(card.mastery * 100) : 0}%</div>
            <div className="text-xs text-gray-500 mt-1">掌握度</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{card.review_count}</div>
            <div className="text-xs text-gray-500 mt-1">复习次数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{(card.probability_weight ?? 0).toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">权重</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{(card.review_priority ?? 0).toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">优先级</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          最后复习：{card.last_review ? new Date(card.last_review).toLocaleDateString('zh-CN') : '从未复习'}
        </div>
      </section>

      {/* Tags */}
      <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">🏷️ 标签</h2>
        <div className="flex flex-wrap gap-1.5">
          {card.tags?.length > 0 ? (
            card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm italic">无标签</span>
          )}
        </div>
      </section>

      {/* AI Understanding */}
      <section className="mb-4">
        <AiSuggestionPanel cardId={card.id} onApplyField={handleApplyField} />
      </section>
    </div>
  )
}

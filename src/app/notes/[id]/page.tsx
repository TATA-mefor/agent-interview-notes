'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import MarkdownEditor from '@/components/markdown/MarkdownEditor'
import type { Card } from '@/lib/types'

export default function NoteEditPage() {
  const { id } = useParams<{ id: string }>()
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wikilinks, setWikilinks] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])

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

  const handleSave = useCallback(
    async (value: string) => {
      if (!card) throw new Error('No card loaded')
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_notes: value }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || '保存失败')
      }
    },
    [card]
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-400 text-center py-12">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Link href="/notes" className="text-blue-600 text-sm underline mt-2 inline-block">
            返回笔记列表
          </Link>
        </div>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link
            href="/notes"
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block"
          >
            ← 笔记列表
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{card.question}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
              {card.topic}
            </span>
            <Link
              href={`/cards/${card.id}`}
              className="text-xs text-gray-400 hover:text-blue-600"
            >
              查看卡片详情 →
            </Link>
          </div>
        </div>
      </div>

      {/* Wikilinks & Tags */}
      {(wikilinks.length > 0 || tags.length > 0) && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          {wikilinks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">🔗 双链:</span>
              {wikilinks.map((link) => (
                <a
                  key={link}
                  href={`/cards?search=${encodeURIComponent(link)}`}
                  className="text-blue-600 hover:underline"
                >
                  {link}
                </a>
              ))}
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">🏷️ 标签:</span>
              {tags.map((tag) => (
                <a
                  key={tag}
                  href={`/cards?tags=${encodeURIComponent(tag)}`}
                  className="text-green-600 hover:underline"
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <MarkdownEditor
        initialValue={card.personal_notes}
        onSave={handleSave}
        onWikilinksChange={setWikilinks}
        onTagsChange={setTags}
        minHeight="50vh"
      />

      {/* Quick Reference */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
        <span className="font-medium text-gray-600">快捷语法：</span>
        &nbsp;<code className="bg-gray-200 px-1 rounded">**粗体**</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">*斜体*</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">`代码`</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">[[双链]]</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">#标签</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">## 标题</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">- 列表</code>
        &nbsp;<code className="bg-gray-200 px-1 rounded">Ctrl+S</code> 保存
      </div>
    </div>
  )
}

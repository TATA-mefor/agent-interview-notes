'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DEFAULT_LIMIT = 10
const MIN_LIMIT = 10
const MAX_LIMIT = 20

export default function TodoSettingsPage() {
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings?key=todo_preview_daily_limit')
        const { data } = await res.json()
        const value = data?.value?.limit
        if (typeof value === 'number') {
          setLimit(Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, value)))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'todo_preview_daily_limit',
          value: { limit },
          description: '每日预习题量',
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">待办设置</h1>
        <p className="text-gray-500 mt-1">加载中...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-blue-600 hover:underline">
          ← 返回设置
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">待办设置</h1>
        <p className="text-gray-500 mt-1">配置每日预习题量</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label htmlFor="daily-limit" className="block text-sm font-medium text-gray-700">
            每日预习题量
          </label>
          <p className="text-xs text-gray-500 mt-1">范围 {MIN_LIMIT}–{MAX_LIMIT} 题</p>
          <input
            id="daily-limit"
            type="number"
            min={MIN_LIMIT}
            max={MAX_LIMIT}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-2 block w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {saved && <span className="text-sm text-green-600">已保存</span>}
        </div>
      </form>
    </div>
  )
}

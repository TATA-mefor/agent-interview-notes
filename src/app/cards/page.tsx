'use client'

import { useState } from 'react'
import CardTable from '@/components/cards/CardTable'
import CardGridView from '@/components/cards/views/CardGridView'

export default function CardsPage() {
  const [mode, setMode] = useState<'table' | 'grid'>('grid')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">题库管理</h1>
          <p className="text-gray-500 mt-1">管理和浏览 Agent 面试题目卡片</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
            <button onClick={() => setMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${mode === 'grid' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500'}`}>
              卡片
            </button>
            <button onClick={() => setMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${mode === 'table' ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500'}`}>
              表格
            </button>
          </div>
          <a href="/cards/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + 新建卡片
          </a>
        </div>
      </div>

      {mode === 'grid' ? <CardGridView /> : <CardTable />}
    </div>
  )
}

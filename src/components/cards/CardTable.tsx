'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import type { Card } from '@/lib/types'

const DIFFICULTY_CLASS: Record<string, string> = {
  '初级': 'bg-green-100 text-green-800',
  '中级': 'bg-yellow-100 text-yellow-800',
  '高级': 'bg-red-100 text-red-800',
}

const FREQUENCY_CLASS: Record<string, string> = {
  '高频': 'bg-red-100 text-red-800',
  '中频': 'bg-yellow-100 text-yellow-800',
  '低频': 'bg-green-100 text-green-800',
}

export default function CardTable() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quickFilter, setQuickFilter] = useState('')

  const fetchCards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cards?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { data } = await res.json()
      setCards(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const columnDefs = useMemo<ColDef<Card>[]>(
    () => [
      {
        field: 'topic',
        headerName: '主题',
        width: 110,
        filter: 'agTextColumnFilter',
        pinned: 'left',
      },
      {
        field: 'question',
        headerName: '题目',
        flex: 1,
        minWidth: 200,
        filter: 'agTextColumnFilter',
        cellStyle: { whiteSpace: 'normal', lineHeight: '1.4' },
      },
      {
        field: 'difficulty',
        headerName: '难度',
        width: 80,
        filter: 'agSetColumnFilter',
        cellRenderer: (params: { value: string }) =>
          `<span class="px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_CLASS[params.value] || ''}">${params.value}</span>`,
      },
      {
        field: 'frequency',
        headerName: '频率',
        width: 80,
        filter: 'agSetColumnFilter',
        cellRenderer: (params: { value: string }) =>
          `<span class="px-2 py-0.5 rounded text-xs font-medium ${FREQUENCY_CLASS[params.value] || ''}">${params.value}</span>`,
      },
      {
        field: 'mastery',
        headerName: '掌握度',
        width: 100,
        filter: 'agNumberColumnFilter',
        editable: true,
        valueFormatter: (params: { value: number }) => `${Math.round((params.value ?? 0) * 100)}%`,
        cellStyle: (params: { value: number }) => {
          const v = params.value ?? 0
          if (v >= 0.8) return { color: '#16a34a', fontWeight: 'bold' }
          if (v >= 0.5) return { color: '#ca8a04', fontWeight: 'bold' }
          return { color: '#dc2626', fontWeight: 'bold' }
        },
      },
      {
        field: 'review_count',
        headerName: '复习次数',
        width: 90,
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'probability_weight',
        headerName: '权重',
        width: 80,
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: { value: number }) => (params.value ?? 0).toFixed(2),
      },
      {
        field: 'tags',
        headerName: '标签',
        width: 200,
        filter: 'agTextColumnFilter',
        valueFormatter: (params: { value: string[] }) =>
          Array.isArray(params.value) ? params.value.join(', ') : '',
      },
      {
        headerName: '操作',
        width: 100,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: Card }) => {
          const id = params.data.id
          return `<a href="/cards/${id}" class="text-blue-600 hover:underline text-xs">查看</a>`
        },
      },
    ],
    []
  )

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      autoHeight: true,
      wrapText: true,
    }),
    []
  )

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
  }, [])

  const handleMasteryChange = useCallback(
    async (event: { data: Card; newValue: string; oldValue: string }) => {
      const newMastery = parseFloat(event.newValue)
      if (isNaN(newMastery) || newMastery < 0 || newMastery > 1) {
        setError('掌握度必须在 0 到 1 之间')
        fetchCards() // refresh to revert
        return
      }
      try {
        await fetch(`/api/cards/${event.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mastery: newMastery }),
        })
      } catch {
        setError('更新掌握度失败')
        fetchCards()
      }
    },
    [fetchCards]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('确定删除这张卡片？')) return
      try {
        const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        fetchCards()
      } catch {
        setError('删除失败')
      }
    },
    [fetchCards]
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        {error}
        <button onClick={fetchCards} className="ml-3 underline">重试</button>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="搜索题目..."
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">{cards.length} 张卡片</span>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 260px)', width: '100%' }}>
        <AgGridReact<Card>
          rowData={cards}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          onGridReady={onGridReady}
          onCellValueChanged={handleMasteryChange}
          onRowClicked={(e) => router.push(`/cards/${e.data!.id}`)}
          rowSelection="multiple"
          suppressRowClickSelection
          pagination
          paginationPageSize={25}
          animateRows
          rowHeight={48}
        />
      </div>
    </div>
  )
}

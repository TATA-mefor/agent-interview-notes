'use client'

import { useState, useRef, useCallback } from 'react'

interface UploadResult {
  title: string
  chunkCount: number
  id: string
}

export default function KnowledgeUploader({ onDone }: { onDone: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<UploadResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setUploading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData })
      if (!res.ok) { const { error: m } = await res.json(); throw new Error(m) }
      const { data } = await res.json()
      setResults(prev => [...prev, data])
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally { setUploading(false) }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    Array.from(e.dataTransfer.files).forEach(processFile)
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}>
        <div className="text-3xl mb-2">{uploading ? '⏳' : '📁'}</div>
        <div className="text-sm font-medium text-gray-700">
          {uploading ? '处理中...' : '拖拽文件到此处或点击上传'}
        </div>
        <div className="text-xs text-gray-400 mt-1">PDF / DOCX / Markdown / TXT</div>
        <div className="text-xs text-gray-400">自动提取文本 → chunk 切分 → embedding 向量化</div>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.md,.markdown,.txt"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} className="hidden" />
      </div>

      {/* Error */}
      {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>}

      {/* Results */}
      {results.map(r => (
        <div key={r.id} className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-green-800">{r.title}</div>
            <div className="text-xs text-green-600">{r.chunkCount} 个切块 · 已向量化 · AI 可检索</div>
          </div>
          <span className="text-green-500 text-lg">✓</span>
        </div>
      ))}

      {/* Done button */}
      {results.length > 0 && (
        <button onClick={onDone} className="mt-4 w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          完成 → 刷新列表
        </button>
      )}
    </div>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'
import type { ImportPreview, PreviewRow, ImportResult } from '@/lib/services/importService'

type Step = 'upload' | 'preview' | 'importing' | 'done' | 'knowledge_preview'

export default function ImportWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [knowledgeData, setKnowledgeData] = useState<{ fileName: string; rawText: string; textLength: number } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pasteText, setPasteText] = useState('')

  // ---- Upload ----
  const handleFileUpload = useCallback(async (file: File, mode: string = 'auto') => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', mode)
      const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || '解析失败')
      }
      const { data } = await res.json()

      if (data.mode === 'knowledge') {
        // Knowledge document import
        setKnowledgeData(data)
        setPreview(null)
        setStep('knowledge_preview')
      } else {
        setPreview(data)
        setKnowledgeData(null)
        setSelectedIndices(new Set(data.rows.filter((r: PreviewRow) => !r.isDuplicate).map((r: PreviewRow) => r.index)))
        setStep('preview')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePasteSubmit = useCallback(async () => {
    if (!pasteText.trim()) {
      setError('请输入要导入的内容')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('text', pasteText)
      const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || '解析失败')
      }
      const { data } = await res.json()
      setPreview(data)
      setSelectedIndices(new Set(data.rows.filter((r: PreviewRow) => !r.isDuplicate).map((r: PreviewRow) => r.index)))
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '文本解析失败')
    } finally {
      setLoading(false)
    }
  }, [pasteText])

  // ---- Execute Import ----
  const handleImport = useCallback(async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    setStep('importing')

    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: preview.jobId,
          rows: preview.rows,
          options: {
            skipDuplicates,
            overwriteDuplicates,
            selectedIndices: Array.from(selectedIndices),
          },
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || '导入失败')
      }
      const { data } = await res.json()
      setResult(data)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入执行失败')
      setStep('preview') // allow retry
    } finally {
      setLoading(false)
    }
  }, [preview, selectedIndices, skipDuplicates, overwriteDuplicates])

  const toggleRow = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (!preview) return
    if (selectedIndices.size === preview.rows.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(preview.rows.map((r) => r.index)))
    }
  }

  // ---- Import as Knowledge Document ----
  const handleImportAsKnowledge = useCallback(async () => {
    if (!knowledgeData) return
    setLoading(true)
    setError(null)
    setStep('importing')
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: knowledgeData.fileName.replace(/\.[^.]+$/, ''),
          content: knowledgeData.rawText,
          file_type: 'markdown',
        }),
      })
      if (!res.ok) throw new Error('创建知识文档失败')
      const { data: doc } = await res.json()

      // Auto-process (chunk + embed)
      await fetch(`/api/knowledge/${doc.id}`, { method: 'POST' }).catch(() => {})

      setResult({ jobId: doc.id, imported: 1, skipped: 0, overwritten: 0, errors: [] })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '知识文档导入失败')
      setStep('knowledge_preview')
    } finally {
      setLoading(false)
    }
  }, [knowledgeData])

  // ---- Render: Upload Step ----
  if (step === 'upload') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">批量导入</h1>
        <p className="text-gray-500 mb-6">支持 CSV / JSON / Markdown / PDF / Word 格式</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* File Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer mb-4"
        >
          <div className="text-3xl mb-2">📁</div>
          <div className="text-sm font-medium text-gray-700">
            {loading ? '解析中...' : '点击选择文件或拖拽到此处'}
          </div>
          <div className="text-xs text-gray-400 mt-1">支持 .csv / .json / .md / .pdf / .docx 文件</div>
          <div className="text-xs text-gray-400 mt-0.5">PDF/Word 自动提取文本，可导入为知识文档或题目卡片</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.md,.markdown,.txt,.pdf,.docx,.doc"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
            className="hidden"
          />
        </div>

        {/* Paste Area */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">或直接粘贴内容</div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={`支持格式示例：

CSV:
topic,question,difficulty
基础概念,What is an Agent?,初级

JSON:
[{"topic": "基础概念", "question": "What is an Agent?"}]

Markdown:
- [基础概念] What is an Agent?
- [核心模块] How does RAG work?`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <button
            onClick={handlePasteSubmit}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            解析内容
          </button>
        </div>
      </div>
    )
  }

  // ---- Render: Preview Step ----
  if (step === 'preview' && preview) {
    const selectedCount = selectedIndices.size
    const allSelected = selectedCount === preview.rows.length

    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">预览导入</h1>
            <p className="text-gray-500 mt-1">
              共 {preview.totalRows} 条，
              <span className="text-orange-600">{preview.duplicateCount} 条重复</span>，
              <span className="text-green-600">{preview.newCount} 条新数据</span>
              {preview.parseErrors.length > 0 && (
                <span className="text-red-600">，{preview.parseErrors.length} 条解析错误</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStep('upload'); setPreview(null) }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              返回
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || loading}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              导入选中 ({selectedCount} 条)
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">跳过重复题</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteDuplicates}
              onChange={(e) => setOverwriteDuplicates(e.target.checked)}
              disabled={!skipDuplicates}
              className="rounded"
            />
            <span className="text-gray-700">覆盖已有卡片</span>
          </label>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">主题</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">题目</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">难度</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row) => (
                  <tr
                    key={row.index}
                    className={`hover:bg-gray-50 ${row.isDuplicate ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIndices.has(row.index)}
                        onChange={() => toggleRow(row.index)}
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-400">{row.index + 1}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {row.topic}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800 max-w-xs truncate">{row.question}</td>
                    <td className="px-3 py-2">{row.difficulty}</td>
                    <td className="px-3 py-2">
                      {row.isDuplicate ? (
                        <span className="text-orange-600 text-xs" title={row.duplicateOf}>
                          ⚠️ 重复
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs">✓ 新</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Parse Errors */}
        {preview.parseErrors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-medium text-red-700 mb-2">解析错误</div>
            <ul className="text-xs text-red-600 space-y-1">
              {preview.parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // ---- Render: Importing ----
  if (step === 'importing') {
    return (
      <div className="max-w-2xl text-center py-12">
        <div className="text-4xl mb-4 animate-bounce">⏳</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">正在导入...</h2>
        <p className="text-gray-500">请稍候，正在将数据写入数据库</p>
      </div>
    )
  }

  // ---- Render: Done ----
  if (step === 'done' && result) {
    return (
      <div className="max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">导入完成</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <ResultCard label="成功导入" value={result.imported} color="text-green-600" />
          <ResultCard label="跳过(重复)" value={result.skipped} color="text-orange-600" />
          <ResultCard label="覆盖更新" value={result.overwritten} color="text-blue-600" />
        </div>

        {result.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-medium text-red-700 mb-2">导入错误</div>
            <ul className="text-xs text-red-600 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setStep('upload'); setPreview(null); setResult(null) }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            继续导入
          </button>
          <a
            href="/cards"
            className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            查看题库
          </a>
        </div>
      </div>
    )
  }

  // ---- Render: Knowledge Document Preview ----
  if (step === 'knowledge_preview' && knowledgeData) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">知识文档预览</h1>
            <p className="text-gray-500 mt-1">
              {knowledgeData.fileName} · {knowledgeData.textLength.toLocaleString()} 字符
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStep('upload'); setKnowledgeData(null) }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              返回
            </button>
            <button
              onClick={handleImportAsKnowledge}
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              导入为知识文档
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">{error}</div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📄 提取的文本内容</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{knowledgeData.rawText.slice(0, 5000)}</pre>
            {knowledgeData.rawText.length > 5000 && (
              <p className="text-xs text-gray-400 mt-2">
                ... 还有 {(knowledgeData.rawText.length - 5000).toLocaleString()} 字符未显示
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

function ResultCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

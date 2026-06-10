'use client'

import React, { useState, useCallback, useRef } from 'react'
import type { ImportPreview, PreviewRow, ImportResult } from '@/lib/services/importService'
import QaCandidateTable, { type QaCandidate } from './QaCandidateTable'
import QaCandidateEditor from './QaCandidateEditor'

type Step = 'upload' | 'preview' | 'extract' | 'importing' | 'done'

interface DebugActions {
  canRetryLoose: boolean
  canRetryLLM: boolean
  llmConfigured: boolean
  canImportKnowledge: boolean
}

interface ExtractionData {
  candidates: QaCandidate[]
  stats: {
    totalCandidates: number; withAnswer: number; missingAnswer: number
    highConfidence: number; mediumConfidence: number; lowConfidence: number
  }
  debugActions?: DebugActions
}

interface BatchFileItem {
  name: string
  size: string
  status: 'pending' | 'processing' | 'done' | 'error'
  cardsFound: number
  error?: string
  previewData?: ImportPreview
}

type ExtractMode = 'auto' | 'strict' | 'loose' | 'llm_assisted' | 'hybrid'
type ImportPurpose = 'knowledge_only' | 'extract_cards' | 'both'

export default function ImportWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pasteText, setPasteText] = useState('')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  // Import purpose & extraction mode
  const [importPurpose, setImportPurpose] = useState<ImportPurpose>('extract_cards')
  const [extractionData, setExtractionData] = useState<ExtractionData | null>(null)
  const [extractMode, setExtractMode] = useState<ExtractMode>('auto')
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set())
  const [skippedCandidateIds, setSkippedCandidateIds] = useState<Set<string>>(new Set())
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const [extractingFile, setExtractingFile] = useState<File | null>(null)
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null)

  // Batch file processing
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([])
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchAllRows, setBatchAllRows] = useState<PreviewRow[]>([])

  // ============================================================
  // Handlers
  // ============================================================

  async function runExtraction(text: string, mode: ExtractMode) {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/import/extract-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      })
      if (!res.ok) { const { error: m } = await res.json(); throw new Error(m || '抽取失败') }
      const { data } = await res.json()
      setExtractionData(data)

      if (data.candidates?.length === 0 && data.debug) {
        const d = data.debug
        const parts = [
          `未在当前模式下抽取到题目。`,
          '',
          d.suggestion,
          '',
          `文本长度: ${d.textLength.toLocaleString()} 字符`,
          d.hasQMarks ? '✓ 检测到问号' : '✗ 未检测到问号',
          d.hasQAMarkers ? '✓ 检测到 Q/A 标记' : '✗ 未检测到 Q/A 标记',
        ]
        setError(parts.join('\n'))

        // Store debug actions for UI buttons
        setExtractionData({
          candidates: [],
          stats: { totalCandidates: 0, withAnswer: 0, missingAnswer: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 },
          debugActions: d.actions,
        } as ExtractionData & { debugActions: typeof d.actions })
        setLoading(false)
        return
      }

      setSelectedCandidateIds(new Set(
        data.candidates
          .filter((c: QaCandidate) => c.confidence >= 0.8 && c.answerStatus === 'present')
          .map((c: QaCandidate) => c.id)
      ))
      setStep('extract')
    } catch (err) {
      setError(err instanceof Error ? err.message : '题目抽取失败')
    } finally { setLoading(false) }
  }

  async function retryExtraction(mode: ExtractMode) {
    setExtractMode(mode)
    if (extractingFile) { await handleFileUpload(extractingFile) }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true); setError(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const isDoc = ext === 'pdf' || ext === 'docx' || ext === 'doc'

      const formData = new FormData()
      formData.append('file', file)

      if (isDoc) {
        // Knowledge-only: upload directly to knowledge API
        if (importPurpose === 'knowledge_only') {
          const kForm = new FormData()
          kForm.append('file', file)
          const kRes = await fetch('/api/knowledge/upload', { method: 'POST', body: kForm })
          if (!kRes.ok) { const { error: m } = await kRes.json(); throw new Error(m || '知识库导入失败') }
          const { data: kData } = await kRes.json()
          setResult({ jobId: kData.id, imported: 1, skipped: 0, overwritten: 0, errors: [] })
          setStep('done')
          return
        }

        setExtractingFile(file)
        formData.append('mode', 'knowledge')
        const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
        if (!res.ok) { const { error: m } = await res.json(); throw new Error(m || '文本提取失败') }
        const { data } = await res.json()
        if (data.rawText) {
          await runExtraction(data.rawText, extractMode)
        } else {
          throw new Error('未能从文件中提取文本。请确认不是扫描版 PDF。')
        }
      } else {
        formData.append('mode', 'auto')
        const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
        if (!res.ok) { const { error: m } = await res.json(); throw new Error(m || '解析失败') }
        const { data } = await res.json()

        if (data.rows && data.rows.length > 0) {
          setPreview(data)
          setSelectedIndices(new Set(data.rows.filter((r: PreviewRow) => !r.isDuplicate).map((r: PreviewRow) => r.index)))
          setStep('preview')
        } else if (data.suggestKnowledge) {
          setPreview(data); setStep('preview')
        } else {
          setError('未能从文件中提取题目。请确认文件内容包含可识别的 Q&A 格式。')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败')
    } finally { setLoading(false) }
  }, [extractMode, importPurpose])

  /** Batch process multiple files sequentially */
  async function handleBatchFiles(files: File[]) {
    setBatchProcessing(true); setError(null)
    const items: BatchFileItem[] = files.map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      status: 'pending' as const,
      cardsFound: 0,
    }))
    setBatchFiles(items)
    const allRows: PreviewRow[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'processing' } : bf))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('mode', 'knowledge') // extract text, then parse

        const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
        if (!res.ok) {
          const { error: msg } = await res.json()
          throw new Error(msg || '解析失败')
        }
        const { data } = await res.json()

        if (data.rows && data.rows.length > 0) {
          // Structured file (CSV/JSON/MD) — got rows directly
          const rows = data.rows.filter((r: PreviewRow) => !r.isDuplicate)
          allRows.push(...rows)
          setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'done', cardsFound: rows.length } : bf))
        } else if (data.rawText) {
          // Unstructured (PDF/DOCX) — use LLM knowledge-driven extraction
          try {
            const extractRes = await fetch('/api/import/extract-qa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.rawText, mode: llmConfigured ? 'llm_assisted' : extractMode }),
            })
            if (extractRes.ok) {
              const { data: extData } = await extractRes.json()
              if (extData.candidates?.length > 0) {
                // Convert candidates to rows
                const rows: PreviewRow[] = extData.candidates
                  .filter((c: QaCandidate) => c.confidence >= 0.7)
                  .map((c: QaCandidate, idx: number) => ({
                    index: allRows.length + idx,
                    topic: c.topic, question: c.question, answer: c.answer,
                    difficulty: c.difficulty, frequency: c.frequency,
                    tags: c.tags, isDuplicate: false,
                  }))
                allRows.push(...rows)
                setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'done', cardsFound: rows.length } : bf))
              } else {
                setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'done', cardsFound: 0 } : bf))
              }
            } else {
              setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'done', cardsFound: 0 } : bf))
            }
          } catch {
            setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'done', cardsFound: 0 } : bf))
          }
        } else {
          setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'done', cardsFound: 0 } : bf))
        }
      } catch (err: any) {
        setBatchFiles(prev => prev.map((bf, idx) => idx === i ? { ...bf, status: 'error', error: err.message?.slice(0, 40) } : bf))
      }
    }

    setBatchProcessing(false)
    setBatchAllRows(allRows)
  }

  const handlePasteSubmit = useCallback(async (useExtraction = false) => {
    if (!pasteText.trim()) { setError('请输入要导入的内容'); return }
    setLoading(true); setError(null)
    try {
      if (useExtraction) {
        await runExtraction(pasteText, extractMode)
      } else {
        const formData = new FormData(); formData.append('text', pasteText)
        const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
        if (!res.ok) { const { error: m } = await res.json(); throw new Error(m || '解析失败') }
        const { data } = await res.json()
        if (data.rows?.length === 0) {
          await runExtraction(pasteText, 'loose')
        } else {
          setPreview(data)
          setSelectedIndices(new Set(data.rows.filter((r: PreviewRow) => !r.isDuplicate).map((r: PreviewRow) => r.index)))
          setStep('preview')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文本解析失败')
    } finally { setLoading(false) }
  }, [pasteText, extractMode])

  const handleImport = useCallback(async () => {
    if (!preview) return
    setLoading(true); setError(null); setStep('importing')
    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: preview.jobId, rows: preview.rows, options: { skipDuplicates: true, overwriteDuplicates: false, selectedIndices: Array.from(selectedIndices) } }),
      })
      if (!res.ok) { const { error: m } = await res.json(); throw new Error(m || '导入失败') }
      const { data } = await res.json()
      setResult(data); setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入执行失败'); setStep('preview')
    } finally { setLoading(false) }
  }, [preview, selectedIndices])

  const handleImportCandidates = useCallback(async () => {
    if (!extractionData) return
    const selected = extractionData.candidates.filter(c => selectedCandidateIds.has(c.id))
    if (selected.length === 0) { setError('请至少选择一个候选题目'); return }

    setLoading(true); setError(null); setStep('importing')
    try {
      const cardsForImport = selected.map(c => ({
        topic: c.topic, question: c.question, answer: c.answer,
        difficulty: c.difficulty, frequency: c.frequency,
        tags: Array.isArray(c.tags) ? c.tags.join(',') : '',
      }))
      const jsonStr = JSON.stringify(cardsForImport)
      const fd = new FormData(); fd.append('text', jsonStr)

      const parseRes = await fetch('/api/import/parse', { method: 'POST', body: fd })
      if (!parseRes.ok) throw new Error('解析失败')
      const { data: previewData } = await parseRes.json()

      const execRes = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: previewData.jobId, rows: previewData.rows,
          options: { skipDuplicates: true, overwriteDuplicates: false }
        }),
      })
      if (!execRes.ok) { const { error: m } = await execRes.json(); throw new Error(m || '导入失败') }
      const { data: execData } = await execRes.json()
      setResult({ ...execData, imported: selected.length })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入执行失败'); setStep('extract')
    } finally { setLoading(false) }
  }, [extractionData, selectedCandidateIds])

  const handleUpdateCandidate = useCallback((candidateId: string, patch: Partial<QaCandidate>) => {
    if (!extractionData) return
    setExtractionData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        candidates: prev.candidates.map(c =>
          c.id === candidateId ? { ...c, ...patch } : c
        ),
      }
    })
  }, [extractionData])

  const handleSkipCandidate = useCallback((id: string) => {
    setSkippedCandidateIds(prev => new Set(prev).add(id))
    // Also deselect
    setSelectedCandidateIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleRestoreCandidate = useCallback((id: string) => {
    setSkippedCandidateIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleRow = (idx: number) => setSelectedIndices(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  const toggleAll = () => {
    if (!preview) return
    setSelectedIndices(prev => prev.size === preview.rows.length ? new Set() : new Set(preview.rows.map(r => r.index)))
  }

  // ============================================================
  // Step: Upload
  // ============================================================
  if (step === 'upload') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">文档导入</h1>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4 whitespace-pre-wrap">{error}</div>}

        {/* Import purpose */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-3">导入用途</div>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importPurpose === 'extract_cards' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="purpose" value="extract_cards" checked={importPurpose === 'extract_cards'}
                onChange={() => setImportPurpose('extract_cards')} className="shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-800">从文档中抽取题目卡片</div>
                <div className="text-xs text-gray-400">规则匹配 Q&A → 预览确认 → 写入题库</div>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importPurpose === 'knowledge_only' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="purpose" value="knowledge_only" checked={importPurpose === 'knowledge_only'}
                onChange={() => setImportPurpose('knowledge_only')} className="shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-800">仅导入知识库</div>
                <div className="text-xs text-gray-400">解析 → 切分 → 向量化 → 用于 RAG 检索</div>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${importPurpose === 'both' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="purpose" value="both" checked={importPurpose === 'both'}
                onChange={() => setImportPurpose('both')} className="shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-800">同时导入知识库并抽取题目</div>
                <div className="text-xs text-gray-400">先入库 → 再抽取 Q&A → 预览确认</div>
              </div>
            </label>
          </div>
        </div>

        {/* Extraction mode (only when extracting cards) */}
        {importPurpose !== 'knowledge_only' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">抽取模式</div>
            <div className="flex flex-wrap gap-2">
              {(['auto', 'strict', 'loose', 'llm_assisted'] as ExtractMode[]).map(m => (
                <button key={m}
                  onClick={() => setExtractMode(m)}
                  disabled={m === 'llm_assisted' && llmConfigured === false}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    extractMode === m
                      ? 'bg-blue-600 text-white'
                      : m === 'llm_assisted' && llmConfigured === false
                        ? 'border border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={m === 'llm_assisted' && llmConfigured === false ? '需要先配置 LLM' : ''}>
                  {{ auto: '自动（推荐）', strict: '严格', loose: '宽松', llm_assisted: 'LLM 辅助', hybrid: '混合' }[m]}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {extractMode === 'auto' && '自动：先严格匹配 → 0 条则宽松重试 → 仍为 0 则提示 LLM 辅助'}
              {extractMode === 'strict' && '严格：仅匹配 Q/A 标记、编号题、Markdown 标题，误抽最少'}
              {extractMode === 'loose' && '宽松：额外匹配问号句、列表问答，召回率更高'}
              {extractMode === 'llm_assisted' && 'LLM 辅助：规则 + LLM 双重抽取，适合格式混乱的文档'}
            </div>
          </div>
        )}

        {/* File upload */}
        <div onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer mb-4">
          <div className="text-4xl mb-3">📁</div>
          <div className="text-sm font-medium text-gray-700">{loading ? '处理中...' : '点击选择文件或拖拽到此处'}</div>
          <div className="text-xs text-gray-400 mt-1">支持多选 · 文件夹 · CSV / JSON / Markdown / PDF / Word</div>
          <input ref={fileInputRef} type="file"
            accept=".csv,.json,.md,.markdown,.txt,.pdf,.docx,.doc"
            multiple
            onChange={e => {
              const files = Array.from(e.target.files || []);
              if (files.length <= 1) {
                const f = files[0];
                if (f) handleFileUpload(f);
              } else {
                handleBatchFiles(files);
              }
            }}
            className="hidden" />
        </div>

        {/* Batch progress */}
        {batchFiles.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">
                📦 批量导入 {batchFiles.length} 个文件
                {!batchProcessing && (
                  <span className="text-gray-400 ml-2">
                    · 共解析 {batchAllRows.length} 题
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!batchProcessing && batchAllRows.length > 0 && (
                  <button onClick={async () => {
                    if (!batchAllRows.length) return;
                    setLoading(true); setStep('preview');
                    try {
                      const fd = new FormData();
                      fd.append('text', JSON.stringify(batchAllRows.map(r => ({
                        topic: r.topic, question: r.question, answer: r.answer,
                        difficulty: r.difficulty, frequency: r.frequency,
                        tags: Array.isArray(r.tags) ? r.tags.join(',') : (r.tags || ''),
                      }))));
                      const parseRes = await fetch('/api/import/parse', { method: 'POST', body: fd });
                      if (!parseRes.ok) throw new Error('解析失败');
                      const { data: previewData } = await parseRes.json();
                      setPreview(previewData);
                      setSelectedIndices(new Set(
                        previewData.rows.filter((r: PreviewRow) => !r.isDuplicate).map((r: PreviewRow) => r.index)
                      ));
                    } catch (err: any) {
                      setError(err.message || '批量解析失败');
                    } finally { setLoading(false) }
                  }}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={batchProcessing}>
                    ✓ 预览并导入 ({batchAllRows.length} 题)
                  </button>
                )}
                <button onClick={() => { setBatchFiles([]); setBatchAllRows([]); }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  清除
                </button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {batchFiles.map((bf, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded ${
                  bf.status === 'error' ? 'bg-red-50' :
                  bf.status === 'processing' ? 'bg-blue-50' :
                  bf.status === 'done' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <span className="w-4 text-center">
                    {bf.status === 'processing' ? '⏳' : bf.status === 'done' ? '✅' : bf.status === 'error' ? '❌' : '⏸'}
                  </span>
                  <span className="flex-1 truncate font-medium">{bf.name}</span>
                  <span className="text-gray-400">{bf.size}</span>
                  {bf.status === 'done' && <span className="text-green-600">{bf.cardsFound} 题</span>}
                  {bf.status === 'error' && <span className="text-red-500 text-xs">{bf.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paste area */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">或粘贴内容</div>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={8}
            placeholder="CSV: topic,question,difficulty&#10;JSON: [{&quot;question&quot;:&quot;...&quot;}]&#10;Markdown: ## 什么是 RAG？"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex gap-2 mt-2">
            <button onClick={() => handlePasteSubmit(false)} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">解析文本</button>
            <button onClick={() => handlePasteSubmit(true)} disabled={loading}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50">规则抽取</button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // Step: Extract (QA candidate preview)
  // ============================================================
  if (step === 'extract' && extractionData) {
    const selCount = selectedCandidateIds.size

    // 0 candidates — show retry options
    if (extractionData.candidates.length === 0) {
      const actions = extractionData.debugActions
      return (
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">题目抽取结果</h1>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4 whitespace-pre-wrap">{error}</div>}

          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center mb-4">
            <div className="text-4xl mb-3">🔍</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">未抽取到题目</h2>
            <p className="text-sm text-gray-500 mb-4">
              {actions?.canRetryLoose
                ? '严格模式未找到 Q/A 结构，可以尝试更宽松的匹配。'
                : '当前模式未能从文本中识别出题目。'}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {actions?.canRetryLoose && (
                <button onClick={() => retryExtraction('loose')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  用宽松模式重试
                </button>
              )}
              {actions?.canRetryLLM && (
                <button onClick={() => retryExtraction('llm_assisted')}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                  用 LLM 辅助重试
                </button>
              )}
              {actions?.llmConfigured === false && (
                <div className="w-full text-xs text-gray-400 mt-1">
                  LLM 辅助模式需要先在
                  <a href="/settings/llm" className="text-blue-600 underline mx-1">LLM 设置</a>
                  配置 API Key
                </div>
              )}
              {actions?.canImportKnowledge && (
                <button onClick={async () => {
                  // Import as knowledge doc
                  const res = await fetch('/api/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: '导入文档', content: pasteText || '', file_type: 'pdf' }),
                  })
                  if (res.ok) {
                    const { data: doc } = await res.json()
                    fetch(`/api/knowledge/${doc.id}`, { method: 'POST' }).catch(() => {})
                    setResult({ jobId: doc.id, imported: 1, skipped: 0, overwritten: 0, errors: [] })
                    setStep('done')
                  }
                }}
                  className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                  仅导入知识库
                </button>
              )}
              <button onClick={() => { setStep('upload'); setExtractionData(null); setError(null) }}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                返回
              </button>
            </div>
          </div>

          {/* Show text preview for diagnosis */}
          <details className="bg-white rounded-xl border border-gray-200 p-4">
            <summary className="text-sm text-gray-600 cursor-pointer">查看解析文本（前 500 字）</summary>
            <pre className="mt-2 text-xs text-gray-500 whitespace-pre-wrap max-h-48 overflow-y-auto">{pasteText?.slice(0, 500) || '（无文本）'}</pre>
          </details>
        </div>
      )
    }

    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">题目抽取结果</h1>
            <p className="text-gray-500 text-sm mt-1">
              从文本中抽取到 <strong>{extractionData.stats.totalCandidates}</strong> 道候选题目，
              <span className="text-green-600"> {extractionData.stats.withAnswer} 道有答案</span>
              {extractionData.stats.missingAnswer > 0 && (
                <span className="text-orange-600"> · {extractionData.stats.missingAnswer} 道缺答案</span>
              )}
              <span className="text-gray-400 ml-1">
                (高{extractionData.stats.highConfidence} / 中{extractionData.stats.mediumConfidence} / 低{extractionData.stats.lowConfidence})
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={extractMode} onChange={(e) => retryExtraction(e.target.value as ExtractMode)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs">
              <option value="strict">严格模式</option>
              <option value="loose">宽松模式</option>
              <option value="llm_assisted">LLM 辅助</option>
            </select>
            <button onClick={() => { setStep('upload'); setExtractionData(null); setExtractingFile(null) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← 返回</button>
            <button onClick={handleImportCandidates} disabled={selCount === 0 || loading}
              className="px-5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              ✓ 导入选中 ({selCount})
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">{error}</div>}

        {/* Candidate table with built-in filters */}
        <div className="flex gap-6">
          <div className={`${activeCandidateId ? 'w-3/5' : 'w-full'} transition-all`}>
            <QaCandidateTable
              candidates={extractionData.candidates}
              selectedIds={selectedCandidateIds}
              skippedIds={skippedCandidateIds}
              activeCandidateId={activeCandidateId}
              onToggle={(id) => {
                const next = new Set(selectedCandidateIds)
                next.has(id) ? next.delete(id) : next.add(id)
                setSelectedCandidateIds(next)
              }}
              onSelectAll={() => setSelectedCandidateIds(new Set(extractionData.candidates.map(c => c.id)))}
              onDeselectAll={() => setSelectedCandidateIds(new Set())}
              onSelectHighConfidence={() => setSelectedCandidateIds(new Set(
                extractionData.candidates.filter(c => c.confidence >= 0.8).map(c => c.id)
              ))}
              onActiveCandidateChange={setActiveCandidateId}
              onSkip={handleSkipCandidate}
              onRestore={handleRestoreCandidate}
            />
          </div>

          {/* Editor side panel */}
          {activeCandidateId && (() => {
            const candidate = extractionData.candidates.find(c => c.id === activeCandidateId)
            if (!candidate) return null
            return (
              <div className="w-2/5 shrink-0">
                <div className="sticky top-4">
                  <QaCandidateEditor
                    candidate={candidate}
                    onSave={(candidateId, patch) => {
                      handleUpdateCandidate(candidateId, patch)
                      setActiveCandidateId(null)
                    }}
                    onClose={() => setActiveCandidateId(null)}
                  />
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // ============================================================
  // Step: Preview (standard CSV/JSON import)
  // ============================================================
  if (step === 'preview' && preview) {
    const count = selectedIndices.size
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">预览确认</h1>
            <p className="text-gray-500 text-sm mt-1">
              共解析 {preview.totalRows} 条，{preview.duplicateCount} 条与题库重复，
              <span className="text-green-600"> {preview.newCount} 条新题目</span>
              {preview.parseErrors.length > 0 && <span className="text-red-600">，{preview.parseErrors.length} 条错误</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setStep('upload'); setPreview(null) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← 返回</button>
            <button onClick={handleImport} disabled={count === 0 || loading}
              className="px-5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              ✓ 确认导入 {count} 题
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">{error}</div>}

        {preview.suggestKnowledge && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-800 mb-1">未识别到题目格式</div>
                <div className="text-xs text-amber-700">此文件更适合导入知识库作为 AI 参考资料。导入后将自动切分+向量化。</div>
                <div className="text-xs text-amber-600 mt-1">已提取 {preview.textLength?.toLocaleString() || preview.rawText?.length || 0} 字符</div>
              </div>
              <button onClick={async () => {
                const res = await fetch('/api/knowledge', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: (preview.rawText?.slice(0, 50) || '导入文档') + '...', content: preview.rawText, file_type: 'pdf' }),
                })
                if (res.ok) {
                  const { data: doc } = await res.json()
                  fetch(`/api/knowledge/${doc.id}`, { method: 'POST' }).catch(() => {})
                  setResult({ jobId: doc.id, imported: 1, skipped: 0, overwritten: 0, errors: [] })
                  setStep('done')
                }
              }}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 shrink-0">
                导入为知识文档
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-3 py-2"><input type="checkbox" checked={count === preview.rows.length} onChange={toggleAll} /></th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">主题</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">题目</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">难度</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map(row => {
                  const isExpanded = expandedRow === row.index
                  return (
                    <React.Fragment key={row.index}>
                      <tr onClick={() => setExpandedRow(isExpanded ? null : row.index)}
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'} ${row.isDuplicate ? 'bg-orange-50' : ''}`}>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIndices.has(row.index)} onChange={() => toggleRow(row.index)} /></td>
                        <td className="px-3 py-2 text-gray-400">{row.index + 1}</td>
                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{row.topic}</span></td>
                        <td className="px-3 py-2 text-gray-800 max-w-sm truncate">{row.question}</td>
                        <td className="px-3 py-2">{row.difficulty}</td>
                        <td className="px-3 py-2">
                          {row.isDuplicate ? (
                            <span className="text-orange-600 text-xs" title={row.duplicateQuestion}>
                              ⚠ {row.duplicateSimilarity != null && row.duplicateSimilarity < 1.0
                                ? `相似 ${Math.round(row.duplicateSimilarity * 100)}%`
                                : '重复'}
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs">✓ 新</span>
                          )}
                          {isExpanded ? <span className="ml-2 text-gray-400">▲</span> : <span className="ml-2 text-gray-300">▼</span>}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${row.index}-detail`} className="bg-blue-50/30">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-3 max-w-3xl">
                              <div><div className="text-xs font-medium text-gray-500 mb-1">📝 题目</div><div className="text-sm text-gray-800 whitespace-pre-wrap">{row.question}</div></div>
                              <div><div className="text-xs font-medium text-gray-500 mb-1">📖 答案</div><div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">{row.answer || <span className="text-gray-400 italic">（无答案）</span>}</div></div>
                              <div className="flex gap-4 text-xs text-gray-400"><span>主题: {row.topic}</span><span>难度: {row.difficulty}</span><span>标签: {row.tags?.join(', ') || '无'}</span></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {preview.parseErrors.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm font-medium text-red-700 mb-1">解析错误</div>
            <ul className="text-xs text-red-600 space-y-0.5">{preview.parseErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
      </div>
    )
  }

  // ---- Step: Importing ----
  if (step === 'importing') {
    return <div className="max-w-2xl text-center py-12"><div className="text-4xl mb-4 animate-bounce">⏳</div><h2 className="text-xl font-bold text-gray-900 mb-2">正在导入...</h2><p className="text-gray-500">正在将数据写入数据库</p></div>
  }

  // ---- Step: Done ----
  if (step === 'done' && result) {
    return (
      <div className="max-w-2xl">
        <div className="text-center mb-8"><div className="text-5xl mb-4">✅</div><h2 className="text-xl font-bold text-gray-900 mb-2">完成</h2></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><div className="text-3xl font-bold text-green-600">{result.imported}</div><div className="text-xs text-gray-500 mt-1">成功导入</div></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><div className="text-3xl font-bold text-orange-600">{result.skipped}</div><div className="text-xs text-gray-500 mt-1">跳过/重复</div></div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><div className="text-3xl font-bold text-blue-600">{result.overwritten}</div><div className="text-xs text-gray-500 mt-1">覆盖更新</div></div>
        </div>
        {result.errors.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs text-red-700">{result.errors.map((e, i) => <div key={i}>{e}</div>)}</div>}
        <div className="flex justify-center gap-3">
          <button onClick={() => { setStep('upload'); setPreview(null); setResult(null); setExtractionData(null) }} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">继续导入</button>
          <a href="/cards" className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">查看题库</a>
        </div>
      </div>
    )
  }

  return null
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { KnowledgeDocument } from '@/lib/types'
import KnowledgeUploader from '@/components/knowledge/KnowledgeUploader'

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [chunks, setChunks] = useState<Array<{ id: string; chunk_index: number; content: string; token_count: number; metadata: Record<string, unknown> }>>([])
  const [chunksLoading, setChunksLoading] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    chunkId: string; documentId: string; documentTitle: string;
    content: string; score: number; vectorScore?: number;
    keywordScore?: number; source: string; breadcrumb: string;
  }>>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge')
      if (!res.ok) throw new Error('Failed')
      const { data } = await res.json()
      setDocs(data ?? [])
    } catch {
      // DB not available
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  // Auto-refresh while any document is processing
  useEffect(() => {
    const hasProcessing = docs.some(d => d.status === 'processing')
    if (!hasProcessing) return
    const timer = setInterval(fetchDocs, 3000)
    return () => clearInterval(timer)
  }, [docs, fetchDocs])

  async function handleDelete(id: string) {
    if (!confirm('确定删除此文档及所有切块？')) return
    try {
      await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      fetchDocs()
    } catch {
      alert('删除失败')
    }
  }

  async function handleProcess(id: string) {
    setProcessing((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      fetchDocs()
    } catch {
      alert('处理失败')
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`)
      if (!res.ok) throw new Error('Search failed')
      const { data } = await res.json()
      setSearchResults(data?.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">知识库</h1>
          <p className="text-gray-400 mt-1 text-xs leading-relaxed">
  将你的面试笔记、面经、文档上传到知识库，系统会自动切分段落并生成向量索引。打开任意题目卡片使用「AI 智能理解」时，AI 会先从知识库检索相关内容，再结合你的资料生成更精准的答案。
</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowUpload(!showUpload); setShowCreate(false) }}
            className={`px-3 py-2 border rounded-lg text-sm transition-colors ${showUpload ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            📁 文件上传
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowUpload(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showCreate ? 'bg-gray-100 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {showCreate ? '取消' : '+ 粘贴文档'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索知识库内容（支持中文全文检索 + 语义搜索）..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0"
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
          {searched && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); setSearched(false) }}
              className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 shrink-0"
            >
              清除
            </button>
          )}
        </div>
      </form>

      {/* Search Results */}
      {searched && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              搜索结果：<span className="text-blue-600">{searchQuery}</span>
            </h3>
            <span className="text-xs text-gray-400">({searchResults.length} 条)</span>
          </div>
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {searching ? '搜索中...' : '未找到相关内容，试试其他关键词'}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((r, i) => (
                <div key={`${r.chunkId}-${i}`} className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-gray-900">{r.documentTitle || '未知文档'}</span>
                    {r.breadcrumb && (
                      <span className="text-xs text-gray-400">{r.breadcrumb}</span>
                    )}
                    <span className={`px-1 py-0 rounded text-xs ml-auto ${
                      r.source === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                      r.source === 'vector' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {r.source}
                    </span>
                    <span className="text-xs text-gray-400">
                      score: {r.score.toFixed(3)}
                      {r.vectorScore != null && ` (v:${r.vectorScore.toFixed(2)})`}
                      {r.keywordScore != null && ` (k:${r.keywordScore.toFixed(2)})`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed line-clamp-4">{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Upload */}
      {showUpload && (
        <div className="mb-6">
          <KnowledgeUploader onDone={() => { setShowUpload(false); fetchDocs() }} />
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <CreateDocumentForm
          onCreated={() => {
            setShowCreate(false)
            fetchDocs()
          }}
        />
      )}

      {/* Document List */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">加载中...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-sm">知识库为空</p>
          <p className="text-xs mt-1">添加文档资料，为 AI 智能理解提供知识上下文</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{doc.title}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {doc.file_type}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {doc.content.length} 字 · {doc.chunk_count} 个切块
                    {doc.source && ` · 来源: ${doc.source}`}
                  </p>
                  {doc.status === 'error' && doc.error_message && (
                    <p className="text-xs text-red-500 mt-1 bg-red-50 rounded px-2 py-1">
                      {doc.error_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === 'ready' && (
                    <button
                      onClick={async () => {
                        if (expandedDoc === doc.id) { setExpandedDoc(null); return }
                        setExpandedDoc(doc.id)
                        setChunksLoading(true)
                        try {
                          const res = await fetch(`/api/knowledge/${doc.id}`)
                          const { data } = await res.json()
                          setChunks(data.chunks || [])
                        } catch { } finally { setChunksLoading(false) }
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {expandedDoc === doc.id ? '收起' : `${doc.chunk_count} chunks →`}
                    </button>
                  )}
                  {doc.status === 'ready' && (
                    <span className="text-xs text-green-600">✓ 已就绪</span>
                  )}
                  {(doc.status === 'processing' || doc.status === 'error') && (
                    <button
                      onClick={() => handleProcess(doc.id)}
                      disabled={processing.has(doc.id)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
                    >
                      {processing.has(doc.id) ? '处理中...' : '重新处理'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* Expanded chunk list */}
              {expandedDoc === doc.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {chunksLoading ? (
                    <div className="text-xs text-gray-400 py-2">加载中...</div>
                  ) : chunks.length === 0 ? (
                    <div className="text-xs text-gray-400 py-2">暂无切块</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {chunks.map(c => (
                        <div key={c.id} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1 py-0 bg-blue-100 text-blue-700 rounded text-xs font-medium">#{c.chunk_index}</span>
                            {(c.metadata as Record<string, string>)?.breadcrumb && (
                              <span className="text-gray-400">{(c.metadata as Record<string, string>).breadcrumb}</span>
                            )}
                            <span className="text-gray-400 ml-auto">{c.token_count} tokens</span>
                          </div>
                          <div className="text-gray-600 line-clamp-3 leading-relaxed">{c.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RAG Pipeline Summary */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 RAG Pipeline 状态</h2>
        <div className="grid grid-cols-5 gap-4 text-center text-sm">
          <PipelineStep step="1" label="文档导入" done={docs.length > 0} />
          <PipelineStep step="2" label="结构化分块" done={docs.some((d) => d.chunk_count > 0)} />
          <PipelineStep step="3" label="向量嵌入" done={docs.some((d) => d.status === 'ready')} />
          <PipelineStep step="4" label="BM25 + 向量索引" done={docs.some((d) => d.status === 'ready')} />
          <PipelineStep step="5" label="混合检索可用" done={docs.some((d) => d.status === 'ready')} />
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
          <p><strong className="text-gray-500">离线管道：</strong>文件上传 → 文本提取 → 结构化分块（三级标题树 / 段落） → Embedding（OpenAI/Ollama） → 写入 pgvector + tsvector 双索引</p>
          <p className="mt-1"><strong className="text-gray-500">在线问答：</strong>用户 Query → Query 改写 → 混合检索（向量 HNSW + BM25 全文，0.7/0.3 加权融合） → 上下文注入 LLM → 带来源引用的答案</p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    processing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    processing: '处理中',
    ready: '就绪',
    error: '错误',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${colors[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  )
}

function PipelineStep({ step, label, done }: { step: string; label: string; done: boolean }) {
  return (
    <div>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold ${
          done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
        }`}
      >
        {done ? '✓' : step}
      </div>
      <div className={`text-xs ${done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</div>
    </div>
  )
}

function CreateDocumentForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fileType, setFileType] = useState('markdown')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), file_type: fileType }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg)
      }
      // Auto-process after create
      const { data } = await res.json()
      await fetch(`/api/knowledge/${data.id}`, { method: 'POST' })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">文档标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：Agent 面试备考资料"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="粘贴文档内容（支持 Markdown）..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono resize-y"
          />
        </div>
        <div className="flex items-center gap-4">
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="markdown">Markdown</option>
            <option value="txt">Text</option>
            <option value="web">Web</option>
          </select>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '创建中...' : '创建并处理'}
        </button>
      </div>
    </form>
  )
}

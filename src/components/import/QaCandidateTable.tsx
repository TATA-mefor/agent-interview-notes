'use client'

import { useState, useMemo } from 'react'

// ---- Types (minimal, usable without extraction module) ----
export interface QaCandidate {
  id: string
  question: string
  answer: string
  answerStatus: 'present' | 'missing' | 'partial'
  topic: string
  tags: string[]
  difficulty: string
  frequency: string
  confidence: number
  extractionMethod: 'rule' | 'llm' | 'hybrid'
  normalizedQuestion?: string
  questionHash?: string
  evidenceText?: string
  duplicateOfCandidateId?: string
  duplicateOfCardId?: string
  isDuplicateCandidate?: boolean
  warnings?: string[]
}

export type CandidateFilter =
  | 'all'
  | 'high_confidence'
  | 'missing_answer'
  | 'duplicates'
  | 'selected'
  | 'skipped'

interface Props {
  candidates: QaCandidate[]
  selectedIds: Set<string>
  skippedIds?: Set<string>
  activeCandidateId?: string | null
  onToggle: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSelectHighConfidence: () => void
  onActiveCandidateChange?: (id: string | null) => void
  onSkip?: (id: string) => void
  onRestore?: (id: string) => void
}

const TOPIC_COLORS: Record<string, string> = {
  '基础概念': 'bg-blue-50 text-blue-700',
  '核心模块': 'bg-purple-50 text-purple-700',
  '工作模式': 'bg-amber-50 text-amber-700',
  '架构设计': 'bg-cyan-50 text-cyan-700',
  '工程实践': 'bg-green-50 text-green-700',
  '评估与多Agent': 'bg-rose-50 text-rose-700',
}

export default function QaCandidateTable({
  candidates,
  selectedIds,
  skippedIds,
  activeCandidateId,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onSelectHighConfidence,
  onActiveCandidateChange,
  onSkip,
  onRestore,
}: Props) {
  const [filter, setFilter] = useState<CandidateFilter>('all')

  const filtered = useMemo(() => {
    switch (filter) {
      case 'high_confidence':
        return candidates.filter(c => c.confidence >= 0.8)
      case 'missing_answer':
        return candidates.filter(c => c.answerStatus === 'missing' || c.answerStatus === 'partial')
      case 'duplicates':
        return candidates.filter(c => c.isDuplicateCandidate || c.duplicateOfCardId)
      case 'selected':
        return candidates.filter(c => selectedIds.has(c.id))
      case 'skipped':
        return candidates.filter(c => skippedIds?.has(c.id))
      default:
        return candidates
    }
  }, [candidates, filter, selectedIds, skippedIds])

  const visibleSelected = filtered.filter(c => selectedIds.has(c.id)).length
  const allVisibleSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  const filterButtons: Array<{ key: CandidateFilter; label: string; count: number }> = [
    { key: 'all', label: '全部', count: candidates.length },
    { key: 'high_confidence', label: '高置信', count: candidates.filter(c => c.confidence >= 0.8).length },
    { key: 'missing_answer', label: '缺答案', count: candidates.filter(c => c.answerStatus !== 'present').length },
    { key: 'duplicates', label: '重复', count: candidates.filter(c => c.isDuplicateCandidate || c.duplicateOfCardId).length },
    { key: 'selected', label: '已选', count: selectedIds.size },
  ]

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-sm">没有候选题目</p>
      </div>
    )
  }

  return (
    <div>
      {/* Batch actions + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        <button onClick={allVisibleSelected ? onDeselectAll : onSelectAll}
          className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
          {allVisibleSelected ? '取消全选' : '全选本页'}
        </button>
        <button onClick={onSelectHighConfidence}
          className="px-3 py-1.5 border border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
          仅选高置信
        </button>
        <span className="text-gray-300">|</span>
        {filterButtons.map(fb => (
          <button key={fb.key}
            onClick={() => setFilter(fb.key)}
            className={`px-2.5 py-1.5 rounded-lg transition-colors ${
              filter === fb.key
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {fb.label} <span className="opacity-70">({fb.count})</span>
          </button>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[55vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allVisibleSelected} onChange={() => allVisibleSelected ? onDeselectAll() : onSelectAll()} />
                </th>
                <th className="w-16 px-2 py-2 text-left font-medium text-gray-600 text-xs">状态</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">题目 / 答案</th>
                <th className="w-24 px-2 py-2 text-left font-medium text-gray-600 text-xs">分类</th>
                <th className="w-16 px-2 py-2 text-left font-medium text-gray-600 text-xs">难度</th>
                <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 text-xs">置信度</th>
                <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 text-xs">方式</th>
                <th className="w-28 px-2 py-2 text-left font-medium text-gray-600 text-xs">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const isSelected = selectedIds.has(c.id)
                const isActive = activeCandidateId === c.id
                const isSkipped = skippedIds?.has(c.id)

                return (
                  <tr key={c.id}
                    onClick={() => onActiveCandidateChange?.(isActive ? null : c.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive ? 'bg-blue-50/50' : isSkipped ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'
                    }`}>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => onToggle(c.id)} />
                    </td>
                    <td className="px-2 py-2">
                      <CandidateStatusBadge candidate={c} />
                    </td>
                    <td className="px-3 py-2 min-w-0 max-w-md">
                      <div className="font-medium text-gray-800 truncate">
                        {c.isDuplicateCandidate && <span className="text-orange-500 mr-1" title="批内重复">⚠</span>}
                        {c.duplicateOfCardId && <span className="text-red-500 mr-1" title={`重复于卡片 ${c.duplicateOfCardId}`}>🔄</span>}
                        {c.question}
                      </div>
                      {c.answer && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{c.answer.slice(0, 180)}</div>
                      )}
                      {c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="px-1 py-0 bg-gray-100 text-gray-500 rounded text-xs">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${TOPIC_COLORS[c.topic] || 'bg-gray-100 text-gray-600'}`}>{c.topic}</span>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">{c.difficulty}</td>
                    <td className="px-2 py-2">
                      <ConfidenceBadge confidence={c.confidence} />
                    </td>
                    <td className="px-2 py-2">
                      <MethodBadge method={c.extractionMethod} />
                    </td>
                    <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onActiveCandidateChange?.(c.id)}
                          className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded">
                          编辑
                        </button>
                        {onSkip && !isSkipped && (
                          <button onClick={() => onSkip(c.id)}
                            className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                            跳过
                          </button>
                        )}
                        {onRestore && isSkipped && (
                          <button onClick={() => onRestore(c.id)}
                            className="px-2 py-0.5 text-xs text-green-600 hover:bg-green-50 rounded">
                            恢复
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-2">
        {filtered.map(c => {
          const isSelected = selectedIds.has(c.id)
          const isActive = activeCandidateId === c.id
          const isSkipped = skippedIds?.has(c.id)

          return (
            <div key={c.id}
              onClick={() => onActiveCandidateChange?.(isActive ? null : c.id)}
              className={`bg-white rounded-lg border p-3 transition-colors ${
                isActive ? 'border-blue-300 bg-blue-50/30' :
                isSkipped ? 'border-gray-200 bg-gray-50 opacity-50' :
                'border-gray-200 hover:border-gray-300'
              }`}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={isSelected}
                  onChange={() => onToggle(c.id)}
                  onClick={e => e.stopPropagation()}
                  className="mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Question + status */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {c.isDuplicateCandidate && '⚠ '}
                      {c.duplicateOfCardId && '🔄 '}
                      {c.question}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <ConfidenceBadge confidence={c.confidence} />
                    <CandidateStatusBadge candidate={c} />
                    <MethodBadge method={c.extractionMethod} />
                    <span className={`px-1.5 py-0.5 rounded text-xs ${TOPIC_COLORS[c.topic] || 'bg-gray-100'}`}>{c.topic}</span>
                  </div>

                  {/* Answer preview */}
                  {c.answer && (
                    <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-1">{c.answer.slice(0, 150)}</div>
                  )}

                  {/* Tags */}
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="px-1.5 py-0 bg-gray-100 text-gray-500 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onActiveCandidateChange?.(c.id)}
                      className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded">编辑</button>
                    {onSkip && !isSkipped && (
                      <button onClick={() => onSkip(c.id)}
                        className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600 rounded">跳过</button>
                    )}
                    {onRestore && isSkipped && (
                      <button onClick={() => onRestore(c.id)}
                        className="px-2 py-0.5 text-xs text-green-600 hover:bg-green-50 rounded">恢复</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Badge sub-components ----

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 0.8
    ? 'bg-green-100 text-green-700'
    : confidence >= 0.6
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {Math.round(confidence * 100)}%
    </span>
  )
}

function MethodBadge({ method }: { method: string }) {
  const color = method === 'rule'
    ? 'bg-blue-100 text-blue-700'
    : method === 'llm'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-cyan-100 text-cyan-700'
  const label = method === 'rule' ? '规则' : method === 'llm' ? 'LLM' : '混合'
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${color}`}>{label}</span>
  )
}

function CandidateStatusBadge({ candidate }: { candidate: QaCandidate }) {
  const { answerStatus, isDuplicateCandidate, duplicateOfCardId } = candidate

  if (duplicateOfCardId) {
    return <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700" title={`重复于 ${duplicateOfCardId}`}>🔄 重复</span>
  }
  if (isDuplicateCandidate) {
    return <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">⚠ 批内重复</span>
  }

  switch (answerStatus) {
    case 'present':
      return <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">有答案</span>
    case 'partial':
      return <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">部分</span>
    case 'missing':
      return <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">缺答案</span>
  }
}

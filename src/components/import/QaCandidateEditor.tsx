'use client'

import { useState } from 'react'
import type { QaCandidate } from './QaCandidateTable'

interface Props {
  candidate: QaCandidate
  onSave: (candidateId: string, patch: Partial<QaCandidate>) => void
  onClose: () => void
}

const TOPICS = ['基础概念', '核心模块', '工作模式', '架构设计', '工程实践', '评估与多Agent'] as const
const DIFFICULTIES = ['初级', '中级', '高级'] as const
const FREQUENCIES = ['高频', '中频', '低频'] as const
const MIN_QUESTION_LENGTH = 6

export default function QaCandidateEditor({ candidate, onSave, onClose }: Props) {
  const [question, setQuestion] = useState(candidate.question)
  const [answer, setAnswer] = useState(candidate.answer)
  const [topic, setTopic] = useState(candidate.topic)
  const [tags, setTags] = useState(candidate.tags.join(', '))
  const [difficulty, setDifficulty] = useState(candidate.difficulty)
  const [frequency, setFrequency] = useState(candidate.frequency)
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSave() {
    const trimmedQ = question.trim()
    if (!trimmedQ) {
      setValidationError('题目不能为空')
      return
    }
    if (trimmedQ.length < MIN_QUESTION_LENGTH) {
      setValidationError(`题目过短，至少需要 ${MIN_QUESTION_LENGTH} 个字符`)
      return
    }
    setValidationError(null)
    onSave(candidate.id, {
      question: trimmedQ,
      answer: answer.trim(),
      topic,
      tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      difficulty,
      frequency,
    })
  }

  const confColor = candidate.confidence >= 0.8
    ? 'text-green-700 bg-green-50'
    : candidate.confidence >= 0.6
      ? 'text-yellow-700 bg-yellow-50'
      : 'text-red-700 bg-red-50'

  const methodLabel = candidate.extractionMethod === 'rule'
    ? '规则抽取' : candidate.extractionMethod === 'llm' ? 'LLM 提取' : '混合'

  const statusLabel = candidate.answerStatus === 'present'
    ? '有答案' : candidate.answerStatus === 'partial' ? '部分答案' : '缺答案'
  const statusColor = candidate.answerStatus === 'present'
    ? 'text-green-700 bg-green-50'
    : candidate.answerStatus === 'partial'
      ? 'text-yellow-700 bg-yellow-50'
      : 'text-orange-700 bg-orange-50'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">编辑候选题目</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto px-4 py-3 space-y-4 flex-1">
        {/* Validation error */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
            {validationError}
          </div>
        )}

        {/* Question */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            题目 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={e => { setQuestion(e.target.value); setValidationError(null) }}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
              validationError && !question.trim()
                ? 'border-red-300 focus:ring-red-200'
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
        </div>

        {/* Answer */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">答案</label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Metadata: topic, difficulty, frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">分类</label>
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">难度</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">频率</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">标签（逗号分隔）</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="RAG, 检索, 向量数据库"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Read-only metadata */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <div className="text-xs font-medium text-gray-500 mb-2">抽取元数据（只读）</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">置信度:</span>
            <span className={`px-1.5 py-0.5 rounded font-medium ${confColor}`}>
              {Math.round(candidate.confidence * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">抽取方式:</span>
            <span className="text-gray-600">{methodLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">答案状态:</span>
            <span className={`px-1.5 py-0.5 rounded ${statusColor}`}>{statusLabel}</span>
          </div>
          {candidate.duplicateOfCardId && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">重复于卡片:</span>
              <span className="text-orange-600 font-mono">{candidate.duplicateOfCardId}</span>
            </div>
          )}
          {candidate.duplicateOfCandidateId && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">重复于候选:</span>
              <span className="text-orange-600 font-mono">{candidate.duplicateOfCandidateId}</span>
            </div>
          )}
        </div>

        {/* Warnings */}
        {candidate.warnings && candidate.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-xs font-medium text-yellow-700 mb-1">⚠ 注意</div>
            <ul className="text-xs text-yellow-600 space-y-0.5">
              {candidate.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Evidence text */}
        {candidate.evidenceText && (
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">📄 原文片段</div>
            <pre className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2.5 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {candidate.evidenceText}
            </pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
        <button onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
          取消
        </button>
        <button onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          保存修改
        </button>
      </div>
    </div>
  )
}

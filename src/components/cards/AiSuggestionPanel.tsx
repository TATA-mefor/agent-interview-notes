'use client'

import { useState } from 'react'
import type { AIUnderstandingOutput } from '@/lib/types'

interface AiSuggestionPanelProps {
  cardId: string
  onApplyField: (field: string, value: string | string[]) => void
}

export default function AiSuggestionPanel({ cardId, onApplyField }: AiSuggestionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<AIUnderstandingOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set())
  const [suggestionId, setSuggestionId] = useState<string | null>(null)
  const [ragUsed, setRagUsed] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setSuggestion(null)
    setAppliedFields(new Set())

    try {
      const res = await fetch('/api/llm/understand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || body.hint || `请求失败 (${res.status})`)
      }

      setSuggestionId(body.data.suggestionId)
      setSuggestion(body.data)
      setRagUsed(body.data.ragUsed || false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求失败'
      if (msg.includes('fetch failed') || msg.includes('Failed to fetch')) {
        setError('无法连接到 LLM 服务。请检查：\n1. Dify/Ollama 是否已启动\n2. API 地址是否正确\n3. 网络是否连通')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleApply(field: string, value: string | string[]) {
    onApplyField(field, value)
    setAppliedFields((prev) => new Set(prev).add(field))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">🤖 AI 智能理解</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            AI 生成标准答案、要点、话术等建议，由你手动选择采纳
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              分析中...
            </span>
          ) : suggestion ? (
            '重新生成'
          ) : (
            '生成建议'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!suggestion && !loading && !error && (
        <div className="text-center py-6 text-gray-400 text-sm">
          <div className="text-2xl mb-2">💡</div>
          <p>点击「生成建议」，AI 将分析本题并生成：</p>
          <ul className="text-xs mt-2 space-y-1 text-left max-w-xs mx-auto">
            <li>📝 标准面试答案</li>
            <li>🎯 关键要点</li>
            <li>📚 扩展知识</li>
            <li>🎤 面试话术（可背诵）</li>
            <li>⚠️ 常见误区</li>
            <li>🏷️ 建议标签与难度</li>
          </ul>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-3 animate-pulse">🧠</div>
          <p className="text-sm">AI 正在分析题目...</p>
          <p className="text-xs mt-1">这可能需要 5-15 秒</p>
        </div>
      )}

      {/* Results */}
      {suggestion && (
        <div className="space-y-4">
          {/* Standard Answer */}
          <SuggestionBlock
            title="📝 标准面试答案"
            applied={appliedFields.has('answer')}
            onApply={() => handleApply('answer', suggestion.standard_answer)}
          >
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion.standard_answer}</p>
          </SuggestionBlock>

          {/* Key Points */}
          <SuggestionBlock
            title="🎯 关键要点"
            applied={appliedFields.has('key_points')}
            onApply={() => handleApply('key_points', suggestion.key_points)}
          >
            <ul className="list-disc list-inside space-y-1">
              {suggestion.key_points.map((p, i) => (
                <li key={i} className="text-sm text-gray-700">{p}</li>
              ))}
            </ul>
          </SuggestionBlock>

          {/* Extended Notes */}
          {suggestion.extended_notes && (
            <SuggestionBlock
              title="📚 扩展知识"
              applied={appliedFields.has('extended_notes')}
              onApply={() => handleApply('extended_notes', suggestion.extended_notes)}
            >
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion.extended_notes}</p>
            </SuggestionBlock>
          )}

          {/* Interview Script */}
          {suggestion.interview_script && (
            <SuggestionBlock
              title="🎤 面试话术"
              applied={appliedFields.has('interview_script')}
              onApply={() => handleApply('interview_script', suggestion.interview_script)}
            >
              <p className="text-sm text-gray-700 whitespace-pre-wrap italic">
                &ldquo;{suggestion.interview_script}&rdquo;
              </p>
            </SuggestionBlock>
          )}

          {/* Common Mistakes */}
          {suggestion.common_mistakes.length > 0 && (
            <SuggestionBlock
              title="⚠️ 常见误区"
              applied={appliedFields.has('common_mistakes')}
              onApply={() => handleApply('common_mistakes', suggestion.common_mistakes)}
            >
              <ul className="list-disc list-inside space-y-1">
                {suggestion.common_mistakes.map((m, i) => (
                  <li key={i} className="text-sm text-red-700">{m}</li>
                ))}
              </ul>
            </SuggestionBlock>
          )}

          {/* Suggested Tags */}
          {suggestion.suggested_tags.length > 0 && (
            <SuggestionBlock
              title="🏷️ 建议标签"
              applied={appliedFields.has('tags')}
              onApply={() => handleApply('tags', suggestion.suggested_tags)}
            >
              <div className="flex flex-wrap gap-1.5">
                {suggestion.suggested_tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </SuggestionBlock>
          )}

          {/* Suggested Difficulty/Frequency */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>建议难度: <strong className="text-gray-700">{suggestion.suggested_difficulty}</strong></span>
            <span>建议频率: <strong className="text-gray-700">{suggestion.suggested_frequency}</strong></span>
            {ragUsed && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">📚 已使用知识库</span>}
            {suggestionId && <span className="text-gray-400">ID: {suggestionId.slice(0, 8)}...</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestionBlock({
  title,
  applied,
  onApply,
  children,
}: {
  title: string
  applied: boolean
  onApply: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`border rounded-lg p-3 ${applied ? 'border-green-300 bg-green-50' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{title}</span>
        <button
          onClick={onApply}
          disabled={applied}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            applied
              ? 'bg-green-100 text-green-600 cursor-default'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          {applied ? '✓ 已采纳' : '采纳'}
        </button>
      </div>
      {children}
    </div>
  )
}

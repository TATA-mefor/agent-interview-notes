'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Card, CardInput } from '@/lib/types'

interface CardFormProps {
  initialData?: Card | null
  mode: 'create' | 'edit'
}

const DIFFICULTY_OPTIONS = ['初级', '中级', '高级'] as const
const FREQUENCY_OPTIONS = ['高频', '中频', '低频'] as const

interface ParsedFields {
  topic: string
  question: string
  answer: string
  difficulty: string
  frequency: string
  tags: string
}

export default function CardForm({ initialData, mode }: CardFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(mode === 'create')
  const [pasteText, setPasteText] = useState('')
  const [parseMsg, setParseMsg] = useState<string | null>(null)
  const pasteRef = useRef<HTMLTextAreaElement>(null)

  const [form, setForm] = useState({
    topic: initialData?.topic || '',
    question: initialData?.question || '',
    answer: initialData?.answer || '',
    difficulty: (initialData?.difficulty || '中级') as typeof DIFFICULTY_OPTIONS[number],
    frequency: (initialData?.frequency || '中频') as typeof FREQUENCY_OPTIONS[number],
    tags: initialData?.tags?.join(', ') || '',
    personal_notes: initialData?.personal_notes || '',
  })

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ---- 粘贴一键解析 ----
  function handleParse() {
    const text = pasteText.trim()
    if (!text) {
      setParseMsg('请先粘贴内容')
      return
    }

    const parsed = smartParse(text)
    const filled: string[] = []

    if (parsed.topic && !form.topic) { updateField('topic', parsed.topic); filled.push('主题') }
    if (parsed.question && !form.question) { updateField('question', parsed.question); filled.push('题目') }
    if (parsed.answer && !form.answer) { updateField('answer', parsed.answer); filled.push('答案') }
    if (parsed.difficulty) { updateField('difficulty', parsed.difficulty as typeof DIFFICULTY_OPTIONS[number]); filled.push('难度') }
    if (parsed.frequency) { updateField('frequency', parsed.frequency as typeof FREQUENCY_OPTIONS[number]); filled.push('频率') }
    if (parsed.tags) {
      const existing = form.tags ? form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : []
      const newTags = parsed.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      const merged = [...new Set([...existing, ...newTags])].join(', ')
      updateField('tags', merged)
      filled.push('标签')
    }

    if (filled.length > 0) {
      setParseMsg(`✓ 已解析填充：${filled.join('、')}`)
      // Auto-collapse after successful parse
      setTimeout(() => setPasteOpen(false), 800)
    } else {
      // If nothing matched, put the whole text as question
      if (!form.question) {
        updateField('question', text.slice(0, 500))
        setParseMsg('✓ 已作为题目填充（未识别到结构化字段）')
        setTimeout(() => setPasteOpen(false), 800)
      } else {
        setParseMsg('未识别到新字段（表单已有内容）')
      }
    }
  }

  function handleClearPaste() {
    setPasteText('')
    setParseMsg(null)
    pasteRef.current?.focus()
  }

  // ---- 提交 ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.topic.trim() || !form.question.trim()) {
      setError('主题和题目为必填项')
      return
    }

    setSaving(true)
    try {
      const body: CardInput = {
        topic: form.topic.trim(),
        question: form.question.trim(),
        answer: form.answer.trim(),
        difficulty: form.difficulty,
        frequency: form.frequency,
        tags: form.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        personal_notes: form.personal_notes.trim(),
      }

      if (mode === 'edit' && initialData) {
        const res = await fetch(`/api/cards/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error: errMsg } = await res.json()
          throw new Error(errMsg || '更新失败')
        }
        router.push(`/cards/${initialData.id}`)
      } else {
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error: errMsg } = await res.json()
          throw new Error(errMsg || '创建失败')
        }
        const { data } = await res.json()
        router.push(`/cards/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ======== 粘贴一键导入面板 ======== */}
      {mode === 'create' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 overflow-hidden">
          {/* Header Toggle */}
          <button
            type="button"
            onClick={() => setPasteOpen(!pasteOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-blue-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-semibold text-blue-800 text-sm">复制粘贴 · 一键导入</span>
              <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">推荐</span>
            </div>
            <span className="text-blue-400 text-sm">{pasteOpen ? '▲ 收起' : '▼ 展开'}</span>
          </button>

          {pasteOpen && (
            <div className="px-5 pb-4">
              <p className="text-xs text-blue-600 mb-3">
                粘贴面试题文本，自动识别 Q&A / Topic / Tags / Difficulty 并填充表单
              </p>

              {/* Paste Area */}
              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setParseMsg(null) }}
                rows={8}
                placeholder={`支持多种格式，直接粘贴即可：

格式示例 1（Q&A 格式）：
Q: What is an AI Agent?
A: AI Agent 是能够感知环境、做出决策并采取行动的自主系统。
Topic: 基础概念
Difficulty: 初级
Tags: agent, 基础, 定义

格式示例 2（中文标题格式）：
题目：什么是 AI Agent？
答案：AI Agent 是一个能够感知环境...
主题：基础概念
难度：初级
标签：agent, 基础

格式示例 3（Markdown 格式）：
## Topic: 核心模块
### Q: 什么是 RAG？
回答正文...`}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
              />

              {/* Parse Actions */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!pasteText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <span>🔍</span> 一键解析填充
                </button>
                {pasteText && (
                  <button
                    type="button"
                    onClick={handleClearPaste}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    清空
                  </button>
                )}
                {parseMsg && (
                  <span className={`text-xs ${parseMsg.startsWith('✓') ? 'text-green-600' : 'text-gray-500'}`}>
                    {parseMsg}
                  </span>
                )}
              </div>

              {/* Format Help */}
              <details className="mt-3 text-xs text-blue-500">
                <summary className="cursor-pointer hover:text-blue-700">支持哪些格式？</summary>
                <div className="mt-2 p-3 bg-white/70 rounded text-gray-600 space-y-1">
                  <div><code className="bg-blue-50 px-1 rounded">Q: 题目文本</code> 或 <code className="bg-blue-50 px-1 rounded">题目：文本</code> → 题目字段</div>
                  <div><code className="bg-blue-50 px-1 rounded">A: 答案文本</code> 或 <code className="bg-blue-50 px-1 rounded">答案：文本</code> → 答案字段</div>
                  <div><code className="bg-blue-50 px-1 rounded">Topic: xxx</code> 或 <code className="bg-blue-50 px-1 rounded">主题：xxx</code> → 主题字段</div>
                  <div><code className="bg-blue-50 px-1 rounded">Difficulty: 初级</code> 或 <code className="bg-blue-50 px-1 rounded">难度：初级</code> → 难度字段</div>
                  <div><code className="bg-blue-50 px-1 rounded">Tags: a, b</code> 或 <code className="bg-blue-50 px-1 rounded">标签：a, b</code> → 标签字段</div>
                  <div>Markdown <code className="bg-blue-50 px-1 rounded">## Topic:</code> / <code className="bg-blue-50 px-1 rounded">### Q:</code> 也支持</div>
                  <div className="text-gray-400 mt-1">只会填充空字段，已有内容不会被覆盖</div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* ======== 表单字段 ======== */}
      {/* Topic */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">主题 *</label>
        <input
          type="text"
          value={form.topic}
          onChange={(e) => updateField('topic', e.target.value)}
          placeholder="例如：基础概念、核心模块、架构设计"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Question */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">题目 *</label>
        <textarea
          value={form.question}
          onChange={(e) => updateField('question', e.target.value)}
          rows={3}
          placeholder="面试题目完整描述..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* Answer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标准答案</label>
        <textarea
          value={form.answer}
          onChange={(e) => updateField('answer', e.target.value)}
          rows={5}
          placeholder="标准面试答案..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* Personal Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          个人笔记 <span className="text-gray-400 font-normal">(Markdown)</span>
        </label>
        <textarea
          value={form.personal_notes}
          onChange={(e) => updateField('personal_notes', e.target.value)}
          rows={4}
          placeholder="个人理解、扩展笔记... 支持 Markdown 语法"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
        />
      </div>

      {/* Difficulty & Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
          <select
            value={form.difficulty}
            onChange={(e) => updateField('difficulty', e.target.value as typeof form.difficulty)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">频率</label>
          <select
            value={form.frequency}
            onChange={(e) => updateField('frequency', e.target.value as typeof form.frequency)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          标签 <span className="text-gray-400 font-normal">(逗号分隔)</span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => updateField('tags', e.target.value)}
          placeholder="agent, 基础, 定义"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : mode === 'create' ? '创建卡片' : '保存修改'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          取消
        </button>
      </div>
    </form>
  )
}

// ============================================================
// Smart Parse Engine — 正则提取结构化字段
// ============================================================

function smartParse(text: string): ParsedFields {
  const result: ParsedFields = {
    topic: '',
    question: '',
    answer: '',
    difficulty: '',
    frequency: '',
    tags: '',
  }

  const lines = text.split(/\r?\n/)
  let answerLines: string[] = []
  let inAnswer = false
  let hashtags: string[] = []

  // ---- Pre-pass: detect bare topic/difficulty on first lines ----
  // Format:
  //   Agent架构      ← short text, no marker → topic
  //   中级            ← difficulty value → difficulty
  //   (blank)
  //   <question>
  let lineCursor = 0

  // Check first non-empty line: if short and not a marker, treat as topic
  const firstNonEmpty = lines.find(l => l.trim())
  if (firstNonEmpty) {
    const t = firstNonEmpty.trim()
    const isShortTopic = t.length <= 15 &&
      !/[：:?？]/.test(t) &&
      !/^(?:Q|题目|案例题目|面试题|Topic|主题|Difficulty|难度|Tags?|标签|Frequency|频率|参考|核心|追问)/i.test(t) &&
      !/^(?:初级|中级|高级)$/.test(t)
    if (isShortTopic && !result.topic) {
      result.topic = t
      // Mark this line as consumed
      lineCursor = lines.indexOf(firstNonEmpty) + 1
    }
  }

  // Check second non-empty line (after topic): if it's a difficulty/frequency, capture it
  if (lineCursor > 0) {
    const remaining = lines.slice(lineCursor)
    const secondNonEmpty = remaining.find(l => l.trim())
    if (secondNonEmpty) {
      const t = secondNonEmpty.trim()
      if (/^(?:初级|中级|高级)$/.test(t) && !result.difficulty) {
        result.difficulty = t as typeof DIFFICULTY_OPTIONS[number]
        lineCursor = lines.indexOf(secondNonEmpty) + 1
      } else if (/^(?:高频|中频|低频)$/.test(t) && !result.frequency) {
        result.frequency = t as typeof FREQUENCY_OPTIONS[number]
        lineCursor = lines.indexOf(secondNonEmpty) + 1
      }
    }
  }

  // ---- Pass 1: line-by-line state machine ----
  for (let i = lineCursor; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) {
      if (inAnswer) answerLines.push('') // preserve blank lines in answer
      continue
    }

    // Detect answer section start
    if (/^(?:参考答案|参考回答|标准答案|核心结论|参考解析)\s*$/.test(line) ||
        /^(?:参考答案|参考回答|标准答案)[：:]/.test(line)) {
      inAnswer = true
      // If the marker line itself has content after [：:], capture it
      const inlineContent = line.match(/^(?:参考答案|参考回答|标准答案)[：:]\s*(.+)/)
      if (inlineContent) answerLines.push(inlineContent[1])
      continue
    }

    // Detect "追问" section → stop answer capture, extract potential topic
    if (/^(?:追问|追问点|扩展问题|易错点)[：:]/.test(line)) {
      inAnswer = false
      continue
    }

    if (inAnswer) {
      answerLines.push(line)
      continue
    }

    // Collect #hashtags from lines that are purely hashtags
    if (/^#\S+$/.test(line) || /^#\S+\s+#\S+/.test(line)) {
      const tags = line.match(/#(\S+)/g)
      if (tags) hashtags.push(...tags.map(t => t.slice(1)))
      continue
    }

    // Detect question line: starts with a known question marker
    const qMatch = line.match(
      /^(?:Q|Question|(?:\d+[.、]\s*)?(?:案例)?题目|面试题|问题|考题|真题)[：:]\s*(.+)$/
    )
    if (qMatch && !result.question) {
      result.question = qMatch[1].trim()
      continue
    }

    // Detect topic line
    const tMatch = line.match(/^(?:Topic|主题|分类|类别|模块)[：:]\s*(.+)$/)
    if (tMatch && !result.topic) {
      result.topic = tMatch[1].trim()
      continue
    }

    // Detect difficulty
    const dMatch = line.match(/^(?:Difficulty|难度)[：:]\s*(.+)$/)
    if (dMatch && !result.difficulty) {
      const d = dMatch[1].trim()
      if (d.includes('初') || /^easy$/i.test(d)) result.difficulty = '初级'
      else if (d.includes('高') || /^hard$/i.test(d)) result.difficulty = '高级'
      else if (d.includes('中') || /^medium$/i.test(d)) result.difficulty = '中级'
      continue
    }

    // Detect frequency
    const fMatch = line.match(/^(?:Frequency|频率)[：:]\s*(.+)$/)
    if (fMatch && !result.frequency) {
      const f = fMatch[1].trim()
      if (f.includes('高') || /^high$/i.test(f)) result.frequency = '高频'
      else if (f.includes('低') || /^low$/i.test(f)) result.frequency = '低频'
      else if (f.includes('中') || /^medium$/i.test(f)) result.frequency = '中频'
      continue
    }

    // Detect tags line (Tags: a, b)
    const tagMatch = line.match(/^(?:Tags?|标签)[：:]\s*(.+)$/)
    if (tagMatch) {
      hashtags.push(...tagMatch[1].split(/[,，;；]/).map(t => t.trim()).filter(Boolean))
      continue
    }

    // If we haven't identified anything yet and haven't found a question,
    // treat the first substantial non-hashtag line as the question
    if (!result.question && line.length > 5 && !line.startsWith('#')) {
      result.question = line.slice(0, 500)
      continue
    }
  }

  // ---- Pass 2: assemble results ----

  // Tags
  if (hashtags.length > 0 && !result.tags) {
    result.tags = [...new Set(hashtags)].join(', ')
  }

  // Answer
  if (answerLines.length > 0 && !result.answer) {
    result.answer = answerLines.join('\n').trim()
  }

  // ---- Fallbacks ----

  // Fallback: if no question found, use first non-empty non-hashtag line
  if (!result.question) {
    const firstLine = lines.find(l => {
      const t = l.trim()
      return t && !t.match(/^#/) && !t.match(/^(?:参考|核心|追问|Topic|主题|Difficulty|难度|Tags?|标签)/)
    })
    if (firstLine) {
      result.question = firstLine.trim().slice(0, 500)
      // Rest as answer
      const qIdx = lines.indexOf(firstLine)
      const rest = lines.slice(qIdx + 1).filter(l => l.trim() && !l.trim().match(/^#/)).join('\n').trim()
      if (rest && !result.answer) result.answer = rest.slice(0, 5000)
    }
  }

  // Topic inference from tags/question
  if (!result.topic) {
    const searchText = result.tags + ' ' + result.question
    const topicKeywords: Record<string, string> = {
      '基础': '基础概念', '概念': '基础概念', '定义': '基础概念',
      '核心': '核心模块', '模块': '核心模块', 'RAG': '核心模块', '工具': '核心模块', 'Memory': '核心模块', '记忆': '核心模块',
      '架构': '架构设计', '设计': '架构设计', '多Agent': '架构设计', '单Agent': '架构设计',
      '模式': '工作模式', 'ReAct': '工作模式', 'Planning': '工作模式', '规划': '工作模式',
      '工程': '工程实践', '实践': '工程实践', '测试': '工程实践', '部署': '工程实践', '监控': '工程实践',
      '评估': '评估与多Agent',
      '并行': '核心模块', '并行化': '核心模块',
    }
    for (const [kw, topic] of Object.entries(topicKeywords)) {
      if (searchText.includes(kw)) { result.topic = topic; break }
    }
  }

  return result
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

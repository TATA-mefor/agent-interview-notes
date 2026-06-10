'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Card } from '@/lib/types'

interface QuizOption {
  key: string
  text: string
  isCorrect: boolean
}

interface QuizState {
  currentIdx: number
  score: number
  totalAnswered: number
  showAnswer: boolean
  selectedKey: string | null
}

/** 取答案的前 N 字作为选项文本（不截断句子中间） */
function shortAnswer(answer: string, maxLen: number): string {
  if (!answer) return ''
  // 按句号/换行取第一个完整语义片段
  const firstSentence = answer.split(/[。\n]/)[0]?.trim() || ''
  if (firstSentence.length <= maxLen) return firstSentence
  // 在中文字符边界截断
  const truncated = firstSentence.slice(0, maxLen)
  const lastPeriod = Math.max(truncated.lastIndexOf('，'), truncated.lastIndexOf('、'), truncated.lastIndexOf(' '))
  return lastPeriod > maxLen * 0.6 ? truncated.slice(0, lastPeriod) : truncated
}

/**
 * 为一组卡片预计算每道题的选项。
 * 干扰项优先取同主题卡片的答案，再降级到其他主题。
 */
function buildOptions(cards: Card[], cardIdx: number): QuizOption[] {
  const card = cards[cardIdx]
  if (!card) return []

  const correctText = shortAnswer(card.answer, 120) || card.answer?.slice(0, 120) || '(无答案)'

  // 干扰项：同主题 > 其他主题
  const sameTopic = cards.filter(c => c.id !== card.id && c.topic === card.topic)
  const otherTopic = cards.filter(c => c.id !== card.id && c.topic !== card.topic)
  const pool = [...sameTopic, ...otherTopic]

  const distractors: string[] = []
  for (const c of pool) {
    if (distractors.length >= 3) break
    const text = shortAnswer(c.answer, 100) || c.topic
    // 去重：排除和正确答案一样或和已有干扰项一样的
    if (text && text !== correctText && !distractors.includes(text)) {
      distractors.push(text)
    }
  }

  // 干扰项不够时，用题目本身的关键词生成
  while (distractors.length < 3) {
    distractors.push(`与 ${card.topic} 相关的其他内容`)
  }

  // 取前 2 个干扰项 + 正确答案，打乱顺序
  const all: { text: string; isCorrect: boolean }[] = [
    ...distractors.slice(0, 2).map(t => ({ text: t, isCorrect: false })),
    { text: correctText, isCorrect: true },
  ]

  // Fisher-Yates shuffle（确定性：基于 cardIdx 不用 Math.random）
  for (let i = all.length - 1; i > 0; i--) {
    const j = (cardIdx * 7 + i * 13) % (i + 1) // 伪随机但确定
    ;[all[i], all[j]] = [all[j], all[i]]
  }

  return all.map((item, i) => ({
    key: String.fromCharCode(65 + i),
    text: item.text,
    isCorrect: item.isCorrect,
  }))
}

export default function QuizCard() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<QuizState>({
    currentIdx: 0, score: 0, totalAnswered: 0,
    showAnswer: false, selectedKey: null,
  })
  const [finished, setFinished] = useState(false)
  const [quizSize, setQuizSize] = useState(10)

  // 加载题库
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/cards?limit=200')
        const { data } = await res.json()
        const arr = data ?? []
        // Fisher-Yates shuffle
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        setCards(arr.slice(0, Math.min(quizSize, arr.length)))
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [quizSize])

  const currentCard = cards[quiz.currentIdx]

  // 选项在 currentIdx 变化时一次性生成，存入 state 以避免重洗牌
  const [options, setOptions] = useState<QuizOption[]>([])

  useEffect(() => {
    if (cards.length > 0 && quiz.currentIdx < cards.length) {
      setOptions(buildOptions(cards, quiz.currentIdx))
    }
  }, [cards, quiz.currentIdx])

  function handleSelect(opt: QuizOption) {
    if (quiz.showAnswer) return
    setQuiz(q => ({
      ...q,
      showAnswer: true,
      selectedKey: opt.key,
      score: opt.isCorrect ? q.score + 1 : q.score,
      totalAnswered: q.totalAnswered + 1,
    }))
  }

  function handleNext() {
    if (quiz.currentIdx + 1 >= cards.length) {
      setFinished(true)
    } else {
      setQuiz(q => ({ ...q, currentIdx: q.currentIdx + 1, showAnswer: false, selectedKey: null }))
    }
  }

  function restart(sameCards: boolean) {
    if (!sameCards) {
      const arr = [...cards].sort(() => Math.random() - 0.5)
      setCards(arr)
    }
    setQuiz({ currentIdx: 0, score: 0, totalAnswered: 0, showAnswer: false, selectedKey: null })
    setFinished(false)
  }

  // ---- Loading ----
  if (loading) return <div className="text-gray-400 text-center py-12">加载中...</div>
  if (cards.length === 0) return <div className="text-center py-12 text-gray-400 text-sm">暂无题目，请先导入题库</div>

  // ---- Finished ----
  if (finished) {
    const pct = cards.length > 0 ? Math.round((quiz.score / cards.length) * 100) : 0
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <div className="text-2xl font-bold text-gray-800 mb-2">测验完成！</div>
        <div className="text-lg text-gray-600 mb-1">{quiz.score} / {cards.length} 正确</div>
        <div className="text-sm text-gray-400 mb-6">正确率 {pct}%</div>
        <div className="flex justify-center gap-3">
          <button onClick={() => restart(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">再来一次</button>
          <button onClick={() => restart(false)}
            className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">换一批</button>
        </div>
      </div>
    )
  }

  // ---- Active Quiz ----
  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">{quiz.currentIdx + 1} / {cards.length}</span>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${((quiz.currentIdx + 1) / cards.length) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600">✓ {quiz.score}</span>
          <span className="text-rose-600">✗ {quiz.totalAnswered - quiz.score}</span>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
            {currentCard?.topic}
          </span>
          <span className="text-xs text-gray-400">{currentCard?.difficulty}</span>
          {currentCard?.frequency === '高频' && (
            <span className="text-xs text-rose-400">🔥 高频</span>
          )}
        </div>
        <div className="text-base font-bold text-gray-800 leading-relaxed">
          {currentCard?.question}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-4">
        {options.map((opt) => {
          let style = 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
          if (quiz.showAnswer) {
            if (opt.isCorrect) {
              style = 'border-emerald-400 bg-emerald-50'
            } else if (quiz.selectedKey === opt.key) {
              style = 'border-rose-400 bg-rose-50'
            } else {
              style = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          }
          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt)}
              disabled={quiz.showAnswer}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all text-sm ${style}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                quiz.showAnswer && opt.isCorrect ? 'bg-emerald-500 text-white' :
                quiz.showAnswer && quiz.selectedKey === opt.key ? 'bg-rose-500 text-white' :
                'bg-gray-100 text-gray-500'
              }`}>
                {opt.key}
              </span>
              <span className="text-gray-700 leading-relaxed">{opt.text}</span>
              {quiz.showAnswer && opt.isCorrect && (
                <span className="ml-auto text-emerald-500 text-xs font-medium">✓ 正确答案</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Answer reveal */}
      {quiz.showAnswer && (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl text-sm ${
            options.find(o => o.key === quiz.selectedKey)?.isCorrect
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="font-medium mb-2">
              {options.find(o => o.key === quiz.selectedKey)?.isCorrect
                ? '✅ 回答正确！'
                : '❌ 回答错误'}
            </div>
            <div className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap">
              {currentCard?.answer}
            </div>
            {currentCard?.common_mistakes && (
              <div className="mt-3 pt-3 border-t border-current/10">
                <span className="font-medium">⚠️ 常见误区：</span>
                <span className="opacity-75">{currentCard.common_mistakes}</span>
              </div>
            )}
          </div>
          <button onClick={handleNext}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            {quiz.currentIdx + 1 >= cards.length ? '📊 查看结果' : '下一题 →'}
          </button>
        </div>
      )}

      {/* Quiz size selector (only shown before starting) */}
      {!quiz.showAnswer && quiz.currentIdx === 0 && quiz.totalAnswered === 0 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-xs text-gray-400">题目数:</span>
          {[5, 10, 20, 50].map(n => (
            <button key={n} onClick={() => setQuizSize(n)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                quizSize === n ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

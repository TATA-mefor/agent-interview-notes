'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Card } from '@/lib/types'

interface QuizState {
  currentIdx: number
  score: number
  totalAnswered: number
  showAnswer: boolean
  selectedAnswer: string | null
  isCorrect: boolean | null
}

export default function QuizCard() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<QuizState>({
    currentIdx: 0, score: 0, totalAnswered: 0,
    showAnswer: false, selectedAnswer: null, isCorrect: null,
  })
  const [finished, setFinished] = useState(false)
  const [quizSize, setQuizSize] = useState(10)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/cards?limit=200')
        const { data } = await res.json()
        // Shuffle and pick quizSize
        const shuffled = (data ?? []).sort(() => Math.random() - 0.5)
        setCards(shuffled.slice(0, Math.min(quizSize, shuffled.length)))
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [quizSize])

  const currentCard = cards[quiz.currentIdx]

  // Generate fake "wrong answers" from other cards
  const options = useCallback(() => {
    if (!currentCard) return []
    const others = cards.filter(c => c.id !== currentCard.id).sort(() => Math.random() - 0.5)
    const distractors = others.slice(0, 3).map(c => c.answer?.split('\n')[0]?.slice(0, 120) || c.topic)
    const correct = currentCard.answer?.split('\n')[0]?.slice(0, 150) || currentCard.answer
    const all = [...distractors.slice(0, 2), correct].sort(() => Math.random() - 0.5)
    return all.map((text, i) => ({ key: String.fromCharCode(65 + i), text: text || '' }))
  }, [currentCard, cards])

  function handleSelect(key: string) {
    if (quiz.showAnswer) return
    const isCorrectAnswer = key === 'C' || options().findIndex(o => o.key === key) === options().findIndex(o => o.text === (currentCard?.answer?.split('\n')[0]?.slice(0, 150) || currentCard?.answer))
    // Simpler: check if the selected option matches the card's answer
    const selected = options().find(o => o.key === key)
    const correct = currentCard?.answer?.split('\n')[0]?.slice(0, 150) || currentCard?.answer
    const isCorrect = selected?.text === correct && correct.length > 0

    setQuiz(q => ({
      ...q,
      showAnswer: true,
      selectedAnswer: key,
      isCorrect,
      score: isCorrect ? q.score + 1 : q.score,
      totalAnswered: q.totalAnswered + 1,
    }))
  }

  function handleNext() {
    if (quiz.currentIdx + 1 >= cards.length) {
      setFinished(true)
    } else {
      setQuiz(q => ({ ...q, currentIdx: q.currentIdx + 1, showAnswer: false, selectedAnswer: null, isCorrect: null }))
    }
  }

  if (loading) return <div className="text-gray-400 text-center py-12">加载中...</div>
  if (cards.length === 0) return <div className="text-center py-12 text-gray-400 text-sm">暂无题目</div>

  if (finished) {
    const pct = cards.length > 0 ? Math.round((quiz.score / cards.length) * 100) : 0
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <div className="text-2xl font-bold text-gray-800 mb-2">测验完成！</div>
        <div className="text-lg text-gray-600 mb-1">{quiz.score} / {cards.length} 正确</div>
        <div className="text-sm text-gray-400 mb-6">正确率 {pct}%</div>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setQuiz({ currentIdx: 0, score: 0, totalAnswered: 0, showAnswer: false, selectedAnswer: null, isCorrect: null }); setFinished(false) }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">再来一次</button>
          <button onClick={() => { const s = cards.sort(() => Math.random() - 0.5); setCards([...s]); setQuiz({ currentIdx: 0, score: 0, totalAnswered: 0, showAnswer: false, selectedAnswer: null, isCorrect: null }); setFinished(false) }}
            className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">换一批</button>
        </div>
      </div>
    )
  }

  const opts = options()

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">{quiz.currentIdx + 1} / {cards.length}</span>
          <div className="flex-1 w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((quiz.currentIdx + 1) / cards.length) * 100}%` }} />
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
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">{currentCard?.topic}</span>
          <span className="text-xs text-gray-400">{currentCard?.difficulty}</span>
        </div>
        <div className="text-base font-bold text-gray-800 leading-relaxed">{currentCard?.question}</div>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-4">
        {opts.map((opt) => {
          const correctText = currentCard?.answer?.split('\n')[0]?.slice(0, 150) || currentCard?.answer
          const isCorrectOpt = opt.text === correctText && correctText.length > 0
          let style = 'border-gray-200 bg-white hover:border-blue-300'
          if (quiz.showAnswer) {
            if (isCorrectOpt) style = 'border-emerald-400 bg-emerald-50'
            else if (quiz.selectedAnswer === opt.key && !quiz.isCorrect) style = 'border-rose-400 bg-rose-50'
          }
          return (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} disabled={quiz.showAnswer}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all text-sm ${style}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                quiz.showAnswer && isCorrectOpt ? 'bg-emerald-500 text-white' :
                quiz.showAnswer && quiz.selectedAnswer === opt.key ? 'bg-rose-500 text-white' :
                'bg-gray-100 text-gray-500'}`}>
                {opt.key}
              </span>
              <span className="text-gray-700 leading-relaxed line-clamp-2">{opt.text}</span>
            </button>
          )
        })}
      </div>

      {/* Answer reveal + Next */}
      {quiz.showAnswer && (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl text-sm ${quiz.isCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
            <div className="font-medium mb-1">{quiz.isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}</div>
            <div className="text-xs leading-relaxed opacity-80">{currentCard?.answer}</div>
          </div>
          <button onClick={handleNext}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            {quiz.currentIdx + 1 >= cards.length ? '查看结果' : '下一题 →'}
          </button>
        </div>
      )}

      {/* Quiz size selector */}
      {!quiz.showAnswer && quiz.currentIdx === 0 && quiz.totalAnswered === 0 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-xs text-gray-400">题目数:</span>
          {[5, 10, 20, 50].map(n => (
            <button key={n} onClick={() => setQuizSize(n)}
              className={`px-2 py-0.5 text-xs rounded ${quizSize === n ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

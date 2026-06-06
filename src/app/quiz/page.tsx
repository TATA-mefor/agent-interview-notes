import QuizCard from '@/components/cards/views/QuizCard'

export default function QuizPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">做题练习</h1>
      <p className="text-gray-500 mb-6">从题库随机抽题，选择题模式自测</p>
      <QuizCard />
    </div>
  )
}

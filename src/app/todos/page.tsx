import TodoBoard from '@/components/todos/TodoBoard'

export default function TodosPage() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">待办清单</h1>
        <p className="text-gray-500 mt-1">按预习 / 学习 / 复习三阶段管理学习任务</p>
      </div>

      <div className="flex-1 min-h-0">
        <TodoBoard />
      </div>
    </div>
  )
}

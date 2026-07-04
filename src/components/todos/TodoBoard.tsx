'use client'

interface Todo {
  id: string
  title: string
  description?: string
  phase: 'preview' | 'study' | 'review'
  status: 'pending' | 'completed'
  due_date?: string
}

interface TodoBoardProps {
  todos?: Todo[]
}

const PHASES = [
  { id: 'preview' as const, label: '预习', colorClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-200' },
  { id: 'study' as const, label: '学习', colorClass: 'text-green-700', bgClass: 'bg-green-50', borderClass: 'border-green-200' },
  { id: 'review' as const, label: '复习', colorClass: 'text-orange-700', bgClass: 'bg-orange-50', borderClass: 'border-orange-200' },
]

export default function TodoBoard({ todos = [] }: TodoBoardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {PHASES.map((phase) => {
        const items = todos.filter((t) => t.phase === phase.id)
        return (
          <div
            key={phase.id}
            className="bg-gray-50 rounded-lg border border-gray-200 flex flex-col min-h-[300px]"
          >
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <span className={`font-medium ${phase.colorClass}`}>{phase.label}</span>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
                {items.length}
              </span>
            </div>
            <div className="flex-1 p-3">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="text-sm text-gray-400">暂无待办</div>
                    <div className="text-xs text-gray-300 mt-1">点击上方按钮添加</div>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((todo) => (
                    <li
                      key={todo.id}
                      className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="font-medium text-sm text-gray-800">{todo.title}</div>
                      {todo.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{todo.description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

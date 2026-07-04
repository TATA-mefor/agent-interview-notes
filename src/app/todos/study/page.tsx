'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function StudyPagePlaceholder() {
  const searchParams = useSearchParams()
  const phase = searchParams.get('phase') ?? 'preview'

  const phaseLabel: Record<string, string> = {
    preview: '预习',
    study: '学习',
    review: '复习',
  }

  return (
    <div className="p-6 h-full flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {phaseLabel[phase] ?? '学习'}会话
        </h1>
        <p className="text-gray-500 mb-6">学习会话功能正在开发中，将在切片 2 完成。</p>
        <Link
          href="/todos"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          返回待办清单
        </Link>
      </div>
    </div>
  )
}

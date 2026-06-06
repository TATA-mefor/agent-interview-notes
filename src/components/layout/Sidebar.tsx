import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: '仪表盘', icon: '📊' },
  { href: '/cards', label: '题库', icon: '📇' },
  { href: '/import', label: '导入', icon: '📥' },
  { href: '/notes', label: '笔记', icon: '📝' },
  { href: '/knowledge', label: '知识库', icon: '📚' },
  { href: '/search', label: '搜索', icon: '🔍' },
  { href: '/mindmap', label: '思维导图', icon: '🧠' },
  { href: '/graph', label: '关系图谱', icon: '🔗' },
  { href: '/review', label: '复习', icon: '📅' },
  { href: '/quiz', label: '做题', icon: '✏️' },
  { href: '/agents', label: 'Agent', icon: '🤖' },
  { href: '/settings', label: '设置', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-bold text-sm text-gray-800">Agent 面试笔记</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
        Local-First · v0.1.0
      </div>
    </aside>
  )
}

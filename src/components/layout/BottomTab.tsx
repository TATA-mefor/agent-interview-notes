'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TAB_ITEMS = [
  { href: '/', label: '首页', icon: '📊' },
  { href: '/cards', label: '题库', icon: '📇' },
  { href: '/review', label: '复习', icon: '📅' },
  { href: '/search', label: '搜索', icon: '🔍' },
  { href: '/settings', label: '设置', icon: '⚙️' },
]

export default function BottomTab() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex items-center justify-around h-14">
        {TAB_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

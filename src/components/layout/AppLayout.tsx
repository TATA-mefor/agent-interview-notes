'use client'

import Sidebar from './Sidebar'
import BottomTab from './BottomTab'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar — visible on lg+ screens */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab — visible below lg */}
      <div className="lg:hidden">
        <BottomTab />
      </div>
    </div>
  )
}

import type { Metadata, Viewport } from 'next'
import AppLayout from '@/components/layout/AppLayout'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agent 面试笔记',
  description: '本地优先的 Agent 面试知识卡片系统 — 电脑运行数据与服务，手机提供轻量复习体验',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Agent笔记',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#3B82F6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}

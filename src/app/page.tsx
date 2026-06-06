'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalCards: number
  avgMastery: number
  todayTotal: number
  todayCompleted: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [knowledgeCount, setKnowledgeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, cardsRes, knowledgeRes] = await Promise.all([
          fetch('/api/review?action=stats'),
          fetch('/api/cards?limit=1'),
          fetch('/api/knowledge'),
        ])

        if (statsRes.ok) {
          const { data } = await statsRes.json()
          setStats({
            totalCards: data.totalCards,
            avgMastery: data.avgMastery,
            todayTotal: data.todayTotal,
            todayCompleted: data.todayCompleted,
          })
        } else {
          const { data: cards } = await cardsRes.json()
          setStats({
            totalCards: cards?.length ?? 0,
            avgMastery: 0,
            todayTotal: 0,
            todayCompleted: 0,
          })
        }

        if (knowledgeRes.ok) {
          const { data: docs } = await knowledgeRes.json()
          setKnowledgeCount(docs?.length ?? 0)
        }
      } catch {
        setStats({ totalCards: 0, avgMastery: 0, todayTotal: 0, todayCompleted: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
      <p className="text-gray-500 mt-1">Agent 面试笔记 — 本地优先的面试知识卡片系统</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <DashboardCard
          title="题库总数"
          value={loading ? '—' : `${stats?.totalCards ?? '—'}`}
          subtitle="道 Agent 面试题"
          href="/cards"
        />
        <DashboardCard
          title="今日复习"
          value={loading ? '—' : `${stats?.todayCompleted ?? 0}/${stats?.todayTotal ?? 0}`}
          subtitle="已完成 / 总计"
          href="/review"
        />
        <DashboardCard
          title="平均掌握度"
          value={loading ? '—' : `${Math.round((stats?.avgMastery ?? 0) * 100)}%`}
          subtitle="当前掌握水平"
          href="/review"
        />
        <DashboardCard
          title="知识库"
          value={loading ? '—' : `${knowledgeCount}`}
          subtitle="文档数量"
          href="/knowledge"
        />
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-gray-800 mt-8 mb-4">快捷操作</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/cards/new" label="新建卡片" icon="➕" />
        <QuickAction href="/import" label="批量导入" icon="📥" />
        <QuickAction href="/review" label="开始复习" icon="📅" />
        <QuickAction href="/search" label="搜索题目" icon="🔍" />
      </div>

      {/* Module Overview */}
      <h2 className="text-lg font-semibold text-gray-800 mt-8 mb-4">功能模块</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <ModuleCard href="/cards" label="题库管理" icon="📇" desc="CRUD & 表格" />
        <ModuleCard href="/notes" label="Markdown 笔记" icon="📝" desc="编辑 & 双链" />
        <ModuleCard href="/knowledge" label="RAG 知识库" icon="📚" desc="文档 & 检索" />
        <ModuleCard href="/mindmap" label="思维导图" icon="🧠" desc="Mermaid" />
        <ModuleCard href="/graph" label="关系图谱" icon="🔗" desc="React Flow" />
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string
  value: string
  subtitle: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </Link>
  )
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-3 hover:bg-blue-50 hover:border-blue-300 transition-all text-sm font-medium text-gray-700"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function ModuleCard({
  href,
  label,
  icon,
  desc,
}: {
  href: string
  label: string
  icon: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all text-center"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium text-gray-800">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{desc}</div>
    </Link>
  )
}

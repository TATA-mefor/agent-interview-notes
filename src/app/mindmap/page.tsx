import MindMapPage from '@/components/mindmap/MindMapPage'

export default function MindmapPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">思维导图</h1>
      <p className="text-gray-500 mb-6">Agent 面试题库知识结构 — 固定 6 大模块，题目数量动态统计</p>
      <MindMapPage />
    </div>
  )
}

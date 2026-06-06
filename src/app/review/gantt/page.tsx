import GanttChart from '@/components/review/GanttChart'

export default function GanttPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">复习甘特图</h1>
      <p className="text-gray-500 mb-6">基于复习优先级自动排期的 14 天计划</p>
      <GanttChart />
    </div>
  )
}

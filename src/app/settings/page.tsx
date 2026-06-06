export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">设置</h1>
      <p className="text-gray-500 mt-1">系统设置与配置</p>
      <div className="mt-6 space-y-3">
        <SettingsLink href="/settings/llm" title="LLM 设置" desc="配置 AI 模型供应商和 API Key" />
        <SettingsLink href="/settings/local" title="本地部署" desc="局域网访问、PWA、Docker 配置" />
        <SettingsLink href="/settings/backup" title="备份恢复" desc="数据备份、恢复和迁移" />
      </div>
    </div>
  )
}

function SettingsLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="font-medium text-gray-900">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{desc}</div>
    </a>
  )
}

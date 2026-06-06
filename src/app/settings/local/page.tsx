export default function LocalSettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">本地部署设置</h1>
      <p className="text-gray-500 mb-6">电脑作为服务器，手机通过局域网访问</p>

      {/* Deployment Architecture */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🏠 部署架构</h2>
        <div className="bg-gray-50 rounded p-4 text-xs font-mono text-gray-700 space-y-1">
          <div>┌─────────────────────────────────────┐</div>
          <div>│  电脑（本地服务器）                  │</div>
          <div>│  ├── web :3000   (Next.js)          │</div>
          <div>│  ├── postgres :5432 (PostgreSQL)    │</div>
          <div>│  ├── pgvector      (向量检索)       │</div>
          <div>│  └── ollama :11434 (可选, 本地LLM)   │</div>
          <div>└─────────────────────────────────────┘</div>
          <div>          ↕ WiFi 局域网</div>
          <div>┌─────────────────────────────────────┐</div>
          <div>│  手机（局域网客户端）                │</div>
          <div>│  http://192.168.x.x:3000             │</div>
          <div>│  PWA 安装到主屏幕                    │</div>
          <div>└─────────────────────────────────────┘</div>
        </div>
      </div>

      {/* Quick Start Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🚀 启动步骤</h2>
        <div className="space-y-3 text-sm">
          <Step num={1} title="启动服务">
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">docker-compose up -d</code>
            <span className="text-gray-400 ml-2">一键启动 web + postgres</span>
          </Step>
          <Step num={2} title="可选：启动本地 LLM">
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">docker-compose --profile ollama up -d</code>
          </Step>
          <Step num={3} title="获取电脑 IP">
            <span className="text-gray-600">Windows:</span> <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">ipconfig</code>
            <br />
            <span className="text-gray-600 ml-12">macOS/Linux:</span> <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">ifconfig | grep inet</code>
          </Step>
          <Step num={4} title="手机访问">
            <span>浏览器打开 </span>
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">http://&lt;电脑IP&gt;:3000</code>
          </Step>
          <Step num={5} title="PWA 安装">
            iOS Safari: 分享 → 添加到主屏幕<br />
            <span className="ml-7">Android Chrome: 菜单 → 添加到主屏幕</span>
          </Step>
        </div>
      </div>

      {/* Docker Services */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📦 Docker 服务</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-1.5">服务</th><th className="py-1.5">端口</th><th className="py-1.5">说明</th><th className="py-1.5">必选</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr><td className="py-1.5 font-medium">web</td><td>3000</td><td>Next.js 应用</td><td>✅</td></tr>
            <tr><td className="py-1.5 font-medium">postgres</td><td>5432</td><td>PostgreSQL + pgvector</td><td>✅</td></tr>
            <tr><td className="py-1.5 font-medium">ollama</td><td>11434</td><td>本地 LLM / embedding</td><td>❌</td></tr>
            <tr><td className="py-1.5 font-medium">adminer</td><td>8080</td><td>数据库管理 UI</td><td>❌</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <div className="font-medium text-gray-700 text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{children}</div>
      </div>
    </div>
  )
}

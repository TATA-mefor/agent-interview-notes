export default function BackupPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">备份与恢复</h1>
      <p className="text-gray-500 mb-6">数据库备份、恢复和数据导出工具</p>

      {/* Backup */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">💾 备份数据库</h2>
        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
{`# Docker 环境中备份
docker-compose exec postgres \\
  pg_dump -U postgres agent_notes > backup_$(date +%Y%m%d).sql

# 本地 PostgreSQL 备份
pg_dump -U postgres agent_notes > backup.sql`}
          </pre>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          建议定期备份。备份文件包含所有卡片、笔记、复习记录和知识库数据。
        </p>
      </div>

      {/* Restore */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📥 恢复数据库</h2>
        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
{`# Docker 环境中恢复
docker-compose exec -T postgres \\
  psql -U postgres agent_notes < backup.sql

# 本地 PostgreSQL 恢复
psql -U postgres agent_notes < backup.sql`}
          </pre>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3 text-xs text-yellow-700">
          ⚠️ 恢复操作会覆盖当前数据库内容。恢复前建议先备份当前数据。
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📤 导出格式</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <div className="font-medium text-gray-700">CSV 导出</div>
              <div className="text-xs text-gray-500">所有卡片导出为 CSV 文件</div>
            </div>
            <a
              href="/api/cards"
              className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              获取数据
            </a>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <div className="font-medium text-gray-700">完整 SQL dump</div>
              <div className="text-xs text-gray-500">PostgreSQL pg_dump（推荐）</div>
            </div>
            <span className="text-xs text-gray-400">终端命令</span>
          </div>
        </div>
      </div>

      {/* Auto Backup Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">⏰ 自动备份（计划）</h2>
        <p className="text-sm text-gray-500">
          未来版本将支持自动定时备份：
        </p>
        <ul className="mt-2 text-xs text-gray-500 list-disc list-inside space-y-1">
          <li>每日自动备份到 data/backups/ 目录</li>
          <li>保留最近 7 天的备份</li>
          <li>备份文件可下载到本地</li>
          <li>支持 cron 定时任务</li>
        </ul>
      </div>
    </div>
  )
}

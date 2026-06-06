'use client'

import { useState } from 'react'

const AGENTS = [
  {
    key: 'card_understanding',
    name: '智能理解',
    icon: '🧠',
    desc: '分析卡片内容，生成标准答案、关键要点、面试话术、常见误区和建议标签',
    endpoint: '/api/llm/understand',
    inputFields: ['cardId'],
  },
  {
    key: 'related_question',
    name: '相关题推荐',
    icon: '🔗',
    desc: '基于标签相似度和 LLM 判断，推荐相关题目、前置知识、对比题和追问题',
    endpoint: '/api/cards/{cardId}/related',
    inputFields: ['cardId'],
  },
  {
    key: 'review_planner',
    name: '复习规划',
    icon: '📅',
    desc: '基于概率权重公式和遗忘曲线，自动生成每日复习计划和甘特图排期',
    endpoint: '/api/review?action=plan',
    inputFields: [],
  },
  {
    key: 'knowledge_import',
    name: '知识导入',
    icon: '📥',
    desc: '解析导入的文档，自动切分段落、生成 embedding、存入向量数据库',
    endpoint: '/api/knowledge/{id}',
    inputFields: ['documentId'],
  },
  {
    key: 'mindmap',
    name: '思维导图',
    icon: '🗺️',
    desc: '按主题分组生成题库结构导图（Mermaid 格式），支持主题过滤',
    endpoint: '/mindmap',
    inputFields: [],
  },
]

export default function AgentsPage() {
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [cardId, setCardId] = useState('')
  const [docId, setDocId] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runAgent(agent: (typeof AGENTS)[0]) {
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      let url = agent.endpoint
      let method = 'GET'
      let body: unknown = undefined

      if (agent.key === 'card_understanding') {
        method = 'POST'
        body = { cardId: cardId || 'card_001' }
      } else if (agent.key === 'related_question') {
        url = url.replace('{cardId}', cardId || 'card_001')
      } else if (agent.key === 'knowledge_import') {
        method = 'POST'
        url = url.replace('{id}', docId || '')
      }

      const fetchOptions: RequestInit = {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }

      const res = await fetch(url, fetchOptions)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.hint || 'Agent 执行失败')
      }

      setResult(JSON.stringify(data.data || data, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行出错')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Agent 面板</h1>
      <p className="text-gray-500 mb-6">
        5 个轻量 Agent Service，每个 Agent 有明确的输入/输出，运行记录写入 agent_runs 表
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AGENTS.map((agent) => (
          <div
            key={agent.key}
            className={`bg-white rounded-lg border-2 p-5 transition-all ${
              activeAgent === agent.key
                ? 'border-blue-400 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">{agent.icon}</span>
                  {agent.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{agent.desc}</p>
              </div>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">
                {agent.key}
              </span>
            </div>

            <div className="text-xs text-gray-400 mb-3">
              API: <code className="bg-gray-50 px-1 rounded">{agent.endpoint}</code>
            </div>

            {activeAgent === agent.key && (
              <div className="border-t border-gray-100 pt-3 mt-3">
                {/* Input fields */}
                {agent.key === 'card_understanding' || agent.key === 'related_question' ? (
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">卡片 ID</label>
                    <input
                      type="text"
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      placeholder="card_001"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ) : null}
                {agent.key === 'knowledge_import' ? (
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">文档 ID</label>
                    <input
                      type="text"
                      value={docId}
                      onChange={(e) => setDocId(e.target.value)}
                      placeholder="文档 UUID"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ) : null}

                <button
                  onClick={() => runAgent(agent)}
                  disabled={running}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {running ? '执行中...' : '▶ 执行'}
                </button>
              </div>
            )}

            <button
              onClick={() => setActiveAgent(activeAgent === agent.key ? null : agent.key)}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              {activeAgent === agent.key ? '收起' : '展开'}
            </button>
          </div>
        ))}
      </div>

      {/* Result */}
      {(result || error) && (
        <div className="mt-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-3">
              {error}
            </div>
          )}
          {result && (
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
      )}

      {/* Agent Architecture Note */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
        <div className="font-medium text-gray-600 mb-2">Agent 架构说明</div>
        <p>
          当前 Agent 为轻量 Service 实现（lib/agents/），不依赖 LangGraph 等重框架。
          每个 Agent 有明确的输入 Schema 和输出 Schema，运行记录持久化到 agent_runs 表。
          未来可升级为完整的 LangGraph Agent 工作流。
        </p>
        <div className="mt-2">
          已实现：CardUnderstandingAgent / RelatedQuestionAgent / ReviewPlanner（Service 层）/ KnowledgeImport（API 层）
        </div>
      </div>
    </div>
  )
}

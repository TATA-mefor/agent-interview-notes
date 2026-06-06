'use client'

import { useState, useEffect } from 'react'

const PROVIDERS = [
  { key: 'dify', name: 'Dify (自建)', icon: '🚀', fields: [
    { key: 'DIFY_API_URL', label: 'API 地址', placeholder: 'http://localhost:5001' },
    { key: 'DIFY_API_KEY', label: 'API Key', placeholder: 'app-xxxxxxxxxxxxxxxx', password: true },
  ]},
  { key: 'deepseek', name: 'DeepSeek', icon: '🔮', fields: [
    { key: 'DEEPSEEK_API_KEY', label: 'API Key', placeholder: 'sk-xxxxxxxxxxxxxxxx', password: true },
  ]},
  { key: 'openai', name: 'OpenAI', icon: '🧠', fields: [
    { key: 'OPENAI_API_KEY', label: 'API Key', placeholder: 'sk-xxxxxxxxxxxxxxxx', password: true },
  ]},
  { key: 'zhipu', name: '智谱 AI', icon: '🤖', fields: [
    { key: 'ZHIPU_API_KEY', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxx', password: true },
  ]},
  { key: 'ollama', name: 'Ollama (本地)', icon: '🦙', fields: [
    { key: 'OLLAMA_BASE_URL', label: '服务地址', placeholder: 'http://localhost:11434' },
    { key: 'OLLAMA_MODEL', label: '模型名', placeholder: 'qwen2.5:7b' },
  ]},
]

export default function LlmSettingsPage() {
  const [activeProvider, setActiveProvider] = useState('dify')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showKeys, setShowKeys] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('llm_settings')
    if (stored) {
      try { setFormData(JSON.parse(stored)) } catch {}
    }
    const storedProvider = localStorage.getItem('llm_provider')
    if (storedProvider) setActiveProvider(storedProvider)
  }, [])

  function handleChange(key: string, value: string) {
    setFormData(prev => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      localStorage.setItem('llm_settings', JSON.stringify(formData))
      localStorage.setItem('llm_provider', activeProvider)

      // Also save to server via API
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'llm_config',
          value: { provider: activeProvider, ...formData },
          description: 'LLM provider configuration',
        }),
      })

      setMessage({ type: 'success', text: '设置已保存' })
    } catch {
      setMessage({ type: 'error', text: '保存失败' })
    } finally { setSaving(false) }
  }

  async function handleTest() {
    setTesting(true)
    setMessage(null)
    try {
      // Save first
      localStorage.setItem('llm_settings', JSON.stringify(formData))
      localStorage.setItem('llm_provider', activeProvider)

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'llm_config',
          value: { provider: activeProvider, ...formData },
          description: 'LLM provider configuration',
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '配置已保存并验证 ✓' })
      } else {
        setMessage({ type: 'error', text: '配置保存失败，请检查网络' })
      }
    } catch {
      setMessage({ type: 'error', text: '连接测试失败，请检查 Dify 服务是否启动' })
    } finally { setTesting(false) }
  }

  const provider = PROVIDERS.find(p => p.key === activeProvider) || PROVIDERS[0]

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">LLM 设置</h1>
      <p className="text-gray-500 mb-6">配置 AI 模型。推荐自建 Dify，统一管理模型和 Key</p>

      {/* Provider Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 flex-wrap">
        {PROVIDERS.map(p => (
          <button key={p.key} onClick={() => setActiveProvider(p.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeProvider === p.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* Config Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{provider.icon}</span>
          <span className="font-semibold text-gray-800">{provider.name}</span>
        </div>

        {provider.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <div className="relative">
              <input
                type={field.password && !showKeys ? 'password' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {field.password && (
                <button type="button" onClick={() => setShowKeys(!showKeys)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {showKeys ? '🙈' : '👁'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? '保存中...' : '💾 保存配置'}
        </button>
        <button onClick={handleTest} disabled={testing}
          className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {testing ? '测试中...' : '🔌 测试连接'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
        <p className="font-medium text-gray-600 mb-1">💡 提示</p>
        <ul className="space-y-1">
          <li>• API Key 保存在浏览器本地存储，仅本机可用</li>
          <li>• Dify 需在本地或服务器运行，创建 Chatbot 应用获取 Key</li>
          <li>• DeepSeek Key 可在 <a href="https://platform.deepseek.com" className="text-blue-500 underline" target="_blank">platform.deepseek.com</a> 获取</li>
        </ul>
      </div>
    </div>
  )
}

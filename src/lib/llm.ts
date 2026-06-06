/**
 * LLM Provider Abstraction.
 * Priority: DB settings (from /settings/llm page) > Env vars > Auto-detect
 */

export type LlmProvider = 'dify' | 'deepseek' | 'openai' | 'zhipu' | 'ollama'

interface LlmMessage { role: 'system' | 'user' | 'assistant'; content: string }

export interface LlmCallOptions {
  temperature?: number; maxTokens?: number
  responseFormat?: 'text' | 'json_object'
  inputs?: Record<string, unknown>
}

let _dbConfig: Record<string, string> | null = null

async function loadDbConfig(): Promise<Record<string, string>> {
  if (_dbConfig) return _dbConfig
  try {
    const { db } = await import('@/lib/db/client')
    const { data } = await db.from('app_settings').select('*').eq('key', 'llm_config').single()
    if (data?.value) _dbConfig = data.value as Record<string, string>
  } catch { }
  return _dbConfig || (_dbConfig = {})
}

function isPlaceholder(v: string): boolean {
  return !v || v.includes('xxx') || v.includes('your_') || v.startsWith('app-xxxx')
}

function getEnv(key: string): string | undefined {
  // DB (user explicitly configured in UI) takes priority
  if (_dbConfig?.[key] && !isPlaceholder(_dbConfig[key])) return _dbConfig[key]
  // Env var (only if real value)
  const ev = process.env[key]
  if (ev && !isPlaceholder(ev)) return ev
  return undefined
}

async function getProvider(): Promise<LlmProvider> {
  // DB config first
  const db = await loadDbConfig()
  if (db.provider && !isPlaceholder(db.provider)) return db.provider as LlmProvider
  // Env var
  const ev = process.env.LLM_PROVIDER as LlmProvider
  if (ev && !isPlaceholder(ev)) return ev
  // Auto-detect
  if (getEnv('DIFY_API_KEY')) return 'dify'
  if (getEnv('DEEPSEEK_API_KEY')) return 'deepseek'
  if (getEnv('OPENAI_API_KEY')) return 'openai'
  if (getEnv('ZHIPU_API_KEY')) return 'zhipu'
  throw new Error('未配置 LLM。请在 /settings/llm 填入 API Key，或设置 .env.local')
}

// ---- Dify ----
async function callDify(prompt: string, systemPrompt?: string, opts: LlmCallOptions = {}): Promise<string> {
  const baseUrl = getEnv('DIFY_API_URL') || 'http://localhost:5001'
  const apiKey = getEnv('DIFY_API_KEY')
  if (!apiKey) throw new Error('未设置 Dify API Key')
  const r = await fetch(`${baseUrl}/v1/chat-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ inputs: opts.inputs || { system_prompt: systemPrompt || '' }, query: prompt, response_mode: 'blocking', user: 'agent-notes' }),
  })
  if (!r.ok) throw new Error(`Dify API ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const d = await r.json(); if (!d.answer) throw new Error('Dify empty')
  return d.answer
}

// ---- OpenAI-compatible ----
interface OC { provider: string; apiKey: string; baseUrl: string; model: string }

async function getOC(): Promise<OC> {
  const p = await getProvider()
  switch (p) {
    case 'deepseek': return { provider: 'deepseek', apiKey: getEnv('DEEPSEEK_API_KEY')!, baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' }
    case 'openai': return { provider: 'openai', apiKey: getEnv('OPENAI_API_KEY')!, baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
    case 'zhipu': return { provider: 'zhipu', apiKey: getEnv('ZHIPU_API_KEY')!, baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' }
    case 'ollama': return { provider: 'ollama', apiKey: 'ollama', baseUrl: (getEnv('OLLAMA_BASE_URL') || 'http://localhost:11434') + '/v1/chat/completions', model: getEnv('OLLAMA_MODEL') || 'qwen2.5:7b' }
    case 'dify': { const u = getEnv('DIFY_API_URL') || 'http://localhost:5001'; return { provider: 'dify', apiKey: getEnv('DIFY_API_KEY')!, baseUrl: `${u}/v1/chat/completions`, model: 'dify' } }
    default: throw new Error(`未知 provider: ${p}`)
  }
}

async function callOC(prompt: string, systemPrompt?: string, opts: LlmCallOptions = {}): Promise<string> {
  const c = await getOC()
  const msgs: LlmMessage[] = []
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt })
  msgs.push({ role: 'user', content: prompt })
  const body: Record<string, unknown> = { model: c.model, messages: msgs, temperature: opts.temperature ?? 0.7 }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens
  if (opts.responseFormat === 'json_object') body.response_format = { type: 'json_object' }
  const r = await fetch(c.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey}` }, body: JSON.stringify(body) })
  if (!r.ok) { const t = await r.text(); throw new Error(`LLM API ${r.status}: ${t.slice(0, 200)}`) }
  const d = await r.json(); const ct = d.choices?.[0]?.message?.content
  if (!ct) throw new Error('LLM empty')
  return ct
}

// ---- Public ----
export async function callLLM(prompt: string, sp?: string, opts?: LlmCallOptions) { const p = await getProvider(); return p === 'dify' ? callDify(prompt, sp, opts) : callOC(prompt, sp, opts) }

export async function callLLMStructured<T = Record<string, unknown>>(prompt: string, sp?: string, opts?: LlmCallOptions): Promise<T> {
  const p = await getProvider()
  const text = p === 'dify' ? await callDify(`${prompt}\n\n请严格返回 JSON 格式。`, sp, opts) : await callOC(prompt, sp, { ...opts, responseFormat: 'json_object' })
  let j = text.trim(); const m = j.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) j = m[1].trim()
  try { return JSON.parse(j) as T } catch { throw new Error(`JSON parse: ${text.slice(0, 200)}`) }
}

export async function isLlmConfigured(): Promise<boolean> { try { await getProvider(); return true } catch { return false } }

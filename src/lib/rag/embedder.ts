/**
 * Embedding generation for RAG.
 *
 * Embedding ≠ Chat — you need a dedicated embedding model, not a chat API.
 *
 * Supported embedding providers:
 *   - openai: text-embedding-3-small (512d, ~$0.02/1M tokens) / text-embedding-3-large / ada-002
 *   - qwen (DashScope): tongyi-embedding-vision-flash (1024d, 阿里云百炼) — OpenAI 兼容接口
 *   - ollama: local model (nomic-embed-text, bge-m3, etc.) via /api/embeddings — free, private
 *   - mock: deterministic pseudo-random vectors for offline/dev testing — always works
 *
 * Priority: OLLAMA_BASE_URL > OPENAI_API_KEY > DASHSCOPE_API_KEY > mock
 *
 * NOTE: DeepSeek / Zhipu do NOT provide embedding APIs.
 * Chat-only API keys (DEEPSEEK_API_KEY, ZHIPU_API_KEY) will fall back to mock for embeddings.
 */

export type EmbeddingProvider = 'ollama' | 'openai' | 'qwen' | 'mock'

export interface EmbedderConfig {
  provider: EmbeddingProvider
  dimensions: number
  model: string
  baseUrl?: string
  apiKey?: string
}

export function getEmbedderConfig(): EmbedderConfig {
  // 1. Ollama — local, free, private
  if (process.env.OLLAMA_BASE_URL || process.env.LLM_PROVIDER === 'ollama') {
    return {
      provider: 'ollama',
      dimensions: 768,
      model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    }
  }

  // 2. OpenAI — dedicated embedding models
  if (process.env.OPENAI_API_KEY && !isPlaceholder(process.env.OPENAI_API_KEY)) {
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
    const defaultDims = model.includes('large') ? 1024 : model.includes('3-small') ? 512 : 1536
    const dimsEnv = process.env.OPENAI_EMBEDDING_DIMENSIONS
    return {
      provider: 'openai',
      dimensions: dimsEnv ? parseInt(dimsEnv, 10) : defaultDims,
      model,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
    }
  }

  // 3. 阿里云百炼 DashScope — tongyi-embedding-vision-flash (1024d, 兼容 OpenAI 接口)
  if (process.env.DASHSCOPE_API_KEY && !isPlaceholder(process.env.DASHSCOPE_API_KEY)) {
    const model = process.env.QWEN_EMBED_MODEL || 'tongyi-embedding-vision-flash-2026-03-06'
    return {
      provider: 'qwen',
      dimensions: 1024,
      model,
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    }
  }

  // 4. No embedding provider — fall back to mock
  // DeepSeek / Zhipu / Dify are chat-only, they don't have embedding endpoints
  const chatProvider = process.env.LLM_PROVIDER || ''
  if (chatProvider === 'deepseek' || process.env.DEEPSEEK_API_KEY) {
    console.warn(
      '⚠️  DeepSeek 不提供 Embedding API，无法生成真实向量。\n' +
      '   方案 A: 设置 OPENAI_API_KEY 使用 text-embedding-3-small（按量付费，约 $0.02/百万 token）\n' +
      '   方案 B: 安装 Ollama 并执行 ollama pull nomic-embed-text（免费，本地运行）\n' +
      '   当前降级为 mock 模式（伪随机向量，仅用于开发测试）'
    )
  } else if (chatProvider === 'zhipu' || process.env.ZHIPU_API_KEY) {
    console.warn(
      '⚠️  智谱 AI 不提供 Embedding API。\n' +
      '   设置 OPENAI_API_KEY 或安装 Ollama 以启用真实向量检索。\n' +
      '   当前降级为 mock 模式。'
    )
  } else {
    console.warn('⚠️  No embedding provider configured. Using mock embeddings (development mode).')
  }

  return {
    provider: 'mock',
    dimensions: 1536,
    model: 'mock',
  }
}

function isPlaceholder(v: string): boolean {
  return !v || v.includes('xxx') || v.includes('your_') || v.startsWith('app-xxxx')
}

/**
 * Generate embedding vector for a single text.
 * Falls back to mock embedding if the real provider fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const config = getEmbedderConfig()

  if (config.provider === 'mock') {
    return mockEmbed(text, config.dimensions)
  }

  try {
    switch (config.provider) {
      case 'ollama':
        return await ollamaEmbed(text, config)
      case 'openai':
      case 'qwen':  // DashScope uses OpenAI-compatible /v1/embeddings
        return await openaiCompatibleEmbed(text, config)
      default:
        return mockEmbed(text, config.dimensions)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`⚠️  ${config.provider} embedding failed, falling back to mock: ${msg.slice(0, 150)}`)
    return mockEmbed(text, config.dimensions)
  }
}

/**
 * Batch generate embeddings. Uses native batch API where supported.
 * Falls back to mock embeddings if the real provider fails.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  if (texts.length === 1) return [await generateEmbedding(texts[0])]

  const config = getEmbedderConfig()

  if (config.provider === 'mock') {
    return texts.map((t) => mockEmbed(t, config.dimensions))
  }

  try {
    switch (config.provider) {
      case 'ollama':
        return await Promise.all(texts.map((t) => ollamaEmbed(t, config)))
      case 'openai':
      case 'qwen':
        return await openaiCompatibleBatchEmbed(texts, config)
      default:
        return texts.map((t) => mockEmbed(t, config.dimensions))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`⚠️  ${config.provider} batch embedding failed, falling back to mock: ${msg.slice(0, 150)}`)
    return texts.map((t) => mockEmbed(t, config.dimensions))
  }
}

// ============================================================
// Provider implementations
// ============================================================

// ---- Ollama ----
async function ollamaEmbed(text: string, config: EmbedderConfig): Promise<number[]> {
  const baseUrl = config.baseUrl || 'http://localhost:11434'
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, prompt: text }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Ollama embedding failed: ${response.status} ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  if (!data.embedding || !Array.isArray(data.embedding)) {
    throw new Error('Ollama returned no embedding')
  }
  return data.embedding as number[]
}

// ---- OpenAI-compatible (OpenAI + DeepSeek) ----
async function openaiCompatibleEmbed(text: string, config: EmbedderConfig): Promise<number[]> {
  const results = await openaiCompatibleBatchEmbed([text], config)
  return results[0]
}

async function openaiCompatibleBatchEmbed(
  texts: string[],
  config: EmbedderConfig
): Promise<number[][]> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  const body: Record<string, unknown> = {
    model: config.model,
    input: texts,
  }

  // text-embedding-3-small and -3-large support configurable dimensions
  if (config.model.includes('text-embedding-3') && config.dimensions) {
    body.dimensions = config.dimensions
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(
      `Embedding API ${response.status} (${config.provider}/${config.model}): ${errText.slice(0, 200)}`
    )
  }

  const data = await response.json()
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Embedding API returned no data array')
  }

  return (data.data as Array<{ embedding: number[] }>)
    .sort((a, b) => {
      // OpenAI returns data sorted by index
      return 0 // keep original order
    })
    .map((d) => d.embedding)
}

// ---- Mock (offline/dev mode) ----
function mockEmbed(text: string, dimensions: number): number[] {
  const hash = simpleHash(text)
  const vector: number[] = []

  for (let i = 0; i < dimensions; i++) {
    vector.push(pseudoRandom(hash + i * 31))
  }

  // Normalize to unit vector (cosine similarity = dot product after normalization)
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return vector.map((v) => v / magnitude)
}

function simpleHash(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

function pseudoRandom(seed: number): number {
  // Mulberry32 PRNG — deterministic, fast
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1 // range [-1, 1]
}

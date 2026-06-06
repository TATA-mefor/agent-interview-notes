/**
 * Embedding generation for RAG.
 *
 * Strategies:
 *   - ollama: use local embedding model (nomic-embed-text, bge-m3, etc.)
 *   - openai: text-embedding-ada-002
 *   - deepseek: use chat model for embedding (not ideal, fallback)
 *   - mock: random embeddings for development/testing without any API key
 *
 * Default: mock mode (always works offline, returns random vectors for testing)
 */

type EmbeddingProvider = 'ollama' | 'openai' | 'mock'

interface EmbedderConfig {
  provider: EmbeddingProvider
  dimensions: number
  model: string
}

function getEmbedderConfig(): EmbedderConfig {
  // Prefer ollama for local embedding
  if (process.env.OLLAMA_BASE_URL || process.env.LLM_PROVIDER === 'ollama') {
    return {
      provider: 'ollama',
      dimensions: 768, // nomic-embed-text default
      model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    }
  }

  // OpenAI embedding
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      dimensions: 1536,
      model: 'text-embedding-ada-002',
    }
  }

  // Default: mock mode — always works, returns consistent pseudo-random vectors
  // Allows RAG pipeline to function for development/testing
  console.warn('⚠️  No embedding provider configured. Using mock embeddings (development mode).')
  return {
    provider: 'mock',
    dimensions: 1536,
    model: 'mock',
  }
}

/**
 * Generate embedding vector for text.
 * Falls back to mock embeddings when no provider is configured.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const config = getEmbedderConfig()

  switch (config.provider) {
    case 'ollama':
      return ollamaEmbed(text, config)
    case 'openai':
      return openaiEmbed(text, config)
    case 'mock':
    default:
      return mockEmbed(text, config.dimensions)
  }
}

/**
 * Batch generate embeddings.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const config = getEmbedderConfig()

  switch (config.provider) {
    case 'ollama':
      return Promise.all(texts.map((t) => ollamaEmbed(t, config)))
    case 'openai':
      // OpenAI supports batch embedding
      return openaiBatchEmbed(texts, config)
    case 'mock':
    default:
      return texts.map((t) => mockEmbed(t, config.dimensions))
  }
}

// ---- Ollama ----
async function ollamaEmbed(text: string, config: EmbedderConfig): Promise<number[]> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt: text,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Ollama embedding failed: ${response.status} ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  return data.embedding as number[]
}

// ---- OpenAI ----
async function openaiEmbed(text: string, config: EmbedderConfig): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`OpenAI embedding failed: ${response.status} ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  return data.data[0].embedding as number[]
}

async function openaiBatchEmbed(texts: string[], config: EmbedderConfig): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: texts,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`OpenAI batch embedding failed: ${response.status} ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding) as number[][]
}

// ---- Mock (offline/dev mode) ----
function mockEmbed(text: string, dimensions: number): number[] {
  // Deterministic pseudo-random based on text hash
  // Uses simple hash → seeded random for reproducibility
  const hash = simpleHash(text)
  const vector: number[] = []

  for (let i = 0; i < dimensions; i++) {
    // Generate pseudo-random number from hash + index
    const value = pseudoRandom(hash + i * 31)
    vector.push(value)
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return vector.map((v) => v / magnitude)
}

function simpleHash(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}

function pseudoRandom(seed: number): number {
  // Mulberry32 PRNG
  let t = seed + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1 // range [-1, 1]
}

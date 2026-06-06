import type { CardInput } from '@/lib/types'

/**
 * Parse JSON text into CardInput array.
 * Supports:
 *   - Array of card objects: [{ topic, question, ... }]
 *   - Object with a "cards" or "data" key
 */
export function parseJSON(text: string): { rows: CardInput[]; errors: string[] } {
  const errors: string[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { rows: [], errors: [`JSON 解析失败: ${err instanceof Error ? err.message : '格式错误'}`] }
  }

  // Extract array from wrapper object
  let arr: unknown[]
  if (Array.isArray(parsed)) {
    arr = parsed
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.cards)) arr = obj.cards
    else if (Array.isArray(obj.data)) arr = obj.data
    else {
      return { rows: [], errors: ['JSON 需要是数组或包含 cards/data 数组的对象'] }
    }
  } else {
    return { rows: [], errors: ['JSON 格式不正确，需要数组或对象'] }
  }

  const rows: CardInput[] = []

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (typeof item !== 'object' || item === null) {
      errors.push(`第 ${i + 1} 项：不是对象，已跳过`)
      continue
    }

    const obj = item as Record<string, unknown>
    const topic = String(obj.topic || obj['主题'] || '').trim()
    const question = String(obj.question || obj['题目'] || '').trim()

    if (!topic || !question) {
      errors.push(`第 ${i + 1} 项：缺少 topic 或 question，已跳过`)
      continue
    }

    rows.push({
      topic,
      question,
      answer: String(obj.answer || obj['答案'] || ''),
      difficulty: normalizeDiff(String(obj.difficulty || obj['难度'] || '')),
      frequency: normalizeFreq(String(obj.frequency || obj['频率'] || '')),
      tags: extractTags(obj.tags || obj['标签']),
      source: 'json_import',
    })
  }

  return { rows, errors }
}

// ---- Helpers ----

function normalizeDiff(v: string): CardInput['difficulty'] {
  if (!v) return '中级'
  if (v.includes('初') || v.toLowerCase() === 'easy') return '初级'
  if (v.includes('高') || v.toLowerCase() === 'hard') return '高级'
  return '中级'
}

function normalizeFreq(v: string): CardInput['frequency'] {
  if (!v) return '中频'
  if (v.includes('高') || v.toLowerCase() === 'high') return '高频'
  if (v.includes('低') || v.toLowerCase() === 'low') return '低频'
  return '中频'
}

function extractTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((t) => String(t).trim()).filter(Boolean)
  if (typeof v === 'string') {
    return v
      .split(/[;；,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return []
}

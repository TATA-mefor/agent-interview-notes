import type { CardInput } from '@/lib/types'

/**
 * Parse CSV text into CardInput array.
 * Expected columns (flexible mapping):
 *   topic, question, [answer, difficulty, frequency, tags]
 */
export function parseCSV(text: string): { rows: CardInput[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV 文件至少需要标题行和一行数据'] }
  }

  const header = parseCSVLine(lines[0])
  const colMap = buildColumnMap(header)

  if (!colMap.topic || !colMap.question) {
    return {
      rows: [],
      errors: [`CSV 需要包含 "topic" 和 "question" 列，当前列: ${header.join(', ')}`],
    }
  }

  const rows: CardInput[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = parseCSVLine(line)
      const row = mapRow(values, colMap, i + 1)

      if (row) {
        rows.push(row)
      } else {
        errors.push(`第 ${i + 1} 行：topic 或 question 为空，已跳过`)
      }
    } catch (err) {
      errors.push(`第 ${i + 1} 行：解析失败 — ${err instanceof Error ? err.message : '格式错误'}`)
    }
  }

  return { rows, errors }
}

// ---- Column Mapping ----

interface ColumnMap {
  topic: number
  question: number
  answer: number
  difficulty: number
  frequency: number
  tags: number
}

function buildColumnMap(header: string[]): Partial<ColumnMap> {
  const map: Partial<ColumnMap> = {}
  header.forEach((col, idx) => {
    const key = col.trim().toLowerCase()
    if (key === 'topic' || key === '主题') map.topic = idx
    if (key === 'question' || key === '题目') map.question = idx
    if (key === 'answer' || key === '答案') map.answer = idx
    if (key === 'difficulty' || key === '难度') map.difficulty = idx
    if (key === 'frequency' || key === '频率') map.frequency = idx
    if (key === 'tags' || key === '标签') map.tags = idx
  })
  return map
}

function mapRow(
  values: string[],
  map: Partial<ColumnMap>,
  lineNum: number
): CardInput | null {
  const topic = (map.topic !== undefined ? values[map.topic]?.trim() : '') || ''
  const question = (map.question !== undefined ? values[map.question]?.trim() : '') || ''

  if (!topic || !question) return null

  const difficulty = normalizeDifficulty(
    map.difficulty !== undefined ? values[map.difficulty]?.trim() : ''
  )
  const frequency = normalizeFrequency(
    map.frequency !== undefined ? values[map.frequency]?.trim() : ''
  )
  const tags = map.tags !== undefined
    ? values[map.tags]
        ?.split(/[;；,，]/)
        .map((t) => t.trim())
        .filter(Boolean) || []
    : []

  return {
    topic,
    question,
    answer: (map.answer !== undefined ? values[map.answer]?.trim() : '') || '',
    difficulty,
    frequency,
    tags,
    source: 'csv_import',
  }
}

// ---- Helpers ----

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function normalizeDifficulty(v: string): CardInput['difficulty'] {
  if (v.includes('初') || v.toLowerCase() === 'easy' || v === '1') return '初级'
  if (v.includes('高') || v.toLowerCase() === 'hard' || v === '3') return '高级'
  return '中级'
}

function normalizeFrequency(v: string): CardInput['frequency'] {
  if (v.includes('高') || v.toLowerCase() === 'high' || v === '3') return '高频'
  if (v.includes('低') || v.toLowerCase() === 'low' || v === '1') return '低频'
  return '中频'
}

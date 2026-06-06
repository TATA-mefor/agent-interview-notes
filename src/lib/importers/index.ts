/**
 * Unified import interface.
 * Detects file format and delegates to the appropriate parser.
 */

import type { CardInput } from '@/lib/types'
import { parseCSV } from './csvImporter'
import { parseJSON } from './jsonImporter'
import { parseMarkdown } from './markdownImporter'

export type ImportFormat = 'csv' | 'json' | 'markdown'

export interface ParseResult {
  format: ImportFormat
  rows: CardInput[]
  errors: string[]
}

/**
 * Auto-detect format and parse.
 */
export function parseImportContent(
  content: string,
  fileName?: string
): ParseResult {
  const ext = fileName?.split('.').pop()?.toLowerCase()

  // Use file extension as hint
  if (ext === 'csv') {
    const { rows, errors } = parseCSV(content)
    return { format: 'csv', rows, errors }
  }
  if (ext === 'json') {
    const { rows, errors } = parseJSON(content)
    return { format: 'json', rows, errors }
  }
  if (ext === 'md' || ext === 'markdown') {
    const { rows, errors } = parseMarkdown(content)
    return { format: 'markdown', rows, errors }
  }

  // Auto-detect: try JSON first (fast fail), then CSV, then Markdown
  const trimmed = content.trim()

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const { rows, errors } = parseJSON(content)
    if (rows.length > 0) return { format: 'json', rows, errors }
  }

  // Check CSV: has comma-separated header with topic/question
  const firstLine = trimmed.split('\n')[0] || ''
  if (
    firstLine.includes(',') &&
    (firstLine.toLowerCase().includes('topic') || firstLine.includes('主题'))
  ) {
    const { rows, errors } = parseCSV(content)
    if (rows.length > 0) return { format: 'csv', rows, errors }
  }

  // Fallback: Markdown
  const { rows, errors } = parseMarkdown(content)
  return { format: 'markdown', rows, errors }
}

export { parseCSV, parseJSON, parseMarkdown }

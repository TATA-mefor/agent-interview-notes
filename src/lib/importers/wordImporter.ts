/**
 * Word Importer — Extract text from .docx files.
 * Uses mammoth (pure JS, works in Node.js).
 */

import type { CardInput } from '@/lib/types'

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammothModule = await import('mammoth')
  const mammoth = mammothModule.default || mammothModule
  const result = await mammoth.extractRawText({ buffer })
  return result.value || ''
}

export async function parseDocxToCards(
  buffer: Buffer,
  fileName: string
): Promise<{ rows: CardInput[]; rawText: string; errors: string[] }> {
  const text = await extractDocxText(buffer)
  return { rows: [], rawText: text, errors: [] }
}

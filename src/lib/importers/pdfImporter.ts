/**
 * PDF Importer — Extract text from PDF files.
 * Uses pdf-parse (pdf.js based, works in Node.js).
 */

import type { CardInput } from '@/lib/types'

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse is an ESM module; handle both default and named exports
  const pdfParseModule = await import('pdf-parse')
  const pdfParse = (pdfParseModule as unknown as { default?: (buf: Buffer) => Promise<{ text: string }> }).default
    || (pdfParseModule as unknown as (buf: Buffer) => Promise<{ text: string }>)

  const data = await pdfParse(buffer)
  return data.text || ''
}

export async function parsePdfToCards(
  buffer: Buffer,
  fileName: string
): Promise<{ rows: CardInput[]; rawText: string; errors: string[] }> {
  const text = await extractPdfText(buffer)
  return { rows: [], rawText: text, errors: [] }
}

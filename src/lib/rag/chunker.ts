/**
 * Document chunking strategies for RAG.
 *
 * Supports:
 *   - Fixed-size chunking (with overlap)
 *   - Paragraph-based chunking
 *   - Markdown-aware chunking (split on headings)
 */

export interface ChunkResult {
  index: number
  content: string
  tokenCount: number // estimated
  metadata: {
    heading?: string
    startLine: number
    endLine: number
  }
}

export interface ChunkOptions {
  strategy: 'fixed' | 'paragraph' | 'markdown'
  chunkSize?: number   // target chars per chunk (default: 1000)
  chunkOverlap?: number // overlap chars (default: 200)
}

export function chunkText(
  text: string,
  options: ChunkOptions = { strategy: 'paragraph' }
): ChunkResult[] {
  switch (options.strategy) {
    case 'fixed':
      return fixedChunk(text, options.chunkSize || 1000, options.chunkOverlap || 200)
    case 'markdown':
      return markdownChunk(text)
    case 'paragraph':
    default:
      return paragraphChunk(text, options.chunkSize || 1000)
  }
}

// ---- Fixed-size chunking ----
function fixedChunk(text: string, size: number, overlap: number): ChunkResult[] {
  const chunks: ChunkResult[] = []
  let index = 0
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + size, text.length)

    // Try to break at a natural boundary (newline or period)
    if (end < text.length) {
      const searchStart = Math.max(start, end - 100)
      const searchText = text.slice(searchStart, end + 100)
      const breakPoint = findBreakPoint(searchText, end - searchStart)
      if (breakPoint > 0) {
        end = searchStart + breakPoint
      }
    }

    chunks.push({
      index,
      content: text.slice(start, end).trim(),
      tokenCount: estimateTokens(text.slice(start, end)),
      metadata: {
        startLine: countNewlines(text, 0, start),
        endLine: countNewlines(text, 0, end),
      },
    })

    index++
    start = end - overlap
    if (start >= text.length) break
    // Prevent infinite loop for very small chunks
    if (start <= 0) start = end
  }

  return chunks
}

// ---- Paragraph chunking ----
function paragraphChunk(text: string, maxSize: number): ChunkResult[] {
  const paragraphs = text.split(/\n\s*\n/)
  const chunks: ChunkResult[] = []
  let index = 0
  let currentChunk = ''
  let lineOffset = 0

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) {
      lineOffset += para.split('\n').length
      continue
    }

    if (
      currentChunk &&
      currentChunk.length + trimmed.length > maxSize
    ) {
      chunks.push({
        index,
        content: currentChunk.trim(),
        tokenCount: estimateTokens(currentChunk),
        metadata: { startLine: 0, endLine: 0 },
      })
      index++
      currentChunk = trimmed
    } else {
      currentChunk = currentChunk
        ? `${currentChunk}\n\n${trimmed}`
        : trimmed
    }

    lineOffset += para.split('\n').length
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      index,
      content: currentChunk.trim(),
      tokenCount: estimateTokens(currentChunk),
      metadata: { startLine: 0, endLine: 0 },
    })
  }

  return chunks
}

// ---- Markdown-aware chunking ----
function markdownChunk(text: string): ChunkResult[] {
  const chunks: ChunkResult[] = []
  // Split on ## or ### headings
  const sections = text.split(/\n(?=##\s)/)
  let index = 0

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    // Extract heading
    const headingMatch = trimmed.match(/^(#{2,3})\s+(.+)/)
    const heading = headingMatch ? headingMatch[2].trim() : undefined

    // If section is too large, sub-chunk by paragraphs
    if (trimmed.length > 2000) {
      const paras = trimmed.split(/\n\s*\n/)
      let subChunk = ''
      let subIndex = 0

      for (const para of paras) {
        if (subChunk && subChunk.length + para.length > 1500) {
          chunks.push({
            index,
            content: subChunk.trim(),
            tokenCount: estimateTokens(subChunk),
            metadata: { heading, startLine: 0, endLine: 0 },
          })
          index++
          subChunk = para
          subIndex++
        } else {
          subChunk = subChunk ? `${subChunk}\n\n${para}` : para
        }
      }

      if (subChunk.trim()) {
        chunks.push({
          index,
          content: subChunk.trim(),
          tokenCount: estimateTokens(subChunk),
          metadata: { heading, startLine: 0, endLine: 0 },
        })
        index++
      }
    } else {
      chunks.push({
        index,
        content: trimmed,
        tokenCount: estimateTokens(trimmed),
        metadata: { heading, startLine: 0, endLine: 0 },
      })
      index++
    }
  }

  return chunks
}

// ---- Helpers ----

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for Chinese, ~4 for English
  // Better: count Chinese chars as 1 token, English words as ~1.3 tokens
  const chineseChars = (text.match(/[一-鿿]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  return Math.ceil(chineseChars * 0.5 + englishWords * 1.3)
}

function findBreakPoint(text: string, target: number): number {
  // Find the nearest newline or period near the target
  const nearTarget = text.slice(Math.max(0, target - 50), target + 50)
  const newlineIdx = nearTarget.lastIndexOf('\n')
  const periodIdx = nearTarget.lastIndexOf('。')
  const dotIdx = nearTarget.lastIndexOf('. ')

  const best = Math.max(newlineIdx, periodIdx, dotIdx)
  return best > 0 ? target - 50 + best + 1 : -1
}

function countNewlines(text: string, start: number, end: number): number {
  const slice = text.slice(start, end)
  return (slice.match(/\n/g) || []).length
}

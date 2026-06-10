/**
 * Structured Markdown chunker.
 *
 * Strategy:
 *   1. Parse document into heading tree (H1/H2/H3)
 *   2. Split each section by paragraph
 *   3. Oversized paragraphs → sentence-split
 *   4. Undersized chunks → merge with next sibling
 *   5. Attach heading breadcrumb + position metadata
 *
 * References: Chonkie, LangChain Text Splitters, RAGFlow
 */

export interface ChunkResult {
  index: number
  content: string
  tokenCount: number
  metadata: {
    breadcrumb: string    // e.g. "核心模块 > Planning"
    heading?: string      // closest heading
    headingLevel?: number // 1-3
    startLine: number
    endLine: number
  }
}

export interface ChunkOptions {
  strategy: 'markdown' | 'paragraph' | 'fixed'
  targetSize?: number     // target chars (default 1000)
  minSize?: number        // merge chunks smaller than this (default 200)
  maxSize?: number        // split chunks larger than this (default 2000)
  chunkOverlap?: number   // for fixed strategy only
}

const DEFAULT_TARGET = 1000
const DEFAULT_MIN = 200
const DEFAULT_MAX = 2000

export function chunkText(
  text: string,
  options: ChunkOptions = { strategy: 'markdown' }
): ChunkResult[] {
  switch (options.strategy) {
    case 'fixed':
      return fixedChunk(text, options.targetSize || 1000, options.chunkOverlap || 200)
    case 'paragraph':
      return paragraphChunk(text, options.targetSize || DEFAULT_TARGET, options.minSize || DEFAULT_MIN)
    case 'markdown':
    default:
      return markdownStructuredChunk(text, options)
  }
}

// ============================================================
// Structured Markdown Chunking (Main)
// ============================================================

interface Section {
  heading: string
  level: number          // 1=#, 2=##, 3=###
  breadcrumb: string     // full path
  content: string
  startLine: number
  endLine: number
}

function markdownStructuredChunk(text: string, options: ChunkOptions): ChunkResult[] {
  const target = options.targetSize || DEFAULT_TARGET
  const min = options.minSize || DEFAULT_MIN
  const max = options.maxSize || DEFAULT_MAX

  // 1. Parse into sections
  const sections = parseMarkdownSections(text)

  // 2. Split each section into paragraphs, then into chunk-sized pieces
  let raw: ChunkResult[] = []
  let idx = 0
  for (const sec of sections) {
    const chunks = sectionToChunks(sec, idx, target, max)
    raw.push(...chunks)
    idx += chunks.length
  }

  // 3. Merge undersized chunks
  raw = mergeSmallChunks(raw, min, target)

  // 4. Re-index
  return raw.map((c, i) => ({ ...c, index: i }))
}

// ---- Parse heading tree ----

function parseMarkdownSections(text: string): Section[] {
  const lines = text.split(/\r?\n/)
  const sections: Section[] = []

  // Breadcrumb stack: [{level, title}]
  let breadcrumbs: { level: number; title: string }[] = [{ level: 0, title: '' }]
  let currentHeading = ''
  let currentLevel = 0
  let currentLines: string[] = []
  let sectionStart = 0

  function flushSection(endLine: number) {
    const content = currentLines.join('\n').trim()
    if (!content) {
      sectionStart = endLine + 1
      currentLines = []
      return
    }

    const breadcrumb = breadcrumbs
      .filter(b => b.level > 0)
      .map(b => b.title)
      .join(' > ')

    sections.push({
      heading: currentHeading,
      level: currentLevel,
      breadcrumb,
      content,
      startLine: sectionStart,
      endLine,
    })

    sectionStart = endLine + 1
    currentLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)

    if (headingMatch) {
      // Flush previous section
      flushSection(i - 1)

      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      currentHeading = title
      currentLevel = level

      // Update breadcrumb: pop everything at or below this level
      while (breadcrumbs.length > 0 && breadcrumbs[breadcrumbs.length - 1].level >= level) {
        breadcrumbs.pop()
      }
      breadcrumbs.push({ level, title })

      // The heading line itself becomes part of the next section's content
      currentLines = [line]
      sectionStart = i
    } else {
      currentLines.push(line)
    }
  }

  // Flush last section
  flushSection(lines.length - 1)

  return sections
}

// ---- Section → Chunks ----

function sectionToChunks(
  sec: Section,
  startIdx: number,
  target: number,
  max: number
): ChunkResult[] {
  const result: ChunkResult[] = []

  // Split into paragraphs first
  const paragraphs = sec.content.split(/\n\s*\n/)
  let buffer = ''
  let bufStart = sec.startLine

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // If adding this paragraph would exceed target, flush buffer
    if (buffer && buffer.length + trimmed.length > target) {
      result.push(makeChunk(buffer, startIdx + result.length, sec, bufStart, bufStart + buffer.split('\n').length))
      buffer = trimmed
      bufStart = sec.startLine + paragraphs.indexOf(para)
    } else {
      buffer = buffer ? `${buffer}\n\n${trimmed}` : trimmed
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    let chunk = makeChunk(buffer, startIdx + result.length, sec, bufStart, sec.endLine)
    result.push(chunk)
  }

  // Split oversized chunks
  const final: ChunkResult[] = []
  for (const c of result) {
    if (c.content.length > max) {
      final.push(...splitOversized(c, target))
    } else {
      final.push(c)
    }
  }

  return final
}

// ---- Split oversized chunks by sentence ----

function splitOversized(chunk: ChunkResult, target: number): ChunkResult[] {
  const parts: ChunkResult[] = []
  const sentences = chunk.content.split(/(?<=[。！？\n])\s*/)
  let buffer = ''

  for (const sent of sentences) {
    if (buffer && buffer.length + sent.length > target) {
      parts.push({ ...chunk, content: buffer.trim(), tokenCount: estimateTokens(buffer) })
      buffer = sent
    } else {
      buffer = buffer ? buffer + sent : sent
    }
  }

  if (buffer.trim()) {
    parts.push({ ...chunk, content: buffer.trim(), tokenCount: estimateTokens(buffer) })
  }

  // Re-index
  return parts.map((c, i) => ({ ...c, index: chunk.index + i }))
}

// ---- Merge small chunks ----

function mergeSmallChunks(chunks: ChunkResult[], min: number, target: number): ChunkResult[] {
  if (chunks.length <= 1) return chunks

  const result: ChunkResult[] = []
  let buffer = chunks[0]

  for (let i = 1; i < chunks.length; i++) {
    const curr = chunks[i]

    // Merge if buffer is small and adding current won't exceed target
    if (buffer.content.length < min && buffer.content.length + curr.content.length <= target) {
      const merged = `${buffer.content}\n\n${curr.content}`
      buffer = {
        ...buffer,
        content: merged,
        tokenCount: estimateTokens(merged),
        metadata: {
          ...buffer.metadata,
          heading: buffer.metadata.heading || curr.metadata.heading,
          headingLevel: buffer.metadata.headingLevel || curr.metadata.headingLevel,
        },
      }
    } else {
      result.push(buffer)
      buffer = curr
    }
  }

  result.push(buffer)
  return result
}

// ---- Helpers ----

function makeChunk(content: string, index: number, sec: Section, startLine: number, endLine: number): ChunkResult {
  return {
    index,
    content: content.trim(),
    tokenCount: estimateTokens(content),
    metadata: {
      breadcrumb: sec.breadcrumb,
      heading: sec.heading,
      headingLevel: sec.level,
      startLine,
      endLine,
    },
  }
}

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) || []).length
  const words = (text.match(/[a-zA-Z]+/g) || []).length
  return Math.ceil(chineseChars * 0.5 + words * 1.3)
}

// ============================================================
// Fixed-size chunking (fallback)
// ============================================================

function fixedChunk(text: string, size: number, overlap: number): ChunkResult[] {
  const chunks: ChunkResult[] = []
  let index = 0, start = 0
  while (start < text.length) {
    let end = Math.min(start + size, text.length)
    if (end < text.length) {
      const searchStart = Math.max(start, end - 100)
      const breakPoint = findBreakPoint(text.slice(searchStart, end + 100), end - searchStart)
      if (breakPoint > 0) end = searchStart + breakPoint
    }
    chunks.push({
      index,
      content: text.slice(start, end).trim(),
      tokenCount: estimateTokens(text.slice(start, end)),
      metadata: { breadcrumb: '', startLine: countLines(text, 0, start), endLine: countLines(text, 0, end) },
    })
    index++
    start = end - overlap
    if (start <= 0 || start >= text.length) break
    start = Math.max(start, end)
  }
  return chunks
}

function findBreakPoint(text: string, target: number): number {
  const near = text.slice(Math.max(0, target - 50), target + 50)
  const idx = Math.max(near.lastIndexOf('\n'), near.lastIndexOf('。'), near.lastIndexOf('. '))
  return idx > 0 ? target - 50 + idx + 1 : -1
}

function countLines(text: string, start: number, end: number): number {
  return (text.slice(start, end).match(/\n/g) || []).length
}

// ============================================================
// Paragraph chunking (fallback)
// ============================================================

function paragraphChunk(text: string, target: number, min: number): ChunkResult[] {
  const paras = text.split(/\n\s*\n/).filter(p => p.trim())
  const chunks: ChunkResult[] = []
  let buffer = '', idx = 0

  for (const p of paras) {
    if (buffer && buffer.length + p.length > target) {
      chunks.push({ index: idx++, content: buffer.trim(), tokenCount: estimateTokens(buffer), metadata: { breadcrumb: '', startLine: 0, endLine: 0 } })
      buffer = p
    } else {
      buffer = buffer ? `${buffer}\n\n${p}` : p
    }
  }
  if (buffer.trim()) {
    chunks.push({ index: idx, content: buffer.trim(), tokenCount: estimateTokens(buffer), metadata: { breadcrumb: '', startLine: 0, endLine: 0 } })
  }

  // Merge small
  return mergeSmallChunks(chunks, min, target)
}

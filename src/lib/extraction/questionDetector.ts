// ============================================================
// Question Detector — identify question candidates in text
// ============================================================

import { isCodeLikeLine, type CodeRange } from './codeBlockDetector'

export interface DetectedQuestion {
  text: string
  startOffset: number
  endOffset: number
  matchType: 'qa_marker' | 'heading' | 'numbered' | 'question_mark' | 'bullet'
  prefix?: string
  confidenceBase: number
  fullLine?: string     // the complete source line for rejection checking
}

export interface QuestionDetectorOptions {
  minLength?: number
  maxLength?: number
  codeRanges?: CodeRange[]  // code blocks to exclude
}

// Patterns for explicit Q/A markers
const QA_MARKER_PATTERNS = [
  /(?:^|\n)\s*(?:Q|Question|问题|题目|问)[\s:：]*(\d*)\s*[:：]?\s*(.+?)(?=\n|$)/gi,
  /(?:^|\n)\s*\[(?:问|题|Q)\]\s*(.+?)(?=\n|$)/gi,
]

// Patterns for numbered questions
const NUMBERED_PATTERNS = [
  /(?:^|\n)\s*(\d+)[\.\、\)]\s*(.+?[?？].*?)(?=\n|$)/g,
  /(?:^|\n)\s*[（(]\s*(\d+)\s*[）)]\s*(.+?[?？].*?)(?=\n|$)/g,
  /(?:^|\n)\s*Q\s*(\d+)\s*[:：]?\s*(.+?)(?=\n|$)/gi,
  /(?:^|\n)\s*问题\s*(\d+)\s*[:：]?\s*(.+?)(?=\n|$)/gi,
  /(?:^|\n)\s*题目\s*(\d+)\s*[:：]?\s*(.+?)(?=\n|$)/gi,
]

// Heading patterns (Markdown ## / ###)
const HEADING_PATTERN = /^(#{1,4})\s+(.+)$/gm

// Standalone question-mark sentences
const QUESTION_MARK_PATTERN = /(?:^|\n)([^#\n]{6,200}[?？])(?=\s*(?:\n|$))/g

// Bullet list patterns
const BULLET_PATTERN = /(?:^|\n)\s*[-*+]\s+(.+?[?？].*?)(?=\n|$)/g


export function detectQuestions(
  text: string,
  options: QuestionDetectorOptions = {}
): DetectedQuestion[] {
  const { minLength = 6, maxLength = 200, codeRanges = [] } = options
  const results: DetectedQuestion[] = []
  const seenRanges = new Set<string>()

  function getFullLine(offset: number): string {
    const lineStart = text.lastIndexOf('\n', offset) + 1
    const lineEnd = text.indexOf('\n', offset)
    return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
  }

  function add(result: DetectedQuestion) {
    const trimmed = result.text.trim()
    const len = trimmed.length
    if (len < minLength || len > maxLength) return
    const key = `${result.startOffset}-${result.endOffset}`
    if (seenRanges.has(key)) return

    // Get full source line for code detection
    const line = getFullLine(result.startOffset)
    result.fullLine = line

    // ---- Code rejection (line-level only; offset ranges are unreliable after masking+cleaning) ----
    // isCodeLikeLine checks the line text itself — no offset dependency
    if (isCodeLikeLine(trimmed) || isCodeLikeLine(line)) return

    // ---- Lower confidence for bare question_mark (non-structured) ----
    if (result.matchType === 'question_mark') {
      result.confidenceBase = Math.min(result.confidenceBase, 0.70)
    }

    seenRanges.add(key)
    results.push(result)
  }

  // ---- Priority 1: Q/A markers (highest confidence) ----
  for (const pattern of QA_MARKER_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const questionText = (match[2] || match[1] || '').trim()
      if (!questionText) continue
      add({
        text: questionText,
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        matchType: 'qa_marker',
        prefix: match[0].match(/^[Q问问题题目]/i)?.[0] || 'Q',
        confidenceBase: 0.95,
      })
    }
  }

  // ---- Priority 2: Numbered questions ----
  for (const pattern of NUMBERED_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const num = match[1] || ''
      const questionText = (match[2] || '').trim()
      if (!questionText) continue
      add({
        text: questionText,
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        matchType: 'numbered',
        prefix: num ? `${num}.` : undefined,
        confidenceBase: 0.85,
      })
    }
  }

  // ---- Priority 3: Markdown headings that look like questions ----
  HEADING_PATTERN.lastIndex = 0
  let headingMatch: RegExpExecArray | null
  while ((headingMatch = HEADING_PATTERN.exec(text)) !== null) {
    const headingText = headingMatch[2].trim()
    // Heading qualifies if it's a question or starts with Q/问
    const isQuestion = /[?？]/.test(headingText) ||
      /^(Q\d*|问题\d*|问\d*|题目\d*)[:：\s]/.test(headingText) ||
      /^(什么是|如何|怎么|为什么|怎样|能否|可否|是否)/.test(headingText)

    if (isQuestion) {
      add({
        text: headingText,
        startOffset: headingMatch.index,
        endOffset: headingMatch.index + headingMatch[0].length,
        matchType: 'heading',
        prefix: headingMatch[1],
        confidenceBase: 0.9,
      })
    }
  }

  // ---- Priority 4: Question-mark sentences (loose mode) ----
  QUESTION_MARK_PATTERN.lastIndex = 0
  let qmMatch: RegExpExecArray | null
  while ((qmMatch = QUESTION_MARK_PATTERN.exec(text)) !== null) {
    const qText = qmMatch[1].trim()
    if (!qText) continue
    add({
      text: qText,
      startOffset: qmMatch.index,
      endOffset: qmMatch.index + qmMatch[0].length,
      matchType: 'question_mark',
      confidenceBase: 0.75,
    })
  }

  // ---- Priority 5: Bullet list items that are questions ----
  BULLET_PATTERN.lastIndex = 0
  let bulletMatch: RegExpExecArray | null
  while ((bulletMatch = BULLET_PATTERN.exec(text)) !== null) {
    const bText = bulletMatch[1].trim()
    if (!bText) continue
    add({
      text: bText,
      startOffset: bulletMatch.index,
      endOffset: bulletMatch.index + bulletMatch[0].length,
      matchType: 'bullet',
      confidenceBase: 0.7,
    })
  }

  // Sort by position in text
  results.sort((a, b) => a.startOffset - b.startOffset)

  return results
}

/**
 * Aggressive fallback: find ANY sentence that looks like a question.
 * Used when standard detection returns 0 results in loose/llm_assisted mode.
 *
 * Strategies:
 *   1. Any sentence ending with ? or ？  (including inside paragraphs)
 *   2. Sentences starting with question words (什么是, 如何, 怎么, 为什么...)
 *   3. Lines that look like topic titles (short, substantive, followed by longer text)
 */
export function detectQuestionsFallback(
  text: string,
  options: QuestionDetectorOptions = {}
): DetectedQuestion[] {
  const { minLength = 6, maxLength = 200, codeRanges = [] } = options
  const results: DetectedQuestion[] = []
  const seen = new Set<string>()

  function getFullLine(offset: number): string {
    const lineStart = text.lastIndexOf('\n', offset) + 1
    const lineEnd = text.indexOf('\n', offset)
    return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
  }

  function add(result: DetectedQuestion) {
    const trimmed = result.text.trim()
    const len = trimmed.length
    if (len < minLength || len > maxLength) return
    const key = `${result.startOffset}-${result.endOffset}`
    if (seen.has(key)) return

    const line = getFullLine(result.startOffset)
    if (isCodeLikeLine(trimmed) || isCodeLikeLine(line)) return

    result.confidenceBase = Math.min(result.confidenceBase, 0.65)
    seen.add(key)
    results.push(result)
  }

  // Strategy 1: Split text into sentences (by Chinese/English punctuation)
  // and find any that end with question mark
  const sentences = text.split(/(?<=[?!?！。\n])\s*/)
  for (let offset = 0, i = 0; i < sentences.length; i++) {
    const s = sentences[i]
    if (/[?？]$/.test(s.trim()) && s.trim().length >= minLength) {
      add({
        text: s.trim(),
        startOffset: offset,
        endOffset: offset + s.length,
        matchType: 'question_mark',
        confidenceBase: 0.65,
      })
    }
    offset += s.length
  }

  // Strategy 2: Find sentences starting with question words (even without ?)
  const questionWordPattern = /(?:^|\n|。|！|!|\.)(\s*(?:什么是|如何|怎么|怎样|为什么|为何|能否|可否|是否|区别|对比|关系|优缺点)[^。！!\.\n]{6,200})/g
  let qwMatch: RegExpExecArray | null
  while ((qwMatch = questionWordPattern.exec(text)) !== null) {
    const qText = qwMatch[1]?.trim()
    if (qText && qText.length >= minLength) {
      add({
        text: qText,
        startOffset: qwMatch.index + 1, // skip the preceding punctuation
        endOffset: qwMatch.index + qwMatch[0].length,
        matchType: 'question_mark',
        confidenceBase: 0.55,
      })
    }
  }

  // Strategy 3: Lines that look like topic titles
  // (relatively short, ends with newline, followed by substantially longer text)
  const lines = text.split('\n')
  let charOffset = 0
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim()
    const nextLine = lines[i + 1]?.trim() || ''

    if (
      line.length >= 10 && line.length <= 120 &&
      nextLine.length > line.length * 2 &&
      !line.startsWith('#') &&
      !line.startsWith('//') &&
      /[一-鿿a-zA-Z]/.test(line)  // contains actual content
    ) {
      add({
        text: line,
        startOffset: charOffset,
        endOffset: charOffset + line.length,
        matchType: 'heading',
        confidenceBase: 0.45,
      })
    }
    charOffset += lines[i].length + 1 // +1 for the \n
  }

  results.sort((a, b) => a.startOffset - b.startOffset)
  return results
}

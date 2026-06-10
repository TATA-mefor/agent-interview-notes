// ============================================================
// Code Block Detector — filter out code lines from Q&A extraction
// ============================================================

export interface CodeRange {
  start: number
  end: number
  type: 'fenced' | 'indented' | 'inline'
}

// ---- Public API ----

/**
 * Check if a single line looks like code, not a real question.
 */
export function isCodeLikeLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Markdown fenced code block markers
  if (/^```/.test(trimmed)) return true
  if (/^~~~/.test(trimmed)) return true

  // Python
  if (/^(def |class |import |from |return |yield |raise |with |async |await |elif |except |finally |pass |break |continue |global |nonlocal )/.test(trimmed)) return true

  // JavaScript/TypeScript
  if (/^(const |let |var |function |export |import |require\(|module\.exports|class |interface |type |enum |async function)/.test(trimmed)) return true

  // Control flow
  if (/^(if |for |while |switch |case |try |catch |throw )/.test(trimmed)) return true

  // Variable assignment with code-like RHS
  if (isAssignmentWithCode(trimmed)) return true

  // Function call that looks like code, not a question
  if (isFunctionCallLine(trimmed)) return true

  // Question mark inside quotes + assignment context = code, not a question
  if (isQuotedQuestionInCode(trimmed)) return true

  // Shell/bash
  if (/^[\$>] /.test(trimmed)) return true
  if (/^(npm |pip |git |docker |kubectl |curl |wget |psql |python\d? |node |ts-node )/.test(trimmed)) return true

  // Configuration / data
  if (/^[\[\{]/.test(trimmed) && /[\]\}]$/.test(trimmed)) return true  // JSON line
  if (/^[a-zA-Z_]\w*\s*[=:]\s*[\[\(\{'"\d]/.test(trimmed) && trimmed.length < 60) return true

  // Comment lines (//, --, <!--). Exclude # — ambiguous with Markdown headings.
  if (/^\s*(\/\/|--|<!--)/.test(trimmed)) return true

  // Log/print statements
  if (/^(console\.|print\(|logger\.|log\.|printf\(|echo |System\.out)/.test(trimmed)) return true

  return false
}

/**
 * Check if offset falls inside any code range.
 */
export function isInsideCodeRange(offset: number, codeRanges: CodeRange[]): boolean {
  for (const range of codeRanges) {
    if (offset >= range.start && offset < range.end) return true
  }
  return false
}

/**
 * Find all code block ranges in text.
 * Returns ranges that should be excluded from question detection.
 */
export function detectCodeRanges(text: string): CodeRange[] {
  const ranges: CodeRange[] = []
  const lines = text.split('\n')
  let offset = 0

  let inFenced = false
  let fenceStart = 0
  let inIndented = false
  let indentStart = 0
  let consecutiveCodeLines = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLen = line.length + 1 // +1 for \n

    // Fenced code blocks (``` or ~~~)
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      if (inFenced) {
        ranges.push({ start: fenceStart, end: offset + lineLen, type: 'fenced' })
        inFenced = false
      } else {
        fenceStart = offset
        inFenced = true
      }
      offset += lineLen
      continue
    }

    if (inFenced) {
      offset += lineLen
      continue
    }

    // Indented code blocks (4+ spaces or tab)
    const isIndentedLine = /^( {4,}|\t)/.test(line) && line.trim().length > 0
    const isCodeLine = isCodeLikeLine(line)

    if (isIndentedLine || isCodeLine) {
      consecutiveCodeLines++
      if (!inIndented && consecutiveCodeLines >= 2) {
        inIndented = true
        indentStart = offset - (consecutiveCodeLines - 1) * (lines[i - 1]?.length + 1 || 0)
      }
    } else {
      if (inIndented) {
        ranges.push({ start: indentStart, end: offset, type: 'indented' })
        inIndented = false
      }
      consecutiveCodeLines = 0
    }

    offset += lineLen
  }

  // Close any open ranges
  if (inFenced) {
    ranges.push({ start: fenceStart, end: offset, type: 'fenced' })
  }
  if (inIndented) {
    ranges.push({ start: indentStart, end: offset, type: 'indented' })
  }

  return ranges
}

/**
 * Mask code blocks in text — replace code content with placeholder characters.
 * Preserves line count and offsets so non-code regions keep their positions.
 */
export function removeOrMaskCodeBlocks(text: string): { maskedText: string; codeRanges: CodeRange[] } {
  const ranges = detectCodeRanges(text)
  if (ranges.length === 0) {
    return { maskedText: text, codeRanges: [] }
  }

  // Build masked text: replace code regions with spaces
  let result = ''
  let cursor = 0

  for (const range of ranges) {
    // Append non-code text before this range
    result += text.slice(cursor, range.start)
    // Replace code region with newlines (preserve line count) + neutral chars
    const codeContent = text.slice(range.start, range.end)
    const masked = codeContent.replace(/[^\n]/g, ' ')  // spaces, keep newlines
    result += masked
    cursor = range.end
  }
  result += text.slice(cursor)

  return { maskedText: result, codeRanges: ranges }
}

/**
 * Check if a question candidate should be rejected as code.
 */
export function shouldRejectQuestionCandidate(
  questionText: string,
  startOffset: number,
  codeRanges: CodeRange[],
  fullLine?: string
): { reject: boolean; reason?: string } {
  // 1. Inside a code block
  if (isInsideCodeRange(startOffset, codeRanges)) {
    return { reject: true, reason: '位于代码块内' }
  }

  // 2. The extracted question text itself looks like code
  if (isCodeLikeLine(questionText)) {
    return { reject: true, reason: '疑似代码行' }
  }

  // 3. Check the full line that contained this candidate
  const line = fullLine || questionText
  const trimmed = line.trim()

  // Variable assignment
  if (isAssignmentWithCode(trimmed)) {
    return { reject: true, reason: '变量赋值语句' }
  }

  // Function call
  if (isFunctionCallLine(trimmed)) {
    return { reject: true, reason: '函数调用语句' }
  }

  // Question mark inside quotes within a code context
  if (isQuotedQuestionInCode(trimmed)) {
    return { reject: true, reason: '引号内的问号（代码上下文）' }
  }

  return { reject: false }
}

// ---- Internal helpers ----

function isAssignmentWithCode(line: string): boolean {
  // Match: identifier = value pattern where value looks code-like
  const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/)
  if (!assignMatch) return false

  const rhs = assignMatch[2].trim()

  // RHS is a function call: xxx(...)
  if (/^[a-zA-Z_]\w*\s*\(/.test(rhs)) return true

  // RHS is a method call: xxx.yyy(...)
  if (/^[a-zA-Z_]\w*\.\w+\s*\(/.test(rhs)) return true

  // RHS is a string literal (in code context)
  if (/^['"`]/.test(rhs) && /['"`]$/.test(rhs)) return true

  // RHS contains operators common in code
  if (/[+\-*\/%<>!=&|^]/.test(rhs) && rhs.length < 100) return true

  return false
}

function isFunctionCallLine(line: string): boolean {
  const trimmed = line.trim()

  // Direct function/method call at start of line
  if (/^[a-zA-Z_]\w*\s*\(/.test(trimmed)) return true
  if (/^[a-zA-Z_]\w*\.\w+\s*\(/.test(trimmed)) return true

  // Common code patterns
  if (/^(await |yield |new )/.test(trimmed)) return true

  return false
}

function isQuotedQuestionInCode(line: string): boolean {
  // Question mark inside quotes AND the line contains code indicators
  const hasQuotedQuestion = /['"`][^'"`]*[?？][^'"`]*['"`]/.test(line)
  if (!hasQuotedQuestion) return false

  // Code indicators: assignment, function call, or code keywords
  const hasAssignment = /[a-zA-Z_]\w*\s*=/.test(line)
  const hasFunctionCall = /[a-zA-Z_]\w*\s*\(/.test(line)
  const hasCodeKeyword = /\b(def |class |const |let |var |function |import |from |return |print\(|console\.)/.test(line)

  return hasAssignment || hasFunctionCall || hasCodeKeyword
}

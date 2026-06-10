// ============================================================
// Document Section Splitter — find Q/A regions in long docs
// ============================================================

export interface DocumentSection {
  title: string
  content: string
  startOffset: number
  endOffset: number
  isQaRegion: boolean     // contains "Q1:" / "面试问题" / Q/A patterns
  isBoilerplate: boolean   // cover, TOC, navigation, etc.
  parentTitle?: string     // parent section title for topic inference
}

// Patterns that indicate a Q/A region
const QA_REGION_SIGNALS = [
  /面试问题.*[（(]\s*Q\s*[）)]/,  // "面试问题（Q）与标准答案（A）"
  /面试问题.*标准答案/,
  /[（(]\s*Q\s*[）)].*[（(]\s*A\s*[）)]/,
  /Q\d+[\s:：]/,               // Q1: Q5：
  /^#{1,3}\s*面试题/i,
  /^#{1,3}\s*Q\s*[&和].*\s*A/i,
  /常见面试题/,
  /题库/,
  /真题/,
]

// Patterns that indicate boilerplate (skip these)
const BOILERPLATE_SIGNALS = [
  /^封面\s*$/i,
  /^版权\s*$/i,
  /^致谢\s*$/i,
  /^前言\s*$/i,
  /^序\s*$/i,
  /学习建议/,
  /如何使用本文档/,
  /阅读指南/,
  /版本历史/,
  /修订记录/,
  /更新日志/,
  /免责声明/,
  /法律声明/,
]

/**
 * Split a long document into sections by heading structure.
 * Identifies Q/A regions and boilerplate sections.
 */
export function splitDocumentSections(text: string): DocumentSection[] {
  const lines = text.split('\n')
  const sections: DocumentSection[] = []

  let currentTitle = ''
  let currentLines: string[] = []
  let sectionStart = 0
  let parentTitle = ''

  const headingStack: Array<{ level: number; title: string }> = []

  function flushSection(endOffset: number) {
    const content = currentLines.join('\n').trim()
    if (!content && !currentTitle) {
      sectionStart = endOffset + 1
      currentLines = []
      return
    }

    const isQa = isQaRegion(currentTitle, content)
    const isBoiler = isBoilerplateSection(currentTitle)

    sections.push({
      title: currentTitle,
      content,
      startOffset: sectionStart,
      endOffset,
      isQaRegion: isQa,
      isBoilerplate: isBoiler,
      parentTitle: parentTitle || undefined,
    })

    sectionStart = endOffset + 1
    currentLines = []
    currentTitle = ''
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)

    if (headingMatch) {
      // Flush previous section
      flushSection(text.indexOf(line) - 1)

      const level = headingMatch[1].length
      const title = headingMatch[2].trim()

      currentTitle = title
      currentLines = [line]

      // Maintain heading breadcrumb
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop()
      }
      headingStack.push({ level, title })

      // Parent is the previous level heading
      if (headingStack.length >= 2) {
        parentTitle = headingStack[headingStack.length - 2].title
      }

      sectionStart = text.indexOf(line)
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }

  // Flush last section
  flushSection(text.length)

  // If no sections found (no headings), treat entire doc as one section
  if (sections.length === 0 && text.trim()) {
    sections.push({
      title: '',
      content: text.trim(),
      startOffset: 0,
      endOffset: text.length,
      isQaRegion: isQaRegion('', text),
      isBoilerplate: false,
    })
  }

  return sections
}

/**
 * Get only the Q/A-relevant sections, ordered by priority.
 * Q/A regions first, then non-boilerplate sections.
 */
export function getQaRelevantSections(sections: DocumentSection[]): DocumentSection[] {
  const qaRegions = sections.filter(s => s.isQaRegion && !s.isBoilerplate)
  const otherRegions = sections.filter(s => !s.isQaRegion && !s.isBoilerplate)

  // Q/A regions first (higher priority for extraction)
  return [...qaRegions, ...otherRegions]
}

/**
 * Check if a section title or content indicates it's a Q/A region.
 */
function isQaRegion(title: string, content: string): boolean {
  const checkText = `${title}\n${content.slice(0, 500)}`

  for (const pattern of QA_REGION_SIGNALS) {
    if (pattern.test(checkText)) return true
  }

  // Heuristic: if section contains multiple Q-numbered items, it's a Q/A region
  const qMatches = content.match(/Q\d+[\s:：]/g)
  if (qMatches && qMatches.length >= 2) return true

  return false
}

/**
 * Check if a section is boilerplate that should be skipped.
 */
function isBoilerplateSection(title: string): boolean {
  for (const pattern of BOILERPLATE_SIGNALS) {
    if (pattern.test(title)) return true
  }
  return false
}

/**
 * Extract the Q/A portion from a section that has a known Q/A header.
 * Example: "3.3 面试问题（Q）与标准答案（A）" → extract Q1..A1, Q2..A2, etc.
 */
export function extractQaFromSection(section: DocumentSection): string {
  // If section already starts with Q/A content, use as-is
  if (/^Q\d+[\s:：]/m.test(section.content)) {
    return section.content
  }

  // Try to find the Q/A subsection within the section content
  // Look for "Q1" or "Q：" pattern
  const qaStart = section.content.search(/(?:^|\n)\s*(?:Q\d+[\s:：]|Q[\s:：]|问题[\s:：]*\d|题目[\s:：]*\d)/m)
  if (qaStart >= 0) {
    return section.content.slice(qaStart).trim()
  }

  // Look for "面试问题" heading within content
  const qaHeader = section.content.search(/(?:^|\n)#{1,3}\s*面试问题/m)
  if (qaHeader >= 0) {
    return section.content.slice(qaHeader).trim()
  }

  return section.content
}

// ============================================================
// Document Structure Analyzer
// Analyzes text structure before extraction to improve accuracy
// ============================================================

export interface DocumentStructure {
  headings: HeadingInfo[]
  totalLength: number
  lineCount: number
  hasQAMarkers: boolean
  hasNumberedItems: boolean
  hasMarkdownHeadings: boolean
  dominantPattern: 'qa_marker' | 'heading' | 'numbered' | 'paragraph' | 'mixed'
}

export interface HeadingInfo {
  level: number       // 1-4 (## = 2)
  text: string
  startLine: number
  isQuestion: boolean
}

/**
 * Analyze document structure to guide extraction strategy.
 */
export function analyzeDocumentStructure(text: string): DocumentStructure {
  const lines = text.split('\n')
  const headings: HeadingInfo[] = []
  let hasQAMarkers = false
  let hasNumberedItems = false
  let hasMarkdownHeadings = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Markdown headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      hasMarkdownHeadings = true
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      headings.push({
        level,
        text,
        startLine: i,
        isQuestion: /[?？]/.test(text) ||
          /^(什么是|如何|怎么|为什么|Q\d*|问题\d*)/.test(text),
      })
      continue
    }

    // Q/A markers
    if (/^(?:Q|Question|问题|题目|问)[\s:：]*\d*[\s:：]/i.test(line.trim())) {
      hasQAMarkers = true
    }

    // Numbered items
    if (/^\s*(\d+)[\.\、\)]\s/.test(line.trim())) {
      hasNumberedItems = true
    }
  }

  // Determine dominant pattern
  let dominantPattern: DocumentStructure['dominantPattern'] = 'paragraph'
  if (hasQAMarkers && headings.filter(h => h.isQuestion).length >= 2) {
    dominantPattern = 'mixed'
  } else if (hasQAMarkers) {
    dominantPattern = 'qa_marker'
  } else if (headings.filter(h => h.isQuestion).length >= 2) {
    dominantPattern = 'heading'
  } else if (hasNumberedItems && hasMarkdownHeadings) {
    dominantPattern = 'mixed'
  } else if (hasNumberedItems) {
    dominantPattern = 'numbered'
  } else if (hasMarkdownHeadings) {
    dominantPattern = 'heading'
  }

  return {
    headings,
    totalLength: text.length,
    lineCount: lines.length,
    hasQAMarkers,
    hasNumberedItems,
    hasMarkdownHeadings,
    dominantPattern,
  }
}

/**
 * Suggest the best extraction mode based on document structure.
 */
export function suggestExtractionMode(structure: DocumentStructure): 'strict' | 'loose' | 'llm_assisted' {
  switch (structure.dominantPattern) {
    case 'qa_marker':
    case 'heading':
      return 'strict'
    case 'numbered':
    case 'mixed':
      return 'loose'
    case 'paragraph':
    default:
      return 'llm_assisted'
  }
}

// ============================================================
// Answer Boundary Detector — find where each answer starts/ends
// ============================================================

export interface AnswerBoundary {
  answerStart: number       // offset in original text
  answerEnd: number         // offset in original text
  answerText: string
  answerPrefix?: string     // e.g. "答案:", "A:", "答:"
  isMultiParagraph: boolean
  hasExplicitMarker: boolean
}

// Patterns that signal "answer starts here"
const ANSWER_START_PATTERNS = [
  /(?:^|\n)\s*\*{0,2}(?:A|Answer|答案|答|解析|参考答案|要点)\*{0,2}[\s:：]*(?=\S)/gi,
  /(?:^|\n)\s*\[(?:答|解|答案)\]\s*/gi,
]

// Patterns that signal "answer ends here" (new question or section starting)
const ANSWER_END_PATTERNS = [
  /(?:\n|^)\s*(?:Q|Question|问题|题目|问)[\s:：]*\d*\s*[:：]/gi,
  /(?:\n|^)(#{1,4})\s+/g,           // Markdown heading
  /(?:\n|^)\s*(\d+)[\.\、\)]\s*/g,   // Numbered list item
  /(?:\n|^)\s*[（(]\s*\d+\s*[）)]/g, // (1) style
  /(?:\n|^)\s*Q\s*\d+\s*[:：]/gi,    // Q1:
  /(?:\n|^)\s*[-*+]\s+/g,            // Bullet (loose)
]

export function detectAnswerBoundary(
  text: string,
  questionEnd: number,
  nextQuestionStart: number | null,
  mode: 'strict' | 'loose' = 'strict'
): AnswerBoundary {
  const afterQuestion = text.slice(questionEnd)
  const maxEnd = nextQuestionStart
    ? nextQuestionStart - questionEnd
    : afterQuestion.length

  // Try explicit answer markers first
  for (const pattern of ANSWER_START_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(afterQuestion)
    if (match && match.index < Math.min(500, maxEnd)) {
      const prefix = match[0].trim()
      const contentStart = match.index + match[0].length

      // Find where this answer ends
      let contentEnd = maxEnd
      for (const endPattern of ANSWER_END_PATTERNS) {
        endPattern.lastIndex = contentStart
        const endMatch = endPattern.exec(afterQuestion)
        if (endMatch && endMatch.index > contentStart && endMatch.index < contentEnd) {
          contentEnd = endMatch.index
        }
      }

      const answerText = afterQuestion.slice(contentStart, contentEnd).trim()
      const paragraphs = answerText.split(/\n\n+/).filter(Boolean)

      return {
        answerStart: questionEnd + contentStart,
        answerEnd: questionEnd + contentEnd,
        answerText,
        answerPrefix: prefix,
        isMultiParagraph: paragraphs.length > 1,
        hasExplicitMarker: true,
      }
    }
  }

  // No explicit marker — take text until next question/section
  let contentEnd = maxEnd
  for (const endPattern of ANSWER_END_PATTERNS) {
    endPattern.lastIndex = 0
    const endMatch = endPattern.exec(afterQuestion)
    if (endMatch && endMatch.index > 0 && endMatch.index < contentEnd) {
      contentEnd = endMatch.index
    }
  }

  // In loose mode, include more text (up to 2000 chars)
  if (mode === 'loose' && contentEnd > 2000) {
    // Try to find a natural break point
    const breakMatch = afterQuestion.slice(1500, 2500).match(/\n\n/)
    if (breakMatch && typeof breakMatch.index === 'number') {
      contentEnd = 1500 + breakMatch.index
    } else {
      contentEnd = Math.min(2000, contentEnd)
    }
  }

  const answerText = afterQuestion.slice(0, contentEnd).trim()
  const paragraphs = answerText.split(/\n\n+/).filter(Boolean)

  return {
    answerStart: questionEnd,
    answerEnd: questionEnd + contentEnd,
    answerText,
    isMultiParagraph: paragraphs.length > 1,
    hasExplicitMarker: false,
  }
}

/**
 * Check if answer text looks "partial" — cut off mid-sentence.
 */
export function isPartialAnswer(text: string): boolean {
  if (!text) return false
  const lastChar = text[text.length - 1]
  // Ends mid-sentence without proper ending punctuation
  return !/[.!?。!?》"」』\n]/.test(lastChar) && text.length < 100
}

import type { CardInput } from '@/lib/types'

/**
 * Parse Markdown text into CardInput array.
 *
 * Supported formats:
 *
 * 1. Heading-separated Q&A:
 *    ## Topic: 基础概念
 *    ### Q: What is an Agent?
 *    A: An agent is...
 *    **Tags:** agent, 基础
 *
 * 2. Bullet list of questions:
 *    - [基础概念] What is an Agent?
 *    - [核心模块] How does RAG work?
 *
 * 3. Numbered list:
 *    1. **基础概念** — What is an Agent?
 *    2. **核心模块** — How does RAG work?
 */
export function parseMarkdown(text: string): { rows: CardInput[]; errors: string[] } {
  const rows: CardInput[] = []
  const errors: string[] = []

  // Try heading-separated format first
  const headingRows = parseHeadingFormat(text)
  if (headingRows.length > 0) {
    return { rows: headingRows, errors: [] }
  }

  // Try bullet/numbered list format
  return parseListFormat(text)
}

// ---- Heading-separated Format ----
// ## Topic: xxx
// ### Q: xxx  /  ### 题目
// answer text...
// **Tags:** a, b

function parseHeadingFormat(text: string): CardInput[] {
  const rows: CardInput[] = []
  const sections = text.split(/^## /m).filter(Boolean)

  for (const section of sections) {
    // Extract topic from heading
    const topicMatch = section.match(/^Topic:\s*(.+)/m) || section.match(/^主题[：:]\s*(.+)/m)
    const topic = topicMatch ? topicMatch[1].trim() : ''

    // Split into Q&A blocks
    const qaBlocks = section.split(/^### /m).filter(Boolean)

    for (const block of qaBlocks) {
      // Check if this is actually a Q&A block (starts with Q: or 题目)
      const qMatch =
        block.match(/^Q:\s*(.+)/m) ||
        block.match(/^题目[：:]\s*(.+)/m) ||
        block.match(/^Question:\s*(.+)/m)

      if (!qMatch) continue

      const question = qMatch[1].trim()
      const blockWithoutQ = block.replace(/^Q:.*\n?/m, '').replace(/^题目[：:].*\n?/m, '').replace(/^Question:.*\n?/m, '')

      // Extract tags
      const tagsMatch = blockWithoutQ.match(/\*\*Tags?\*\*[：:]\s*(.+)/m) ||
        blockWithoutQ.match(/标签[：:]\s*(.+)/m)
      const tags = tagsMatch
        ? tagsMatch[1].split(/[,，;；]/).map((t) => t.trim()).filter(Boolean)
        : []

      // Extract difficulty/frequency
      const diffMatch = blockWithoutQ.match(/难度[：:]\s*(.+)/m)
      const freqMatch = blockWithoutQ.match(/频率[：:]\s*(.+)/m)

      const answer = blockWithoutQ
        .replace(/\*\*Tags?\*\*[：:].*\n?/g, '')
        .replace(/标签[：:].*\n?/g, '')
        .replace(/难度[：:].*\n?/g, '')
        .replace(/频率[：:].*\n?/g, '')
        .trim()

      const actualTopic = topic || extractTopicFromTags(tags) || '未分类'

      rows.push({
        topic: actualTopic,
        question,
        answer,
        difficulty: normalizeMDDifficulty(diffMatch?.[1] || ''),
        frequency: normalizeMDFrequency(freqMatch?.[1] || ''),
        tags,
        source: 'markdown_import',
      })
    }
  }

  return rows
}

// ---- List Format ----
// - [Topic] Question text
// 1. **Topic** — Question text

function parseListFormat(text: string): { rows: CardInput[]; errors: string[] } {
  const rows: CardInput[] = []
  const errors: string[] = []
  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Match: - [Topic] Question  or  * [Topic] Question
    let match = line.match(/^[-*]\s*\[(.+?)\]\s*(.+)/)
    if (match) {
      rows.push({
        topic: match[1].trim(),
        question: match[2].trim(),
        source: 'markdown_import',
      })
      continue
    }

    // Match: 1. **Topic** — Question  or  1. **Topic** - Question
    match = line.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[—\-]\s*(.+)/)
    if (match) {
      rows.push({
        topic: match[1].trim(),
        question: match[2].trim(),
        source: 'markdown_import',
      })
      continue
    }

    // Match: - **Q:** text  or  - Q: text
    match = line.match(/^[-*]\s*(?:\*\*)?Q[：:](?:\*\*)?\s*(.+)/i)
    if (match) {
      // Next line might be topic or tags
      const question = match[1].trim()
      rows.push({
        topic: '未分类',
        question,
        source: 'markdown_import',
      })
      continue
    }
  }

  if (rows.length === 0) {
    errors.push('未能从 Markdown 中识别出题目格式。支持：`- [主题] 题目` 或 `1. **主题** — 题目`')
  }

  return { rows, errors }
}

// ---- Helpers ----

function extractTopicFromTags(tags: string[]): string | null {
  const topicTags = ['基础概念', '核心模块', '架构设计', '工作模式', '工程实践', '评估']
  for (const tag of tags) {
    if (topicTags.includes(tag)) return tag
  }
  return null
}

function normalizeMDDifficulty(v: string): CardInput['difficulty'] {
  if (!v) return '中级'
  if (v.includes('初') || v.toLowerCase() === 'easy') return '初级'
  if (v.includes('高') || v.toLowerCase() === 'hard') return '高级'
  return '中级'
}

function normalizeMDFrequency(v: string): CardInput['frequency'] {
  if (!v) return '中频'
  if (v.includes('高') || v.toLowerCase() === 'high') return '高频'
  if (v.includes('低') || v.toLowerCase() === 'low') return '低频'
  return '中频'
}

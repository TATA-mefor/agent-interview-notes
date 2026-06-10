// ============================================================
// Metadata Inferencer — infer difficulty, frequency from topic + content
// ============================================================

import type { MindMapCategory } from './types'

type Difficulty = '初级' | '中级' | '高级'
type Frequency = '高频' | '中频' | '低频'

/**
 * Category-based defaults.
 */
const CATEGORY_DEFAULTS: Record<MindMapCategory, { difficulty: Difficulty; frequency: Frequency }> = {
  '基础概念':      { difficulty: '初级', frequency: '高频' },
  '核心模块':      { difficulty: '中级', frequency: '高频' },
  '工作模式':      { difficulty: '中级', frequency: '高频' },
  '架构设计':      { difficulty: '高级', frequency: '高频' },
  '工程实践':      { difficulty: '中级', frequency: '高频' },
  '评估与多Agent': { difficulty: '高级', frequency: '高频' },
}

/**
 * Keyword hints for difficulty inference.
 */
function inferDifficulty(text: string, category: MindMapCategory): Difficulty {
  const lower = text.toLowerCase()

  // Strong "advanced" signals
  if (/多\s*agent/i.test(lower)) return '高级'
  if (/评估|evaluat|critic|benchmark|评测|生产级|企业级|架构权衡/i.test(lower)) return '高级'
  if (/分布式|高可用|容灾|扩展性/i.test(lower)) return '高级'

  // "Basic" signals
  if (/基础|入门|什么是|定义|概念|概述|介绍/i.test(lower)) return '初级'
  if (/区别|对比|比较|不同/i.test(lower)) return '中级'

  // "Intermediate" signals
  if (/如何|怎么|为什么|设计|实现|原理|机制/i.test(lower)) return '中级'

  // Fall back to category default
  return CATEGORY_DEFAULTS[category]?.difficulty || '初级'
}

/**
 * Keyword hints for frequency inference.
 */
function inferFrequency(text: string): Frequency {
  if (text.length < 30) return '高频'

  // Count keyword density as proxy for importance
  const agentTerms = [
    'agent', 'planning', 'memory', 'rag', 'tool', 'react',
    'embedding', 'workflow', 'prompt', 'function call',
  ]
  const lower = text.toLowerCase()
  const matches = agentTerms.filter(t => lower.includes(t)).length

  if (matches >= 4) return '高频'
  if (matches >= 2) return '中频'
  return '低频'
}

/**
 * Infer difficulty and frequency for an extracted Q&A candidate.
 */
export function inferMetadata(
  question: string,
  answer: string,
  category: MindMapCategory
): { difficulty: Difficulty; frequency: Frequency } {
  const combined = `${question} ${answer}`

  return {
    difficulty: inferDifficulty(combined, category),
    frequency: inferFrequency(combined),
  }
}

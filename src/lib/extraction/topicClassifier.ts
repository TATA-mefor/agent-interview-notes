// ============================================================
// Topic Classifier — assign one of 6 categories by keyword rules
// ============================================================

import type { MindMapCategory } from './types'

interface CategoryRule {
  category: MindMapCategory
  strongKeywords: string[]    // high confidence match
  weakKeywords: string[]      // medium confidence match
}

const RULES: CategoryRule[] = [
  {
    category: '核心模块',
    strongKeywords: [
      'planning', '规划', '任务拆解', 'memory', '记忆',
      'observation', '观察', 'reflection', '反思', 'tool', '工具调用',
      'function call', 'function calling', '检索', 'retrieval', 'rag',
      'embedding', '向量', '向量数据库',
    ],
    weakKeywords: [
      '模块', '组件', '能力', 'skill', 'action',
    ],
  },
  {
    category: '工作模式',
    strongKeywords: [
      'react', 'reasoning and acting', '推理与行动',
      'plan-and-execute', '规划执行', 'plan and execute',
      'workflow', '工作流', '执行模式', 'cot', 'chain of thought',
      '思维链', 'tot', 'tree of thought',
    ],
    weakKeywords: [
      '模式', '流程', '步骤', '循环', 'loop',
    ],
  },
  {
    category: '架构设计',
    strongKeywords: [
      'supervisor', '监督者', 'routing', '路由', '多agent',
      'multi-agent', '多智能体', 'planner executor',
      '架构', '微服务', '分布式', '编排', 'orchestrat',
      'swarm', '群体',
    ],
    weakKeywords: [
      '设计', '系统', '结构', '拓扑', '通信',
    ],
  },
  {
    category: '工程实践',
    strongKeywords: [
      '幂等', 'idempotent', 'checkpoint', '检查点',
      'human-in-the-loop', 'hitl', '人在回路', '人机协同',
      '终止条件', 'stop condition', '上下文工程',
      'context engineering', 'token', '限流', 'rate limit',
      '重试', 'retry', '超时', 'timeout', '熔断',
      '降级', 'fallback', '部署', 'deploy', 'docker',
      '监控', 'monitor', '日志', 'log', '安全', 'security',
      '脱敏', 'pii', 'guardrail', '护栏',
    ],
    weakKeywords: [
      '工程', '实践', '生产', '上线', '运维',
    ],
  },
  {
    category: '评估与多Agent',
    strongKeywords: [
      '评估', 'evaluat', '评测', 'benchmark', 'critic',
      '批评', '打分', '多agent通信', '通信协议',
      '协作', 'collaborat', '协商', 'negotiation',
      '消息', 'message', '协议', 'protocol',
    ],
    weakKeywords: [
      '质量', '准确', '指标', 'metric', '比较',
    ],
  },
  {
    category: '基础概念',
    strongKeywords: [
      '什么是', '定义', '概念', '区别', '对比',
      'agent 定义', 'ai agent', 'llm 应用',
      '智能体', '大模型', '边界', '原理',
    ],
    weakKeywords: [
      '基础', '入门', '概述', '介绍', '理解',
    ],
  },
]

export function classifyTopic(text: string): { category: MindMapCategory; confidence: number } {
  const lower = text.toLowerCase()

  // Score each category
  const scores = RULES.map((rule) => {
    let score = 0
    for (const kw of rule.strongKeywords) {
      if (lower.includes(kw.toLowerCase())) score += 3
    }
    for (const kw of rule.weakKeywords) {
      if (lower.includes(kw.toLowerCase())) score += 1
    }
    return { category: rule.category, score }
  })

  // Get the highest scoring category
  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]

  if (best.score >= 3) {
    return { category: best.category, confidence: Math.min(0.95, 0.6 + best.score * 0.05) }
  }
  if (best.score >= 1) {
    return { category: best.category, confidence: 0.55 }
  }

  // Default
  return { category: '核心模块', confidence: 0.4 }
}

/**
 * Suggest tags from question+answer text using keyword matching.
 */
export function suggestTags(text: string): string[] {
  const lower = text.toLowerCase()
  const tags = new Set<string>()

  const TAG_KEYWORDS: Array<[string, string]> = [
    ['planning', 'Planning'],
    ['规划', 'Planning'],
    ['memory', 'Memory'],
    ['记忆', 'Memory'],
    ['rag', 'RAG'],
    ['检索增强', 'RAG'],
    ['检索', '检索'],
    ['embedding', 'Embedding'],
    ['向量', '向量数据库'],
    ['tool', 'Tool'],
    ['工具', 'Tool'],
    ['function call', 'Function Call'],
    ['react', 'ReAct'],
    ['workflow', 'Workflow'],
    ['agent', 'Agent'],
    ['多agent', '多Agent'],
    ['multi-agent', '多Agent'],
    ['prompt', 'Prompt'],
    ['提示词', 'Prompt'],
    ['上下文', '上下文工程'],
    ['context', '上下文工程'],
    ['评测', '评测'],
    ['评估', '评估'],
    ['evaluat', '评估'],
    ['部署', '部署'],
    ['deploy', '部署'],
    ['安全', '安全'],
    ['security', '安全'],
    ['幂等', '幂等性'],
    ['checkpoint', 'Checkpoint'],
    ['human-in-the-loop', 'HITL'],
    ['人在回路', 'HITL'],
    ['路由', 'Routing'],
    ['routing', 'Routing'],
    ['编排', '编排'],
    ['orchestrat', '编排'],
    ['思考链', 'CoT'],
    ['chain of thought', 'CoT'],
    ['cot', 'CoT'],
    ['反射', 'Reflection'],
    ['reflection', 'Reflection'],
  ]

  for (const [kw, tag] of TAG_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      tags.add(tag)
    }
  }

  return Array.from(tags).slice(0, 5)
}

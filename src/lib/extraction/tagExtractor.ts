// ============================================================
// Tag Extractor — extract Agent-relevant tags from Q&A text
// ============================================================

const AGENT_TAG_VOCABULARY: Array<[string, string]> = [
  // English → Chinese display
  ['planning', 'Planning'],
  ['规划', 'Planning'],
  ['task decomposition', 'Task Decomposition'],
  ['任务拆解', 'Task Decomposition'],
  ['memory', 'Memory'],
  ['记忆', 'Memory'],
  ['rag', 'RAG'],
  ['检索增强', 'RAG'],
  ['检索', '检索'],
  ['embedding', 'Embedding'],
  ['向量', '向量数据库'],
  ['tool', 'Tool Use'],
  ['工具调用', 'Tool Use'],
  ['function call', 'Function Call'],
  ['react', 'ReAct'],
  ['reasoning and acting', 'ReAct'],
  ['plan-and-execute', 'Plan-and-Execute'],
  ['规划执行', 'Plan-and-Execute'],
  ['workflow', 'Workflow'],
  ['工作流', 'Workflow'],
  ['supervisor', 'Supervisor'],
  ['监督者', 'Supervisor'],
  ['routing', 'Routing'],
  ['路由', 'Routing'],
  ['multi-agent', 'Multi-Agent'],
  ['多agent', 'Multi-Agent'],
  ['多智能体', 'Multi-Agent'],
  ['prompt', 'Prompt Engineering'],
  ['提示词', 'Prompt Engineering'],
  ['上下文', 'Context Engineering'],
  ['context engineering', 'Context Engineering'],
  ['checkpoint', 'Checkpoint'],
  ['检查点', 'Checkpoint'],
  ['human-in-the-loop', 'HITL'],
  ['人在回路', 'HITL'],
  ['hitl', 'HITL'],
  ['evaluator', 'Evaluator'],
  ['评估', 'Evaluator'],
  ['critic', 'Critic'],
  ['反思', 'Reflection'],
  ['reflection', 'Reflection'],
  ['observation', 'Observation'],
  ['观察', 'Observation'],
  ['agent', 'AI Agent'],
  ['智能体', 'AI Agent'],
  ['llm', 'LLM'],
  ['大模型', 'LLM'],
  ['幂等', '幂等性'],
  ['idempotent', '幂等性'],
  ['终止条件', '终止条件'],
  ['stop condition', '终止条件'],
  ['部署', '部署'],
  ['deploy', '部署'],
  ['安全', '安全'],
  ['security', '安全'],
]

/**
 * Extract tags from question + answer text.
 * Returns up to 5 tags sorted by relevance.
 */
export function extractTags(question: string, answer: string): string[] {
  const combined = `${question} ${answer}`.toLowerCase()
  const scored: Array<{ tag: string; score: number }> = []

  for (const [keyword, display] of AGENT_TAG_VOCABULARY) {
    const kw = keyword.toLowerCase()
    if (!combined.includes(kw)) continue

    // Score: question match > answer match, multiple occurrences
    const qMatches = (question.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    const aMatches = (answer.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    const score = qMatches * 3 + aMatches * 1

    scored.push({ tag: display, score })
  }

  // Sort by score descending, deduplicate, take top 5
  scored.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const result: string[] = []
  for (const { tag } of scored) {
    if (seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
    if (result.length >= 5) break
  }

  return result
}

/**
 * QA extraction pipeline test.
 * Run: npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true,"paths":{"@/*":["src/*"]}}' scripts/test-extraction.ts
 */
import { extractQaByRules } from '../src/lib/extraction/qaRuleExtractor'

const testCases: Array<{ name: string; text: string; expectMin: number; expectMax?: number }> = [
  // === Positive cases (should extract) ===
  {
    name: 'Q/A 标记格式',
    text: `Q: 什么是 AI Agent？
A: AI Agent 是一种能够感知环境、做出决策并执行动作的智能系统。

Q: 什么是 Planning？
A: Planning 是 Agent 在执行任务前进行任务拆解、步骤安排和工具选择的过程。`,
    expectMin: 2,
  },
  {
    name: '中文问题/答案格式',
    text: `问题：什么是 ReAct 模式？
答案：ReAct 是 Reasoning and Acting 的结合，让模型在推理过程中交替执行思考和动作。

问题：Agent 和普通 LLM 应用有什么区别？
答案：Agent 具有自主决策和工具调用能力，而普通 LLM 应用只是单轮问答。`,
    expectMin: 2,
  },
  {
    name: 'Markdown 标题格式',
    text: `## 什么是 Agent 中的 Planning？

Planning 是 Agent 在执行复杂任务前进行任务拆解、步骤安排和工具选择的过程。

### 什么是 Memory？

Memory 是 Agent 存储和检索历史信息的能力，包括短期记忆和长期记忆。`,
    expectMin: 2,
  },
  {
    name: '编号题目格式',
    text: `1. 什么是 AI Agent？
AI Agent 是具有一定自主性的智能系统。

2. Agent 和 Workflow 的区别是什么？
Agent 自主决策路径，Workflow 按预定义步骤执行。`,
    expectMin: 2,
  },
  {
    name: 'PDF 面试题 Q1/A1 格式',
    text: `Q1：一句话说明什么是 AI Agent？
A：AI Agent 是以大模型为认知核心，结合规划、记忆与工具调用，能在多步交互中完成任务的系统。

Q2：什么是 Agent 中的 Planning？
A：Planning 是 Agent 在执行复杂任务前进行任务拆解、步骤安排和工具选择的过程。`,
    expectMin: 2,
  },
  {
    name: '纯问号句（宽松模式）',
    text: `在 AI Agent 系统的开发中，我们经常遇到一个问题：如何设计合理的 Planning 机制？

规划机制的设计需要考虑任务复杂度、可用工具集和执行成本。

另一个常见的问题：为什么 Agent 需要 Memory 模块？

Memory 模块帮助 Agent 在长对话和复杂任务中保持上下文连贯性。`,
    expectMin: 2,
  },

  // === Negative cases (code should NOT be extracted) ===
  {
    name: '❌ 代码变量赋值中的问号',
    text: `context = naive_retrieve("年假多少天？", query)
answer = llm.generate("什么是 Planning？")
query = "什么是 Agent？"

这是一段正常的 Q&A 内容：

Q: 真正的面试题：什么是 RAG？
A: RAG 是检索增强生成...`,
    expectMin: 1,  // only the real Q/A should survive
    expectMax: 1,
  },
  {
    name: '❌ Python 函数定义不应被抽取',
    text: `def run_agent(user_goal: str):
    """运行 Agent 的主函数"""
    plan = planner.decompose(user_goal)
    return executor.execute(plan)

Q: Python 函数如何定义？
A: 使用 def 关键字，后跟函数名和参数列表。`,
    expectMin: 1,
    expectMax: 1,
  },
  {
    name: '❌ 工具定义列表不应被抽取',
    text: `tools = [{"name": "search_kb"}, {"name": "calculator"}]

问：Agent 常用的工具有哪些？
答：包括知识库检索、计算器、代码解释器、网页搜索等。`,
    expectMin: 1,
    expectMax: 1,
  },
  {
    name: '❌ 代码块中的问号不应被抽取',
    text: `\`\`\`python
# 这是一个检索示例
query = "什么是 RAG？"
result = vector_search(query)
print(result)
\`\`\`

问题：RAG 的检索流程是什么？
答案：RAG 先对用户问题进行向量化，再在向量数据库中检索相关内容。`,
    expectMin: 1,
    expectMax: 1,
  },
  {
    name: '❌ 纯代码段不应有候选',
    text: `context = naive_retrieve("年假多少天？", query)
answer = llm.generate("什么是 Planning？")
query = "什么是 Agent？"
def run_agent(user_goal: str):
tools = [{"name": "search_kb"}]`,
    expectMin: 0,
    expectMax: 0,
  },
  {
    name: '❌ import/const/let 行不应被抽取',
    text: `import numpy as np
const API_KEY = "sk-xxx"
let result = await fetch("/api/query?q=什么是Agent")

问：Agent 的 API 调用如何设计？
答：Agent 通过统一的 API 网关调用外部服务。`,
    expectMin: 1,
    expectMax: 1,
  },

  // === PDF normalization + Q-numbered format ===
  {
    name: 'PDF Q编号 + A答案 (Q1:/A:)',
    text: `Q1：一句话说明什么是 AI Agent？
A：AI Agent 是以大模型为认知核心，结合规划、记忆与工具调用，能在多步交互中完成任务的系统。

Q5：Agent 的记忆一般怎么设计？
A：分层设计最常见：工作记忆 + 会话记忆 + 长期记忆。`,
    expectMin: 2,
  },
  {
    name: '加粗答案 **A：** 格式',
    text: `Q5：Agent 的记忆一般怎么设计？
**A：** 分层设计最常见：工作记忆 + 会话记忆 + 长期记忆。`,
    expectMin: 1,
  },
  {
    name: 'PDF 兼容字符归一化（⾯试 → 面试）',
    text: `⾯试问题（Q）与标准答案（A）

Q1：什么是 AI Agent？
A：AI Agent 是能够自主感知和决策的智能系统。`,
    expectMin: 1,
  },
  {
    name: '面试问题区域优先识别',
    text: `3.3 面试问题（Q）与标准答案（A）

Q1：一句话说明什么是 AI Agent？
A：AI Agent 是以大模型为认知核心，结合规划、记忆与工具调用，能在多步交互中完成任务的系统。

Q2：Agent 和 Workflow 的核心区别是什么？
A：Agent 能自主决策下一步做什么，Workflow 按预定义流程执行。`,
    expectMin: 2,
  },
]

let passed = 0
let failed = 0

for (const tc of testCases) {
  const result = extractQaByRules(tc.text, {
    mode: tc.name.includes('宽松') ? 'loose' : 'strict',
  })
  const count = result.candidates.length

  let ok = count >= tc.expectMin
  if (tc.expectMax !== undefined) {
    ok = ok && count <= tc.expectMax
  }

  const flag = ok ? '✅' : '❌'
  console.log(`\n${flag} ${tc.name}`)
  console.log(`   期望: ${tc.expectMin}${tc.expectMax !== undefined ? `-${tc.expectMax}` : '+'}, 实际: ${count}`)

  if (result.candidates.length > 0) {
    for (const c of result.candidates.slice(0, 3)) {
      console.log(`   - [${Math.round(c.confidence * 100)}%] ${c.question.slice(0, 70)}${c.answerStatus === 'missing' ? ' (缺答案)' : ''}`)
    }
  }

  if (ok) passed++; else failed++
}

console.log(`\n${'='.repeat(50)}`)
console.log(`通过: ${passed}/${testCases.length}, 失败: ${failed}`)
if (failed > 0) process.exit(1)

// ============================================================
// QA LLM Extractor v2 — 知识点驱动提取
// 不再只找已有的 Q&A，而是：
//   1. 识别文档中的技术知识点
//   2. 基于知识点生成面试题 + 答案
//   3. 答案必须来自文档，但可重新组织语言
// ============================================================

import { callLLMStructured, isLlmConfigured } from '@/lib/llm'
import { classifyTopic, suggestTags } from './topicClassifier'
import { normalizeQuestion, generateQuestionHash } from './qaDedupService'
import type { ExtractedQaCandidate } from './types'

interface LlmExtractedCard {
  question: string
  answer: string
  topic: string
  tags: string[]
  difficulty: string
  frequency: string
  confidence: number
  evidence_text: string
}

// 主 Prompt — 知识点驱动
const KNOWLEDGE_PROMPT = `你是 AI Agent 领域的资深面试官。请分析以下文档，识别技术知识点并生成面试题。

工作方式：
1. 扫描文档，识别所有技术知识点、概念、方案对比、实践踩坑
2. 对每个有价值的知识点，生成一道面试题
3. question 必须是自然的面试提问（"什么是...""请说明...""对比...""如何处理...""为什么..."）
4. answer 必须基于文档内容，保留关键的技术细节，但可以重新组织语言使其通顺
5. 如果原文就是 Q&A 格式，直接提取；如果是叙述段落，提炼知识点后生成题目

❌ 绝对不要提取以下内容：
- 某个库/框架的 API 参数说明（如 "TokenTextSplitter 的 chunkSize 默认值是多少"）
- 具体函数的调用签名、参数列表、返回值类型
- 配置文件的具体字段和默认值
- "XX 类有几个参数""XX 方法的第 N 个参数是什么" 这类死记硬背的题
- 原文原样照搬的长篇大论（超过 200 字的 question 不要）
- 同一个知识点拆成多道过于细碎的题，应合并

✅ 好的面试题特征：
- 考察理解而非记忆：问"为什么这样设计"而不是"默认值是多少"
- 有思考深度：问"方案对比""优缺点""适用场景""踩坑经验"
- 问题简洁（30 字以内最佳），答案详实
- 面试中真会被问到，而不是文档验收题

主题（topic）6 选 1：
  基础概念 —— 定义、原理、术语解释
  核心模块 —— RAG、检索、向量库、Embedding、Tool/Function Calling、分块
  工作模式 —— ReAct、Plan-Execute、CoT、Agent 循环、提示策略
  架构设计 —— 系统设计、多 Agent、模型路由、流水线、状态管理
  工程实践 —— 部署、监控、日志、权限、成本、错误处理
  评估与多Agent —— 评测方法、RAGAS、多 Agent 协作、安全对齐

难度：概念定义→初级，具体实现→中级，架构权衡→高级
频率：文档反复提到的→高频，偶尔出现→中频，冷门细节→低频
confidence：根据答案在文档中有多少原文支撑（0.5-1.0，越高越可信）
evidence_text：原文中相关的段落片段（200 字内）
tags：3-5 个中文技术关键词

返回 JSON 数组。如果文档不包含可出面试题的技术知识，返回 []。`

// 降级 Prompt — 段落知识点扫描
const FALLBACK_PROMPT = `你是 AI Agent 技术专家。以下是技术文档的一个段落。
请识别其中的知识点，为每个知识点生成一道面试题和答案。
哪怕只找到 1 个知识点也要输出。如果段落不包含技术内容，返回 []。`

/**
 * LLM-assisted extraction. Tries knowledge-driven first,
 * then falls back to paragraph scanning on failure.
 */
export async function extractQaByLLM(
  text: string,
  documentId?: string
): Promise<ExtractedQaCandidate[]> {
  try {
    const configured = await isLlmConfigured()
    if (!configured) return []
  } catch {
    return []
  }

  // ---- Pass 1: Knowledge-driven extraction ----
  let allCandidates = await extractWithPrompt(text, KNOWLEDGE_PROMPT, 50000, 8000, documentId)

  // ---- Pass 2: Paragraph scan (for narrative docs) ----
  if (allCandidates.length === 0) {
    console.warn('知识提取为空，尝试段落扫描...')
    const chunks = splitIntoChunks(text, 4000)
    const seenHashes = new Set<string>()

    for (let i = 0; i < Math.min(chunks.length, 15); i++) {
      try {
        const chunkCandidates = await extractWithPrompt(
          chunks[i], FALLBACK_PROMPT, 4000, 2000, documentId
        )
        for (const c of chunkCandidates) {
          if (!seenHashes.has(c.questionHash)) {
            seenHashes.add(c.questionHash)
            allCandidates.push(c)
          }
        }
      } catch {
        // Single chunk failure doesn't block others
      }
    }
    console.log(`段落扫描: found ${allCandidates.length} candidates from ${chunks.length} chunks`)
  }

  return allCandidates
}

async function extractWithPrompt(
  text: string,
  systemPrompt: string,
  maxChars: number,
  maxTokens: number,
  documentId?: string
): Promise<ExtractedQaCandidate[]> {
  const candidates: ExtractedQaCandidate[] = []
  const seenHashes = new Set<string>()
  const truncated = text.slice(0, maxChars)

  try {
    const cards = await callLLMStructured<LlmExtractedCard[]>(
      `请分析以下文档，提取知识点并生成面试题：\n\n${truncated}`,
      systemPrompt,
      { temperature: 0.2, maxTokens }
    )

    if (!Array.isArray(cards)) return []

    for (const c of cards) {
      if (!c.question) continue

      const normalizedQ = normalizeQuestion(c.question)
      const hash = generateQuestionHash(normalizedQ)
      if (seenHashes.has(hash)) continue
      seenHashes.add(hash)

      const classificationText = `${c.question} ${c.answer || ''}`.slice(0, 500)
      const topicResult = classifyTopic(classificationText)
      const tags = c.tags?.length ? c.tags.slice(0, 5) : suggestTags(classificationText)

      candidates.push({
        id: hash,
        question: normalizedQ,
        answer: (c.answer || '').trim().slice(0, 5000),
        answerStatus: (c.answer || '').trim().length > 10 ? 'present' : 'missing',
        topic: topicResult.category,
        tags,
        difficulty: normalizeField(c.difficulty, ['初级', '中级', '高级'], '中级') as '初级' | '中级' | '高级',
        frequency: normalizeField(c.frequency, ['高频', '中频', '低频'], '中频') as '高频' | '中频' | '低频',
        confidence: Math.min(0.9, Math.max(0.5, c.confidence || 0.7)),
        extractionMethod: 'llm',
        normalizedQuestion: normalizedQ,
        questionHash: hash,
        sourceDocumentId: documentId,
        evidenceText: c.evidence_text?.slice(0, 500) || truncated.slice(0, 200),
      })
    }
  } catch (err) {
    console.error('LLM extraction failed:', (err as Error).message?.slice(0, 200))
  }

  return candidates
}

/** Split text into chunks by approximate character count */
function splitIntoChunks(text: string, maxChars: number): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let current = ''
  for (const p of paragraphs) {
    if (current.length + p.length > maxChars && current.length > 0) {
      chunks.push(current.trim())
      current = p
    } else {
      current += (current ? '\n\n' : '') + p
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

function normalizeField(value: string, allowed: string[], defaultVal: string): string {
  if (!value) return defaultVal
  for (const a of allowed) {
    if (value.includes(a)) return a
  }
  return defaultVal
}

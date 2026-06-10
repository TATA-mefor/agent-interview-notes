/**
 * LLM-powered card extractor v2 — 知识点驱动卡片生成
 *
 * 不再只是"匹配 Q&A 格式"，而是：
 *   1. 分析文档结构，识别技术知识点
 *   2. 对每个知识点，判断是否值得出题
 *   3. 以文档内容为素材，生成面试题 + 标准答案
 *   4. 自动推断主题、难度、频率、标签
 *
 * Strategy:
 *   Pass 1 (主): 知识点分析 + 出题一步完成
 *   Pass 2 (降级): 如果 Pass 1 为空，用自由文本提取
 *   Pass 3 (最后): 将文档按段落拆分，逐段让 LLM 找知识点
 */

import { callLLMStructured, callLLM, isLlmConfigured } from '@/lib/llm'
import type { CardInput } from '@/lib/types'

interface ExtractedCard {
  topic: string
  question: string
  answer: string
  key_points: string[]
  difficulty: string
  frequency: string
  tags: string[]
}

// ============================================================
// 主 Prompt — 知识点驱动的卡片生成
// ============================================================
const KNOWLEDGE_ANALYSIS_PROMPT = `你是 AI Agent 领域的资深面试官和技术讲师。你的任务是：
1. 仔细阅读提供的技术文档
2. 识别其中的核心知识点和概念
3. 将每个知识点转化为一道高质量的面试题

出题规则：
- 题目（question）必须是自然的中文面试提问，如"什么是...""请说明...""对比...""如何..."
- 问题要简洁，30 字以内最佳，超过 100 字的不要
- 答案（answer）必须基于文档内容，保留关键的技术细节、代码示例、架构描述
- 不要编造文档中没有的内容，但可以适当组织语言使其通顺
- 优先提取面试中真正会问的内容：概念原理、方案对比、实践踩坑、设计决策

❌ 绝对不要提取：
- API 参数说明（如 "X 方法的 chunkSize 默认值是多少"）
- 函数签名、参数列表、具体默认值
- 配置文件字段（如 "keepSeparator 参数控制什么"）
- 同一个知识点拆成多道细碎题（应合并）
- 原文照搬超过 200 字的长题目

主题判断（topic）：
  基础概念 —— 定义、原理、术语解释
  核心模块 —— RAG、Embedding、检索、向量库、分块、Tool/Function Calling
  工作模式 —— ReAct、Plan-Execute、思维链、提示策略、Agent 循环
  架构设计 —— 系统设计、多 Agent、模型路由、流水线、状态管理
  工程实践 —— 部署、监控、日志、权限、成本、评估
  评估与多Agent —— 评测方法、多 Agent 协作、安全对齐

难度推断（difficulty）：
  初级 —— 定义、概念、基础原理
  中级 —— 具体实现、模块设计、参数调优
  高级 —— 架构权衡、系统设计、多方案对比

频率推断（frequency）：
  高频 —— 文档中反复出现、面试必问的核心概念
  中频 —— 常见但不一定有深度的知识点
  低频 —— 细节、特定场景、冷门话题

标签（tags）：
  提取 3-6 个中文技术关键词，优先选文档中出现的术语

key_points：
  3-5 个核心要点，用于快速记忆和复习`

// ============================================================
// 降级 Prompt — 段落知识点扫描
// ============================================================
const PARAGRAPH_SCAN_PROMPT = `你是 AI Agent 技术专家。从以下文档段落中提取所有可以出面试题的知识点。
对每个知识点，给出：
- 题目（面试提问风格）
- 基于段落的完整答案
- 难度和标签

哪怕段落很短，只要包含技术信息就尝试出题。`

// ============================================================
// 自由文本降级 Prompt
// ============================================================
const FREETEXT_PROMPT = `你是面试出题专家。以下文档可能格式混乱，请从中提取所有有价值的面试知识点。

对每个知识点用以下格式输出：
【题目】以"什么是..."或"请说明..."开头的面试问题
【答案】基于文档内容的完整回答`

// ============================================================
// 主入口
// ============================================================
export async function extractCardsWithLLM(text: string): Promise<CardInput[]> {
  const configured = await isLlmConfigured()
  if (!configured) {
    throw new Error('LLM 未配置，无法智能提取。请在设置页面配置 API Key。')
  }

  // ---- Pass 1: 知识点分析 + 出题（主策略）----
  let allCards = await extractKnowledgeDriven(text)

  // ---- Pass 2: 段落扫描（适合叙述性文档）----
  if (allCards.length === 0) {
    console.warn('知识驱动提取为空，尝试段落扫描...')
    allCards = await extractParagraphScan(text)
  }

  // ---- Pass 3: 自由文本提取（最后手段）----
  if (allCards.length === 0) {
    console.warn('段落扫描为空，尝试自由文本提取...')
    allCards = await extractFreeText(text)
  }

  if (allCards.length === 0) {
    throw new Error(
      'LLM 未能从文档中提取到题目。可能原因：\n' +
      '1. 文档不包含技术知识点（非技术内容）\n' +
      '2. 文档是扫描版 PDF（图片），无法提取文本\n' +
      '3. LLM 模型能力不足\n' +
      '提示：请确认文档为可读文本，或尝试更换 LLM 模型。'
    )
  }

  return allCards
}

// ============================================================
// Pass 1: 知识驱动提取
// ============================================================
async function extractKnowledgeDriven(text: string): Promise<CardInput[]> {
  const truncated = text.slice(0, 50000)

  try {
    const prompt = `请分析以下技术文档，识别所有可出面试题的知识点，生成对应的题目和答案。

文档内容：
${truncated.slice(0, 40000)}${truncated.length > 40000 ? '\n\n[文档较长，已截取前 40000 字]' : ''}`

    const cards = await callLLMStructured<ExtractedCard[]>(
      prompt,
      KNOWLEDGE_ANALYSIS_PROMPT,
      { temperature: 0.2, maxTokens: 8000 }
    )

    if (!Array.isArray(cards)) {
      console.warn('知识提取未返回数组:', typeof cards)
      return []
    }

    console.log(`知识驱动提取: ${cards.length} 题`)

    return cards
      .filter((c): c is ExtractedCard & { question: string; answer: string } => !!(c.question && c.answer))
      .map(c => normalizeCard(c))
      .filter(c => c.question.length >= 5 && (c.answer ?? '').length >= 20)
  } catch (err) {
    console.error('知识提取失败:', (err as Error).message?.slice(0, 200))
    return []
  }
}

// ============================================================
// Pass 2: 段落扫描（适合纯叙述、无 Q&A 结构的文档）
// ============================================================
async function extractParagraphScan(text: string): Promise<CardInput[]> {
  const allCards: CardInput[] = []

  // 把文档按自然段落切分，每段最多 3000 字
  const paragraphs = splitIntoChunks(text, 3000)

  for (let i = 0; i < paragraphs.length && i < 15; i++) {
    const chunk = paragraphs[i]

    try {
      const prompt = `从以下段落中提取面试知识点：\n\n${chunk}`

      const cards = await callLLMStructured<ExtractedCard[]>(
        prompt,
        PARAGRAPH_SCAN_PROMPT,
        { temperature: 0.2, maxTokens: 2000 }
      )

      if (Array.isArray(cards) && cards.length > 0) {
        const normalized = cards
          .filter(c => c.question && c.answer)
          .map(c => normalizeCard(c))
          .filter(c => c.question.length >= 5 && (c.answer ?? '').length >= 15)
        allCards.push(...normalized)
      }
    } catch (err) {
      // 单段失败不影响其他段
      console.warn(`段落 ${i} 提取失败:`, (err as Error).message?.slice(0, 100))
    }
  }

  console.log(`段落扫描: ${allCards.length} 题 (from ${paragraphs.length} 段落)`)
  return allCards
}

// ============================================================
// Pass 3: 自由文本提取（最后手段）
// ============================================================
async function extractFreeText(text: string): Promise<CardInput[]> {
  try {
    const truncated = text.slice(0, 30000)
    const raw = await callLLM(
      `请从以下文档中提取面试题目：\n\n${truncated}`,
      FREETEXT_PROMPT,
      { temperature: 0.3, maxTokens: 6000 }
    )

    return parseFreeTextCards(raw)
  } catch (err) {
    console.error('自由文本提取失败:', (err as Error).message?.slice(0, 200))
    return []
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 将文本按字数切分为多个块 */
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

/** 解析自由文本中的 Q&A 对 */
function parseFreeTextCards(text: string): CardInput[] {
  const cards: CardInput[] = []

  const patterns = [
    /【题目】\s*([\s\S]*?)【答案】\s*([\s\S]*?)(?=【题目】|$)/g,
    /Q[:：]\s*(.+?)\n+A[:：]\s*([\s\S]*?)(?=Q[:：]|$)/gi,
    /问题\s*\d*[:：]\s*(.+?)\n+答案\s*\d*[:：]\s*([\s\S]*?)(?=问题\s*\d*[:：]|$)/gi,
    /\d+[\.\、]\s*(.+?)\n+答[:：]\s*([\s\S]*?)(?=\d+[\.\、]|$)/g,
  ]

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      const question = (m[1] || '').trim()
      const answer = (m[2] || '').trim()
      if (question.length > 5 && answer.length > 10) {
        cards.push({
          topic: guessTopic(question + answer),
          question: question.slice(0, 500),
          answer: answer.slice(0, 5000),
          difficulty: '中级',
          frequency: '中频',
          tags: [],
          source: 'csv_import',
        })
      }
    }
    if (cards.length > 0) break
  }

  return cards
}

// ============================================================
// 归一化
// ============================================================
function normalizeCard(c: ExtractedCard): CardInput {
  return {
    topic: normalizeTopic(c.topic),
    question: (c.question || '').trim().slice(0, 500),
    answer: (c.answer || '').trim().slice(0, 5000),
    difficulty: normalizeDifficulty(c.difficulty),
    frequency: normalizeFrequency(c.frequency),
    tags: (c.tags || []).slice(0, 8).filter(Boolean),
    source: 'csv_import',
  }
}

function normalizeTopic(t: string): string {
  const map: Record<string, string> = {
    '基础': '基础概念', '核心': '核心模块', '工作': '工作模式',
    '架构': '架构设计', '工程': '工程实践', '评估': '评估与多Agent',
    '多Agent': '评估与多Agent', '多agent': '评估与多Agent',
  }
  for (const [k, v] of Object.entries(map)) {
    if (t?.includes(k)) return v
  }
  return guessTopic(t) || '核心模块'
}

function guessTopic(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('rag') || t.includes('检索') || t.includes('向量') || t.includes('embedding') || t.includes('chunk')) return '核心模块'
  if (t.includes('function') || t.includes('tool') || t.includes('工具调用') || t.includes('插件')) return '核心模块'
  if (t.includes('架构') || t.includes('设计模式') || t.includes('流水线') || t.includes('路由')) return '架构设计'
  if (t.includes('部署') || t.includes('docker') || t.includes('监控') || t.includes('日志') || t.includes('成本') || t.includes('权限')) return '工程实践'
  if (t.includes('评估') || t.includes('评测') || t.includes('多agent') || t.includes('协作') || t.includes('ragas')) return '评估与多Agent'
  if (t.includes('提示') || t.includes('react') || t.includes('cot') || t.includes('plan') || t.includes('循环')) return '工作模式'
  if (t.includes('概念') || t.includes('定义') || t.includes('什么是') || t.includes('区别') || t.includes('原理')) return '基础概念'
  return ''
}

function normalizeDifficulty(d: string): CardInput['difficulty'] {
  if (d?.includes('初') || d?.toLowerCase() === 'easy') return '初级'
  if (d?.includes('高') || d?.toLowerCase() === 'hard') return '高级'
  return '中级'
}

function normalizeFrequency(f: string): CardInput['frequency'] {
  if (f?.includes('高') || f?.toLowerCase() === 'high') return '高频'
  if (f?.includes('低') || f?.toLowerCase() === 'low') return '低频'
  return '中频'
}

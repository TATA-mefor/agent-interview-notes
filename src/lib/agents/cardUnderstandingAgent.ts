/**
 * CardUnderstandingAgent — AI-powered card content analysis.
 *
 * Generates structured suggestions for interview cards.
 * OUTPUT IS SUGGESTION-ONLY — never auto-applied to user content.
 */

import { callLLMStructured } from '@/lib/llm'
import { retrieveCardContext } from '@/lib/rag/retriever'
import type { AIUnderstandingOutput, Card } from '@/lib/types'

const SYSTEM_PROMPT = `You are an expert Agent Engineering interview coach.
You help analyze interview questions about AI Agents and generate structured study materials.

If provided with reference materials from the user's knowledge base, prioritize and cite them in your answer.

Your response MUST be a valid JSON object with the following structure:
{
  "standard_answer": "A comprehensive standard interview answer in Chinese",
  "key_points": ["Key point 1", "Key point 2", ...],
  "extended_notes": "Extended knowledge and deep dive content in Chinese",
  "interview_script": "A recitable interview script in first-person Chinese, suitable for speaking aloud",
  "common_mistakes": ["Common mistake 1", "Common mistake 2", ...],
  "suggested_tags": ["tag1", "tag2", ...],
  "suggested_difficulty": "初级" | "中级" | "高级",
  "suggested_frequency": "高频" | "中频" | "低频",
  "related_question_ids": []
}

Keep the interview_script concise (60-90 seconds spoken length).
Generate 3-5 key_points.
Generate 2-3 common_mistakes.
Generate 3-5 suggested_tags (use Chinese tags relevant to Agent engineering).
Focus on practical, interview-ready content.`

function buildPrompt(
  card: Pick<Card, 'topic' | 'question' | 'answer' | 'tags' | 'difficulty'>,
  ragContext?: string
): string {
  let prompt = `请分析以下 Agent 工程面试题，生成完整的面试准备材料。

主题: ${card.topic}
题目: ${card.question}
现有答案: ${card.answer || '（无）'}
现有标签: ${card.tags?.join(', ') || '（无）'}
现有难度: ${card.difficulty}`

  if (ragContext) {
    prompt += `\n\n📚 以下是从你的知识库中检索到的相关参考资料，请优先参考这些资料来生成答案：\n\n${ragContext}`
  }

  prompt += `\n\n请生成标准面试答案、关键要点、扩展笔记、面试话术、常见误区、建议标签、建议难度和建议频率。
如果现有答案已经很完整，可以在其基础上优化。如果现有答案为空，请从零生成。
所有输出必须是 JSON 格式。`

  return prompt
}

export interface UnderstandingResult {
  suggestion: AIUnderstandingOutput
  tokensUsed: number
  model: string
  provider: string
}

export async function runCardUnderstanding(
  card: Pick<Card, 'topic' | 'question' | 'answer' | 'tags' | 'difficulty'>
): Promise<UnderstandingResult & { ragContext: string | null }> {
  // Step 1: Search knowledge base for relevant context
  let ragContext: string | null = null
  try {
    ragContext = await retrieveCardContext(card.question, 3)
  } catch { /* RAG unavailable, proceed without */ }

  // Step 2: Build prompt with RAG context
  const prompt = buildPrompt(card, ragContext || undefined)

  // Step 3: Call LLM
  const output = await callLLMStructured<AIUnderstandingOutput>(
    prompt,
    SYSTEM_PROMPT,
    {
      temperature: 0.7,
      maxTokens: 3000,
    }
  )

  // Validate output structure
  return {
    suggestion: {
      standard_answer: output.standard_answer || '',
      key_points: Array.isArray(output.key_points) ? output.key_points : [],
      extended_notes: output.extended_notes || '',
      interview_script: output.interview_script || '',
      common_mistakes: Array.isArray(output.common_mistakes) ? output.common_mistakes : [],
      suggested_tags: Array.isArray(output.suggested_tags) ? output.suggested_tags : [],
      suggested_difficulty: output.suggested_difficulty || card.difficulty,
      suggested_frequency: output.suggested_frequency || '中频',
      related_question_ids: Array.isArray(output.related_question_ids)
        ? output.related_question_ids
        : [],
    },
    tokensUsed: 0,
    model: '',
    provider: '',
    ragContext,
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { runCardUnderstanding } from '@/lib/agents/cardUnderstandingAgent'
import * as cardRepo from '@/lib/repositories/cardRepository'
import * as llmSuggestionRepo from '@/lib/repositories/llmSuggestionRepository'
import * as agentRunRepo from '@/lib/repositories/agentRunRepository'
import { isLlmConfigured } from '@/lib/llm'

// POST /api/llm/understand — Generate AI understanding for a card
export async function POST(req: NextRequest) {
  // Check LLM availability
  if (!(await isLlmConfigured())) {
    return NextResponse.json(
      {
        error: '未配置 LLM。请在环境变量中设置 LLM_PROVIDER 和 API Key。',
        hint: '基础 CRUD 无需 LLM 仍可正常使用。',
      },
      { status: 400 }
    )
  }

  try {
    const { cardId } = await req.json()

    if (!cardId) {
      return NextResponse.json(
        { error: 'cardId is required' },
        { status: 400 }
      )
    }

    // Fetch card
    const card = await cardRepo.getCardById(cardId)
    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Start agent run
    const agentRun = await agentRunRepo.createAgentRun({
      agent_type: 'card_understanding',
      status: 'running',
      input: { card_id: cardId, topic: card.topic, question: card.question },
      provider: process.env.LLM_PROVIDER || 'unknown',
      model: '',
    })

    // Run AI understanding
    const result = await runCardUnderstanding(card)

    // Update agent run
    await agentRunRepo.updateAgentRun(agentRun.id, {
      status: 'completed',
      output: result.suggestion as unknown as Record<string, unknown>,
      tokens_used: result.tokensUsed,
    })

    // Save as suggestion (NOT auto-applied)
    const suggestion = await llmSuggestionRepo.createSuggestion({
      card_id: cardId,
      suggestion_type: 'understanding',
      input_context: {
        topic: card.topic,
        question: card.question,
        answer: card.answer,
      },
      output_content: result.suggestion as unknown as Record<string, unknown>,
      provider: result.provider,
      model: result.model,
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({
      data: {
        suggestionId: suggestion.id,
        ...result.suggestion,
        ragUsed: !!result.ragContext,
        ragContext: result.ragContext?.slice(0, 500) || null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 理解失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

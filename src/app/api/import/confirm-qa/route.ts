/**
 * POST /api/import/confirm-qa
 *
 * Write user-confirmed Q&A candidates to cards table.
 * Only this endpoint writes to cards — extraction endpoints never do.
 *
 * Body:
 *   {
 *     candidates: Array<{ question, answer, topic, tags, difficulty, frequency, questionHash }>,
 *     duplicateStrategy: "skip" | "create_new"
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import * as cardService from '@/lib/services/cardService'
import * as cardRepo from '@/lib/repositories/cardRepository'
import { generateQuestionHash, normalizeQuestion, combinedSimilarity } from '@/lib/extraction/qaDedupService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const candidates = body.candidates as Array<{
      question: string
      answer: string
      topic: string
      tags: string[]
      difficulty: string
      frequency: string
      questionHash: string
    }> | null
    const duplicateStrategy = (body.duplicateStrategy as string) || 'skip'

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: '缺少 candidates 数组' }, { status: 400 })
    }

    // Fetch existing cards for dedup (exact hash + 80% similarity)
    let existingCards: Array<{ id: string; question: string; question_hash: string | null }> = []
    let existingHashes = new Set<string>()
    try {
      existingCards = await cardRepo.listCards({ limit: 2000 })
      existingHashes = new Set(
        existingCards
          .map(c => c.question_hash)
          .filter(Boolean) as string[]
      )
    } catch {
      // DB not available — proceed without dedup
    }

    let imported = 0
    let skipped = 0
    let similaritySkipped = 0
    const errors: string[] = []

    for (const c of candidates) {
      try {
        if (!c.question?.trim()) {
          skipped++
          continue
        }

        const hash = c.questionHash || generateQuestionHash(normalizeQuestion(c.question))

        // Exact hash dedup
        if (existingHashes.has(hash)) {
          if (duplicateStrategy === 'skip') {
            skipped++
            continue
          }
        }

        // 80% similarity dedup
        let isSimilar = false
        for (const existing of existingCards) {
          const sim = combinedSimilarity(c.question, existing.question)
          if (sim >= 0.80) {
            isSimilar = true
            break
          }
        }
        if (isSimilar && duplicateStrategy === 'skip') {
          similaritySkipped++
          continue
        }

        await cardService.createCard({
          topic: c.topic || '核心模块',
          question: c.question.trim(),
          answer: (c.answer || '').trim(),
          difficulty: (c.difficulty as '初级' | '中级' | '高级') || '中级',
          frequency: (c.frequency as '高频' | '中频' | '低频') || '中频',
          tags: Array.isArray(c.tags) ? c.tags.slice(0, 8) : [],
          source: 'markdown_import',
        })

        imported++
      } catch (err) {
        errors.push(
          `导入失败 "${c.question?.slice(0, 50)}": ${err instanceof Error ? err.message.slice(0, 200) : '未知错误'}`
        )
      }
    }

    return NextResponse.json({
      data: {
        imported,
        skipped,
        similaritySkipped,
        errors,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入确认失败'
    console.error('confirm-qa error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

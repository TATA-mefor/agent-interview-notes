/**
 * POST /api/import/extract-qa
 *
 * Extract Q&A candidates from unstructured text.
 * NEVER writes to cards — returns candidates for user preview only.
 *
 * Body:
 *   { text, mode: "auto"|"strict"|"loose"|"llm_assisted"|"hybrid", documentId?, sourceType? }
 *
 * Supports "auto" mode: strict → loose fallback automatically.
 */
import { NextRequest, NextResponse } from 'next/server'
import { extractQaCandidates } from '@/lib/extraction/qaExtractionService'
import { isLlmConfigured } from '@/lib/llm'
import type { ExtractionMode, QaSourceType } from '@/lib/extraction/types'

const VALID_MODES = ['auto', 'strict', 'loose', 'llm_assisted', 'hybrid']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = body.text as string | null
    const mode = (body.mode as string) || 'auto'
    const documentId = body.documentId as string | undefined
    const sourceType = body.sourceType as string | undefined

    if (!text || !text.trim()) {
      return NextResponse.json({ error: '缺少文本内容 (text)' }, { status: 400 })
    }

    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: `mode 必须是: ${VALID_MODES.join(' / ')}` }, { status: 400 })
    }

    const result = await extractQaCandidates(text, {
      mode: mode as ExtractionMode,
      documentId,
      sourceType: sourceType as QaSourceType | undefined,
    })

    // Check LLM availability
    let llmConfigured = false
    try { llmConfigured = await isLlmConfigured() } catch { /* ignore */ }

    // When 0 candidates, include diagnostic + actionable suggestions
    if (result.candidates.length === 0) {
      const hasQMarks = /[?？]/.test(text)
      const hasQAMarkers = /(?:Q\d*|问题|题目|问)[\s:：]/.test(text)
      const hasHeadings = /^#{1,4}\s/m.test(text)

      let suggestion = ''
      if (!llmConfigured) {
        suggestion = '当前文档是纯段落叙述，需要 LLM 做知识点分析才能提取题目。\n请在 .env 中配置 DEEPSEEK_API_KEY，重启容器后再试。\n或者手动转换为 Q&A 格式（CSV/JSON/Markdown）后导入。'
      } else if (text.length < 50) {
        suggestion = '文本太短（<50字符）。如果是扫描版 PDF，请先用 OCR 提取文字。'
      } else if (hasQAMarkers) {
        suggestion = '检测到疑似 Q/A 标记但未能匹配到完整题目。LLM 辅助也未返回结果，请尝试切换抽取模式为"LLM 辅助"。'
      } else if (hasQMarks) {
        suggestion = '检测到问号但未匹配到 Q/A 结构。LLM 辅助也未返回结果，请检查 LLM 配置。'
      } else if (hasHeadings) {
        suggestion = '检测到 Markdown 标题但未匹配到题目格式。LLM 辅助也未返回结果。'
      } else {
        suggestion = '未检测到问号或 Q/A 标记。LLM 知识分析也未抽取到题目。\n可能原因：文档不是技术内容，或 LLM 未正确配置。'
      }

      return NextResponse.json({
        data: {
          ...result,
          debug: {
            textLength: text.length,
            textPreview: text.slice(0, 300),
            textPreviewEnd: text.slice(-200),
            hasQMarks,
            hasQAMarkers,
            suggestion,
            actions: {
              canRetryLoose: mode !== 'loose',
              canRetryLLM: llmConfigured && mode !== 'llm_assisted',
              llmConfigured,
              canImportKnowledge: true,
            },
          },
        },
      })
    }

    return NextResponse.json({
      data: {
        ...result,
        llmConfigured,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '抽取失败'
    console.error('extract-qa error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

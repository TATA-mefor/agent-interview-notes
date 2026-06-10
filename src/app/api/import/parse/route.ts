import { NextRequest, NextResponse } from 'next/server'
import * as importService from '@/lib/services/importService'

// POST /api/import/parse
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null
    const mode = (formData.get('mode') as string) || 'auto'
    const useLLM = formData.get('useLLM') === 'true'

    let content: string
    let fileName: string
    let sourceType = 'markdown'

    if (file) {
      fileName = file.name
      const ext = fileName.split('.').pop()?.toLowerCase()

      if (ext === 'pdf') {
        const buffer = Buffer.from(await file.arrayBuffer())
        const { extractPdfText } = await import('@/lib/importers/pdfImporter')
        content = await extractPdfText(buffer)
        sourceType = 'markdown'
      } else if (ext === 'docx' || ext === 'doc') {
        const buffer = Buffer.from(await file.arrayBuffer())
        const { extractDocxText } = await import('@/lib/importers/wordImporter')
        content = await extractDocxText(buffer)
        sourceType = 'markdown'
      } else {
        content = await file.text()
        if (ext === 'csv') sourceType = 'csv'
        else if (ext === 'json') sourceType = 'json'
      }
    } else if (text) {
      content = text
      fileName = 'paste.txt'
    } else {
      return NextResponse.json({ error: '请上传文件或粘贴文本内容' }, { status: 400 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '未能从文件中提取文本。请确认文件不是扫描版 PDF。' }, { status: 400 })
    }

    if (mode === 'knowledge') {
      return NextResponse.json({ data: { mode: 'knowledge', fileName, rawText: content.slice(0, 100000), textLength: content.length } })
    }

    // Try LLM extraction for unstructured text (PDF/DOCX/MD)
    if (useLLM && content.length > 500) {
      try {
        const { extractCardsWithLLM } = await import('@/lib/importers/llmCardExtractor')
        const cards = await extractCardsWithLLM(content)
        if (cards.length > 0) {
          // Convert tags array to comma-separated for the CSV/JSON parser
          const jsonStr = JSON.stringify(cards.map(c => ({
            ...c,
            tags: Array.isArray(c.tags) ? c.tags.join(',') : (c.tags || '')
          })))
          const preview = await importService.parseAndPreview(jsonStr, fileName, 'json')
          return NextResponse.json({ data: { ...preview, llmExtracted: true } })
        }
        // LLM returned empty — fall through to standard parsing
        console.warn('LLM extraction returned 0 cards, falling back to standard parsing')
      } catch (llmErr) {
        console.error('LLM extraction failed:', llmErr)
        const msg = llmErr instanceof Error ? llmErr.message : 'LLM 提取失败'
        if (msg.includes('未配置') || msg.includes('API key')) {
          // LLM not available — fall through to standard parsing with a warning
          console.warn('LLM not configured, using standard parsing only')
        } else {
          // LLM failed but was configured — still try standard parsing as fallback
          console.warn(`LLM extraction error: ${msg.slice(0, 200)}. Falling back to standard parsing.`)
        }
        // Don't throw — fall through to standard parsing below
      }
    }

    // Standard parsing
    const preview = await importService.parseAndPreview(content, fileName, sourceType)

    if (preview.totalRows === 0 && content.trim().length > 100) {
      preview.suggestKnowledge = true
      preview.rawText = content.slice(0, 5000)
      preview.textLength = content.length
    }

    return NextResponse.json({ data: preview })
  } catch (err) {
    const message = err instanceof Error ? err.message : '解析失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

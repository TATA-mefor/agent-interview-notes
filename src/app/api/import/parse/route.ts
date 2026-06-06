import { NextRequest, NextResponse } from 'next/server'
import * as importService from '@/lib/services/importService'

// POST /api/import/parse — Parse uploaded file and return preview
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null
    const mode = (formData.get('mode') as string) || 'auto' // 'auto' | 'cards' | 'knowledge'

    let content: string
    let fileName: string
    let sourceType = 'markdown'

    if (file) {
      fileName = file.name
      const ext = fileName.split('.').pop()?.toLowerCase()

      if (ext === 'pdf') {
        // Extract text from PDF
        const buffer = Buffer.from(await file.arrayBuffer())
        const { extractPdfText } = await import('@/lib/importers/pdfImporter')
        content = await extractPdfText(buffer)
        sourceType = 'markdown' // treat extracted text as markdown-like
      } else if (ext === 'docx' || ext === 'doc') {
        // Extract text from Word
        const buffer = Buffer.from(await file.arrayBuffer())
        const { extractDocxText } = await import('@/lib/importers/wordImporter')
        content = await extractDocxText(buffer)
        sourceType = 'markdown'
      } else {
        // Plain text files (csv, json, md, txt)
        content = await file.text()
        if (ext === 'csv') sourceType = 'csv'
        else if (ext === 'json') sourceType = 'json'
      }
    } else if (text) {
      content = text
      fileName = 'paste.txt'
    } else {
      return NextResponse.json(
        { error: '请上传文件或粘贴文本内容' },
        { status: 400 }
      )
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '未能从文件中提取到文本内容。请确认文件不是扫描图片版 PDF。' },
        { status: 400 }
      )
    }

    // If mode is 'knowledge', return raw text for knowledge document creation
    if (mode === 'knowledge') {
      return NextResponse.json({
        data: {
          mode: 'knowledge',
          fileName,
          rawText: content.slice(0, 100000), // limit to 100k chars
          textLength: content.length,
        },
      })
    }

    // Default: try to parse as cards
    const preview = await importService.parseAndPreview(content, fileName, sourceType)

    // If no card rows found, suggest knowledge import
    if (preview.totalRows === 0 && content.trim().length > 100) {
      ;(preview as unknown as Record<string, unknown>).suggestKnowledge = true
      ;(preview as unknown as Record<string, unknown>).rawText = content.slice(0, 5000)
    }

    return NextResponse.json({ data: preview })
  } catch (err) {
    const message = err instanceof Error ? err.message : '解析失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

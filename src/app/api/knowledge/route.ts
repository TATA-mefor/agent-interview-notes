import { NextRequest, NextResponse } from 'next/server'
import * as knowledgeRepo from '@/lib/repositories/knowledgeRepository'

// GET /api/knowledge — List all knowledge documents
export async function GET() {
  try {
    const docs = await knowledgeRepo.listDocuments()
    return NextResponse.json({ data: docs })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list documents'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/knowledge — Create a knowledge document
export async function POST(req: NextRequest) {
  try {
    const { title, content, file_type, source } = await req.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      )
    }

    const doc = await knowledgeRepo.createDocument({
      title,
      content,
      file_type: file_type || 'markdown',
      source: source || '',
      status: 'processing',
    })

    return NextResponse.json({ data: doc }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

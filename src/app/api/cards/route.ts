import { NextRequest, NextResponse } from 'next/server'
import * as cardRepo from '@/lib/repositories/cardRepository'
import * as cardService from '@/lib/services/cardService'
import type { CardInput } from '@/lib/types'

// GET /api/cards — List cards with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const topic = searchParams.get('topic') || undefined
    const difficulty = searchParams.get('difficulty') || undefined
    const frequency = searchParams.get('frequency') || undefined
    const search = searchParams.get('search') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    const tagsParam = searchParams.get('tags') || undefined
    const tags = tagsParam ? tagsParam.split(',') : undefined

    const cards = await cardRepo.listCards({
      topic,
      difficulty,
      frequency,
      search,
      tags,
      limit,
      offset,
    })

    return NextResponse.json({ data: cards })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/cards — Create a new card
export async function POST(req: NextRequest) {
  try {
    const body: CardInput = await req.json()

    if (!body.topic || !body.question) {
      return NextResponse.json(
        { error: 'topic and question are required' },
        { status: 400 }
      )
    }

    const card = await cardService.createCard(body)
    return NextResponse.json({ data: card }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

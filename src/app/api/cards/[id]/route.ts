import { NextRequest, NextResponse } from 'next/server'
import * as cardRepo from '@/lib/repositories/cardRepository'
import * as cardService from '@/lib/services/cardService'
import type { CardUpdate } from '@/lib/types'

// GET /api/cards/[id] — Get card detail
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const card = await cardRepo.getCardById(params.id)
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
    return NextResponse.json({ data: card })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/cards/[id] — Update card
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: CardUpdate & { change_summary?: string } = await req.json()
    const { change_summary, ...updates } = body

    const card = await cardService.updateCard(params.id, updates, change_summary)
    return NextResponse.json({ data: card })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/cards/[id] — Delete card
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const card = await cardRepo.getCardById(params.id)
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    await cardService.deleteCard(params.id)
    return NextResponse.json({ data: { id: params.id, deleted: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

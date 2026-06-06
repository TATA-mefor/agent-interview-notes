import { NextRequest, NextResponse } from 'next/server'
import * as cardRepo from '@/lib/repositories/cardRepository'
import { recommendCards } from '@/lib/services/recommendationService'

// GET /api/cards/[id]/related — Get related card recommendations
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const card = await cardRepo.getCardById(params.id)
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Get all cards as candidate pool (limit 100 for performance)
    const allCards = await cardRepo.listCards({ limit: 100 })
    const recommendations = await recommendCards(card, allCards, 5)

    return NextResponse.json({ data: recommendations })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recommendation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

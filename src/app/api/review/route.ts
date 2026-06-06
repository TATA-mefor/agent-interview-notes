import { NextRequest, NextResponse } from 'next/server'
import * as reviewService from '@/lib/services/reviewService'

// GET /api/review?action=stats — Review stats
// GET /api/review?action=today — Today's review tasks
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'stats'

  try {
    switch (action) {
      case 'stats': {
        const stats = await reviewService.getReviewStats()
        return NextResponse.json({ data: stats })
      }
      case 'today': {
        const tasks = await reviewService.generateDailyReviewPlan()
        return NextResponse.json({ data: tasks })
      }
      case 'plan': {
        // Generate plan for next N days
        await reviewService.recalculateAllPriorities()
        const tasks = await reviewService.generateDailyReviewPlan()
        return NextResponse.json({ data: tasks })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Review API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/review — Complete a review task
export async function POST(req: NextRequest) {
  try {
    const { taskId, isCorrect, notes, durationSeconds } = await req.json()
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const result = await reviewService.completeReview(
      taskId,
      isCorrect ?? true,
      notes,
      durationSeconds
    )

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Review completion failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

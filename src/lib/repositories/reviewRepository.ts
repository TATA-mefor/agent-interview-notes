import { db } from '@/lib/db/client'
import type { ReviewLog, ReviewLogInput, ReviewTask, ReviewTaskInput } from '@/lib/types'

// ---- Review Logs ----
export async function getReviewLogs(cardId: string): Promise<ReviewLog[]> {
  const { data, error } = await db
    .from('review_log')
    .select('*')
    .eq('card_id', cardId)
    .order('review_date', { ascending: false })

  if (error) throw new Error(`getReviewLogs failed: ${error.message}`)
  return (data ?? []) as ReviewLog[]
}

export async function createReviewLog(input: ReviewLogInput): Promise<ReviewLog> {
  const { data, error } = await db.from('review_log').insert(input).select().single()
  if (error) throw new Error(`createReviewLog failed: ${error.message}`)
  return data as ReviewLog
}

export async function getRecentReviewLogs(days: number = 30): Promise<ReviewLog[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await db
    .from('review_log')
    .select('*')
    .gte('review_date', since.toISOString())
    .order('review_date', { ascending: false })

  if (error) throw new Error(`getRecentReviewLogs failed: ${error.message}`)
  return (data ?? []) as ReviewLog[]
}

// ---- Review Tasks ----
export async function getReviewTasks(params?: {
  cardId?: string
  scheduledDate?: string
  completed?: boolean
}): Promise<ReviewTask[]> {
  let query = db.from('review_tasks').select('*')

  if (params?.cardId) query = query.eq('card_id', params.cardId)
  if (params?.scheduledDate) query = query.eq('scheduled_date', params.scheduledDate)
  if (params?.completed !== undefined) query = query.eq('completed', params.completed)

  query = query.order('scheduled_date', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(`getReviewTasks failed: ${error.message}`)
  return (data ?? []) as ReviewTask[]
}

export async function getTodayTasks(): Promise<ReviewTask[]> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return getReviewTasks({ scheduledDate: today })
}

export async function createReviewTask(input: ReviewTaskInput): Promise<ReviewTask> {
  const { data, error } = await db.from('review_tasks').insert(input).select().single()
  if (error) throw new Error(`createReviewTask failed: ${error.message}`)
  return data as ReviewTask
}

export async function completeReviewTask(
  id: string,
  masteryAfter: number
): Promise<ReviewTask> {
  const { data, error } = await db
    .from('review_tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`completeReviewTask failed: ${error.message}`)
  return data as ReviewTask
}

export async function createReviewTasksBatch(inputs: ReviewTaskInput[]): Promise<ReviewTask[]> {
  if (inputs.length === 0) return []
  const { data, error } = await db.from('review_tasks').insert(inputs).select()
  if (error) throw new Error(`createReviewTasksBatch failed: ${error.message}`)
  return (data ?? []) as ReviewTask[]
}

export async function deleteTasksForCard(cardId: string): Promise<void> {
  const { error } = await db.from('review_tasks').delete().eq('card_id', cardId)
  if (error) throw new Error(`deleteTasksForCard failed: ${error.message}`)
}

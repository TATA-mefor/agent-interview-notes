import { db } from '@/lib/db/client'
import type { ImportJob } from '@/lib/types'

const TABLE = 'import_jobs'

export async function createImportJob(input: {
  source_type: string
  file_name: string
  total_rows?: number
}): Promise<ImportJob> {
  const { data, error } = await db.from(TABLE).insert(input).select().single()
  if (error) throw new Error(`createImportJob failed: ${error.message}`)
  return data as ImportJob
}

export async function getImportJob(id: string): Promise<ImportJob | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getImportJob failed: ${error.message}`)
  }
  return data as ImportJob
}

export async function listImportJobs(limit: number = 20): Promise<ImportJob[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`listImportJobs failed: ${error.message}`)
  return (data ?? []) as ImportJob[]
}

export async function updateImportJob(
  id: string,
  updates: {
    status?: string
    total_rows?: number
    imported_rows?: number
    skipped_rows?: number
    duplicate_rows?: number
    error_rows?: number
    result_summary?: Record<string, unknown>
  }
): Promise<ImportJob> {
  const { data, error } = await db.from(TABLE).update(updates).eq('id', id).select().single()
  if (error) throw new Error(`updateImportJob failed: ${error.message}`)
  return data as ImportJob
}

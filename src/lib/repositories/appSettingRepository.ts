import { db } from '@/lib/db/client'
import type { AppSetting } from '@/lib/types'

const TABLE = 'app_settings'

export async function getSetting(key: string): Promise<AppSetting | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('key', key).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getSetting failed: ${error.message}`)
  }
  return data as AppSetting
}

export async function getAllSettings(): Promise<AppSetting[]> {
  const { data, error } = await db.from(TABLE).select('*').order('key')
  if (error) throw new Error(`getAllSettings failed: ${error.message}`)
  return (data ?? []) as AppSetting[]
}

export async function setSetting(
  key: string,
  value: Record<string, unknown>,
  description?: string
): Promise<AppSetting> {
  const { data, error } = await db
    .from(TABLE)
    .upsert({ key, value, description: description ?? '' })
    .select()
    .single()

  if (error) throw new Error(`setSetting failed: ${error.message}`)
  return data as AppSetting
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await db.from(TABLE).delete().eq('key', key)
  if (error) throw new Error(`deleteSetting failed: ${error.message}`)
}

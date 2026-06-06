import { NextRequest, NextResponse } from 'next/server'
import * as settingRepo from '@/lib/repositories/appSettingRepository'

// GET /api/settings?key=llm_config
export async function GET(req: NextRequest) {
  try {
    const key = new URL(req.url).searchParams.get('key')
    if (key) {
      const setting = await settingRepo.getSetting(key)
      return NextResponse.json({ data: setting })
    }
    const all = await settingRepo.getAllSettings()
    return NextResponse.json({ data: all })
  } catch {
    return NextResponse.json({ data: null })
  }
}

// POST /api/settings — Save a setting
export async function POST(req: NextRequest) {
  try {
    const { key, value, description } = await req.json()
    if (!key || !value) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 })
    }
    const setting = await settingRepo.setSetting(key, value, description || '')
    return NextResponse.json({ data: setting })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    )
  }
}

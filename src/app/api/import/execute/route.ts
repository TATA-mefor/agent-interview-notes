import { NextRequest, NextResponse } from 'next/server'
import * as importService from '@/lib/services/importService'
import type { PreviewRow, ImportOptions } from '@/lib/services/importService'

// POST /api/import/execute — Execute import with user choices
export async function POST(req: NextRequest) {
  try {
    const body: {
      jobId: string
      rows: PreviewRow[]
      options: ImportOptions
    } = await req.json()

    if (!body.jobId || !body.rows) {
      return NextResponse.json(
        { error: 'jobId 和 rows 为必填' },
        { status: 400 }
      )
    }

    const result = await importService.executeImport(
      body.jobId,
      body.rows,
      body.options
    )

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入执行失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

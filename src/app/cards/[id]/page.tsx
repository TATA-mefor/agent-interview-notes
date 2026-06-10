import CardDetail from '@/components/cards/CardDetail'
import CardForm from '@/components/cards/CardForm'
import type { Card } from '@/lib/types'

async function fetchCard(id: string): Promise<Card | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/cards/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const { data } = await res.json()
    return data ?? null
  } catch {
    return null
  }
}

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { edit?: string }
}) {
  const isEdit = searchParams.edit === '1'

  if (isEdit) {
    const card = await fetchCard(params.id)
    if (!card) {
      return (
        <div className="p-6 text-center text-gray-400 py-12">
          卡片不存在或已被删除
        </div>
      )
    }

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑卡片</h1>
        <CardForm mode="edit" initialData={card} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <CardDetail id={params.id} />
    </div>
  )
}

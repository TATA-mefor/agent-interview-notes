import CardDetail from '@/components/cards/CardDetail'
import CardForm from '@/components/cards/CardForm'

export default function CardDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { edit?: string }
}) {
  // If ?edit=1 is in the URL, show edit form
  if (searchParams.edit === '1') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑卡片</h1>
        <CardForm mode="edit" initialData={null} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <CardDetail id={params.id} />
    </div>
  )
}

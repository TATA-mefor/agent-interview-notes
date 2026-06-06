import CardForm from '@/components/cards/CardForm'

export default function NewCardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新建卡片</h1>
      <CardForm mode="create" />
    </div>
  )
}

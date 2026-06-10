'use client'

interface Props {
  text: string
  maxHeight?: number
}

export default function QaEvidencePanel({ text, maxHeight = 200 }: Props) {
  if (!text) return null

  return (
    <div>
      <div className="text-xs font-medium text-gray-600 mb-1">📄 原文片段</div>
      <pre className="text-xs text-gray-500 bg-white border border-gray-200 rounded p-2.5 overflow-y-auto whitespace-pre-wrap leading-relaxed"
        style={{ maxHeight }}>
        {text}
      </pre>
    </div>
  )
}

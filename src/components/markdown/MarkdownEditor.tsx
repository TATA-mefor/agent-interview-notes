'use client'

import { useState, useCallback, useMemo } from 'react'
import { parseMarkdown, extractWikilinks, extractTags } from '@/lib/markdown/parser'

interface MarkdownEditorProps {
  initialValue?: string
  onSave?: (value: string) => Promise<void>
  onWikilinksChange?: (links: string[]) => void
  onTagsChange?: (tags: string[]) => void
  readOnly?: boolean
  placeholder?: string
  minHeight?: string
}

type ViewMode = 'edit' | 'preview' | 'split'

export default function MarkdownEditor({
  initialValue = '',
  onSave,
  onWikilinksChange,
  onTagsChange,
  readOnly = false,
  placeholder = '开始编写 Markdown 笔记...\n\n支持 **粗体** *斜体* `代码` [[双链]] #标签',
  minHeight = '300px',
}: MarkdownEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [viewMode, setViewMode] = useState<ViewMode>(readOnly ? 'preview' : 'edit')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const parsed = useMemo(() => parseMarkdown(value), [value])

  // Notify parent of wikilinks/tags changes
  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue)
      setSaveStatus('idle')

      if (onWikilinksChange) {
        onWikilinksChange(extractWikilinks(newValue))
      }
      if (onTagsChange) {
        onTagsChange(extractTags(newValue))
      }
    },
    [onWikilinksChange, onTagsChange]
  )

  const handleSave = useCallback(async () => {
    if (!onSave) return
    setSaving(true)
    setSaveStatus('saving')
    try {
      await onSave(value)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [value, onSave])

  // Keyboard shortcut: Ctrl+S to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave]
  )

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <ViewButton active={viewMode === 'edit'} onClick={() => setViewMode('edit')} label="编辑" />
          <ViewButton active={viewMode === 'preview'} onClick={() => setViewMode('preview')} label="预览" />
          <ViewButton active={viewMode === 'split'} onClick={() => setViewMode('split')} label="分屏" />
        </div>

        <div className="flex items-center gap-3">
          {/* WikiLinks count */}
          {parsed.wikilinks.length > 0 && (
            <span className="text-xs text-blue-500">
              🔗 {parsed.wikilinks.length} 双链
            </span>
          )}
          {/* Tags count */}
          {parsed.tags.length > 0 && (
            <span className="text-xs text-green-500">
              # {parsed.tags.length} 标签
            </span>
          )}
          {/* Save button */}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                saveStatus === 'saved'
                  ? 'bg-green-100 text-green-700'
                  : saveStatus === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '✓ 已保存' : saveStatus === 'error' ? '✗ 失败' : '保存'}
            </button>
          )}
        </div>
      </div>

      {/* Editor / Preview */}
      <div className={`flex ${viewMode === 'split' ? 'flex-row' : 'flex-col'}`}>
        {/* Edit pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2 border-r border-gray-200' : ''}>
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              placeholder={placeholder}
              className="w-full p-4 text-sm font-mono text-gray-800 bg-white resize-none focus:outline-none"
              style={{ minHeight, height: viewMode === 'split' ? '60vh' : minHeight }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`p-4 prose prose-sm max-w-none ${viewMode === 'split' ? 'w-1/2' : ''}`}
            style={{ minHeight, overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: parsed.html }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        <span>Markdown · {value.length} 字符 · {value.split(/\n/).length} 行</span>
        <span>Ctrl+S 保存</span>
      </div>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-white text-gray-800 shadow-sm font-medium'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

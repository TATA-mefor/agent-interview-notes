/**
 * Lightweight Markdown → HTML converter.
 * Supports: headings, bold, italic, code, lists, links, [[wikilinks]], #tags.
 * For full GFM/CommonMark, replace with react-markdown + remark-gfm.
 */

export interface ParsedMarkdown {
  html: string
  wikilinks: string[]    // extracted [[card IDs or titles]]
  tags: string[]         // extracted #tags
}

export function parseMarkdown(text: string): ParsedMarkdown {
  const wikilinks: string[] = []
  const tags: string[] = []

  let html = escapeHtml(text)

  // Extract [[wikilinks]] before other processing
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_match, name: string) => {
    wikilinks.push(name.trim())
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
    return `<a href="/cards?search=${encodeURIComponent(name.trim())}" class="wikilink text-blue-600 underline decoration-dotted hover:text-blue-800">${escapeHtml(name.trim())}</a>`
  })

  // Extract #tags (must be preceded by space or start of line, not inside words)
  html = html.replace(/(^|\s)#([一-龥\w-]+)/g, (_match, space: string, tag: string) => {
    tags.push(tag)
    return `${space}<a href="/cards?tags=${encodeURIComponent(tag)}" class="tag-link text-blue-500 hover:text-blue-700">#${escapeHtml(tag)}</a>`
  })

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    return `<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-3 text-sm"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
  })

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

  // Headings (must be at start of line)
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-5 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')

  // Bold + Italic (***text***)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  // Italic (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />')

  // Links [text](url) — but not already-processed wikilinks
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 underline hover:text-blue-800">$1</a>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 my-2 text-gray-600 italic">$1</blockquote>')

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

  // Wrap consecutive <li> in <ul> or <ol>
  html = wrapListItems(html)

  // Paragraphs: double newlines become paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p class="my-2 leading-relaxed">')
  html = '<p class="my-2 leading-relaxed">' + html + '</p>'

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2 leading-relaxed"><\/p>/g, '')

  // Convert remaining single newlines to <br>
  html = html.replace(/\n/g, '<br />')

  return { html, wikilinks, tags }
}

/**
 * Extract all [[wikilinks]] from text without full parsing.
 */
export function extractWikilinks(text: string): string[] {
  const matches = text.matchAll(/\[\[([^\]]+)\]\]/g)
  return Array.from(matches, (m) => m[1].trim())
}

/**
 * Extract all #tags from text.
 */
export function extractTags(text: string): string[] {
  const matches = text.matchAll(/(?:^|\s)#([一-龥\w-]+)/g)
  return Array.from(matches, (m) => m[1])
}

// ---- Helpers ----

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function wrapListItems(html: string): string {
  // Wrap consecutive <li class="ml-4 list-disc"> in <ul>
  html = html.replace(
    /((?:<li class="ml-4 list-disc">.*?(?:<br \/>)?<\/li>\n?)+)/g,
    '<ul class="my-2">$1</ul>'
  )
  // Wrap consecutive <li class="ml-4 list-decimal"> in <ol>
  html = html.replace(
    /((?:<li class="ml-4 list-decimal">.*?(?:<br \/>)?<\/li>\n?)+)/g,
    '<ol class="my-2">$1</ol>'
  )
  return html
}

/**
 * Strip Markdown formatting to get plain text (for search indexing, etc.)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/#{1,4}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^> /gm, '')
    .replace(/^[\-\*] /gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/^---$/gm, '')
    .trim()
}

// ============================================================
// Text Cleaner — sanitize unstructured text before extraction
// ============================================================

/**
 * PDF compatibility character mapping.
 * PDF text extraction often produces Unicode compatibility characters
 * that look correct but have different code points.
 *
 * Examples:
 *   ⾯ (U+2FAF) → 面 (U+9762)
 *   ⽂ (U+2F42) → 文 (U+6587)
 *   ﬀ (U+FB00)  → ff
 */
const PDF_COMPAT_MAP: Record<string, string> = {
  // CJK compatibility ideographs → standard CJK
  '⾯': '面',  // ⾯
  '⽂': '文',  // ⽂
  '⼩': '小',  // ⼩
  '⽩': '白',  // ⽩
  '⽉': '月',  // ⽉
  '⼭': '寸',  // ⼨
  '⼈': '人',  // ⼈
  '⼌': '入',  // ⼌
  '⼚': '出',  // ⼚
  '⼳': '工',  // ⼣
  '⼿': '已',  // ⼿
  '⽊': '有',  // ⽊
  '⽟': '示',  // ⽟
  '⽴': '石',  // ⽴
  '⾍': '耳',  // ⾍
  '⾔': '自',  // ⾔
  '⾡': '角',  // ⾡
  '⾧': '言',  // ⾧
  '⾸': '门',  // ⾸
  '⾺': '间',  // ⾺

  // Latin ligatures
  'ﬀ': 'ff',  // ﬀ
  'ﬁ': 'fi',  // ﬁ
  'ﬂ': 'fl',  // ﬂ
  'ﬃ': 'ffi', // ﬃ
  'ﬄ': 'ffl', // ﬄ

  // Other common PDF artifacts
  '‐': '-',   // hyphen
  '‑': '-',   // non-breaking hyphen
  '–': '-',   // en dash
  '—': '--',  // em dash
  '‘': "'",   // left single quote
  '’': "'",   // right single quote
  '“': '"',   // left double quote
  '”': '"',   // right double quote
  '…': '...', // ellipsis
  ' ': ' ',   // non-breaking space
}

/**
 * Normalize PDF text: Unicode NFKC + compatibility character mapping.
 * Must be called BEFORE cleanText for best results.
 */
export function normalizePdfText(text: string): string {
  // Step 1: Unicode NFKC normalization (handles full-width/half-width, ligatures)
  let normalized = text.normalize('NFKC')

  // Step 2: Compatibility character mapping (NFKC doesn't catch CJK compat ideographs)
  for (const [compat, standard] of Object.entries(PDF_COMPAT_MAP)) {
    normalized = normalized.replaceAll(compat, standard)
  }

  return normalized
}

/**
 * Clean raw text from PDF/web/copy-paste.
 * Removes noise while preserving structural markers.
 */
export function cleanText(text: string): string {
  let cleaned = text

  // Remove page headers/footers (common PDF patterns)
  cleaned = cleaned.replace(/第\s*\d+\s*页\s*[\/／]\s*共\s*\d+\s*页/gi, '')
  cleaned = cleaned.replace(/^\d+\s*[\/／]\s*\d+\s*$/gm, '')
  cleaned = cleaned.replace(/^[pP]age\s*\d+\s*of\s*\d+\s*$/gim, '')

  // Remove standalone page numbers
  cleaned = cleaned.replace(/^\s*\d{1,3}\s*$/gm, '')

  // Remove common PDF header/footer boilerplate
  cleaned = cleaned.replace(/^小番薯资料铺\s*$/gim, '')
  cleaned = cleaned.replace(/^Agent Interview Notes\s*$/gim, '')

  // Remove navigation artifacts
  cleaned = cleaned.replace(/^目录\s*$/gim, '')
  cleaned = cleaned.replace(/^目\s+录\s*$/gim, '')
  cleaned = cleaned.replace(/^[-\*=_]{3,}\s*$/gm, '')  // horizontal rules

  // Remove standalone page numbers
  cleaned = cleaned.replace(/^\s*\d{1,3}\s*$/gm, '')

  // Fix PDF line-break within sentences (single \n in middle of paragraph)
  // Strategy: lines ending with Chinese char or letter → join with next line
  cleaned = cleaned.replace(/([一-鿿a-zA-Z0-9,;，；])\n([一-鿿a-zA-Z])/g, '$1$2')

  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ')          // spaces/tabs → single space
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')        // 3+ newlines → 2
  cleaned = cleaned.replace(/^[ \t]+/gm, '')          // strip leading spaces per line

  // Normalize full-width characters
  cleaned = cleaned.replace(/[！]/g, '!')
  cleaned = cleaned.replace(/[？]/g, '?')
  cleaned = cleaned.replace(/[：]/g, ':')
  cleaned = cleaned.replace(/[，]/g, ',')
  cleaned = cleaned.replace(/[。]/g, '.')
  cleaned = cleaned.replace(/[；]/g, ';')
  cleaned = cleaned.replace(/[（）]/g, (m) => m === '（' ? '(' : ')')

  // Trim
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Split cleaned text into logical blocks for extraction.
 * Preserves heading structure and paragraph boundaries.
 */
export function splitBlocks(text: string): string[] {
  // Split on double newlines (paragraph boundaries) or heading lines
  const raw = text.split(/\n\n+/)

  // Merge very short blocks with neighbors
  const merged: string[] = []
  let buffer = ''

  for (const block of raw) {
    const trimmed = block.trim()
    if (!trimmed) continue

    if (trimmed.length < 20 && !trimmed.startsWith('#') && !trimmed.match(/^[\dQ问]/)) {
      // Short block — likely fragment, merge with buffer
      buffer = buffer ? `${buffer}\n${trimmed}` : trimmed
    } else {
      if (buffer) { merged.push(buffer); buffer = '' }
      merged.push(trimmed)
    }
  }
  if (buffer) merged.push(buffer)

  return merged
}

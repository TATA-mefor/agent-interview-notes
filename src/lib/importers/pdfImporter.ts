/**
 * PDF text extraction — 4-tier strategy.
 *
 *   Tier 1: pypdf (Python) — text-based PDFs, best Chinese support
 *   Tier 2: pdfjs-dist (Node.js) — always available, zero Python dependency
 *   Tier 3: OCR (PaddleOCR > EasyOCR > Tesseract) — scanned/image PDFs
 *   Tier 4: Error with actionable message
 *
 * Auto-detection:
 *   If tiers 1+2 return < 10 meaningful chars → treat as scanned PDF → trigger OCR.
 *
 * Install OCR (any one):
 *   pip install paddlepaddle paddleocr   (recommended, best Chinese)
 *   pip install easyocr                  (simplest, auto-downloads models)
 *   pip install pytesseract pdf2image    (needs separate Tesseract install)
 */
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { CardInput } from '@/lib/types'

/**
 * Extract text from a PDF buffer.
 * 4-tier strategy: pypdf → pdfjs-dist → OCR → error.
 */
export async function extractPdfText(buffer: Buffer, maxPages = 100): Promise<string> {
  // ---- Tier 1: pypdf (text-based PDFs) ----
  try {
    const text = await extractWithPypdf(buffer, maxPages)
    if (isMeaningfulText(text)) return text
    console.warn('pypdf returned empty/minimal text, trying pdfjs-dist...')
  } catch (err) {
    console.warn('pypdf unavailable:', (err as Error).message?.slice(0, 100))
  }

  // ---- Tier 2: pdfjs-dist (Node.js, always available) ----
  try {
    const text = await extractWithPdfjs(buffer, maxPages)
    if (isMeaningfulText(text)) return text
    console.warn('pdfjs-dist returned empty/minimal text — PDF may be scanned (image-based)')
  } catch (err) {
    console.warn('pdfjs-dist failed:', (err as Error).message?.slice(0, 100))
  }

  // ---- Tier 3: OCR (scanned/image PDFs) ----
  try {
    console.log('Attempting OCR on scanned PDF...')
    const text = await extractWithOCR(buffer, maxPages)
    if (isMeaningfulText(text)) return text
  } catch (err) {
    console.warn('OCR unavailable:', (err as Error).message?.slice(0, 100))
  }

  // ---- Tier 4: All failed ----
  throw new Error(
    'PDF 文本提取失败。可能原因：\n' +
    '1. PDF 是扫描版且未安装 OCR 工具 → pip install paddlepaddle paddleocr\n' +
    '2. PDF 是纯图片且分辨率太低\n' +
    '3. PDF 文件损坏或加密\n' +
    '建议：先用 OCR 工具（如 PaddleOCR）将 PDF 转为文字后再导入。'
  )
}

/** Check if text has meaningful content (not just whitespace/numbers) */
function isMeaningfulText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\W]/g, '')
  return cleaned.length >= 10
}

// ============================================================
// pypdf (Python)
// ============================================================

async function extractWithPypdf(buffer: Buffer, maxPages: number): Promise<string> {
  // Write buffer to temp file
  const tmpPath = join(tmpdir(), `pdf-extract-${randomUUID()}.pdf`)
  await writeFile(tmpPath, buffer)

  try {
    const scriptPath = join(process.cwd(), 'scripts', 'extract_pdf_text.py')
    const text = await runPythonScript(scriptPath, [tmpPath, String(maxPages)])
    return text
  } finally {
    // Clean up temp file
    try { await unlink(tmpPath) } catch { /* ignore */ }
  }
}

function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try python3 first, then python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    const proc = spawn(pythonCmd, [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000, // 60s timeout for large PDFs
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim())
      } else {
        // Try 'python' if 'python3' failed (or vice versa)
        const altCmd = pythonCmd === 'python3' ? 'python' : 'python3'
        if (altCmd !== pythonCmd) {
          const proc2 = spawn(altCmd, [scriptPath, ...args], {
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 60000,
          })
          let out2 = '', err2 = ''
          proc2.stdout?.on('data', (c: Buffer) => { out2 += c.toString() })
          proc2.stderr?.on('data', (c: Buffer) => { err2 += c.toString() })
          proc2.on('close', (code2) => {
            if (code2 === 0 && out2.trim()) {
              resolve(out2.trim())
            } else {
              reject(new Error(`pypdf failed (${code2}): ${err2.slice(0, 200) || stderr.slice(0, 200)}`))
            }
          })
          proc2.on('error', () => reject(new Error(`pypdf unavailable: ${stderr.slice(0, 200)}`)))
        } else {
          reject(new Error(`pypdf failed (${code}): ${stderr.slice(0, 200)}`))
        }
      }
    })

    proc.on('error', () => {
      // Python not installed — reject so we fall back to pdfjs-dist
      reject(new Error('Python not available'))
    })
  })
}

// ============================================================
// OCR (PaddleOCR > EasyOCR > Tesseract) — scanned PDFs
// ============================================================

async function extractWithOCR(buffer: Buffer, maxPages: number): Promise<string> {
  const tmpPath = join(tmpdir(), `ocr-pdf-${randomUUID()}.pdf`)
  await writeFile(tmpPath, buffer)

  try {
    const scriptPath = join(process.cwd(), 'scripts', 'ocr_pdf.py')
    return await runPythonScript(scriptPath, [tmpPath, String(maxPages)])
  } finally {
    try { await unlink(tmpPath) } catch { /* ignore */ }
  }
}

// ============================================================
// pdfjs-dist (Node.js) — fallback
// ============================================================

async function extractWithPdfjs(buffer: Buffer, maxPages: number): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await (pdfjs as any).getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
  }).promise

  const limit = Math.min(doc.numPages, maxPages)
  const pages: string[] = []

  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (content as any).items || []
    const pageText = (items as Array<{ str?: string }>)
      .map((item) => item.str || '')
      .join(' ')
      .trim()
    if (pageText) pages.push(pageText)
  }

  const text = pages.join('\n\n')
  if (!text.trim()) throw new Error('PDF 文本提取为空（pdfjs-dist）。如果是扫描版 PDF，请先 OCR。')

  const suffix = doc.numPages > limit
    ? `\n\n[注意: PDF 共 ${doc.numPages} 页，仅提取了前 ${limit} 页。]`
    : ''
  return text + suffix
}

// ============================================================
// Card parsing (delegates to extraction pipeline)
// ============================================================

export async function parsePdfToCards(
  buffer: Buffer,
  fileName: string
): Promise<{ rows: CardInput[]; rawText: string; errors: string[] }> {
  const text = await extractPdfText(buffer)
  return { rows: [], rawText: text, errors: [] }
}

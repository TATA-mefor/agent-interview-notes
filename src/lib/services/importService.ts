/**
 * Import Service — Full import pipeline orchestration.
 *
 * Pipeline:
 *   Upload → Parse → Detect Duplicates → Preview → User Confirm → Write → Update Stats
 */

import type { CardInput } from '@/lib/types'
import * as cardRepo from '@/lib/repositories/cardRepository'
import * as importRepo from '@/lib/repositories/importRepository'
import * as cardService from '@/lib/services/cardService'
import { parseImportContent } from '@/lib/importers'
import { findSimilarCards, combinedSimilarity } from '@/lib/extraction/qaDedupService'
import type { ParseResult, ImportFormat } from '@/lib/importers'

// ---- Parse Phase ----

export interface PreviewRow {
  index: number
  topic: string
  question: string
  answer: string
  difficulty: string
  frequency: string
  tags: string[]
  isDuplicate: boolean
  duplicateOf?: string          // card ID if exact duplicate (hash match)
  duplicateSimilarity?: number  // similarity score (0-1) for fuzzy match
  duplicateQuestion?: string    // the existing similar question
}

export interface ImportPreview {
  jobId: string
  format: ImportFormat
  totalRows: number
  duplicateCount: number
  newCount: number
  rows: PreviewRow[]
  parseErrors: string[]
  suggestKnowledge?: boolean
  rawText?: string
  textLength?: number
}

export async function parseAndPreview(
  content: string,
  fileName: string,
  sourceType: string = 'csv'
): Promise<ImportPreview> {
  // 1. Create import job
  const job = await importRepo.createImportJob({
    source_type: sourceType,
    file_name: fileName,
    total_rows: 0,
  })

  // 2. Parse content
  const parseResult: ParseResult = parseImportContent(content, fileName)

  // 3. Dedup check: exact hash match + 80% similarity match
  const existingCards = await getAllExistingQuestions()
  const rows: PreviewRow[] = parseResult.rows.map((row, idx) => {
    // Check exact hash match first
    const exactDup = findDuplicate(row, existingCards)
    if (exactDup) {
      return {
        index: idx,
        topic: row.topic || '',
        question: row.question || '',
        answer: row.answer || '',
        difficulty: row.difficulty || '中级',
        frequency: row.frequency || '中频',
        tags: row.tags || [],
        isDuplicate: true,
        duplicateOf: exactDup.id,
        duplicateSimilarity: 1.0,
        duplicateQuestion: exactDup.question,
      }
    }

    // Check 80% similarity fuzzy match
    const similarMatches = findSimilarCards(row.question || '', existingCards, 0.80)
    if (similarMatches.length > 0) {
      const best = similarMatches[0]
      return {
        index: idx,
        topic: row.topic || '',
        question: row.question || '',
        answer: row.answer || '',
        difficulty: row.difficulty || '中级',
        frequency: row.frequency || '中频',
        tags: row.tags || [],
        isDuplicate: true,
        duplicateOf: best.cardId,
        duplicateSimilarity: best.similarity,
        duplicateQuestion: best.existingQuestion,
      }
    }

    return {
      index: idx,
      topic: row.topic || '',
      question: row.question || '',
      answer: row.answer || '',
      difficulty: row.difficulty || '中级',
      frequency: row.frequency || '中频',
      tags: row.tags || [],
      isDuplicate: false,
    }
  })

  const duplicateCount = rows.filter((r) => r.isDuplicate).length

  // 4. Update job with totals
  await importRepo.updateImportJob(job.id, {
    status: 'previewing',
    total_rows: rows.length,
    duplicate_rows: duplicateCount,
  })

  return {
    jobId: job.id,
    format: parseResult.format,
    totalRows: rows.length,
    duplicateCount,
    newCount: rows.length - duplicateCount,
    rows,
    parseErrors: parseResult.errors,
  }
}

// ---- Execute Phase ----

export interface ImportOptions {
  skipDuplicates: boolean
  overwriteDuplicates: boolean
  selectedIndices?: number[] // if provided, only import these rows
}

export interface ImportResult {
  jobId: string
  imported: number
  skipped: number
  overwritten: number
  errors: string[]
}

export async function executeImport(
  jobId: string,
  rows: PreviewRow[],
  options: ImportOptions
): Promise<ImportResult> {
  // Update job status
  await importRepo.updateImportJob(jobId, { status: 'importing' })

  let imported = 0
  let skipped = 0
  let overwritten = 0
  const errors: string[] = []

  // Filter rows to import
  const toImport = options.selectedIndices
    ? rows.filter((r) => options.selectedIndices!.includes(r.index))
    : rows

  for (const row of toImport) {
    try {
      if (row.isDuplicate) {
        if (options.overwriteDuplicates && row.duplicateOf) {
          // Overwrite existing card
          await cardService.updateCard(row.duplicateOf, {
            topic: row.topic,
            question: row.question,
            answer: row.answer,
            difficulty: row.difficulty as CardInput['difficulty'],
            frequency: row.frequency as CardInput['frequency'],
            tags: row.tags,
          })
          overwritten++
        } else if (options.skipDuplicates) {
          skipped++
        }
        // else: import anyway (creates a new card with different ID)
      }

      if (!row.isDuplicate || (!options.skipDuplicates && !options.overwriteDuplicates)) {
        await cardService.createCard({
          topic: row.topic,
          question: row.question,
          answer: row.answer,
          difficulty: row.difficulty as CardInput['difficulty'],
          frequency: row.frequency as CardInput['frequency'],
          tags: row.tags,
          source: 'csv_import',
        })
        imported++
      }
    } catch (err) {
      errors.push(
        `行 ${row.index + 1}: ${err instanceof Error ? err.message : '导入失败'}`
      )
    }
  }

  // Update job status
  await importRepo.updateImportJob(jobId, {
    status: 'completed',
    imported_rows: imported,
    skipped_rows: skipped,
    error_rows: errors.length,
    result_summary: { overwritten, errors },
  })

  return {
    jobId,
    imported,
    skipped,
    overwritten,
    errors,
  }
}

// ---- Export ----

export function exportCardsToCSV(cards: Array<{
  topic: string
  question: string
  answer: string
  difficulty: string
  frequency: string
  tags: string[]
}>): string {
  const header = 'topic,question,answer,difficulty,frequency,tags'
  const rows = cards.map((c) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
    return [
      escape(c.topic),
      escape(c.question),
      escape(c.answer),
      c.difficulty,
      c.frequency,
      escape(c.tags.join(';')),
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

// ---- Helpers ----

interface ExistingCard {
  id: string
  question: string
  question_hash: string | null
}

async function getAllExistingQuestions(): Promise<ExistingCard[]> {
  try {
    const cards = await cardRepo.listCards({ limit: 1000 })
    return cards.map((c) => ({
      id: c.id,
      question: c.question,
      question_hash: c.question_hash,
    }))
  } catch {
    // DB not available — return empty, no dedup possible
    return []
  }
}

function findDuplicate(
  row: CardInput,
  existing: ExistingCard[]
): ExistingCard | null {
  if (!row.question) return null
  const q = row.question.trim().toLowerCase()
  return (
    existing.find(
      (c) =>
        c.question.trim().toLowerCase() === q ||
        c.question.includes(row.question!) ||
        row.question!.includes(c.question)
    ) || null
  )
}

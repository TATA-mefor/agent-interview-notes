// ============================================================
// QA Extraction Service — main orchestrator
// ============================================================

import { extractQaByRules } from './qaRuleExtractor'
import { extractQaByLLM } from './qaLlmExtractor'
import { mergeResults } from './qaMergeService'
import { generateQuestionHash, normalizeQuestion } from './qaDedupService'
import { normalizePdfText } from './textCleaner'
import { splitDocumentSections, getQaRelevantSections, extractQaFromSection } from './documentSectionSplitter'
import type {
  ExtractedQaCandidate, QaExtractionOptions,
  QaExtractionResult, QaExtractionStats, ExtractionMode,
} from './types'

export type { ExtractedQaCandidate, QaExtractionOptions, QaExtractionResult, ExtractionMode }
export { extractQaByRules, extractQaByLLM }

/**
 * Main extraction entry point.
 *
 * Pipeline:
 *   raw text → normalize PDF → split sections → prioritize Q/A regions →
 *   rule extract per section → [auto retry with looser mode] →
 *   [LLM extract] → merge → dedup → stats
 *
 * Auto mode: strict → loose → prompt LLM (if configured)
 */
export async function extractQaCandidates(
  text: string,
  options: QaExtractionOptions = {}
): Promise<QaExtractionResult> {
  const mode = options.mode || 'strict'

  // Step 0: Normalize PDF compatibility characters
  const normalized = normalizePdfText(text)

  // Step 1: For long documents, split and prioritize Q/A sections
  let extractText = normalized
  const isLongDoc = normalized.length > 10000 || normalized.split('\n').length > 200

  if (isLongDoc) {
    const sections = splitDocumentSections(normalized)
    const qaSections = getQaRelevantSections(sections)

    if (qaSections.length > 0) {
      // Extract Q/A content from each relevant section
      extractText = qaSections
        .map(s => extractQaFromSection(s))
        .filter(Boolean)
        .join('\n\n')
    }

    // If we got meaningful Q/A content, use that. Otherwise, fall back to full text.
    if (extractText.length < 200) {
      extractText = normalized
    }
  }

  // Step 2: Rule-based extraction
  let ruleResult: QaExtractionResult
  let effectiveMode = mode

  if (mode === 'strict' || mode === 'loose' || mode === 'hybrid' || mode === 'llm_assisted') {
    ruleResult = extractQaByRules(extractText, { ...options, mode })
  } else {
    // Auto mode: strict → loose
    ruleResult = extractQaByRules(extractText, { ...options, mode: 'strict' })
    if (ruleResult.candidates.length === 0) {
      ruleResult = extractQaByRules(extractText, { ...options, mode: 'loose' })
      effectiveMode = 'loose'
    }
  }

  // Step 3: If still 0 in auto mode, run on full text (not just Q/A sections)
  if (ruleResult.candidates.length === 0 && extractText !== normalized) {
    ruleResult = extractQaByRules(normalized, { ...options, mode: 'loose' })
    effectiveMode = 'loose'
  }

  // Step 4: LLM-assisted extraction
  let llmCandidates: ExtractedQaCandidate[] = []
  // Run LLM when explicitly requested OR when auto/strict/loose returned 0
  const llmModes: string[] = ['llm_assisted', 'hybrid']
  const shouldTryLLM = llmModes.includes(mode) || (
    mode === 'auto' && ruleResult.candidates.length === 0
  )

  if (shouldTryLLM) {
    try {
      llmCandidates = await extractQaByLLM(extractText, options.documentId)
    } catch (err) {
      console.error('LLM extraction failed:', (err as Error).message?.slice(0, 200))
    }
  }

  // Step 5: Merge — always include LLM results if we ran LLM
  const candidates = (shouldTryLLM && llmCandidates.length > 0)
    ? mergeResults(ruleResult.candidates, llmCandidates)
    : (ruleResult.candidates.length > 0 ? ruleResult.candidates : llmCandidates)

  // Step 6: Recompute stats
  const stats = computeFinalStats(candidates)

  return { candidates, stats }
}

function computeFinalStats(candidates: ExtractedQaCandidate[]): QaExtractionStats {
  return {
    totalCandidates: candidates.length,
    withAnswer: candidates.filter(c => c.answerStatus === 'present').length,
    missingAnswer: candidates.filter(c => c.answerStatus === 'missing').length,
    partialAnswer: candidates.filter(c => c.answerStatus === 'partial').length,
    duplicates: candidates.filter(c => c.isDuplicateCandidate).length,
    ruleExtracted: candidates.filter(c => c.extractionMethod === 'rule').length,
    llmExtracted: candidates.filter(c => c.extractionMethod === 'llm' || c.extractionMethod === 'hybrid').length,
    highConfidence: candidates.filter(c => c.confidence >= 0.8).length,
    mediumConfidence: candidates.filter(c => c.confidence >= 0.6 && c.confidence < 0.8).length,
    lowConfidence: candidates.filter(c => c.confidence < 0.6).length,
  }
}

// Re-export for convenience
export { normalizeQuestion, generateQuestionHash }

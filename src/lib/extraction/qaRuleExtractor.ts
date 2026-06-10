// ============================================================
// QA Rule Extractor — rule-based Q&A extraction pipeline
// ============================================================

import { cleanText } from './textCleaner'
import { detectQuestions, detectQuestionsFallback, type DetectedQuestion } from './questionDetector'
import { detectAnswerBoundary, isPartialAnswer } from './answerBoundaryDetector'
import { classifyTopic } from './topicClassifier'
import { extractTags } from './tagExtractor'
import { inferMetadata } from './metadataInferencer'
import { scoreConfidence } from './confidenceScorer'
import { removeOrMaskCodeBlocks, type CodeRange } from './codeBlockDetector'
import { normalizeQuestion, generateQuestionHash } from './qaDedupService'
import type {
  ExtractedQaCandidate, QaExtractionOptions,
  QaExtractionResult, QaExtractionStats, AnswerStatus,
} from './types'

export function extractQaByRules(
  rawText: string,
  options: QaExtractionOptions = {}
): QaExtractionResult {
  const {
    mode = 'strict',
    documentId,
    minQuestionLength = 6,
    maxQuestionLength = 200,
    confidenceThreshold = 0.5,
  } = options

  // Step 0: Mask code blocks to prevent false positives
  const { maskedText, codeRanges } = removeOrMaskCodeBlocks(rawText)

  // Step 1: Clean the masked text
  const text = cleanText(maskedText)

  // Step 2: Detect questions (with code range filtering)
  let questions = detectQuestions(text, {
    minLength: minQuestionLength,
    maxLength: maxQuestionLength,
    codeRanges,
  })

  // In strict mode, only keep higher-confidence types
  if (mode === 'strict') {
    questions = questions.filter(q =>
      q.matchType === 'qa_marker' ||
      q.matchType === 'numbered' ||
      q.matchType === 'heading'
    )
  }

  // If no questions found, try aggressive fallback
  if (questions.length === 0 && mode !== 'strict') {
    questions = detectQuestionsFallback(text, {
      minLength: minQuestionLength,
      maxLength: maxQuestionLength,
      codeRanges,
    })
  }

  // Step 3: For each question, detect answer boundary
  const candidates: ExtractedQaCandidate[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const nextQ = i + 1 < questions.length ? questions[i + 1] : null

    const boundaryMode = (mode === 'llm_assisted' || mode === 'hybrid' || mode === 'auto') ? 'loose' : mode
    const boundary = detectAnswerBoundary(
      text,
      q.endOffset,
      nextQ?.startOffset ?? null,
      boundaryMode
    )

    // Determine answer status
    const answerText = boundary.answerText.trim()
    const answerStatus: AnswerStatus = !answerText
      ? 'missing'
      : isPartialAnswer(answerText)
        ? 'partial'
        : 'present'

    // Normalize
    const normalizedQ = normalizeQuestion(q.text)
    const questionHash = generateQuestionHash(normalizedQ)

    // Classify topic
    const classificationText = `${q.text} ${answerText}`.slice(0, 500)
    const { category, confidence: topicConf } = classifyTopic(classificationText)

    // Extract tags
    const tags = extractTags(q.text, answerText)

    // Infer difficulty & frequency
    const { difficulty, frequency } = inferMetadata(q.text, answerText, category)

    // Score confidence — cap missing answers at 0.7
    const rawConfidence = scoreConfidence({
      matchType: q.matchType,
      hasExplicitAnswer: answerStatus === 'present',
      hasExplicitMarker: boundary.hasExplicitMarker,
      answerLength: answerText.length,
      questionLength: q.text.length,
      isMultiParagraph: boundary.isMultiParagraph,
      topicConfidence: topicConf,
      answerStatus,
    })
    const confidence = answerStatus === 'missing'
      ? Math.min(rawConfidence, 0.70)
      : rawConfidence

    if (confidence >= confidenceThreshold) {
      candidates.push({
        id: questionHash,
        question: normalizedQ,
        answer: answerText.slice(0, 5000),
        answerStatus,
        topic: category,
        tags,
        difficulty,
        frequency,
        confidence,
        extractionMethod: 'rule',
        normalizedQuestion: normalizedQ,
        questionHash,
        sourceDocumentId: documentId,
        startOffset: q.startOffset,
        endOffset: boundary.answerEnd,
        evidenceText: text.slice(q.startOffset, boundary.answerEnd).slice(0, 500),
      })
    }
  }

  // Step 4: Dedup within batch
  const deduped = dedupCandidates(candidates)

  // Step 5: Stats
  const stats = computeStats(deduped)

  return { candidates: deduped, stats }
}

function dedupCandidates(candidates: ExtractedQaCandidate[]): ExtractedQaCandidate[] {
  const seen = new Map<string, ExtractedQaCandidate>()

  for (const c of candidates) {
    const existing = seen.get(c.id)
    if (existing) {
      // Keep the one with higher confidence or longer answer
      if (c.confidence > existing.confidence ||
          (c.confidence === existing.confidence && c.answer.length > existing.answer.length)) {
        c.isDuplicateCandidate = true
        seen.set(c.id, c)
      } else {
        existing.isDuplicateCandidate = true
      }
    } else {
      seen.set(c.id, c)
    }
  }

  return Array.from(seen.values())
}

function computeStats(candidates: ExtractedQaCandidate[]): QaExtractionStats {
  return {
    totalCandidates: candidates.length,
    withAnswer: candidates.filter(c => c.answerStatus === 'present').length,
    missingAnswer: candidates.filter(c => c.answerStatus === 'missing').length,
    partialAnswer: candidates.filter(c => c.answerStatus === 'partial').length,
    duplicates: candidates.filter(c => c.isDuplicateCandidate).length,
    ruleExtracted: candidates.filter(c => c.extractionMethod === 'rule').length,
    llmExtracted: candidates.filter(c => c.extractionMethod === 'llm').length,
    highConfidence: candidates.filter(c => c.confidence >= 0.8).length,
    mediumConfidence: candidates.filter(c => c.confidence >= 0.6 && c.confidence < 0.8).length,
    lowConfidence: candidates.filter(c => c.confidence < 0.6).length,
  }
}

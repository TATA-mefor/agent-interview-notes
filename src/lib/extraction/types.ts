// ============================================================
// Extraction types — Q&A extraction from unstructured text
// ============================================================

// ---- Topic (fixed 6 categories, per design doc §5) ----
export type MindMapCategory =
  | '基础概念'
  | '核心模块'
  | '工作模式'
  | '架构设计'
  | '工程实践'
  | '评估与多Agent'

// ---- Extraction mode ----
export type ExtractionMode = 'auto' | 'strict' | 'loose' | 'llm_assisted' | 'hybrid'

// ---- Source type ----
export type QaSourceType =
  | 'markdown'
  | 'pdf_text'
  | 'txt'
  | 'web_clip'
  | 'manual_paste'

// ---- Answer status ----
export type AnswerStatus = 'present' | 'missing' | 'partial'

// ---- Extraction method ----
export type ExtractionMethod = 'rule' | 'llm' | 'hybrid'

// ---- Candidate (per design doc §4) ----
export interface ExtractedQaCandidate {
  id: string                          // questionHash

  question: string
  answer: string
  answerStatus: AnswerStatus

  topic: MindMapCategory
  tags: string[]

  difficulty: '初级' | '中级' | '高级'
  frequency: '高频' | '中频' | '低频'

  confidence: number                  // 0-1
  extractionMethod: ExtractionMethod

  normalizedQuestion: string
  questionHash: string

  sourceDocumentId?: string
  sourceChunkIndex?: number
  sourceType?: QaSourceType

  startOffset?: number
  endOffset?: number
  evidenceText?: string

  duplicateOfCandidateId?: string     // duplicate within this batch
  duplicateOfCardId?: string          // duplicate in existing cards
  isDuplicateCandidate?: boolean      // convenience flag

  warnings?: string[]
}

// ---- Extraction options (per design doc §22) ----
export interface QaExtractionOptions {
  mode?: ExtractionMode              // default 'strict'
  sourceType?: QaSourceType | string
  documentId?: string
  minQuestionLength?: number
  maxQuestionLength?: number
  minAnswerLength?: number
  minConfidence?: number             // default 0.5
  confidenceThreshold?: number       // alias for minConfidence
  enableLlm?: boolean
}

// ---- Extraction stats (per design doc §22) ----
export interface QaExtractionStats {
  totalCandidates: number
  withAnswer: number
  missingAnswer: number
  partialAnswer: number
  duplicates: number
  ruleExtracted: number
  llmExtracted: number
  highConfidence: number              // >= 0.8
  mediumConfidence: number            // 0.6-0.8
  lowConfidence: number               // < 0.6
}

// ---- Extraction result ----
export interface QaExtractionResult {
  candidates: ExtractedQaCandidate[]
  stats: QaExtractionStats
}

// ---- Confirm import ----
export interface QaConfirmOptions {
  importJobId?: string
  candidates: Array<{
    id: string
    question: string
    answer: string
    topic: MindMapCategory
    tags: string[]
    difficulty: '初级' | '中级' | '高级'
    frequency: '高频' | '中频' | '低频'
    questionHash: string
  }>
  duplicateStrategy: 'skip' | 'create_new'
}

// Matched region in source text
export interface QaMatch {
  question: string
  questionStart: number
  questionEnd: number
  answer: string
  answerStart: number
  answerEnd: number
  matchType: 'qa_marker' | 'heading' | 'numbered' | 'question_mark' | 'bullet' | 'llm'
  confidence: number
}

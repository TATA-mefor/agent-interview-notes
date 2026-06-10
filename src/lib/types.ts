// ============================================================
// Domain Types — Agent Interview Notes
// ============================================================

// ---- Enum Types ----
export type Difficulty = '初级' | '中级' | '高级'
export type Frequency = '高频' | '中频' | '低频'
export type RelationType = 'related' | 'prerequisite' | 'compare' | 'follow_up' | 'same_topic'
export type LinkSource = 'manual' | 'tag' | 'vector' | 'llm' | 'hybrid'
export type CardSource = 'manual' | 'csv_import' | 'json_import' | 'markdown_import'
export type SuggestionType = 'understanding' | 'related_questions' | 'review_plan' | 'tags' | 'mindmap'
export type AgentType = 'card_understanding' | 'related_question' | 'review_planner' | 'knowledge_import' | 'mindmap'
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ImportSourceType = 'csv' | 'json' | 'markdown' | 'obsidian' | 'logseq'
export type ImportStatus = 'pending' | 'parsing' | 'previewing' | 'importing' | 'completed' | 'failed' | 'cancelled'
export type KnowledgeDocType = 'pdf' | 'markdown' | 'txt' | 'web' | 'other'
export type KnowledgeDocStatus = 'processing' | 'ready' | 'error'
export type TaskType = 'review' | 'retest' | 'cram'

// ---- Card (核心实体) ----
export interface Card {
  id: string
  question_hash: string | null
  topic: string
  question: string
  answer: string
  // Markdown notes
  personal_notes: string
  extended_notes: string
  interview_script: string
  common_mistakes: string
  references_links: string
  // Interview attributes
  difficulty: Difficulty
  frequency: Frequency
  mastery: number              // 0–1
  // Review attributes
  review_count: number
  last_review: string | null
  next_review_date: string | null
  probability_weight: number
  review_priority: number
  manual_boost: number         // 0–1
  // Tags & metadata
  tags: string[]
  source: CardSource
  ai_summary: string
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CardInput {
  id?: string
  topic: string
  question: string
  answer?: string
  personal_notes?: string
  extended_notes?: string
  interview_script?: string
  common_mistakes?: string
  references_links?: string
  difficulty?: Difficulty
  frequency?: Frequency
  mastery?: number
  tags?: string[]
  source?: CardSource
}

export interface CardUpdate {
  topic?: string
  question?: string
  answer?: string
  personal_notes?: string
  extended_notes?: string
  interview_script?: string
  common_mistakes?: string
  references_links?: string
  difficulty?: Difficulty
  frequency?: Frequency
  mastery?: number
  manual_boost?: number
  probability_weight?: number
  review_priority?: number
  review_count?: number
  last_review?: string
  next_review_date?: string
  tags?: string[]
  ai_summary?: string
}

// ---- CardLink (卡片关联) ----
export interface CardLink {
  id: string
  from_card_id: string
  to_card_id: string
  relation_type: RelationType
  reason: string
  score: number                 // 0–1
  source: LinkSource
  created_at: string
  updated_at: string
}

export interface CardLinkInput {
  from_card_id: string
  to_card_id: string
  relation_type: RelationType
  reason?: string
  score?: number
  source?: LinkSource
}

// ---- CardVersion (卡片版本) ----
export interface CardVersion {
  id: string
  card_id: string
  version_number: number
  snapshot: Card                // 完整卡片快照
  change_summary: string
  created_at: string
}

// ---- ReviewLog (复习日志) ----
export interface ReviewLog {
  id: string
  card_id: string
  review_date: string
  mastery_before: number
  mastery_after: number
  notes: string
  review_duration_seconds: number | null
  created_at: string
}

export interface ReviewLogInput {
  card_id: string
  mastery_before: number
  mastery_after: number
  notes?: string
  review_duration_seconds?: number
}

// ---- ReviewTask (复习任务) ----
export interface ReviewTask {
  id: string
  card_id: string
  scheduled_date: string        // YYYY-MM-DD
  completed: boolean
  completed_at: string | null
  priority_score: number
  task_type: TaskType
  notes: string
  created_at: string
  updated_at: string
}

export interface ReviewTaskInput {
  card_id: string
  scheduled_date: string
  priority_score?: number
  task_type?: TaskType
  notes?: string
}

// ---- KnowledgeDocument (知识文档) ----
export interface KnowledgeDocument {
  id: string
  title: string
  source: string
  file_type: KnowledgeDocType
  content: string
  chunk_count: number
  status: KnowledgeDocStatus
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface KnowledgeDocumentInput {
  title: string
  source?: string
  file_type?: KnowledgeDocType
  content: string
  status?: KnowledgeDocStatus
  metadata?: Record<string, unknown>
}

// ---- KnowledgeChunk (知识文档切块) ----
export interface KnowledgeChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  embedding: number[] | null     // vector(1536)
  token_count: number | null
  metadata: Record<string, unknown>
  created_at: string
}

// ---- LlmSuggestion (AI 建议) ----
export interface LlmSuggestion {
  id: string
  card_id: string | null
  suggestion_type: SuggestionType
  input_context: Record<string, unknown>
  output_content: Record<string, unknown>
  accepted: boolean
  accepted_fields: string[]
  provider: string
  model: string
  tokens_used: number
  created_at: string
}

/** Source reference from RAG retrieval */
export interface SourceReference {
  chunkId: string
  documentId: string
  documentTitle: string
  breadcrumb: string
  score: number
  source: 'vector' | 'keyword' | 'hybrid'
}

/** AI Understanding output — never auto-apply to user notes */
export interface AIUnderstandingOutput {
  standard_answer: string
  key_points: string[]
  extended_notes: string
  interview_script: string
  common_mistakes: string[]
  suggested_tags: string[]
  suggested_difficulty: Difficulty
  suggested_frequency: Frequency
  related_question_ids: string[]
  /** RAG sources used to generate this answer */
  sources?: SourceReference[]
}

// ---- AgentRun (Agent 运行记录) ----
export interface AgentRun {
  id: string
  agent_type: AgentType
  status: AgentStatus
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  provider: string
  model: string
  tokens_used: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

// ---- ImportJob (导入任务) ----
export interface ImportJob {
  id: string
  source_type: ImportSourceType
  file_name: string
  status: ImportStatus
  total_rows: number
  imported_rows: number
  skipped_rows: number
  duplicate_rows: number
  error_rows: number
  result_summary: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ---- AppSetting (应用设置) ----
export interface AppSetting {
  key: string
  value: Record<string, unknown>
  description: string
  updated_at: string
}

// ---- Review Formula Types ----
export interface ReviewFormulaParams {
  difficulty: Difficulty
  frequency: Frequency
  mastery: number
  days_since_last_review: number
  manual_boost: number
}

export interface ReviewFormulaResult {
  base_weight: number
  forgetting_factor: number
  review_priority: number
}

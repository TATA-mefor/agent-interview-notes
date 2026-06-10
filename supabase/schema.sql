-- ============================================================
-- Agent Interview Notes — Database Schema
-- PostgreSQL + pgvector
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. cards — 面试题目卡片（核心实体）
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  question_hash TEXT UNIQUE,                          -- SHA256 hash for dedup
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  -- Markdown notes
  personal_notes TEXT NOT NULL DEFAULT '',            -- 个人笔记 (Markdown)
  extended_notes TEXT NOT NULL DEFAULT '',            -- 扩展知识
  interview_script TEXT NOT NULL DEFAULT '',          -- 面试话术
  common_mistakes TEXT NOT NULL DEFAULT '',           -- 易错点
  references_links TEXT NOT NULL DEFAULT '',          -- 参考资料链接
  -- Interview attributes
  difficulty TEXT NOT NULL CHECK (difficulty IN ('初级', '中级', '高级')),
  frequency TEXT NOT NULL CHECK (frequency IN ('高频', '中频', '低频')),
  mastery NUMERIC(4,3) NOT NULL DEFAULT 0.2 CHECK (mastery >= 0 AND mastery <= 1),
  -- Review attributes
  review_count INTEGER NOT NULL DEFAULT 0,
  last_review TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  probability_weight NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  review_priority NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  manual_boost NUMERIC(4,3) NOT NULL DEFAULT 0.0 CHECK (manual_boost >= 0 AND manual_boost <= 1),
  -- Tags & metadata
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',              -- manual / csv_import / json_import / markdown_import
  ai_summary TEXT NOT NULL DEFAULT '',                -- AI 生成的摘要
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. card_links — 卡片关联关系
-- ============================================================
CREATE TABLE IF NOT EXISTS card_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  to_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'related', 'prerequisite', 'compare', 'follow_up', 'same_topic'
  )),
  reason TEXT NOT NULL DEFAULT '',                    -- 关联原因说明
  score NUMERIC(4,3) DEFAULT 0.0,                     -- 关联强度 0-1
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual', 'tag', 'vector', 'llm', 'hybrid'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_card_id, to_card_id, relation_type)
);

-- ============================================================
-- 3. card_versions — 卡片编辑版本历史
-- ============================================================
CREATE TABLE IF NOT EXISTS card_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,                            -- 完整卡片快照
  change_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_versions_card ON card_versions(card_id, version_number DESC);

-- ============================================================
-- 4. review_log — 复习日志
-- ============================================================
CREATE TABLE IF NOT EXISTS review_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mastery_before NUMERIC(4,3) NOT NULL,
  mastery_after NUMERIC(4,3) NOT NULL CHECK (mastery_after >= 0 AND mastery_after <= 1),
  notes TEXT NOT NULL DEFAULT '',                     -- 复习备注
  review_duration_seconds INTEGER,                    -- 复习耗时（秒）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. review_tasks — 复习任务计划
-- ============================================================
CREATE TABLE IF NOT EXISTS review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority_score NUMERIC(6,4) NOT NULL DEFAULT 0.0,
  task_type TEXT NOT NULL DEFAULT 'review' CHECK (task_type IN (
    'review', 'retest', 'cram'
  )),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_tasks_card ON review_tasks(card_id);
CREATE INDEX IF NOT EXISTS idx_review_tasks_date ON review_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_review_tasks_completed ON review_tasks(card_id, scheduled_date, completed);

-- ============================================================
-- 6. knowledge_documents — 知识库文档
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',                    -- 文件来源路径或 URL
  file_type TEXT NOT NULL DEFAULT 'markdown' CHECK (file_type IN (
    'pdf', 'markdown', 'txt', 'web', 'other'
  )),
  content TEXT NOT NULL DEFAULT '',                   -- 原始全文
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN (
    'processing', 'ready', 'error'
  )),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. knowledge_chunks — 文档切块 + embedding
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),                             -- OpenAI ada-002: 1536 dims
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);

-- HNSW index for vector similarity search (better QPS/latency than IVFFlat for medium-scale data)
-- Requires pgvector 0.5.0+. Falls back to sequential scan if not supported.
-- CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
--   ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 200);

-- IVFFlat fallback (for pgvector < 0.5.0 or explicit choice)
-- Uncomment one based on your pgvector version:
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search column for BM25-style keyword retrieval
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts
  ON knowledge_chunks USING GIN(fts);

-- ============================================================
-- 8. llm_suggestions — AI 建议记录（不可自动覆盖用户数据）
-- ============================================================
CREATE TABLE IF NOT EXISTS llm_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'understanding', 'related_questions', 'review_plan', 'tags', 'mindmap'
  )),
  input_context JSONB NOT NULL DEFAULT '{}',          -- 发送给 LLM 的上下文
  output_content JSONB NOT NULL DEFAULT '{}',         -- LLM 返回的完整建议
  accepted BOOLEAN NOT NULL DEFAULT FALSE,            -- 用户是否已采纳
  accepted_fields TEXT[] NOT NULL DEFAULT '{}',       -- 用户采纳了哪些字段
  provider TEXT NOT NULL DEFAULT '',                  -- deepseek / openai / zhipu / ollama
  model TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_suggestions_card ON llm_suggestions(card_id);

-- ============================================================
-- 9. agent_runs — Agent 运行记录
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'card_understanding', 'related_question', 'review_planner',
    'knowledge_import', 'mindmap'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled'
  )),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_type ON agent_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at DESC);

-- ============================================================
-- 10. import_jobs — 批量导入任务
-- ============================================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'csv', 'json', 'markdown', 'obsidian', 'logseq'
  )),
  file_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'parsing', 'previewing', 'importing', 'completed', 'failed', 'cancelled'
  )),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  result_summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. app_settings — 应用设置键值存储
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cards_topic ON cards(topic);
CREATE INDEX IF NOT EXISTS idx_cards_difficulty ON cards(difficulty);
CREATE INDEX IF NOT EXISTS idx_cards_frequency ON cards(frequency);
CREATE INDEX IF NOT EXISTS idx_cards_mastery ON cards(mastery);
CREATE INDEX IF NOT EXISTS idx_cards_probability_weight ON cards(probability_weight DESC);
CREATE INDEX IF NOT EXISTS idx_cards_review_priority ON cards(review_priority DESC);
CREATE INDEX IF NOT EXISTS idx_cards_tags ON cards USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_cards_question_hash ON cards(question_hash);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_date);

CREATE INDEX IF NOT EXISTS idx_card_links_from ON card_links(from_card_id);
CREATE INDEX IF NOT EXISTS idx_card_links_to ON card_links(to_card_id);
CREATE INDEX IF NOT EXISTS idx_card_links_type ON card_links(from_card_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_review_log_card ON review_log(card_id);
CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(review_date DESC);

-- ============================================================
-- Updated_at trigger (applied to all mutable tables)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to mutable tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['cards', 'card_links', 'review_tasks', 'knowledge_documents', 'import_jobs', 'app_settings'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Helper: auto-compute question_hash on insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION set_question_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.question_hash = encode(digest(NEW.question, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_question_hash_trigger ON cards;
CREATE TRIGGER set_question_hash_trigger
  BEFORE INSERT OR UPDATE OF question ON cards
  FOR EACH ROW
  EXECUTE FUNCTION set_question_hash();

-- ============================================================
-- RPC: search_chunks — Vector-only ANN search
-- ============================================================
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  document_title text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kd.title AS document_title,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::float AS similarity,
    kc.metadata
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- RPC: search_chunks_hybrid — Hybrid search (vector + BM25)
-- ============================================================
CREATE OR REPLACE FUNCTION search_chunks_hybrid(
  query_embedding vector(1536),
  query_text text,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  document_title text,
  content text,
  similarity float,
  vector_score float,
  keyword_score float,
  source text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_hits AS (
    SELECT
      kc.id,
      kc.document_id,
      kd.title AS document_title,
      kc.content,
      (1 - (kc.embedding <=> query_embedding))::float AS vs,
      kc.metadata
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE kc.embedding IS NOT NULL
      AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ),
  keyword_hits AS (
    SELECT
      kc.id,
      ts_rank(kc.fts, websearch_to_tsquery('simple', query_text)) AS ks
    FROM knowledge_chunks kc
    WHERE kc.fts @@ websearch_to_tsquery('simple', query_text)
  ),
  merged AS (
    SELECT
      v.id,
      v.document_id,
      v.document_title,
      v.content,
      v.vs,
      COALESCE(k.ks, 0) AS ks,
      v.metadata
    FROM vector_hits v
    FULL OUTER JOIN keyword_hits k ON k.id = v.id
  )
  SELECT
    m.id,
    m.document_id,
    m.document_title,
    m.content,
    (COALESCE(m.vs, 0) * vector_weight + COALESCE(m.ks, 0) * keyword_weight)::float AS similarity,
    COALESCE(m.vs, 0)::float AS vector_score,
    COALESCE(m.ks, 0)::float AS keyword_score,
    CASE
      WHEN m.vs IS NOT NULL AND m.ks > 0 THEN 'hybrid'
      WHEN m.vs IS NOT NULL THEN 'vector'
      ELSE 'keyword'
    END AS source,
    m.metadata
  FROM merged m
  WHERE (COALESCE(m.vs, 0) * vector_weight + COALESCE(m.ks, 0) * keyword_weight) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

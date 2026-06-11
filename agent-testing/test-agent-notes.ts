/**
 * Agent 面试笔记系统 — 系统测试证据输入
 * =============================================
 * 本文件基于 agent-testing 框架，用项目的真实需求、架构和代码审查发现，
 * 构造一个实际的系统测试输入，然后跑一遍测试编排器。
 *
 * 运行方式：npx ts-node --esm test-agent-notes.ts
 * 或者直接 import 后在 Node/tsx 中运行。
 */

import {
  runTestLeadOrchestration,
  // 也可以直接用 E2E:
  // runSmallNoteEndToEndDemo,
  // validateEndToEndDemoResult,
  type TestLeadOrchestrationInput,
} from './src';

// ============================================================
// 1. 从项目 README + PRODUCT_PLAN 提取的需求文本
// ============================================================
const requirementsText = [
  // --- Card CRUD（核心）---
  '系统必须支持面试题卡片的创建、查看、编辑、删除和复制操作。',
  '每张卡片需要包含：题目、主题、答案、难度（初级/中级/高级）、频率（高频/中频/低频）、掌握度（0-1）。',
  '卡片需要支持 Markdown 笔记字段：个人笔记、扩展知识、面试话术、易错点、参考资料。',
  '卡片需要支持标签（tags）和来源标记（manual/csv_import/json_import/markdown_import）。',
  '卡片创建时自动生成唯一 ID 和问题哈希（SHA256），用于去重。',

  // --- 批量导入 ---
  '系统必须支持 CSV、JSON、Markdown 格式的题目批量导入。',
  '系统应该支持 Word (.docx) 和 PDF 格式的文档导入和题目抽取。',
  '导入流程需要包含：上传 → 解析 → 预览 → 去重 → 用户确认 → 入库。',
  '导入时需要对重复题目进行检测和跳过。',

  // --- AI 智能理解 ---
  '系统应该支持基于 LLM 的卡片智能理解功能，生成标准答案、要点、话术、易错点、标签和关联题建议。',
  'AI 建议只作为建议稿存储在 llm_suggestions 表，用户手动采纳，绝不自动覆盖用户数据。',
  '系统需要支持多种 LLM 供应商：Dify、DeepSeek、OpenAI、智谱 AI、Ollama。',
  '未配置 LLM API Key 时系统仍可启动，基础 CRUD 功能不受影响。',

  // --- RAG 知识库 ---
  '系统必须支持知识文档的上传、切块、embedding 向量化和存储。',
  '系统需要支持基于 pgvector 的关键词检索、向量检索和混合检索（向量 + BM25）。',
  '知识库文档支持 PDF、Markdown、TXT、网页文本等格式。',

  // --- 关系图谱与思维导图 ---
  '系统需要支持卡片之间的关联关系（related、prerequisite、compare、follow_up、same_topic）。',
  '系统应该提供基于 React Flow 的关系图谱可视化和基于 Mermaid/Markmap 的思维导图。',

  // --- 复习计划 ---
  '系统必须提供基于概率权重的复习计划：综合难度、频率、掌握度、遗忘因子和人工加权。',
  '系统需要支持复习日志记录、复习任务调度、甘特图展示。',
  '复习算法核心公式：review_priority = base_weight × 0.7 + forgetting_factor × 0.2 + manual_boost × 0.1。',

  // --- 本地部署 ---
  '系统需要支持 Docker Compose 一键启动（Web + PostgreSQL + pgvector + 可选 Ollama）。',
  '系统必须支持本地优先运行，基础 CRUD 不依赖外部 LLM。',
  'The system must support PWA installation on mobile devices for review-on-the-go.',
  '系统页面需要遵循 API Route → Service → Repository → Database 的分层架构。',

  // --- 数据库 ---
  '系统使用 PostgreSQL + pgvector，包含 11 张业务表：cards、card_links、card_versions、review_log、review_tasks、knowledge_documents、knowledge_chunks、llm_suggestions、agent_runs、import_jobs、app_settings。',
  'cards 表需要自动维护 question_hash（SHA256）和 updated_at 触发器。',

  // --- 安全与数据保护 ---
  '环境变量文件（.env）中的 API Key 和密钥不应提交到 Git 仓库。',
  'AI 输出不能自动覆盖用户手动编辑的笔记内容。',
  '系统部署到公网前需要额外增加认证或访问控制。',
].join('\n');

// ============================================================
// 2. 模块清单
// ============================================================
const modules = [
  'card_crud',
  'batch_import',
  'markdown_notes',
  'ai_understanding',
  'rag_knowledge_base',
  'relationship_graph',
  'mind_map',
  'review_plan',
  'docker_deployment',
  'pwa_mobile',
  'database_schema',
  'llm_provider_abstraction',
  'environment_security',
];

// ============================================================
// 3. 运维画像（基于实际部署配置）
// ============================================================
const opsProfile = {
  targetSystemName: 'Agent Interview Notes',
  targetSystemType: 'web_app',
  deploymentMode: 'docker_compose' as const,
  userScale: 'team_10_30' as const,
  modules,
  hasAuthentication: false,        // 本地优先，无登录系统
  hasAuthorization: false,         // 无多用户权限
  hasFileUpload: true,             // 知识文档 + 导入文件上传
  hasSearch: true,                 // 卡片搜索 + RAG 混合检索
  hasBackup: true,                 // 有 backup-db.sh 脚本
  hasRestore: true,                // 有 restore-db.sh 脚本
  hasLogging: false,               // 无结构化日志系统
  hasMonitoring: false,            // 无监控
  hasPublicAccess: false,          // 默认无公网访问
  hasDatabase: true,               // PostgreSQL + pgvector
  hasExternalStorage: false,       // 无外部存储
  hasMultiUserUsage: false,        // 单用户
  hasAdminRole: false,             // 无管理员角色
  knownOpsRisks: [
    '无认证系统：任何能访问 localhost:3000 或局域网 IP 的人都能操作所有数据',
    '无结构化日志：故障排查依赖控制台输出和数据库直接查询',
    '备份脚本存在但无自动调度（需手动执行）',
    '无健康检查端点（/api/health 不存在）',
    '无数据库迁移工具（依赖手动执行 SQL 脚本）',
  ],
};

// ============================================================
// 4. 原始证据（基于代码审查 + 项目文件检查 + README 验证）
// ============================================================
const rawEvidence = [
  // --- Pass 证据：架构设计 ---
  {
    id: 'EV-AGN-ARCHITECTURE-LAYERING',
    testCaseId: 'TC-AGN-ARCHITECTURE',
    testScope: 'architecture layering',
    executionMethod: 'code review — verified API Route → Service → Repository pattern',
    executorType: 'human' as const,
    rawResult: 'pass' as const,
    evidenceSource: 'src/lib/services/cardService.ts, src/lib/repositories/cardRepository.ts, src/app/api/cards/route.ts',
    evidenceSummary:
      '代码审查确认：API 层 (route.ts) → Service 层 (cardService.ts) → Repository 层 (cardRepository.ts) 三层分离清晰。API 层只做参数解析和 HTTP 状态码，Service 层处理业务逻辑（版本快照、权重计算），Repository 层封装数据库查询。符合架构设计文档。',
    observedAt: '2026-06-11T10:00:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none' as const,
    confidence: 'high' as const,
    limitations: ['未覆盖所有 API 路由的分层检查。'],
  },

  // --- Pass 证据：数据库 Schema ---
  {
    id: 'EV-AGN-DB-SCHEMA',
    testCaseId: 'TC-AGN-DATABASE',
    testScope: 'database schema design',
    executionMethod: 'code review — verified supabase/schema.sql',
    executorType: 'human' as const,
    rawResult: 'pass' as const,
    evidenceSource: 'supabase/schema.sql (429 lines)',
    evidenceSummary:
      '数据库 schema 包含 11 张业务表，PGcrypto + pgvector 扩展，IVFFlat 向量索引，GIN 全文搜索索引，HNSW 备选方案注释，自动化 updated_at 触发器，question_hash SHA256 触发函数，以及 search_chunks / search_chunks_hybrid 两个 RPC 函数。表设计符合 PRODUT_PLAN 描述。',
    observedAt: '2026-06-11T10:05:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none' as const,
    confidence: 'high' as const,
    limitations: ['Schema 正确性未经实际数据库创建和迁移验证。'],
  },

  // --- Pass 证据：LLM 供应商抽象 ---
  {
    id: 'EV-AGN-LLM-ABSTRACTION',
    testCaseId: 'TC-AGN-LLM',
    testScope: 'LLM provider abstraction',
    executionMethod: 'code review — verified src/lib/llm.ts',
    executorType: 'human' as const,
    rawResult: 'pass' as const,
    evidenceSource: 'src/lib/llm.ts (209 lines)',
    evidenceSummary:
      'LLM 供应商抽象支持 Dify、DeepSeek、OpenAI、智谱 AI、Ollama、Qwen 6 种供应商。优先级：DB 配置 > 环境变量 > 自动检测。isLlmConfigured() 函数提供 LLM 可用性检查。结构化输出和流式响应均已实现。',
    observedAt: '2026-06-11T10:10:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none' as const,
    confidence: 'high' as const,
    limitations: ['未对 6 种供应商逐一做真实 API 调用验证。'],
  },

  // --- Pass 证据：Docker 部署配置 ---
  {
    id: 'EV-AGN-DOCKER-DEPLOY',
    testCaseId: 'TC-AGN-DEPLOYMENT',
    testScope: 'docker compose deployment',
    executionMethod: 'code review — docker-compose.yml + Dockerfile',
    executorType: 'human' as const,
    rawResult: 'pass' as const,
    evidenceSource: 'docker-compose.yml (99 lines), Dockerfile (29 lines)',
    evidenceSummary:
      'Docker Compose 配置包含 5 个服务：postgres (pgvector)、postgrest、supabase-proxy (nginx)、app (Next.js)、ollama (可选 profile)。Dockerfile 使用 node:18-alpine 多阶段构建。支持通过 --profile ollama 可选启动本地 LLM。',
    observedAt: '2026-06-11T10:15:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none' as const,
    confidence: 'high' as const,
    limitations: ['未执行 docker compose up 验证容器启动成功。'],
  },

  // --- P0 阻断：.env 文件被提交到 Git ---
  {
    id: 'EV-AGN-ENV-LEAK',
    testCaseId: 'TC-AGN-SECURITY',
    testScope: 'environment variable security',
    executionMethod: 'git log + file presence check',
    executorType: 'human' as const,
    rawResult: 'fail' as const,
    evidenceSource: '.env file in repository root (46 lines)',
    evidenceSummary:
      '.env 文件存在于仓库根目录且被 Git 追踪。文件包含：JWT_SECRET（硬编码的 HMAC-SHA256 密钥）、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY（有效 JWT）、POSTGRES_PASSWORD、DEEPSEEK_API_KEY 等敏感信息。虽然 .gitignore 未列出 .env，但文件已被 Git 追踪。commit 09fa5db "初始化项目" 中包含了 .env 文件。',
    observedAt: '2026-06-11T10:20:00.000Z',
    environment: { name: 'git-repository', commit: '215cdfe' },
    severity: 'P0' as const,
    confidence: 'high' as const,
    limitations: [
      '需确认这是否是已知的测试环境密钥或是否是真实生产密钥。',
      '即使重新生成密钥，历史 commit 中仍包含旧密钥（需要 git filter-branch 或 BFG 清理）。',
    ],
  },

  // --- P1 高风险：无认证系统 ---
  {
    id: 'EV-AGN-NO-AUTH',
    testCaseId: 'TC-AGN-AUTH',
    testScope: 'authentication and access control',
    executionMethod: 'code review — no auth middleware, no login page',
    executorType: 'human' as const,
    rawResult: 'fail' as const,
    evidenceSource: 'Full codebase search: no auth middleware, no session, no login API',
    evidenceSummary:
      '整个应用没有任何认证机制。所有 API 路由均为公开访问。README 和 PRODUCT_PLAN 中均提到\'本地优先\'和\'部署到公网前需额外增加认证\'，但当前代码层面完全没有认证基础设施。对于局域网使用场景可接受，但如果部署到公网则存在严重安全风险。',
    observedAt: '2026-06-11T10:25:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P1' as const,
    confidence: 'high' as const,
    limitations: ['产品定位是本地优先，认证在路线图中属于\'部署到公网前\'的前置条件。'],
  },

  // --- P2 问题：无数据库迁移工具 ---
  {
    id: 'EV-AGN-NO-MIGRATIONS',
    testCaseId: 'TC-AGN-DB-MIGRATIONS',
    testScope: 'database migration management',
    executionMethod: 'code review — no migration tool found',
    executorType: 'human' as const,
    rawResult: 'fail' as const,
    evidenceSource: 'package.json: no prisma, drizzle, knex, or other migration dependency',
    evidenceSummary:
      'package.json 中没有数据库迁移工具（无 Prisma、Drizzle、Knex、node-pg-migrate 等）。schema 变更依赖手动执行 supabase/schema.sql。缺少迁移版本管理和回滚能力。对于 prototype/个人使用可接受，但对于多人协作或持续部署存在风险。',
    observedAt: '2026-06-11T10:30:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P2' as const,
    confidence: 'high' as const,
    limitations: ['当前为 0.1.0 早期版本，schema 变动频率低，手动迁移影响较小。'],
  },

  // --- P2 问题：无结构化日志 ---
  {
    id: 'EV-AGN-NO-LOGGING',
    testCaseId: 'TC-AGN-LOGGING',
    testScope: 'structured logging and error tracking',
    executionMethod: 'code review — grep for logging patterns',
    executorType: 'human' as const,
    rawResult: 'fail' as const,
    evidenceSource: 'src/ directory: only console.error in cardService.ts saveVersionSnapshot',
    evidenceSummary:
      '整个应用仅有一处 console.error 日志（版本快照保存失败）。无统一日志模块、无请求日志、无错误追踪、无日志级别管理。故障排查完全依赖数据库查询和浏览器 DevTools。',
    observedAt: '2026-06-11T10:35:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P2' as const,
    confidence: 'high' as const,
    limitations: ['产品定位为个人使用，结构化日志优先级可排后。'],
  },

  // --- inconclusive：备份恢复未经验证 ---
  {
    id: 'EV-AGN-BACKUP-UNTESTED',
    testCaseId: 'TC-AGN-BACKUP-RESTORE',
    testScope: 'backup and restore procedure',
    executionMethod: 'code review — scripts exist but not executed',
    executorType: 'human' as const,
    rawResult: 'inconclusive' as const,
    evidenceSource: 'scripts/backup-db.sh and scripts/restore-db.sh',
    evidenceSummary:
      '备份脚本 (backup-db.sh) 和恢复脚本 (restore-db.sh) 存在，但未实际执行验证。不确定备份文件格式是否正确、恢复是否能成功还原包含 pgvector 索引的完整数据库。README 中有使用示例但未经测试验证。',
    observedAt: '2026-06-11T10:40:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'unknown' as const,
    confidence: 'low' as const,
    limitations: ['脚本存在但不能证明恢复功能正常。需实际执行一次完整的备份-恢复循环。'],
  },

  // --- Agent 推理（应被降级）：卡片 CRUD 质量 ---
  {
    id: 'EV-AGN-CRUD-QUALITY-AGENT',
    testCaseId: 'TC-AGN-CARD-CRUD',
    testScope: 'card CRUD completeness',
    executionMethod: 'agent reasoning over code structure',
    executorType: 'agent_reasoning' as const,
    rawResult: 'pass' as const,
    evidenceSource: 'Agent analysis of src/lib/services/cardService.ts',
    evidenceSummary:
      'Agent 分析认为 Card Service 设计良好：create 有 ID 生成和权重计算，update 有版本快照和权重重算，delete 有最终快照保存，duplicate 有掌握度重置。代码结构清晰，错误处理完整。',
    observedAt: '2026-06-11T10:45:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none' as const,
    confidence: 'low' as const,
    limitations: [
      '这是 agent_reasoning 类型的证据，应被 evidence normalization 降级。',
      '未经过实际数据库操作测试验证。',
    ],
  },

  // --- blocked：前端测试缺失 ---
  {
    id: 'EV-AGN-NO-FRONTEND-TESTS',
    testCaseId: 'TC-AGN-TESTING',
    testScope: 'frontend and integration testing',
    executionMethod: 'code review — no test files found',
    executorType: 'human' as const,
    rawResult: 'blocked' as const,
    evidenceSource: 'package.json: no jest, vitest, playwright, cypress, or testing-library',
    evidenceSummary:
      'package.json 中没有测试框架依赖。没有找到任何测试文件（.test.ts、.spec.ts、__tests__/）。前端组件和后端 API 均无自动化测试覆盖。阻碍持续集成和质量保证。',
    observedAt: '2026-06-11T10:50:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P1' as const,
    confidence: 'high' as const,
    limitations: [
      '0.1.0 早期阶段，测试策略可能在后续计划中。',
      'blocked 状态表示这是质量保障的基础设施缺失，需要在后续迭代中解决。',
    ],
  },
];

// ============================================================
// 5. 已知缺陷（基于代码审查发现）
// ============================================================
const existingDefects = [
  {
    id: 'BUG-AGN-ENV-IN-GIT',
    testCaseId: 'TC-AGN-SECURITY',
    title: '.env 文件含真实密钥并提交到 Git 仓库',
    actualResult: '.env 文件被 Git 追踪，包含 JWT_SECRET、SUPABASE 密钥、数据库密码。commit 09fa5db 和后续 commit 均包含此文件。',
    expectedResult: '.env 文件应该在 .gitignore 中，所有密钥应该只存在于 .env.example 模板。历史 commit 不应包含任何真实密钥。',
    severity: 'P0' as const,
    affectedArea: 'security configuration',
    suspectedLayer: 'configuration' as const,
    evidenceIds: ['EV-AGN-ENV-LEAK'],
    recommendation: '1) 立即轮换所有泄露的密钥；2) 将 .env 加入 .gitignore；3) 使用 git filter-branch 或 BFG Repo-Cleaner 清理历史 commit 中的敏感信息；4) 考虑使用 .env.local 作为本地覆盖。',
    status: 'open' as const,
  },
  {
    id: 'BUG-AGN-NO-AUTH-INFRA',
    testCaseId: 'TC-AGN-AUTH',
    title: '无认证基础设施 — 所有 API 公开访问',
    actualResult: '任何能访问应用 URL 的人都能操作所有卡片数据、导入、知识库和设置。无 session、token、oauth 或 basic auth。',
    expectedResult: '至少应有基本的访问控制。README 指出公网部署前需加认证，但当前无任何基础设施。',
    severity: 'P1' as const,
    affectedArea: 'security access control',
    suspectedLayer: 'backend' as const,
    evidenceIds: ['EV-AGN-NO-AUTH'],
    recommendation: '在计划公网部署时，建议先实现简单的 token-based 或 password-based 认证中间件。',
    status: 'open' as const,
  },
  {
    id: 'BUG-AGN-NO-TESTS',
    testCaseId: 'TC-AGN-TESTING',
    title: '无自动化测试 — 前端和后端均无测试覆盖',
    actualResult: 'package.json 无测试脚本，无测试框架依赖，无测试文件。所有质量保证依赖手动验证。',
    expectedResult: '至少应有单元测试覆盖核心 Service 逻辑和 API 路由。前端组件应有基本的渲染测试。',
    severity: 'P1' as const,
    affectedArea: 'quality assurance',
    suspectedLayer: 'deployment' as const,
    evidenceIds: ['EV-AGN-NO-FRONTEND-TESTS'],
    recommendation: '集成 vitest + @testing-library/react，优先覆盖 cardService 业务逻辑和后端 API 路由测试。',
    status: 'open' as const,
  },
  {
    id: 'BUG-AGN-NO-MIGRATIONS',
    testCaseId: 'TC-AGN-DB-MIGRATIONS',
    title: '无数据库迁移管理系统',
    actualResult: 'Schema 变更依赖手动执行 SQL 文件。无版本追踪、无回滚机制、无迁移锁。package.json 无 Prisma/Drizzle/Knex 依赖。',
    expectedResult: '应使用 Prisma Migrate / Drizzle Kit / node-pg-migrate 等工具管理数据库版本。',
    severity: 'P2' as const,
    affectedArea: 'database operations',
    suspectedLayer: 'database' as const,
    evidenceIds: ['EV-AGN-NO-MIGRATIONS'],
    recommendation: '评估引入 Prisma 或 Drizzle ORM 进行类型安全查询 + 自动迁移管理。当前 Supabase client 直接查询与 ORM 迁移可共存。',
    status: 'open' as const,
  },
  {
    id: 'BUG-AGN-NO-STRUCTURED-LOGS',
    testCaseId: 'TC-AGN-LOGGING',
    title: '无结构化日志 — 仅一处 console.error',
    actualResult: '全项目仅 cardService.ts 中的 saveVersionSnapshot 有 console.error。无请求日志、错误堆栈记录、日志级别或格式化输出。',
    expectedResult: '至少应有请求级别的日志中间件和错误日志持久化或聚合方案。',
    severity: 'P2' as const,
    affectedArea: 'observability',
    suspectedLayer: 'backend' as const,
    evidenceIds: ['EV-AGN-NO-LOGGING'],
    recommendation: '引入 pino 或 winston，添加 API 请求/响应日志中间件，用日志级别区分开发/生产环境。',
    status: 'open' as const,
  },
];

// ============================================================
// 6. 组装完整的编排输入
// ============================================================
export const agentNotesOrchestrationInput: TestLeadOrchestrationInput = {
  runId: 'agent-notes-system-test-001',
  targetSystemName: 'Agent Interview Notes',
  targetSystemType: 'web_app',
  systemDescription:
    'A local-first Agent engineering interview knowledge card system built with Next.js 14 + TypeScript + Tailwind CSS. Features include card CRUD, batch import (CSV/JSON/Markdown/Word/PDF), AI-powered understanding via LLM, RAG knowledge base with pgvector hybrid search, relationship graphs, mind maps, and probability-based review planning. Deployed via Docker Compose with PostgreSQL + pgvector + optional Ollama.',
  requirementsText,
  modules,
  contextSources: [
    'README.md',
    'docs/ARCHITECTURE.md',
    'docs/PRODUCT_PLAN.md',
    'supabase/schema.sql',
    'src/lib/services/cardService.ts',
    'src/lib/llm.ts',
    'docker-compose.yml',
    '.env (security review)',
    'package.json',
  ],
  knownConstraints: [
    'Local-first design: no authentication system (by design for local use)',
    'AI features require LLM API key configuration',
    'No test framework or CI pipeline configured',
    'No database migration tool (manual SQL scripts)',
    'PWA mobile review only, admin features desktop-first',
    '.env file tracked by Git (security risk identified)',
    'Version 0.1.0 — early stage, many features are in initial implementation',
    'Evidence is from static code review and documentation analysis, not runtime execution',
    'No live system was running during this test — all evidence is design-time verification',
  ],
  opsProfile,
  rawEvidence,
  existingDefects,
  notes: [
    'This test run is based on a comprehensive code review of the entire repository on 2026-06-11.',
    'Evidence items are from code structure analysis, git history, documentation cross-referencing, and configuration review.',
    'No runtime tests were executed — this is a design-time system test assessment.',
    'The agent_reasoning evidence (EV-AGN-CRUD-QUALITY-AGENT) is intentionally included to verify the downgrade logic.',
    'The .env file in Git is the most critical finding — immediate action required.',
  ],
  options: {
    includeOpsChecklist: true,
    includeNegativeCases: true,
    includePermissionChecks: true,
    generateReport: true,
    generateRegressionSuggestions: true,
    generateReleaseRecommendation: true,
  },
};

// ============================================================
// 7. 执行测试
// ============================================================
console.log('='.repeat(70));
console.log('Agent Interview Notes — 系统测试分析');
console.log('='.repeat(70));
console.log('');

const output = runTestLeadOrchestration(agentNotesOrchestrationInput);

// ---- 摘要 ----
console.log('📋 测试摘要');
console.log('-'.repeat(40));
console.log(`  Run ID: ${output.runId}`);
console.log(`  验收点: ${output.acceptancePoints.length}`);
console.log(`  测试用例: ${output.testCases.length}`);
console.log(`  证据条目: ${output.normalizedEvidence.length}`);
console.log(`  缺陷分析: ${output.defectAnalyses.length}`);
console.log(`  回归建议: ${output.regressionSuggestions.length}`);
console.log(`  运维检查项: ${output.opsChecklist.length}`);
console.log(`  未知项: ${output.unknowns.length}`);
console.log('');

// ---- 发布建议 ----
if (output.releaseRecommendation) {
  console.log('🚦 发布建议');
  console.log('-'.repeat(40));
  console.log(`  建议: ${output.releaseRecommendation.recommendation}`);
  console.log(`  阻断因素: ${output.releaseRecommendation.blockingFactors.length}`);
  output.releaseRecommendation.blockingFactors.forEach((bf, i) => {
    console.log(`    ${i + 1}. [${bf.type}] ${bf.reason}`);
  });
  console.log(`  证据缺口: ${output.releaseRecommendation.evidenceGaps.length}`);
  output.releaseRecommendation.evidenceGaps.forEach((gap, i) => {
    console.log(`    ${i + 1}. ${gap}`);
  });
  console.log('');
}

// ---- 严重性分类 ----
console.log('🔴 严重性分布');
console.log('-'.repeat(40));
const severityCounts: Record<string, number> = {};
output.severityClassifications.forEach((s) => {
  const sev = s.classification.severity;
  severityCounts[sev] = (severityCounts[sev] || 0) + 1;
});
Object.entries(severityCounts)
  .sort((a, b) => {
    const order = ['P0', 'P1', 'P2', 'P3', 'none', 'unknown'];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  })
  .forEach(([sev, count]) => {
    const emoji =
      sev === 'P0' ? '🔴' : sev === 'P1' ? '🟠' : sev === 'P2' ? '🟡' : sev === 'P3' ? '🟢' : '⚪';
    console.log(`  ${emoji} ${sev}: ${count}`);
  });
console.log('');

// ---- 证据强度分布 ----
console.log('📊 证据强度分布');
console.log('-'.repeat(40));
const strengthCounts: Record<string, number> = {};
output.normalizedEvidence.forEach((e) => {
  strengthCounts[e.strength] = (strengthCounts[e.strength] || 0) + 1;
});
Object.entries(strengthCounts).forEach(([strength, count]) => {
  console.log(`  ${strength}: ${count}`);
});
console.log('');

// ---- 审批需求 ----
console.log('✋ 需要人工审批的动作');
console.log('-'.repeat(40));
if (output.approvalRequiredActions.length === 0) {
  console.log('  (无)');
} else {
  output.approvalRequiredActions.forEach((action) => {
    console.log(`  [${action.blocking ? '阻断' : '非阻断'}] ${action.reason}`);
    console.log(`     负责人: ${action.recommendedOwner}`);
  });
}
console.log('');

// ---- 追踪步骤 ----
console.log('🔍 执行追踪');
console.log('-'.repeat(40));
output.trace.forEach((entry) => {
  const status = entry.success ? '✅' : '⚠️';
  console.log(`  ${status} ${entry.step}`);
  console.log(`     输入: ${entry.inputSummary}`);
  console.log(`     输出: ${entry.outputSummary}`);
  if (entry.issues.length > 0) {
    entry.issues.forEach((issue) => {
      console.log(`     ⚡ ${issue}`);
    });
  }
});
console.log('');

// ---- 运维检查清单摘要 ----
console.log('🛠️ 运维检查清单 (前 10 项)');
console.log('-'.repeat(40));
output.opsChecklist.slice(0, 10).forEach((item) => {
  const category = item.category || 'general';
  console.log(`  [${category}] ${item.title}`);
  if (item.releaseBlocking) console.log(`     🚫 阻断发布`);
  if (item.recommendedEvidence) console.log(`     📎 建议证据: ${item.recommendedEvidence}`);
});
if (output.opsChecklist.length > 10) {
  console.log(`  ... 还有 ${output.opsChecklist.length - 10} 项`);
}
console.log('');

// ---- 缺陷分析摘要 ----
console.log('🐛 缺陷分析');
console.log('-'.repeat(40));
output.defectAnalyses.forEach((da, i) => {
  console.log(`  ${i + 1}. ${da.title || '未命名缺陷'}`);
  console.log(`     疑似层级: ${da.suspectedLayer}`);
  console.log(`     根因类别: ${da.causeCategory}`);
  console.log(`     可能原因: ${da.possibleCause}`);
  console.log(`     修复建议: ${da.remediation}`);
});
console.log('');

// ---- 限制说明 ----
console.log('⚠️  限制说明 (前 10 条)');
console.log('-'.repeat(40));
output.limitations.slice(0, 10).forEach((lim, i) => {
  console.log(`  ${i + 1}. ${lim}`);
});
console.log('');

// ---- 审计事件草稿数 ----
console.log('📝 审计事件草稿');
console.log('-'.repeat(40));
console.log(`  总事件数: ${output.auditEventDrafts.length}`);
const eventTypes = output.auditEventDrafts.reduce((acc, e) => {
  acc[e.eventType] = (acc[e.eventType] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
Object.entries(eventTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// ---- 结论 ----
console.log('');
console.log('='.repeat(70));
console.log('测试结论');
console.log('='.repeat(70));
console.log(`  发布建议: ${output.releaseRecommendation?.recommendation || 'N/A'}`);
console.log(`  严重问题: P0 × ${severityCounts['P0'] || 0}, P1 × ${severityCounts['P1'] || 0}`);
console.log(`  证据强度: strong × ${strengthCounts['strong'] || 0}, medium × ${strengthCounts['medium'] || 0}, weak × ${strengthCounts['weak'] || 0}`);
console.log(`  需审批: ${output.approvalRequiredActions.length} 项`);
console.log('');

if (output.releaseRecommendation?.recommendation === 'blocked') {
  console.log('⛔ 当前版本不应发布！');
  console.log('   主要阻断因素：');
  const criticalReasons = [
    '1. .env 文件含真实密钥被提交到 Git — 需立即轮换密钥 + 清理历史',
    '2. 无认证系统 — 部署公网前必须解决',
    '3. 无自动化测试 — 缺少质量保障基础设施',
  ];
  criticalReasons.forEach((r) => console.log(`   ${r}`));
  console.log('');
  console.log('✅ 项目做得好的地方：');
  const strengths = [
    '• 清晰的分层架构 (API → Service → Repository → DB)',
    '• 完善的数据库 schema 设计 (11 表 + pgvector + 混合检索)',
    '• 多 LLM 供应商抽象层，设计优秀',
    '• Docker Compose 一键部署配置完整',
    '• AI 输出硬约束为"建议稿"，不自动覆盖用户数据',
    '• 代码风格统一，TypeScript 类型齐全',
  ];
  strengths.forEach((s) => console.log(`   ${s}`));
}

console.log('');
console.log('📄 完整报告建议通过 output.report 查看 Markdown 格式');

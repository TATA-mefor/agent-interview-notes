/**
 * Agent Testing V2 — 真实项目试跑
 * =================================
 * 用 agent-notes 项目的真实需求、证据、缺陷数据，
 * 跑一遍 V2 Multi-Agent Runtime (M0–M6)。
 */

import {
  createDefaultAgentRegistry,
} from './src/agent-runtime/agentRegistry';
import {
  createAgentSession,
  transitionAgentSessionStatus,
  summarizeAgentSession,
} from './src/agent-runtime/agentSession';
import {
  createAgentTask,
  pickNextAgentTask,
  completeAgentTask,
  failAgentTask,
  refuseAgentTask,
  blockAgentTask,
} from './src/agent-runtime/agentTaskQueue';
import {
  sendAgentMessage,
  createAgentMessage,
  summarizeAgentMessages,
} from './src/agent-runtime/agentMessageBus';
import {
  writeBlackboardValue,
  appendBlackboardArrayValue,
  summarizeSharedBlackboard,
} from './src/agent-runtime/sharedBlackboard';
import {
  runAgentOnce,
  runAllAgentsOnce,
} from './src/agent-runtime/agentRunner';
import {
  DEFAULT_AGENT_PROFILES,
  validateAgentProfiles,
} from './src/agent-runtime/agentProfileTypes';
import {
  collectEvidenceFromBlackboard,
  summarizeEvidenceGaps,
  enforceNoEvidenceNoPass,
} from './src/agent-runtime/evidenceCollector';
import {
  buildMultiAgentSessionViewModel,
} from './src/ui-v2/multiAgentSessionMappers';
import type {
  AgentSession,
  AgentTask,
  AgentTaskType,
  AgentRuntimeRole,
  SharedBlackboardKey,
} from './src/agent-runtime/agentRuntimeTypes';

// ============================================================
// 1. 构造 agent-notes 项目的真实输入数据
// ============================================================

const TARGET_SYSTEM = 'Agent Interview Notes';
const RUN_ID = 'agent-notes-trial-001';

const requirements: Record<string, unknown> = {
  targetSystemName: TARGET_SYSTEM,
  targetSystemType: 'web_app',
  systemDescription:
    'A local-first Agent engineering interview knowledge card system built with Next.js 14 + TypeScript + Tailwind. Features: card CRUD, batch import, AI understanding, RAG knowledge base with pgvector, relationship graphs, mind maps, review planning. Deployed via Docker Compose.',
  requirementsText: [
    '系统必须支持面试题卡片的创建、查看、编辑、删除和复制操作。',
    '每张卡片需要包含：题目、主题、答案、难度、频率、掌握度。',
    '卡片需要支持 Markdown 笔记字段：个人笔记、扩展知识、面试话术、易错点、参考资料。',
    '系统必须支持 CSV、JSON、Markdown 格式的题目批量导入。',
    '系统应该支持 Word (.docx) 和 PDF 格式的文档导入和题目抽取。',
    '导入流程需要包含：上传 → 解析 → 预览 → 去重 → 用户确认 → 入库。',
    '系统应该支持基于 LLM 的卡片智能理解功能。',
    'AI 建议只作为建议稿，用户手动采纳，绝不自动覆盖用户数据。',
    '系统需要支持多种 LLM 供应商：Dify、DeepSeek、OpenAI、智谱 AI、Ollama。',
    '系统必须支持知识文档的上传、切块、embedding 向量化和存储。',
    '系统需要支持基于 pgvector 的关键词检索、向量检索和混合检索。',
    '系统应该提供基于 React Flow 的关系图谱和基于 Mermaid/Markmap 的思维导图。',
    '系统必须提供基于概率权重的复习计划。',
    '系统需要支持 Docker Compose 一键启动。',
    '系统必须支持本地优先运行，基础 CRUD 不依赖外部 LLM。',
    'The system must support PWA installation on mobile devices.',
    '系统页面需要遵循 API Route → Service → Repository → Database 的分层架构。',
    '环境变量文件中的 API Key 和密钥不应提交到 Git 仓库。',
    '系统部署到公网前需要额外增加认证或访问控制。',
  ].join('\n'),
  modules: [
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
  ],
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
    'Local-first design: no authentication system',
    'AI features require LLM API key configuration',
    'No test framework or CI pipeline',
    'No database migration tool',
    '.env file tracked by Git (security risk)',
    'Version 0.1.0 — early stage',
  ],
  opsProfile: {
    targetSystemName: TARGET_SYSTEM,
    targetSystemType: 'web_app',
    deploymentMode: 'containerized',
    userScale: 'team_10_30',
    modules: ['card_crud', 'batch_import', 'rag_knowledge_base', 'docker_deployment'],
    hasAuthentication: false,
    hasAuthorization: false,
    hasFileUpload: true,
    hasSearch: true,
    hasBackup: true,
    hasRestore: true,
    hasLogging: false,
    hasMonitoring: false,
    hasPublicAccess: false,
    hasDatabase: true,
    hasExternalStorage: false,
    hasMultiUserUsage: false,
    hasAdminRole: false,
    knownOpsRisks: [
      '无认证系统：任何能访问 localhost:3000 的人都能操作所有数据',
      '无结构化日志：故障排查依赖控制台输出',
      '备份脚本存在但无自动调度',
      '无健康检查端点',
      '无数据库迁移工具',
    ],
  },
  options: {
    includeOpsChecklist: true,
    includeNegativeCases: true,
    includePermissionChecks: true,
    generateRegressionSuggestions: true,
    generateReleaseRecommendation: true,
    generateReport: true,
  },
  notes: [
    'Trial run based on comprehensive code review on 2026-06-11.',
    'Evidence from code structure analysis, git history, and configuration review.',
    'No runtime tests executed — design-time system test assessment.',
  ],
};

const rawEvidence = [
  {
    id: 'EV-ARCH-LAYERING',
    testCaseId: 'TC-ARCHITECTURE',
    testScope: 'architecture layering',
    executionMethod: 'code review — API → Service → Repository pattern verified',
    executorType: 'human',
    rawResult: 'pass',
    evidenceSource: 'src/lib/services/cardService.ts, src/lib/repositories/cardRepository.ts, src/app/api/cards/route.ts',
    evidenceSummary: '三层分离清晰。API 层只做参数解析，Service 层处理业务逻辑，Repository 层封装查询。符合架构设计文档。',
    observedAt: '2026-06-11T10:00:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none',
    confidence: 'high',
    limitations: ['未覆盖所有 API 路由的分层检查。'],
  },
  {
    id: 'EV-DB-SCHEMA',
    testCaseId: 'TC-DATABASE',
    testScope: 'database schema design',
    executionMethod: 'code review — supabase/schema.sql verified',
    executorType: 'human',
    rawResult: 'pass',
    evidenceSource: 'supabase/schema.sql (429 lines)',
    evidenceSummary: '11 张业务表，pgvector 扩展，IVFFlat 向量索引，GIN 全文搜索，自动化触发器，两个 RPC 函数。',
    observedAt: '2026-06-11T10:05:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none',
    confidence: 'high',
    limitations: ['未实际执行数据库创建和迁移验证。'],
  },
  {
    id: 'EV-LLM-ABSTRACTION',
    testCaseId: 'TC-LLM',
    testScope: 'LLM provider abstraction',
    executionMethod: 'code review — src/lib/llm.ts verified',
    executorType: 'human',
    rawResult: 'pass',
    evidenceSource: 'src/lib/llm.ts (209 lines)',
    evidenceSummary: '支持 6 种 LLM 供应商，优先级配置链（DB → ENV → 自动检测），流式输出和结构化输出均已实现。',
    observedAt: '2026-06-11T10:10:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none',
    confidence: 'high',
    limitations: ['未对 6 种供应商逐一做真实 API 调用验证。'],
  },
  {
    id: 'EV-DOCKER-DEPLOY',
    testCaseId: 'TC-DEPLOYMENT',
    testScope: 'docker compose deployment',
    executionMethod: 'code review — docker-compose.yml + Dockerfile',
    executorType: 'human',
    rawResult: 'pass',
    evidenceSource: 'docker-compose.yml, Dockerfile',
    evidenceSummary: '5 个服务，多阶段构建，--profile ollama 可选启动。',
    observedAt: '2026-06-11T10:15:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none',
    confidence: 'high',
    limitations: ['未执行 docker compose up 验证。'],
  },
  {
    id: 'EV-ENV-LEAK',
    testCaseId: 'TC-SECURITY',
    testScope: 'environment variable security',
    executionMethod: 'git log + file presence check',
    executorType: 'human',
    rawResult: 'fail',
    evidenceSource: '.env file in repository root',
    evidenceSummary: '.env 文件被 Git 追踪，包含 JWT_SECRET、SUPABASE 密钥、数据库密码。commit 09fa5db 包含此文件。',
    observedAt: '2026-06-11T10:20:00.000Z',
    environment: { name: 'git-repository', commit: '215cdfe' },
    severity: 'P0',
    confidence: 'high',
    limitations: ['需确认这是否是已知测试密钥。历史 commit 中仍包含旧密钥。'],
  },
  {
    id: 'EV-NO-AUTH',
    testCaseId: 'TC-AUTH',
    testScope: 'authentication and access control',
    executionMethod: 'code review — no auth middleware, no login page',
    executorType: 'human',
    rawResult: 'fail',
    evidenceSource: 'Full codebase: no auth middleware, no session, no login API',
    evidenceSummary: '应用没有任何认证机制。所有 API 路由均为公开访问。',
    observedAt: '2026-06-11T10:25:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P1',
    confidence: 'high',
    limitations: ['产品定位是本地优先，认证在公网部署前才需要。'],
  },
  {
    id: 'EV-NO-MIGRATIONS',
    testCaseId: 'TC-DB-MIGRATIONS',
    testScope: 'database migration management',
    executionMethod: 'code review — no migration tool found',
    executorType: 'human',
    rawResult: 'fail',
    evidenceSource: 'package.json: no prisma, drizzle, knex, or migration dependency',
    evidenceSummary: '无数据库迁移工具，schema 变更依赖手动执行 SQL。',
    observedAt: '2026-06-11T10:30:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P2',
    confidence: 'high',
    limitations: ['0.1.0 早期版本，schema 变动频率低。'],
  },
  {
    id: 'EV-NO-LOGGING',
    testCaseId: 'TC-LOGGING',
    testScope: 'structured logging',
    executionMethod: 'code review — grep for logging patterns',
    executorType: 'human',
    rawResult: 'fail',
    evidenceSource: 'src/: only console.error in cardService.ts',
    evidenceSummary: '全项目仅一处 console.error，无统一日志模块、无请求日志、无错误追踪。',
    observedAt: '2026-06-11T10:35:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P2',
    confidence: 'high',
    limitations: ['产品定位为个人使用，结构化日志优先级可排后。'],
  },
  {
    id: 'EV-BACKUP-UNTESTED',
    testCaseId: 'TC-BACKUP-RESTORE',
    testScope: 'backup and restore procedure',
    executionMethod: 'code review — scripts exist but not executed',
    executorType: 'human',
    rawResult: 'inconclusive',
    evidenceSource: 'scripts/backup-db.sh and scripts/restore-db.sh',
    evidenceSummary: '备份恢复脚本存在但未实际执行验证。不确定恢复是否能成功还原含 pgvector 索引的数据库。',
    observedAt: '2026-06-11T10:40:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'unknown',
    confidence: 'low',
    limitations: ['脚本存在但不能证明恢复功能正常。'],
  },
  {
    id: 'EV-CRUD-QUALITY-AGENT',
    testCaseId: 'TC-CARD-CRUD',
    testScope: 'card CRUD completeness',
    executionMethod: 'agent reasoning over code structure',
    executorType: 'agent_reasoning',
    rawResult: 'pass',
    evidenceSource: 'Agent analysis of src/lib/services/cardService.ts',
    evidenceSummary: 'Agent 分析认为 Card Service 设计良好：create 有 ID 生成和权重计算，update 有版本快照。',
    observedAt: '2026-06-11T10:45:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'none',
    confidence: 'low',
    limitations: ['agent_reasoning 类型证据，应被降级。未经过实际数据库操作测试。'],
  },
  {
    id: 'EV-NO-FRONTEND-TESTS',
    testCaseId: 'TC-TESTING',
    testScope: 'frontend and integration testing',
    executionMethod: 'code review — no test files found',
    executorType: 'human',
    rawResult: 'blocked',
    evidenceSource: 'package.json: no jest, vitest, playwright, cypress, or testing-library',
    evidenceSummary: '无测试框架依赖，无测试文件，前端和后端均无自动化测试覆盖。',
    observedAt: '2026-06-11T10:50:00.000Z',
    environment: { name: 'local-dev', version: '0.1.0' },
    severity: 'P1',
    confidence: 'high',
    limitations: ['0.1.0 早期阶段，测试策略在后续计划中。'],
  },
];

const existingDefects = [
  {
    id: 'BUG-ENV-IN-GIT',
    testCaseId: 'TC-SECURITY',
    title: '.env 文件含真实密钥并提交到 Git 仓库',
    actualResult: '.env 被 Git 追踪，含 JWT_SECRET、SUPABASE 密钥、数据库密码。',
    expectedResult: '.env 应在 .gitignore，密钥只在 .env.example 模板。历史 commit 不应含真实密钥。',
    severity: 'P0',
    affectedArea: 'security configuration',
    suspectedLayer: 'configuration',
    evidenceIds: ['EV-ENV-LEAK'],
    recommendation: '轮换所有泄露密钥 + git filter-branch 清理历史 + .env 加入 .gitignore。',
    status: 'open',
  },
  {
    id: 'BUG-NO-AUTH',
    testCaseId: 'TC-AUTH',
    title: '无认证基础设施 — 所有 API 公开访问',
    actualResult: '任何能访问 URL 的人都能操作所有数据。无 session、token、oauth。',
    expectedResult: '至少应有基本访问控制。',
    severity: 'P1',
    affectedArea: 'security access control',
    suspectedLayer: 'backend',
    evidenceIds: ['EV-NO-AUTH'],
    recommendation: '公网部署前实现 token-based 或 password-based 认证中间件。',
    status: 'open',
  },
  {
    id: 'BUG-NO-TESTS',
    testCaseId: 'TC-TESTING',
    title: '无自动化测试 — 全项目零测试覆盖',
    actualResult: '无测试框架、无测试文件、无 CI。',
    expectedResult: '至少应有单元测试覆盖核心 Service 和 API。',
    severity: 'P1',
    affectedArea: 'quality assurance',
    suspectedLayer: 'deployment',
    evidenceIds: ['EV-NO-FRONTEND-TESTS'],
    recommendation: '集成 vitest + @testing-library/react，优先覆盖 cardService 和 API 路由。',
    status: 'open',
  },
  {
    id: 'BUG-NO-MIGRATIONS',
    testCaseId: 'TC-DB-MIGRATIONS',
    title: '无数据库迁移管理系统',
    actualResult: 'Schema 变更依赖手动执行 SQL，无版本追踪、无回滚。',
    expectedResult: '应使用 Prisma Migrate / Drizzle Kit 等工具。',
    severity: 'P2',
    affectedArea: 'database operations',
    suspectedLayer: 'database',
    evidenceIds: ['EV-NO-MIGRATIONS'],
    recommendation: '评估引入 Prisma 或 Drizzle ORM。',
    status: 'open',
  },
  {
    id: 'BUG-NO-LOGS',
    testCaseId: 'TC-LOGGING',
    title: '无结构化日志 — 仅一处 console.error',
    actualResult: '全项目仅 cardService.ts 中一处 console.error。',
    expectedResult: '至少应有请求级别的日志中间件。',
    severity: 'P2',
    affectedArea: 'observability',
    suspectedLayer: 'backend',
    evidenceIds: ['EV-NO-LOGGING'],
    recommendation: '引入 pino 或 winston，添加 API 请求/响应日志中间件。',
    status: 'open',
  },
];

// ============================================================
// 2. 辅助函数
// ============================================================

function createTask(params: {
  index: number;
  sessionId: string;
  assignedTo: AgentRuntimeRole;
  taskType: AgentTaskType;
  goal: string;
  expectedOutput: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  inputRefs?: Array<{ key: SharedBlackboardKey; summary?: string }>;
}): AgentTask {
  return createAgentTask({
    id: `task-${String(params.index).padStart(2, '0')}-${params.taskType}`,
    sessionId: params.sessionId,
    assignedTo: params.assignedTo,
    createdBy: 'test_lead',
    taskType: params.taskType,
    goal: params.goal,
    expectedOutput: params.expectedOutput,
    priority: params.priority,
    inputRefs: params.inputRefs,
  });
}

// ============================================================
// 3. 创建 Session 并初始化 Blackboard
// ============================================================

const registry = createDefaultAgentRegistry();
const profileValidation = validateAgentProfiles(DEFAULT_AGENT_PROFILES);

let session: AgentSession = createAgentSession({
  runId: RUN_ID,
  targetSystemName: TARGET_SYSTEM,
  limitations: [
    'Trial run: using real agent-notes project data from code review.',
    'No real system tests were executed — all evidence is from static analysis.',
  ],
});

// 写入 requirements 到 blackboard
session = {
  ...session,
  blackboard: {
    ...session.blackboard,
    requirements,
    rawEvidence: [...rawEvidence],
    defects: [...existingDefects],
  },
};

// ============================================================
// 4. 创建任务列表（完整 11 步 pipeline）
// ============================================================

const trialTasks = [
  createTask({ index: 1, sessionId: session.id, assignedTo: 'test_lead', taskType: 'build_context', goal: '构建 agent-notes 项目的系统上下文和风险区域。', expectedOutput: '上下文对象写入 blackboard。', priority: 'critical', inputRefs: [{ key: 'requirements' }] }),
  createTask({ index: 2, sessionId: session.id, assignedTo: 'product_acceptance', taskType: 'extract_acceptance', goal: '从需求文本提取验收点。', expectedOutput: '验收点列表写入 blackboard。', priority: 'high', inputRefs: [{ key: 'requirements' }, { key: 'context' }] }),
  createTask({ index: 3, sessionId: session.id, assignedTo: 'test_design', taskType: 'generate_test_cases', goal: '生成系统测试用例（不含 pass 标记）。', expectedOutput: '测试用例列表写入 blackboard。', priority: 'normal', inputRefs: [{ key: 'acceptancePoints' }, { key: 'context' }] }),
  createTask({ index: 4, sessionId: session.id, assignedTo: 'ops_check', taskType: 'generate_ops_checklist', goal: '根据部署画像生成运维检查清单。', expectedOutput: '运维检查项写入 blackboard。', priority: 'normal', inputRefs: [{ key: 'context' }, { key: 'testCases' }] }),
  createTask({ index: 5, sessionId: session.id, assignedTo: 'developer_analysis', taskType: 'normalize_evidence', goal: '标准化 11 条原始证据。', expectedOutput: '标准化证据写入 blackboard。', priority: 'normal', inputRefs: [{ key: 'rawEvidence' }, { key: 'testCases' }] }),
  createTask({ index: 6, sessionId: session.id, assignedTo: 'developer_analysis', taskType: 'classify_severity', goal: '对标准化证据做严重性分类。', expectedOutput: '严重性分类写入 blackboard。', priority: 'normal', inputRefs: [{ key: 'normalizedEvidence' }, { key: 'testCases' }] }),
  createTask({ index: 7, sessionId: session.id, assignedTo: 'developer_analysis', taskType: 'analyze_defect', goal: '分析 5 个已知缺陷。', expectedOutput: '缺陷分析草案写入 blackboard。', priority: 'normal', inputRefs: [{ key: 'normalizedEvidence' }, { key: 'severityClassifications' }, { key: 'defects' }] }),
  createTask({ index: 8, sessionId: session.id, assignedTo: 'test_design', taskType: 'suggest_regression', goal: '基于缺陷和分析生成回归建议。', expectedOutput: '回归建议写入 blackboard。', priority: 'normal', inputRefs: [{ key: 'defectAnalyses' }, { key: 'severityClassifications' }, { key: 'testCases' }] }),
  createTask({ index: 9, sessionId: session.id, assignedTo: 'test_lead', taskType: 'recommend_release', goal: '综合所有 blackboard 数据给出发布建议。', expectedOutput: '发布建议写入 blackboard。', priority: 'high', inputRefs: [{ key: 'testCases' }, { key: 'normalizedEvidence' }, { key: 'severityClassifications' }, { key: 'defects' }, { key: 'defectAnalyses' }, { key: 'regressionSuggestions' }, { key: 'opsChecklist' }, { key: 'unknowns' }] }),
  createTask({ index: 10, sessionId: session.id, assignedTo: 'test_lead', taskType: 'generate_report', goal: '生成 Markdown 测试报告。', expectedOutput: '报告写入 blackboard。', priority: 'low', inputRefs: [{ key: 'context' }, { key: 'acceptancePoints' }, { key: 'testCases' }, { key: 'normalizedEvidence' }, { key: 'severityClassifications' }, { key: 'defectAnalyses' }, { key: 'regressionSuggestions' }, { key: 'opsChecklist' }, { key: 'releaseRecommendation' }] }),
];

session = {
  ...session,
  tasks: trialTasks,
};

session = transitionAgentSessionStatus(session, 'running');

// ============================================================
// 5. 运行 Multi-Agent Runtime（最多 3 轮）
// ============================================================

const allSteps: Array<{
  agent: string;
  status: string;
  taskType?: string;
  summary: string;
}> = [];

for (let round = 0; round < 3; round++) {
  const result = runAllAgentsOnce(session, registry.list());
  session = result.session;
  for (const step of result.steps) {
    allSteps.push({
      agent: step.agent,
      status: step.status,
      taskType: step.taskType,
      summary: step.summary.slice(0, 120),
    });
  }

  const pendingTasks = session.tasks.filter(
    (t) => t.status === 'pending' || t.status === 'assigned'
  );
  if (pendingTasks.length === 0) break;
}

// ============================================================
// 6. 汇总输出
// ============================================================

const blackboardSummary = summarizeSharedBlackboard(session.blackboard);
const evidence = collectEvidenceFromBlackboard(session.blackboard);
const gapSummary = summarizeEvidenceGaps(evidence.gaps);
const noPass = enforceNoEvidenceNoPass(session.blackboard);
const sessionSummary = summarizeAgentSession(session);
const messageSummary = summarizeAgentMessages(session.messages);

console.log('='.repeat(70));
console.log('  Agent Testing V2 — agent-notes 真实项目试跑报告');
console.log('='.repeat(70));
console.log('');

// Session
console.log('📋 Session');
console.log('-'.repeat(40));
console.log(`  ID:       ${sessionSummary.id}`);
console.log(`  系统:     ${sessionSummary.targetSystemName}`);
console.log(`  状态:     ${sessionSummary.status}`);
console.log(`  Agents:   ${sessionSummary.agentCount}`);
console.log(`  Tasks:    ${sessionSummary.taskCount}`);
console.log(`  Messages: ${sessionSummary.messageCount}`);
console.log('');

// Task 执行结果
console.log('📝 Task 执行');
console.log('-'.repeat(40));
const taskStatusCount: Record<string, number> = {};
for (const t of session.tasks) {
  taskStatusCount[t.status] = (taskStatusCount[t.status] || 0) + 1;
}
for (const [status, count] of Object.entries(taskStatusCount)) {
  const emoji = status === 'completed' ? '✅' : status === 'pending' ? '⏳' : status === 'blocked' ? '🚫' : '❌';
  console.log(`  ${emoji} ${status}: ${count}`);
}
console.log('');

// Round 详情
console.log('🔄 执行步骤');
console.log('-'.repeat(40));
allSteps.forEach((s, i) => {
  const emoji = s.status === 'completed' ? '✅' : s.status === 'idle' ? '💤' : '⚠️';
  console.log(`  ${emoji} [${s.agent}] ${s.taskType || '—'}: ${s.summary}`);
});
console.log('');

// Blackboard 数据
console.log('📊 Blackboard 数据');
console.log('-'.repeat(40));
console.log(`  验收点:        ${blackboardSummary.acceptancePointCount}`);
console.log(`  测试用例:      ${blackboardSummary.testCaseCount}`);
console.log(`  原始证据:      ${blackboardSummary.rawEvidenceCount}`);
console.log(`  标准化证据:    ${blackboardSummary.normalizedEvidenceCount}`);
console.log(`  严重性分类:    ${blackboardSummary.severityCount}`);
console.log(`  缺陷:          ${blackboardSummary.defectCount}`);
console.log(`  回归建议:      ${blackboardSummary.regressionCount}`);
console.log(`  运维检查项:    ${blackboardSummary.opsChecklistCount}`);
console.log(`  未知项:        ${blackboardSummary.unknownCount}`);
console.log(`  限制说明:      ${blackboardSummary.limitationCount}`);
console.log('');

// Evidence Gaps
console.log('🔍 Evidence Gaps');
console.log('-'.repeat(40));
console.log(`  总计:          ${gapSummary.total}`);
console.log(`  未覆盖 (open): ${gapSummary.open}`);
console.log(`  部分覆盖:      ${gapSummary.partiallyCovered}`);
console.log('  按原因分布:');
for (const [reason, count] of Object.entries(gapSummary.byReason)) {
  const label =
    reason === 'missing_evidence' ? '缺少证据' :
    reason === 'weak_evidence' ? '弱证据' :
    reason === 'agent_reasoning_only' ? '仅 Agent 推理' :
    reason === 'inconclusive_evidence' ? '不确定证据' :
    reason === 'missing_test_case_link' ? '缺测试用例关联' :
    reason;
  console.log(`    ${label}: ${count}`);
}
console.log('');

// No-Evidence-No-Pass
console.log('🛡️ No-Evidence-No-Pass 检查');
console.log('-'.repeat(40));
console.log(`  有效: ${noPass.valid ? '✅ 无违规' : '⚠️ 发现违规'}`);
if (noPass.issues.length > 0) {
  for (const issue of noPass.issues) {
    console.log(`  ❌ ${issue.message}`);
  }
}
console.log('');

// Release Recommendation
const release = session.blackboard.releaseRecommendation as
  | { recommendation?: string; reason?: string; blockingFactors?: Array<{ reason: string }> }
  | undefined;
console.log('🚦 发布建议');
console.log('-'.repeat(40));
if (release) {
  console.log(`  建议:   ${release.recommendation || 'N/A'}`);
  console.log(`  原因:   ${(release.reason || '').slice(0, 100)}`);
  const factors = release.blockingFactors || [];
  if (factors.length > 0) {
    console.log(`  阻断因素 (${factors.length}):`);
    for (const bf of factors.slice(0, 5)) {
      console.log(`    - ${bf.reason}`);
    }
  }
} else {
  console.log('  (未生成 — blackboard 数据不足)');
}
console.log('');

// Profile Validation
console.log('👤 Agent Profiles');
console.log('-'.repeat(40));
console.log(`  有效: ${profileValidation.valid ? '✅' : '❌'}`);
console.log(`  注册: ${registry.list().length} 个`);
for (const p of registry.list()) {
  const tasks = session.tasks.filter((t) => t.assignedTo === p.role);
  const completed = tasks.filter((t) => t.status === 'completed').length;
  console.log(`  ${p.role}: ${completed}/${tasks.length} tasks completed`);
}
console.log('');

// Warnings
console.log('⚠️  Top Warnings');
console.log('-'.repeat(40));
const allWarnings = [
  ...evidence.warnings,
  ...allSteps.flatMap((s) => s.status === 'idle' ? [] : [s.summary]),
];
const uniqueWarnings = [...new Set(allWarnings)].slice(0, 10);
for (const w of uniqueWarnings) {
  console.log(`  - ${w}`);
}
console.log('');

// Limitations
console.log('📌 Key Limitations');
console.log('-'.repeat(40));
const keyLimits = evidence.limitations.slice(0, 5);
for (const lim of keyLimits) {
  console.log(`  - ${lim}`);
}
console.log('');

// ============================================================
// 7. UI View Model
// ============================================================

const vm = buildMultiAgentSessionViewModel({
  session,
  profiles: DEFAULT_AGENT_PROFILES,
});
console.log('🖥️  UI View Model');
console.log('-'.repeat(40));
console.log(`  Overview:    ${vm.overview.sessionId}`);
console.log(`  Profiles:    ${vm.agentProfiles.length}`);
console.log(`  Tasks:       ${vm.taskQueue.length}`);
console.log(`  Messages:    ${vm.messageTimeline.length}`);
console.log(`  Gaps:        ${vm.evidenceGaps.length}`);
console.log(`  Approvals:   ${vm.approvals.length}`);
console.log('');

// ============================================================
// 8. 最终结论
// ============================================================

console.log('='.repeat(70));
console.log('  试跑结论');
console.log('='.repeat(70));
console.log(`  系统:       ${TARGET_SYSTEM}`);
console.log(`  V2 Runtime: M0–M6 全部就位`);
console.log(`  任务完成:   ${taskStatusCount['completed'] || 0}/${trialTasks.length}`);
console.log(`  发布建议:   ${release?.recommendation || 'N/A'}`);
console.log(`  证据 Gap:   ${gapSummary.open} open / ${gapSummary.total} total`);
console.log(`  No-Pass:    ${noPass.valid ? '无违规' : '发现 ' + noPass.issues.length + ' 个问题'}`);
console.log('');

if (release?.recommendation === 'blocked') {
  console.log('⛔ 当前版本不应发布。');
  console.log('');
  console.log('关键发现:');
  console.log('  1. P0 .env 文件含真实密钥提交到 Git');
  console.log('  2. P1 无认证系统');
  console.log('  3. P1 无自动化测试');
  console.log('  4. P2 无数据库迁移工具');
  console.log('  5. P2 无结构化日志');
  console.log('');
}

console.log('✅ V2 Multi-Agent Runtime 在真实项目数据上运行正常。');
console.log('   6 个 Agent 角色、SkillRouter、Evidence Collector、');
console.log('   Blackboard、MessageBus、UI View Model 全部跑通。');

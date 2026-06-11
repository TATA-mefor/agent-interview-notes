# Agent 面试笔记

一个本地优先的 Agent 工程面试知识卡片系统。它把题库卡片、Markdown 笔记、批量导入、AI 辅助理解、RAG 知识库、关系图谱、思维导图和复习计划放在同一个 Next.js 应用里，适合在电脑上维护内容，在手机上做轻量复习。

> 定位：这不是通用笔记软件，也不是通用 RAG 平台，而是面向 Agent / LLM 工程面试准备的专用知识库。

## 当前能力

| 模块 | 说明 |
| --- | --- |
| 仪表盘 | 展示题库数量、今日复习、平均掌握度和知识库文档数量 |
| 题库管理 | 卡片创建、编辑、详情、列表、网格视图、测验/复习卡片视图 |
| 批量导入 | 支持 CSV、JSON、Markdown、Word、PDF 等导入解析流程，提供 QA 候选预览、证据查看和确认入库 |
| Markdown 笔记 | 提供 Markdown 编辑入口，面向结构化笔记和面试问答材料整理 |
| AI 智能理解 | 基于 LLM 生成标准答案、要点、话术、易错点、标签和相关题建议，AI 输出作为建议稿保存 |
| RAG 知识库 | 支持知识文档上传、切块、embedding、关键词/向量/混合检索 |
| 关系图谱 | 基于卡片关系展示知识点连接 |
| 思维导图 | 基于 Mermaid / Markmap 展示主题结构和卡片摘要 |
| 复习计划 | 基于难度、频率、掌握度、遗忘因子和人工加权计算复习优先级，提供复习中心和甘特图页面 |
| 本地部署 | Docker Compose 启动 PostgreSQL + pgvector + PostgREST + Next.js，Ollama 可选 |

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Next.js 14 App Router、React 18、TypeScript |
| 样式 | Tailwind CSS |
| 表格/图形 | AG Grid、React Flow、Mermaid、Markmap |
| 数据库 | PostgreSQL + pgvector |
| 本地 Supabase 兼容层 | PostgREST + Nginx proxy |
| 文档解析 | pdf-parse、pdfjs-dist、mammoth、自定义 Markdown/CSV/JSON importer |
| LLM | Dify、DeepSeek、OpenAI、智谱 AI、Ollama |
| 部署 | Docker Compose、Nginx |

## 快速开始

### 前置条件

- Node.js 18+
- npm
- PostgreSQL 16 + pgvector，或直接使用 Docker Compose

### 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问：

```text
http://localhost:3000
```

如果只想用本地数据库，可以先启动 PostgreSQL：

```bash
docker compose up -d postgres postgrest supabase-proxy
```

首次初始化数据库时，执行：

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$DATABASE_URL" -f supabase/init_roles.sql
```

### Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

可选启动 Ollama：

```bash
docker compose --profile ollama up -d
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull nomic-embed-text
```

## 环境变量

常用配置见 `.env.example`：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 或本地 PostgREST proxy 地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key；本地兼容模式下也会被客户端读取 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端访问 key |
| `LLM_PROVIDER` | `dify`、`deepseek`、`openai`、`zhipu`、`ollama` 等 |
| `DIFY_API_URL` / `DIFY_API_KEY` | Dify 接入配置 |
| `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `ZHIPU_API_KEY` | 直连模型 API key |
| `OLLAMA_BASE_URL` | Ollama 服务地址 |
| `OLLAMA_EMBED_MODEL` | 本地 embedding 模型，默认可用 `nomic-embed-text` |
| `NEXT_PUBLIC_APP_URL` | 应用访问地址，用于 PWA 和局域网访问 |

不要把真实 `.env`、`.env.local`、`.env.production` 提交到 Git。

## 常用命令

```bash
npm run dev      # 开发模式
npm run build    # 生产构建
npm run start    # 启动生产构建
```

数据库脚本：

```bash
./scripts/backup-db.sh
./scripts/restore-db.sh backups/agent_notes_YYYYMMDD_HHMMSS.sql
```

导入/清洗辅助脚本位于 `scripts/`，包括 PDF 文本提取、OCR、导入 SQL 生成、卡片审计和清洗等。

## 页面入口

| 路径 | 用途 |
| --- | --- |
| `/` | 仪表盘 |
| `/cards` | 题库列表 |
| `/cards/new` | 新建卡片 |
| `/import` | 批量导入 |
| `/notes` | Markdown 笔记 |
| `/knowledge` | 知识库 |
| `/search` | 搜索 |
| `/mindmap` | 思维导图 |
| `/graph` | 关系图谱 |
| `/review` | 复习中心 |
| `/review/gantt` | 复习甘特图 |
| `/agents` | Agent 面板 |
| `/settings` | 设置 |

## 目录结构

```text
agent-notes/
├── src/
│   ├── app/                 # Next.js 页面和 API routes
│   ├── components/          # 页面组件、卡片组件、导入组件、图谱/导图/复习组件
│   └── lib/
│       ├── agents/          # Agent 编排
│       ├── db/              # 数据库连接
│       ├── extraction/      # QA 抽取、清洗、去重、置信度评分
│       ├── importers/       # CSV/JSON/Markdown/Word/PDF 导入器
│       ├── rag/             # chunk、embedding、retriever
│       ├── repositories/    # 数据访问层
│       └── services/        # 业务服务层
├── supabase/                # schema、seed、角色初始化
├── scripts/                 # 导入、清洗、部署、备份脚本
├── docs/                    # 架构、部署、产品规划文档
├── nginx/                   # Nginx / PostgREST proxy 配置
├── public/                  # PWA manifest 等静态资源
├── docker-compose.yml
└── Dockerfile
```

## 手机访问

1. 确保手机和电脑在同一局域网。
2. 查看电脑局域网 IP。
   - Windows: `ipconfig`
   - macOS / Linux: `ifconfig` 或 `hostname -I`
3. 手机浏览器访问：

```text
http://<电脑局域网IP>:3000
```

4. 在浏览器中添加到主屏幕，即可作为 PWA 使用。

## 部署文档

- [系统架构](docs/ARCHITECTURE.md)
- [本地部署指南](docs/LOCAL_DEPLOYMENT.md)
- [服务器部署指南](docs/SERVER_DEPLOYMENT.md)
- [产品规划](docs/PRODUCT_PLAN.md)
- [参考项目](docs/references/REFERENCE_PROJECTS.md)

## Agent 测试模块

项目包含一个独立的 **Small System Test Agent Team** 模块，位于 `agent-testing/`。这是一个离线确定性系统测试框架，专为 10-30 人小系统设计。

### 核心能力

| 能力 | 说明 |
| --- | --- |
| 需求验收提取 | 从需求文本自动提取 must/should/could 验收点，标记歧义 |
| 测试用例生成 | 基于验收点自动生成系统测试用例（含前置条件、步骤、预期证据） |
| 证据标准化 | 统一 9 种执行器类型（human/api/browser/script 等），自动降级弱证据 |
| 严重性分类 | P0/P1/P2/P3 确定性分类，标记阻断发布和回归需求 |
| 缺陷分析 | 分析失败证据，推断受影响层级（frontend/backend/auth/permission 等） |
| 运维检查清单 | 根据部署模式自动生成 40+ 运维检查项 |
| 回归建议 | 基于缺陷+严重性自动生成回归测试范围和优先级 |
| 发布建议 | 综合所有指标给出 approved/approved_with_risks/blocked/inconclusive |
| 人机回路审批 | 对每个动作自动评估 LOW/MEDIUM/HIGH/FORBIDDEN 风险级别 |
| 审计追踪 | 记录每一步的 Actor、Skill、MCP、证据引用和审批状态 |
| Markdown 报告 | 生成完整系统测试报告 |

### 设计原则

- **证据驱动**：Agent 不能凭空证明测试通过 — pass 必须绑定真实执行证据
- **离线确定性**：所有 Skill 都是纯函数，不依赖 LLM/MCP/数据库/网络
- **证据降级**：`agent_reasoning + pass` 会被自动降级为 weak 证据，不能成为发布依据
- **保守判断**：证据不足时宁可报 `unknown`/`inconclusive`，不瞎猜

### 快速使用

```ts
import { runTestLeadOrchestration } from './agent-testing/src';
import { agentNotesOrchestrationInput } from './agent-testing/test-agent-notes';

const output = runTestLeadOrchestration(agentNotesOrchestrationInput);
console.log(output.releaseRecommendation);  // → 'blocked'
console.log(output.report);                  // → Markdown 报告
```

```bash
# 运行项目自身的系统测试分析
npx tsx agent-testing/test-agent-notes.ts
```

详细文档见 `agent-testing/docs/README.md` 和 `agent-testing/docs/ROADMAP.md`。

## 设计原则

- 本地优先，基础 CRUD 不依赖外部 LLM。
- AI 输出只作为建议稿，用户手动采纳。
- 页面层不直接写数据库，遵循 API Route → Service → Repository 分层。
- 优先支持电脑维护内容、手机复习的双端体验。
- 部署到公网前需要额外增加认证或访问控制。

## License

MIT

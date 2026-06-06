# Architecture — Agent Interview Notes

## 分层架构

```
┌─────────────────────────────────────────────────────┐
│                    App Routes                        │
│  (pages, layouts, client components)                │
├─────────────────────────────────────────────────────┤
│                    API Routes                        │
│  (route handlers, request validation, responses)    │
├─────────────────────────────────────────────────────┤
│                    Services                          │
│  (business logic, orchestration, domain rules)      │
├──────────────────┬──────────────────────────────────┤
│   Repositories   │  Agents / LLM / RAG              │
│   (data access,  │  (AI logic, retrieval,           │
│    queries,      │   embedding, chunking,           │
│    persistence)  │   provider abstraction)           │
├──────────────────┴──────────────────────────────────┤
│                  Database                            │
│  (PostgreSQL + pgvector, migrations, indexes)       │
└─────────────────────────────────────────────────────┘
```

## 目录结构

```
agent-notes/
├── src/
│   ├── app/                    # Next.js App Router 页面 & API 路由
│   │   ├── layout.tsx          # 根布局（PWA meta，响应式容器）
│   │   ├── page.tsx            # 仪表盘 /
│   │   ├── cards/              # /cards 题库管理
│   │   ├── import/             # /import 批量导入
│   │   ├── notes/              # /notes Markdown 笔记
│   │   ├── knowledge/          # /knowledge 知识库文档
│   │   ├── search/             # /search 搜索
│   │   ├── mindmap/            # /mindmap 思维导图
│   │   ├── graph/              # /graph 关系图谱
│   │   ├── review/             # /review 复习中心
│   │   ├── agents/             # /agents Agent 面板
│   │   ├── settings/           # /settings 设置
│   │   └── api/                # API 路由（cards, import, knowledge, ...）
│   │
│   ├── components/             # UI 组件
│   │   ├── layout/             # Sidebar, BottomTab, AppLayout
│   │   ├── cards/              # 卡片相关组件
│   │   ├── markdown/           # Markdown 编辑器/预览
│   │   ├── knowledge/          # 知识库组件
│   │   ├── mindmap/            # 思维导图组件
│   │   ├── graph/              # 图谱组件
│   │   ├── review/             # 复习组件
│   │   ├── agents/             # Agent 组件
│   │   └── settings/           # 设置组件
│   │
│   └── lib/                    # 业务逻辑库
│       ├── db/                 # 数据库连接
│       ├── repositories/       # 数据访问层
│       ├── services/           # 业务服务层
│       ├── agents/             # Agent 服务
│       ├── llm/                # LLM 供应商抽象
│       ├── rag/                # RAG 检索/切分/embedding
│       ├── importers/          # 导入解析器
│       ├── review/             # 复习算法
│       ├── markdown/           # Markdown 处理
│       ├── backup/             # 备份恢复
│       └── types/              # TypeScript 类型定义
│
├── supabase/                   # 数据库 schema & seed
├── docker/                     # Docker 配置
├── docs/                       # 文档
├── public/                     # 静态资源（PWA manifest 等）
├── docker-compose.yml
└── package.json
```

## 数据流

```
User Action → Page Component → API Route → Service → Repository → Database
                                                    ↓
                                              Agent / LLM / RAG
                                                    ↓
                                              AI Response → Service → API → Page
```

## 关键设计原则

1. **页面不包含业务逻辑** — 页面只做展示和用户交互，通过 API 获取数据
2. **API 不直接访问数据库** — 通过 Service → Repository 分层
3. **AI 输出永远为建议稿** — 存储在 `llm_suggestions` 表，用户手动采纳
4. **默认离线可运行** — 无 API Key 时系统仍可启动，基础 CRUD 可用
5. **移动端不是事后补充** — 底部 Tab 导航、复习优先、PWA 安装

## 技术栈

| 层       | 技术选型                                |
| -------- | --------------------------------------- |
| 前端框架 | Next.js 14 (App Router) + TypeScript    |
| 样式     | Tailwind CSS                            |
| 表格     | AG Grid Community                       |
| Markdown | MDXEditor / Milkdown / TipTap           |
| 思维导图 | Mermaid.js                              |
| 关系图谱 | React Flow                              |
| 甘特图   | Frappe Gantt / CSS 自定义               |
| 数据库   | PostgreSQL + pgvector                   |
| LLM      | DeepSeek / OpenAI / 智谱 / Ollama       |
| 部署     | Docker Compose                          |

## 数据库表

| 表名               | 用途         |
| ------------------ | ------------ |
| cards              | 面试题卡片   |
| card_links         | 卡片关联关系 |
| card_versions      | 卡片版本历史 |
| review_log         | 复习日志     |
| review_tasks       | 复习任务     |
| knowledge_documents | 知识文档    |
| knowledge_chunks   | 文档切块     |
| llm_suggestions    | AI 建议记录  |
| agent_runs         | Agent 运行记录 |
| import_jobs        | 导入任务     |
| app_settings       | 应用设置     |

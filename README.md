# Agent 面试笔记 (Agent Interview Notes)

一个**本地优先**的 Agent 面试知识卡片系统。电脑运行数据、模型和服务，手机提供轻量复习体验。

系统整合结构化卡片 CRUD、Markdown 笔记、AI 智能理解、RAG 知识检索、知识图谱、思维导图和基于概率权重的复习规划。

> 🔒 **核心定位**：这不是通用笔记软件，也不是通用 RAG 平台。这是面向 Agent 工程面试准备的专用知识卡片系统。

## 功能规划

| 模块         | 说明                                               | 状态   |
| ------------ | -------------------------------------------------- | ------ |
| 题库 CRUD    | 卡片管理（创建/编辑/删除/批量操作），AG Grid 表格视图 | 🚧 规划 |
| 批量导入     | CSV / JSON / Markdown 导入，去重预览               | 🚧 规划 |
| Markdown 笔记 | 编辑预览，[[双链]]，#标签，导出                    | 🚧 规划 |
| AI 智能理解  | 生成标准答案/要点/话术/易错点，用户手动采纳         | 🚧 规划 |
| RAG 知识库   | 文档导入 → 解析 → embedding → 向量检索             | 🚧 规划 |
| 相关题推荐   | 标签 + 向量 + LLM 混合推荐                          | 🚧 规划 |
| 思维导图     | Mermaid 按主题可视化                                | 🚧 规划 |
| 关系图谱     | React Flow 卡片关联可视化                           | 🚧 规划 |
| 复习计划     | 概率权重公式 + 遗忘曲线 + 甘特图                     | 🚧 规划 |
| Agent 自动化 | 轻量 Agent Service（理解/推荐/规划/导入/导图）     | 🚧 规划 |
| 本地部署     | Docker Compose（PostgreSQL + pgvector + ollama）    | 🚧 规划 |

## 本地运行

### 前置条件

- Node.js 18+
- PostgreSQL（本地或 Docker）

### 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入数据库连接信息

# 3. 初始化数据库
# 在 PostgreSQL 中执行 supabase/schema.sql 和 supabase/seed.sql

# 4. 启动开发服务器
npm run dev
```

访问 **http://localhost:3000**

### Docker 一键启动

```bash
docker-compose up -d

# 可选：启动 Ollama 本地 LLM
docker-compose --profile ollama up -d
```

## 手机访问

1. 确保手机与电脑在同一局域网
2. 查看电脑局域网 IP（`ipconfig` / `ifconfig`）
3. 手机浏览器访问 `http://<电脑IP>:3000`
4. **添加到主屏幕**（PWA 安装）获得全屏体验

## 技术栈

| 层       | 技术                                     |
| -------- | ---------------------------------------- |
| 框架     | Next.js 14 (App Router) + TypeScript     |
| 样式     | Tailwind CSS                             |
| 数据库   | PostgreSQL + pgvector                    |
| 表格     | AG Grid Community                        |
| 思维导图 | Mermaid.js                               |
| 关系图谱 | React Flow                               |
| LLM      | DeepSeek / OpenAI / 智谱 AI / Ollama     |
| 部署     | Docker Compose                           |

## 开发策略

- **自建主仓库**，不 fork 大型开源项目
- 参考 note-gen / Reor / RAGFlow / MaxKB 等项目的设计思路
- 代码独立实现，业务模型自己定义
- AI 输出永远是建议稿，用户手动采纳
- 每次只做一个明确模块，保证 build 通过
- 默认离线可运行（无 API Key 时基础 CRUD 仍可用）

## 目录结构

```
agent-notes/
├── src/
│   ├── app/          # 页面路由（17 个页面占位）
│   ├── components/   # UI 组件（layout/cards/markdown/...）
│   └── lib/          # 业务逻辑（types/db/services/agents/llm/rag/...）
├── supabase/         # 数据库 Schema & Seed（25 道面试题）
├── docs/             # 产品文档 & 架构文档
├── docker/           # Docker 配置
├── public/           # 静态资源（PWA manifest）
└── docker-compose.yml
```

## 参考项目

详见 [docs/references/REFERENCE_PROJECTS.md](docs/references/REFERENCE_PROJECTS.md)

## 文档

- [产品规划](docs/PRODUCT_PLAN.md)
- [系统架构](docs/ARCHITECTURE.md)
- [本地部署指南](docs/LOCAL_DEPLOYMENT.md)
- [参考项目](docs/references/REFERENCE_PROJECTS.md)

## License

MIT

# Reference Projects

## 声明

本项目是**自建主仓库**，不 fork 任何大型开源项目。以下列出的项目仅作为产品设计、架构思路和交互模式的参考来源。**所有代码均为独立实现**，不直接复制或修改参考项目的源代码。

## 参考映射表

| 参考项目 | 借鉴内容 | 是否复制代码 |
| -------- | -------- | ------------ |
| note-gen | AI + Markdown 笔记产品形态 | 不复制 |
| Reor | 本地优先架构、语义搜索、相似笔记推荐 | 不复制 |
| SmartNotboot | 中文智能笔记产品结构、AI 理解卡片设计 | 不复制 |
| Readify | AI 阅读笔记、思维导图自动生成 | 不复制 |
| RAGFlow | 文档解析 pipeline、RAG 检索增强 | 不复制 |
| MaxKB | 知识库管理 UI、RAG 工作流 | 不复制 |
| RuoYi-AI | Agent / Skill / 多模型供应商抽象 | 不复制 |
| Atomic | 语义链接、知识图谱可视化 | 不复制 |
| Obsidian / Logseq | Markdown 编辑体验、[[双链]]、本地知识库 | 不复制 |
| Khoj / OpenAgent | Agent 自动化任务、第二大脑 | 不复制 |

## 各项目具体借鉴点

### note-gen
- **借鉴**：AI 辅助生成 Markdown 笔记的思路。AI 输出为「建议稿」，用户手动采纳。
- **不复制**：note-gen 的完整代码、UI 布局。

### Reor
- **借鉴**：本地优先（local-first）架构理念。笔记存储在本地，语义搜索不依赖云服务。相似笔记推荐算法（embedding + 向量相似度）。
- **不复制**：Reor 的 Electron 架构、具体 UI 组件。

### SmartNotboot / SmartNotbook
- **借鉴**：中文面试场景下的 AI 智能理解卡片设计。卡片结构化字段（标准答案、要点、话术、易错点）。
- **不复制**：SmartNotboot 的项目结构、后端实现。

### Readify
- **借鉴**：AI 驱动的内容结构化展示。思维导图基于内容主题自动分组。
- **不复制**：Readify 的代码实现。

### RAGFlow
- **借鉴**：文档解析 pipeline 设计（解析 → 切分 → embedding → 检索）。chunk 切分策略的参考。
- **不复制**：RAGFlow 的解析器代码、pipeline 引擎。

### MaxKB
- **借鉴**：知识库管理 UI 设计（文档上传、分段预览、检索测试）。RAG 工作流的用户交互模式。
- **不复制**：MaxKB 的前端或后端代码。

### RuoYi-AI
- **借鉴**：多模型供应商抽象层的设计思路（DeepSeek / OpenAI / 智谱统一接口）。Agent / Skill 的概念模型。
- **不复制**：RuoYi-AI 的 Java 后端代码、Spring Boot 架构。

### Atomic
- **借鉴**：语义链接和知识图谱可视化。笔记之间不仅是超链接，而是有类型的语义关系。
- **不复制**：Atomic 的项目代码。

### Obsidian / Logseq
- **借鉴**：Markdown 编辑体验、`[[双链]]` 语法、本地文件存储理念。标签系统设计。
- **不复制**：Obsidian / Logseq 的核心编辑器代码。

### Khoj / OpenAgent
- **借鉴**：Agent 自动化处理个人知识的思路。自然语言查询知识库的交互模式。
- **不复制**：Khoj / OpenAgent 的完整项目代码。

## 技术库使用（通过 package.json 正常引入）

以下成熟库通过 npm 正常安装使用，不涉及源码复制：

| 库 | 用途 | License |
| -- | ---- | ------- |
| AG Grid Community | 表格视图 | MIT |
| Mermaid.js | 思维导图 | MIT |
| React Flow | 关系图谱 | MIT |
| pgvector | 向量检索 | PostgreSQL |
| Next.js | Web 框架 | MIT |
| Tailwind CSS | 样式框架 | MIT |

## 开发原则回顾

1. 本项目是独立的业务系统，不是开源 RAG 平台的套壳
2. 代码主线完全自主维护
3. 参考开源项目的设计思想，但业务模型自己定义
4. 使用成熟库时通过 package.json 正常引入，不粘贴源码
5. 所有借鉴点在此文档中记录，保持透明

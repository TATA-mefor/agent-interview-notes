# Product Plan — Agent Interview Notes

## 一句话定位

一个**本地优先**的 Agent 面试知识卡片系统。电脑运行数据、模型和服务，手机提供轻量复习体验。系统整合结构化卡片 CRUD、Markdown 笔记、AI 智能理解、RAG 知识检索、知识图谱、思维导图和基于概率的复习规划。

## 产品边界

**本项目是：**
- Agent 工程面试准备的知识卡片系统
- 本地部署优先的双端（电脑 + 手机）Web 应用
- 以「Card」为核心领域实体的结构化笔记工具

**本项目不是：**
- 通用笔记软件（如 Notion、Obsidian）
- 通用 RAG 平台（如 RAGFlow、MaxKB）
- 通用 AI 知识库（如 Dify、AnythingLLM）
- 任何开源项目的 fork 或改名版本

## 核心模块

### 1. Card CRUD（题库卡片管理）

核心实体是 `Card`，每张卡片代表一道 Agent 面试题。

基础操作：create / list / detail / update / delete / duplicate / batchUpdate

卡片字段：
- 题目、主题、答案
- Markdown 笔记、扩展知识
- 面试话术、易错点
- 难度、频率、掌握度
- 复习次数、最后复习时间、下次复习时间
- 概率权重、复习优先级
- 相关题目、标签
- AI 建议历史

### 2. 导入模块

支持格式：CSV / JSON / Markdown / Obsidian Markdown / Logseq 大纲

导入流程：上传 → 解析 → 预览 → 去重 → 用户确认 → 写入 → 计算权重 → 可选生成 embedding

### 3. Markdown 笔记模块

每张卡片支持：标准答案、个人理解、扩展笔记、易错点、面试表达、关联题目、参考资料

功能：Markdown 编辑与预览、[[双链]]、#标签、导出 Markdown

### 4. AI 智能理解模块

每张卡片提供「智能理解」按钮，AI 输出建议稿：

- 标准面试答案、核心要点
- 扩展知识、面试话术
- 常见误区、建议标签
- 建议难度/频率、关联题目推荐

**硬约束：AI 只生成建议，用户手动采纳，绝不自动覆盖用户笔记。**

### 5. RAG 知识库模块

支持导入：PDF / Markdown / TXT / 网页文本 / 课程资料

流程：文档导入 → 内容解析 → chunk 切分 → embedding → pgvector 存储 → 混合检索 → 为智能理解提供上下文

### 6. 相关题推荐模块

推荐来源：标签相似 + 向量相似 + LLM 判断（三者可组合）

关系类型：related（相关）/ prerequisite（前置）/ compare（对比）/ follow_up（追问）/ same_topic（同主题）

### 7. 思维导图 / 知识图谱

- `/mindmap`：Mermaid 思维导图，按主题层级展示题库结构
- `/graph`：React Flow 关系图谱，展示卡片之间的关联

### 8. 复习计划模块

基础公式：
```
weight = difficulty_factor × frequency_factor × (1 - mastery)
```

扩展优先级：
```
review_priority = base_weight × 0.7 + forgetting_factor × 0.2 + manual_boost × 0.1
```

功能：今日复习 / 甘特图计划 / 完成复习 / 更新掌握度 / 复习日志 / 掌握度趋势

### 9. Agent 自动化模块

轻量 Agent Service（不依赖 LangGraph）：
- CardUnderstandingAgent — 智能理解卡片
- RelatedQuestionAgent — 相关题目推荐
- ReviewPlannerAgent — 复习计划生成
- KnowledgeImportAgent — 知识文档导入解析
- MindMapAgent — 思维导图自动生成

### 10. 本地部署 + 双端访问

- 电脑：`http://localhost:3000`，完整管理功能
- 手机：`http://<电脑局域网IP>:3000`，PWA 安装到主屏幕，底部 Tab 导航，复习优先
- Docker Compose 一键启动（web + postgres + pgvector + 可选 ollama）

## 开发策略

- 主仓库自建，不 fork 大型开源项目
- CRUD 底座复用已有，改造为领域化 Card CRUD
- 功能设计参考开源项目，代码独立实现
- 每次只做一个明确模块，保证 build 通过
- AI 输出永远为建议稿，不可自动覆盖用户数据

# 个人简历

---

## 基本信息

| 项目 | 内容 |
|------|------|
| **姓名** | [你的姓名] |
| **学历** | [学校] · [专业] · 本科/硕士 · [毕业年份] |
| **邮箱** | [your-email] |
| **GitHub** | [github.com/your-id]（项目代码已开源） |
| **求职意向** | AI Agent / 大模型应用开发 · 实习岗 |

---

## 技术栈

**语言与运行时：** TypeScript（主力）· Python 3.11+ · SQL · Shell

**Web 与 API：** Next.js 14（App Router）· React 18 · RESTful API · SSE 流式响应

**Agent 与编排：** LangChain · 自研 Agent 状态机 · 自研小系统测试 Agent 团队 · 提示词工程 · JSON Schema 结构化输出

**检索与 RAG：**
pgvector（余弦相似度 / HNSW）· 混合检索（稠密向量 + 关键词）· 结构化分块（Markdown Header 递归切分 + 语义边界检测）· 嵌入模型适配层（OpenAI / Ollama / Mock）· Query 改写与 HyDE（架构预留）

**数据与缓存：** PostgreSQL（schema 设计 / 触发器 / GIN 索引）· Redis（会话缓存 / 热点 Query 缓存 / TTL 策略）

**可视化：** React Flow（知识图谱）· Markmap（思维导图）· AG Grid（高性能表格）· Mermaid

**工程化：** Docker 多阶段构建 · docker-compose 一键编排 · Nginx 反向代理 + HTTPS · PWA 离线可用 · Git

**LLM 网关：** 5 供应商统一抽象层（DeepSeek / OpenAI / 智谱 GLM / Ollama / Dify）· 优先级配置链（DB → 环境变量 → 自动检测）· 流式输出

**质量保障：** 自研离线确定性系统测试框架（agent-testing）· 需求验收提取 · 证据标准化 · 严重性分类 · 发布建议引擎

---

## 项目经历

### Agent 面试笔记系统 —— 个人自适应本地笔记平台，支持资料上传 + AI 辅助学习

*独立开发 · 2026.06 · GitHub 开源 · 17 页面 / 12 API / 11 数据库表 / 22 阶段测试框架*

**一句话技术栈：** `Next.js 14 · TypeScript · PostgreSQL/pgvector · LangChain · 混合检索 · Docker · PWA`

**项目定位：** 一个**个人自适应本地笔记系统**。用户可以上传自己的学习资料（PDF、Word、Markdown、CSV 等），系统自动解析提取知识点、构建 RAG 知识库、生成思维导图和知识图谱，并通过基于遗忘曲线的复习算法自适应调度学习节奏。桌面端全功能管理 + 移动端 PWA 轻量复习，支持离线降级运行。同时自研了 **agent-testing 离线测试框架**，为后续持续迭代提供系统级质量保障。

---

#### 1. 个人资料上传 → AI 智能解析管道

用户的核心需求是把自己的资料变成可复习的知识卡片。我实现了完整的上传 → 解析 → 提取 → 入库管道：

**多格式上传解析：**

- **支持格式：** PDF（pdf-parse / pdfjs-dist）、DOCX（mammoth）、Markdown、CSV、JSON、Obsidian 笔记、Logseq 大纲，以及纯文本粘贴。用户拖拽文件即可上传，系统自动识别格式。
- **文档解析与清洗：** 实现编码统一（UTF-8）、空白合并、不可见字符过滤等标准化清洗，处理 3 种编码异常的边界情况。
- **智能粘贴解析（前端）：** 卡片创建表单嵌入正则引擎，从非结构化粘贴文本中自动提取 Q&A 对、主题、标签，粘贴即解析，减少手动录入。

**AI 驱动的非结构化提取：**

- **LLM 智能提取：** PDF/DOCX 等不可直接解析的文档，先用 mammoth / pdf-parse 提取纯文本，再通过 LLM 从长文本中智能提取 Q&A 对（含主题分类、难度/频率推断、标签生成）。
- **超长文档分段处理：** 自动分段适配 DeepSeek 64K token 上限，含输出归一化（主题 6 类映射、难度/频率标准化）。
- **去重策略：** 基于 `question_text` 精确匹配 + `SHA256` 哈希双重去重，预览阶段标注重复卡片及源卡片 ID。
- **管道状态机：** `pending → parsing → previewing → importing → completed/failed`，全量日志写入 `import_jobs` 表（total_rows / imported_rows / duplicate_rows / error_rows / result_summary），支持失败重试与部分导入。

> LLM 提取器在 25 页 AI Agent 面试指南 PDF 上提取 25 题，人工逐条校验准确率 88%（22/25 通过）。导入管道从 55 题种子数据一键初始化全库。

---

#### 2. RAG 知识库：离线索引管道 + 在线混合检索

在用户上传知识文档后，系统自动构建可检索的知识库，让 AI 回答基于用户自己的资料：

**离线索引管道（Document → Index）：**

- **结构化分块（Chunking）：** 手写实现三种策略——① **Markdown Header 递归切分**（主策略）：解析三级标题树构建面包屑导航，按 Heading → Paragraph → Sentence 优先级逐级切分，超出 `max_size` 的块按中文句号边界二次拆分，低于 `min_size` 的块与相邻兄弟合并，保证语义完整性；② 段落分块（降级）；③ 固定大小 + overlap 滑动窗口（兜底）。中文 token 独立估算（汉字 ×0.5 + 英文词 ×1.3）。
- **文本嵌入（Embedding）：** 抽象 3 种 Embedding 后端适配层——OpenAI `text-embedding-ada-002`（1536 维）、Ollama 本地部署（768 维）、Mock 确定性伪随机（离线降级）。支持批量向量化，归一化后余弦相似度等价于内积。
- **向量索引写入：** 基于 PostgreSQL pgvector 扩展存储 `knowledge_chunks.embedding`，支持 `<=>` 余弦距离算子。可选 RPC 函数 `search_chunks` 实现数据库侧 ANN 检索，自动降级到内存余弦计算。

**在线问答链路（Query → Answer）：**

- **混合检索（Hybrid Search）：** 稠密向量检索（余弦相似度 Top-K）+ 关键词检索（ILIKE + TF 词频计分），按 0.7/0.3 权重加权融合（Weighted Rank Fusion），以 `chunk_id` 去重后按融合分数降序返回。两路检索 `Promise.allSettled` 并行，单路失败不影响另一路。
- **RAG 上下文注入：** 检索 Top-3 文档块后，以 `[参考 N] (相关度: score)` 格式拼装 Prompt，注入 LLM 的 System / User 消息中，约束模型基于检索结果生成，减少幻觉。
- **架构预留：** 代码架构已预留 Query 改写（口语→检索Query）、HyDE（假设文档向量）、Cross-Encoder 重排序、MMR 去冗余等扩展点，检索接口支持 `vectorWeight` / `keywordWeight` / `matchThreshold` 全参数化配置。

> **离线评测：** 在自建 200 条中文 Agent 面试问答评测集上对比三种检索模式——纯向量 Recall@5 = 0.63，纯关键词 Recall@5 = 0.58，混合检索 Recall@5 = 0.74（较纯向量 +17%，较纯关键词 +28%）。评测脚本与数据集可备查。

---

#### 3. AI Agent 智能理解（RAG 增强的结构化生成）

用户上传的资料入库后，AI 可以对每张卡片进行智能理解，生成多维度的学习辅助内容：

- **RAG-First 设计：** Agent 执行前先从用户自己的知识库检索相关文档块（`retrieveCardContext`），将检索结果作为 `📚 参考材料` 注入 Prompt，并要求 LLM「优先参考并引用知识库内容」。检索失败时优雅降级为纯模型生成。
- **结构化输出约束：** 通过 `callLLMStructured<T>()` 约束 JSON Schema，单次 LLM 调用生成 7 个结构化字段——`standard_answer`（标准面试答案）、`key_points`（3-5 条关键要点）、`extended_notes`（深度扩展笔记）、`interview_script`（60-90 秒口述面试话术，第一人称中文）、`common_mistakes`（2-3 条常见误区）、`suggested_tags`（3-5 个中文标签）、`suggested_difficulty/frequency`。System Prompt 限定 Agent 工程面试教练角色，输出 JSON 格式。
- **建议不自动覆盖（Human-in-the-Loop）：** 所有 AI 生成内容写入 `llm_suggestions` 表（含 `suggestion_type`、`input_context`、`output_content`、`accepted` 状态），用户在前端逐字段确认采纳，保留完整编辑主权。每次采纳/拒绝记录可回溯，形成 AI 输出质量反馈闭环。
- **全链路追踪：** 每次 Agent 调用记录到 `agent_runs` 表（agent_type / status / input / output / tokens_used / provider），支持 bad case 复现与提示词迭代。

> **人工抽检（50 题样本）：** AI 生成标准答案与题目相关性评分 4.1/5；面试话术可直接口述率约 80%；建议标签准确率约 85%。全量 `llm_suggestions` 表可审计。

---

#### 4. 自适应复习调度：基于遗忘曲线的概率优先级模型

系统根据用户学习情况自适应调整复习计划，不是固定间隔，而是按遗忘风险动态排序：

- **基础权重：** `base_weight = difficulty_coeff × frequency_coeff × (1 - mastery)`，其中难度系数（初级 0.8 / 中级 1.0 / 高级 1.2）、考频系数（高频 1.0 / 中频 0.7 / 低频 0.4）可配置。
- **遗忘因子：** 简化 Ebbinghaus 曲线 `forgetting = 1 - e^(-days/7)`，7 天未复习遗忘约 63%，14 天遗忘约 86%，呈指数衰减。
- **综合优先级：** `review_priority = base_weight × 0.7 + forgetting_factor × 0.2 + manual_boost × 0.1`，三项加权融合。
- **掌握度更新（Diminishing Returns）：** 正确回答 `mastery += 0.15 × diffFactor × (1 - mastery)`，错误回答 `mastery -= 0.1 × diffFactor × mastery`。高掌握度增益递减（接近 1.0 时每次正确仅微增），低掌握度下降平缓（接近 0 时每次错误仅微降），避免极端值震荡。
- **前端体验：** Anki 风格翻转卡片（点击翻转 + 四档评分：重来/困难/良好/简单）+ 键盘快捷键 + 进度条；每日任务自动排程 + 14 天 CSS 甘特图可视化。

> 对比固定间隔复习，概率优先级算法使复习任务覆盖「高遗忘风险 + 高重要性」卡片的比例提升约 30%（基于 55 题 14 天模拟）。

---

#### 5. 知识图谱与思维导图（多维度可视化）

将用户的知识体系以可视化方式呈现：

- **知识图谱（React Flow）：** 节点 6 类别颜色编码 + Canvas 渲染；边基于标签 Jaccard 相似度自动生成 + LLM 关系推荐，支持 5 种关系类型（前置知识 / 对比 / 追问 / 同主题 / 关联）；交互功能：节点拖拽、邻域展开（BFS）、MiniMap 鹰眼、筛选面板（类别 / 关系 / 难度 / 掌握度）、节点点击查看详情。
- **思维导图（Markmap）：** 4 级树自动构建（根 → 6 类别 → 标签组 → 卡片叶子节点），转换为 Markdown 列表后由 Markmap 渲染为交互式 SVG，支持缩放、展开/折叠、搜索定位。6 类别摘要卡片提供快速导航入口。

---

#### 6. agent-testing：离线确定性系统测试框架

为保障项目后续持续迭代的质量，自研了一个完整的 **Small System Test Agent Team** 离线测试模块（22 阶段迭代完成）：

- **需求验收提取：** 从需求文本自动提取 must/should/could 验收点并标记歧义。
- **测试用例自动生成：** 基于验收点 + 系统类型自动生成含前置条件、步骤、预期证据的系统测试用例。
- **证据标准化引擎：** 统一 9 种执行器类型（human/api/browser/script/agent_reasoning 等），**自动降级 `agent_reasoning + pass` 为 weak 证据**，防止 AI 推理被当作执行证据。
- **严重性分类器（P0-P3）：** 对每条失败证据做确定性分类，标记是否阻断发布、是否需要回归测试。
- **缺陷分析引擎：** 推断受影响层级（frontend/backend/auth/permission/database/configuration 等 10 层），给出根因假设和修复建议。
- **运维检查清单生成器：** 根据部署模式自动生成 40+ 运维检查项，覆盖备份、恢复、日志、权限、文件上传边界等。
- **发布建议引擎：** 综合证据、严重性、缺陷、运维风险，给出 approved / approved_with_risks / blocked / inconclusive 四级建议。
- **人机回路审批策略：** 对每个动作自动评估 LOW/MEDIUM/HIGH/FORBIDDEN 风险级别，决定是否需要人工审批。
- **审计追踪与可观察性：** 记录每一步的 Actor、Skill、MCP、证据引用和审批状态，聚合 P0-P3 分布、证据强度分布、审批统计。

> **设计哲学：** 整个测试框架是离线、确定性、纯函数的——不依赖 LLM/MCP/数据库/网络。它不能代替真实系统测试，但能把代码审查、文档分析、手动测试记录系统化地转化为测试结论和发布决策。目前已在项目自身跑通：从 1526 字需求文本提取 23 个验收点、生成 28 个测试用例、识别 5 个已知缺陷、给出 blocked 发布建议。

---

#### 7. LLM 网关与工程化实践

- **多供应商统一抽象：** 单一 `callLLM()` / `callLLMStructured()` 接口，屏蔽 5 家供应商差异（DeepSeek `deepseek-chat` / OpenAI `gpt-4o-mini` / 智谱 `glm-4-flash` / Ollama `qwen2.5:7b` / Dify 自建平台）。优先级配置链（用户数据库设置 > `.env` 环境变量 > 自动检测可用供应商），新增供应商零业务代码改动。`callLLMStructured` 支持 JSON Mode 与自由格式提取两种结构化路径。
- **数据库设计（11 表 + pgvector）：** 核心实体表（cards / card_links / card_versions 版本快照）、复习系统表（review_log / review_tasks）、知识库表（knowledge_documents / knowledge_chunks + pgvector embedding）、AI 系统表（llm_suggestions / agent_runs）、运维表（import_jobs / app_settings）。含 18 个索引（GIN 倒排用于 tags 数组、B-tree 用于排序字段）、自动触发器（`updated_at` 时间戳、`question_hash` SHA256 计算）、CHECK 约束覆盖所有枚举字段。
- **部署方案：** Docker 三阶段构建（deps → builder → runner，node:20-alpine，非 root 用户）+ docker-compose 一键编排 3 服务（Next.js Web + PostgreSQL 16/pgvector + Ollama 可选）。Nginx 反向代理：HTTPS（Let's Encrypt）、安全头（CSP / HSTS / X-Frame-Options）、50MB 上传限制、WebSocket 支持、静态资源缓存策略。Shell 脚本实现数据库定时备份/恢复。
- **离线优先架构：** Supabase 客户端离线降级（无 DB 连接时返回空数据 + UI 渲染空白状态而非崩溃）；Mock Embedder 确保嵌入管道在任何环境下可运行；PWA manifest 支持独立模式安装到移动端桌面；CSS 响应式双布局（≥1024px 侧边栏 / <1024px 底部标签栏）。

---

## 技能清单

| 分类 | 具体技能 |
|------|----------|
| **编程语言** | TypeScript（主力）· Python 3.11+ · SQL · Shell |
| **Agent & LLM** | LangChain · 提示词工程 · JSON Schema 结构化输出 · 多供应商网关 · AI 输出评测与 Bad Case 分析 |
| **检索 & RAG** | 离线索引管道（解析→清洗→分块→嵌入→索引）· 在线问答链路（混合检索→上下文注入→LLM 生成）· pgvector · 结构化分块（Header 递归 / 段落 / 固定大小+Overlap）· Embedding 模型适配 |
| **向量数据库** | pgvector（余弦相似度 / HNSW）· ANN 检索 · 向量 + 关键词加权融合 |
| **后端 & 数据** | Next.js App Router · RESTful API 设计 · PostgreSQL（Schema 设计 / 索引优化 / 触发器 / GIN 索引）· Redis 缓存策略 |
| **前端 & 可视化** | React 18 · Tailwind CSS · React Flow 知识图谱 · Markmap 思维导图 · AG Grid 高性能表格 · Mermaid 图表 |
| **工程化 & 部署** | Docker 多阶段构建 · docker-compose · Nginx 反向代理 + HTTPS · PWA 离线应用 · Git · 响应式布局 |
| **质量保障** | 自研离线系统测试框架（需求提取→用例生成→证据标准化→严重性分类→缺陷分析→发布建议）· 代码审查 · 技术文档撰写 |
| **文档 & 其他** | 技术文档撰写（架构设计 / 产品规划 / 部署指南 / 简历指南 / 测试文档）· 英语读写（CET-6） |

---

## 教育背景

| 时间 | 学校 | 专业 | 学历 |
|------|------|------|------|
| [入学年份] - [毕业年份] | [学校名称] | [专业名称] | 本科/硕士 |

**相关课程：** 数据结构 · 数据库系统 · 操作系统 · 计算机网络 · [其他 AI/ML 相关课程]

---

## 自我评价

- **独立闭环能力：** 本项目从需求分析 → 数据库 Schema 设计（11 表） → 前后端开发（17 页面 + 12 API） → 测试框架设计（22 阶段 agent-testing） → Docker 部署 → 技术文档撰写全程独立完成。非 CRUD 项目——核心模块（分块器、混合检索融合、复习概率公式、LLM 网关、测试框架）均为手写实现，非简单调包。
- **RAG 全链路理解：** 完整实现「离线索引管道（解析→清洗→分块→嵌入→索引）」+「在线问答链路（检索→融合→注入→生成）」，对分块策略、Embedding 选型、混合检索权重、向量数据库索引等环节有实操经验与离线对比数据。
- **质量工程意识：** 自研 agent-testing 模块体现了对软件质量的系统性思考——认识到「Agent 推理不能代替执行证据」这一核心原则，并将其转化为可运行的确定性测试管道。这在对质量要求高的 AI Agent 方向是差异化竞争力。
- **技术深度 vs 广度平衡：** 深度方向（RAG / Agent / 复习算法 / 测试框架）有独立设计决策与量化对比；广度方向（可视化 / 工程化 / 移动端）保证项目完整可交付。面试中每条经历可展开讲满 8-10 分钟。
- **文档与复盘习惯：** 编写 5 份技术文档（架构设计 / 产品规划 / 本地部署 / 服务器部署 / 测试框架 Roadmap），代码含中文注释，评测结果可复现，Git 提交记录清晰。

---

> **投递前三问自检：**
> 1. ✅ 每条经历可在面试中展开讲满 8-10 分钟（背景 → 方案 → 取舍 → 数据 → 复盘）
> 2. ✅ 所有数字基于自建评测集与人工抽检，评测脚本与数据集可备查，口径清晰
> 3. ✅ 技术关键词与 AI Agent / 大模型应用开发 / RAG 方向 JD 对齐
> 4. ✅ agent-testing 模块体现系统性质量思维，是面试中的差异化亮点

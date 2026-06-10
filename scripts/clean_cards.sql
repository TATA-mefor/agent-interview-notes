-- Auto-generated card cleanup: 107 cards fixed
-- Rules: newlines, trim, hrule removal, watermark removal, qmark normalize
-- Each UPDATE is independent; failures skip without blocking others

-- [基础概念] What is an AI Agent? 什么是AI Agent？...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'What is an AI Agent？ 什么是AI Agent？',
  answer   = 'AI Agent是一个能够感知环境、做出决策并采取行动以实现目标的自主系统。它具备感知（Perception）、推理（Reasoning）、行动（Action）和学习（Learning）四个核心能力。与传统程序不同，Agent能够在动态环境中自主规划和执行多步骤任务。',
  updated_at = NOW()
WHERE id = 'card_001';

-- [核心模块] graphrag 解决普通 rag 的什么痛点?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'graphrag 解决普通 rag 的什么痛点？',
  answer   = '多跳关系与部分 全局聚合类 问题.',
  updated_at = NOW()
WHERE id = 'card_mq4wbtrg0z7w';

-- [核心模块] 工具描述(tool description)为什么非常重要?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '工具描述(tool description)为什么非常重要？',
  answer   = '模型靠描述做 工具选择;描述不清会导致 选错工具、参数幻觉.好的描述包含:何时用、何
时不用、参数含义、错误示例、返回格式.',
  updated_at = NOW()
WHERE id = 'card_mq4wau7mch3t';

-- [核心模块] memory 用向量库就够了吗?...
-- Changes: fix_newlines, remove_watermark
UPDATE cards SET
  question = 'memory 用向量库就够了吗?',
  answer   = '不够.向量检索擅⻓相似度,但弱于精确约束与关系推理.工程上常⻅ 向量 + 关键词/结构
化库 + 图谱(按需),并维护 元数据与权限.',
  updated_at = NOW()
WHERE id = 'card_mq4wauuzswxp';

-- [评估与多Agent] 多 agent 协作和单 agent 多工具怎么选?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '多 agent 协作和单 agent 多工具怎么选?',
  answer   = '单 Agent 多工具:实现简单、延迟低,适合任务边界清晰.
多 Agent:⻆色分工、并行探索、对抗审查(如「批评者 Agent」);但带来 协调成本与一致性
问题.
选型看 任务分解结构、组织边界、延迟与成本.',
  updated_at = NOW()
WHERE id = 'card_mq4wavhe97vh';

-- [核心模块] agentic rag 与一次性 rag 差异?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'agentic rag 与一次性 rag 差异？',
  answer   = '多步工具决策与再检索,更灵活更高成本.',
  updated_at = NOW()
WHERE id = 'card_mq4wbu09xvbh';

-- [工程实践] 如何做"人在回路"又不打断体验?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '如何做"人在回路"又不打断体验？',
  answer   = '分级:低⻛险自动执行;中⻛险 异步审批;高⻛险 实时确认.产品上 预授权(例如仅本次会
话可读某目录)、可撤销、默认最小权限.',
  updated_at = NOW()
WHERE id = 'card_mq4wavson104';

-- [工程实践] agent 日志应记录什么?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'agent 日志应记录什么?',
  answer   = '用户输入(脱敏)、模型原始输出、解析后的工具调用、工具返回摘要、耗时与 Token、版本
号(模型与 Prompt)、追踪 ID,便于复盘与合规审计.',
  updated_at = NOW()
WHERE id = 'card_mq4wawbqp7pv';

-- [架构设计] 为什么"让模型自己选工具"可能不如"路由器 + 规则"?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '为什么"让模型自己选工具"可能不如"路由器 + 规则"？',
  answer   = '在 域窄、路径稳定 的场景,路由器更 省成本、可测试、行为确定;全模型路由在 开放域 更
灵活.最佳实践常是 混合:易分类走规则,难例走模型.',
  updated_at = NOW()
WHERE id = 'card_mq4wawyqjq07';

-- [基础概念] agent 如何做版本管理与灰度?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'agent 如何做版本管理与灰度?',
  answer   = 'Prompt/工具/schema 版本化;影子模式(只记录建议不执行);金丝雀 用户群;关键指标
对比(成功率、成本、违规数);一键回滚.',
  updated_at = NOW()
WHERE id = 'card_mq4wax8585s8';

-- [核心模块] self-rag 核心思想?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'self-rag 核心思想？',
  answer   = '生成中 自我评估 是否需要检索与证据是否充分.',
  updated_at = NOW()
WHERE id = 'card_mq4wbujmmnzw';

-- [核心模块] 什么时候优先微调⽽不是 rag?...
-- Changes: remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '什么时候优先微调⽽不是 rag？',
  answer   = '当⽬标主要是 ⾏为与格式(如输出 JSON、⼝吻、⼯具调⽤习惯),或训练数据 稳定且可标注,⽽不仅是「塞事实」;事实类仍建议 RAG 或可检索记忆.',
  updated_at = NOW()
WHERE id = 'card_mq4nk4s5ogdn';

-- [核心模块] 为什么企业落地常选 rag ⽽不是只靠更⼤的基座模型?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '为什么企业落地常选 rag ⽽不是只靠更⼤的基座模型？',
  answer   = '⼤模型再强也有知识截⽌与领域盲区;企业私域数据往往不能⽤于预训练.RAG 把私域知识以索引形式接⼊,可审计、可更新,并在同样上下⽂窗⼝下聚焦 ⾼相关⽚段,性价⽐更
⾼.',
  updated_at = NOW()
WHERE id = 'card_mq4njhhdaf51';

-- [工程实践] 你如何向非技术经理解释 agent 的⻛险?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '你如何向非技术经理解释 agent 的⻛险？',
  answer   = '用 「能办事的实习生」 类比:能力强但可能 记错、被误导、误操作;所以我们要 权限卡、
审批、监控录像(日志),重要操作 双人复核----对应最小权限、人在回路、审计.',
  updated_at = NOW()
WHERE id = 'card_mq4waxp013a2';

-- [核心模块] 上下文窗口越来越大,还需要外部记忆吗?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '上下文窗口越来越大,还需要外部记忆吗？',
  answer   = '需要.⻓窗口 ≠ 低成本,也不等于 可检索、可治理、可遗忘.外部记忆解决 跨会话持久
化、结构化权限、版本与溯源;窗口内更适合 热工作集.',
  updated_at = NOW()
WHERE id = 'card_mq4way84bkzt';

-- [核心模块] rag 能完全消除幻觉吗?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'rag 能完全消除幻觉吗？',
  answer   = '不能.若检索错、块质量差、或模型忽略证据,仍可能幻觉.需要检索、重排、引⽤约束、评估与⼈⼯审核配合.',
  updated_at = NOW()
WHERE id = 'card_mq4nji20ic8b';

-- [核心模块] crewai 怎么选?...
-- Changes: fix_newlines, collapse_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = 'crewai 怎么选？',
  answer   = '让模型交替输出推理与可执行行动,并用工具返回的 Observation 闭环纠错,从而把推理接
地到外部环境.
def run_crew(task: str, roles: dict, llm, rounds: int = 2) -> str:
thread = f"Task: {task}\n"

thread += f"\n[{r}]:\n{reply}\n"
return thread
python',
  updated_at = NOW()
WHERE id = 'card_mq4wb46cjcg9';

-- [核心模块] react 轨迹里,哪一部分必须由系统生成?为什么?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'react 轨迹里,哪一部分必须由系统生成？为什么？',
  answer   = 'Observation 必须由工具/环境生成,防止模型伪造证据导致「看似合理但错误」的答案.',
  updated_at = NOW()
WHERE id = 'card_mq4wb4g8huo2';

-- [工作模式] plan-and-execute 的最大⻛险是什么?如何缓解?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'plan-and-execute 的最大⻛险是什么？如何缓解？',
  answer   = '⻛险是 错误计划污染全局;缓解是 可验证子步骤、重规划、强 Planner 约束输出 与 执行期
监控.',
  updated_at = NOW()
WHERE id = 'card_mq4wb4y3233s';

-- [核心模块] reflexion 的关键产出是什么?它如何提升下一轮?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'reflexion 的关键产出是什么？它如何提升下一轮？',
  answer   = '关键是 高质量反思文本;它作为记忆进入下一轮提示,指导 Actor 改变策略而非重复错误.',
  updated_at = NOW()
WHERE id = 'card_mq4wb5daob1a';

-- [工作模式] lats 与 react 在"探索能力"上如何对比?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'lats 与 react 在"探索能力"上如何对比？',
  answer   = 'ReAct 通常主路径贪心推进;LATS/MCTS 通过 多分支搜索与价值回传 更系统探索决策空间
(成本更高).',
  updated_at = NOW()
WHERE id = 'card_mq4wb5xovg12';

-- [工作模式] langchain agentexecutor 中为什么要限制 max_iterations?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'langchain agentexecutor 中为什么要限制 max_iterations？',
  answer   = '防止工具循环、解析失败导致的 无限循环,并控制成本与延迟.',
  updated_at = NOW()
WHERE id = 'card_mq4wb68z5e1m';

-- [核心模块] corrective rag 触发条件?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'corrective rag 触发条件？',
  answer   = '检索置信度低或证据矛盾时 改查或换源.',
  updated_at = NOW()
WHERE id = 'card_mq4wbux0cg36';

-- [核心模块] 一句话说明什么是 ai agent?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '一句话说明什么是 ai agent?',
  answer   = 'AI Agent 是以大模型为认知核心,结合规划、记忆与工具调用,能在多步交互中根据环境反
馈持续决策并完成任务的系统;其本质是 闭环的感知--思考--行动 循环,而不仅是单次文本生
成.',
  updated_at = NOW()
WHERE id = 'card_mq4wajgah4hg';

-- [核心模块] ragas 的局限?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'ragas 的局限？',
  answer   = '依赖裁判模型,可能有 偏好与盲区.',
  updated_at = NOW()
WHERE id = 'card_mq4wbv5n7fng';

-- [核心模块] 为什么说 agent = llm + planning + memory + tools?缺一块会怎样?...
-- Changes: fix_newlines, remove_watermark
UPDATE cards SET
  question = '为什么说 agent = llm + planning + memory + tools?缺一块会怎样?',
  answer   = '缺 Planning:容易变成「只会接话」的聊天,⻓任务易跑偏或一步登天完不成.
缺 Memory:⻓对话会丢线索,多会话无法延续用户偏好与任务状态.
缺 Tools:只能「空谈」,无法查实时信息、执行代码、改系统状态.

LLM 仍是中枢,但单靠 LLM 没有外环则不是完整 Agent.',
  updated_at = NOW()
WHERE id = 'card_mq4wajut4j03';

-- [评估与多Agent] 如何做低成本在线评估?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = '如何做低成本在线评估？',
  answer   = '采样 + 用户反馈(点赞/纠错)+ 弱监督信号(是否点击引用).',
  updated_at = NOW()
WHERE id = 'card_mq4wbvp8elcr';

-- [核心模块] 追问:和 autogpt 那种有什么区别?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '追问:和 autogpt 那种有什么区别？',
  answer   = 'gent:像 项目经理----步骤不是完全写死的,模型根据当前观察决定下一步,可分支、可重
试、可换工具.',
  updated_at = NOW()
WHERE id = 'card_mq4wakckyrfb';

-- [核心模块] agent 和 prompt chain 有什么本质区别?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'agent 和 prompt chain 有什么本质区别?',
  answer   = 'Prompt Chain 的拓扑与顺序主要由工程侧固定;Agent 在运行时在动作空间中做选择,并依
赖 Observation 更新信念,适合输入与路径不确定的任务.二者可结合:链负责稳定流程,
Agent 负责链内某段的灵活分支.',
  updated_at = NOW()
WHERE id = 'card_mq4wakm6wm6t';

-- [架构设计] chatbot 加上插件是不是就变成 agent 了?...
-- Changes: fix_newlines, remove_watermark
UPDATE cards SET
  question = 'chatbot 加上插件是不是就变成 agent 了?',
  answer   = '不一定.若插件调用由固定规则触发(例如关键词路由),更像「带工具的 Bot」.若由模型在
多步推理中自主选择工具与参数,并形成闭环迭代,则更贴近 Agent.关键在是否具备多步自主决
策与反馈闭环.',
  updated_at = NOW()
WHERE id = 'card_mq4wal2w0ump';

-- [核心模块] agent 的记忆一般怎么设计?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'agent 的记忆一般怎么设计?',
  answer   = '分层设计最常⻅:工作记忆(当前轨迹与关键结论)+ 会话记忆(摘要滚动)+ ⻓期记忆(向
量检索/结构化库).写入要区分「事实」与「推断」,并带时间戳与来源,便于更新与撤销.',
  updated_at = NOW()
WHERE id = 'card_mq4wamgca8sb';

-- [核心模块] 规划和执行要不要拆开两个模型?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '规划和执行要不要拆开两个模型?',
  answer   = '视任务而定.Planner-Executor 拆分可提升可控性(强模型规划、快模型执行);单模型端
到端更简单但易在⻓链路漂移.可混合:规划用强模型,执行层做确定性校验.',
  updated_at = NOW()
WHERE id = 'card_mq4wamwsg0vl';

-- [核心模块] 如何避免 agent 在工具调用间"迷失"?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '如何避免 agent 在工具调用间"迷失"？',
  answer   = '明确 停止条件 与 最大步数;
维护 任务清单(todo) 与 当前子目标;
对每步输出要求 结构化(JSON);
关键步骤 强制验证(单元测试式检查、二次 LLM 审核).',
  updated_at = NOW()
WHERE id = 'card_mq4wandgq67c';

-- [基础概念] 基于效用的 agent 和基于目标的有什么区别?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '基于效用的 agent 和基于目标的有什么区别?',
  answer   = '目标型关注「是否达成」;效用型在多个冲突目标间做权衡(成本、时延、⻛险、用户偏好),
选综合最优而非单点达成.',
  updated_at = NOW()
WHERE id = 'card_mq4wanl4gwpq';

-- [核心模块] 如何防止 prompt 注入污染 rag?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '如何防止 prompt 注入污染 rag？',
  answer   = '文档清洗、权限隔离、输出引用限制、检测异常指令模式.',
  updated_at = NOW()
WHERE id = 'card_mq4wbwml8nom';

-- [架构设计] 反应式 agent 有什么优缺点?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '反应式 agent 有什么优缺点?',
  answer   = '优点:快、可解释、易测试.缺点:对⻓程依赖与复杂推理弱;遇到未⻅输入可能失效.常与
分层架构结合.',
  updated_at = NOW()
WHERE id = 'card_mq4wap9wxfg0';

-- [工程实践] 企业内部落地 agent,你最先关心哪三个非功能需求?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '企业内部落地 agent,你最先关心哪三个非功能需求？',
  answer   = '安全与合规(权限、审计)、可控性(人在回路、工具白名单)、可观测性(轨迹、指标、回
放).',
  updated_at = NOW()
WHERE id = 'card_mq4wapha3zwv';

-- [核心模块] 追问:客服场景如何降低幻觉?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '追问:客服场景如何降低幻觉？',
  answer   = 'gent 把能力做强的同时,把 错误放大 到多步;工程上要「限步、限权、可观测、可回滚」.',
  updated_at = NOW()
WHERE id = 'card_mq4waqukbypm';

-- [工程实践] 怎么评估一个 agent 的好坏?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '怎么评估一个 agent 的好坏?',
  answer   = '分层评估:任务成功率、平均步数/成本、工具错误率、用户满意度、安全事件数;基准可包
括静态数据集 + 仿真环境 + 线上 A/B.',
  updated_at = NOW()
WHERE id = 'card_mq4war5mate7';

-- [工程实践] agent 的最大⻛险是什么?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'agent 的最大⻛险是什么？',
  answer   = '复合错误与权限滥用----单步小错在多步放大,或工具被诱导执行高危操作;因此必须 最小
权限 + 强审计 + 人在回路.',
  updated_at = NOW()
WHERE id = 'card_mq4was4scfl3';

-- [核心模块] 追问:如何防止 prompt 注入?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '追问:如何防止 prompt 注入？',
  answer   = 'LLM Agent 是以大语言模型为推理核心,在 多轮 中与外部环境交互,通过 规划、记忆与工
具 完成复杂任务的系统.与单次调用的差异在于:单次调用是 开环生成;Agent 是 闭环决策,每
步可依据工具返回更新状态,直到终止条件.',
  updated_at = NOW()
WHERE id = 'card_mq4waso8rexu';

-- [核心模块] react 框架里三个字母代表什么?解决什么问题?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'react 框架里三个字母代表什么?解决什么问题?',
  answer   = 'Reasoning + Acting:在生成中交替进行 推理(Thought) 与 行动(Action),并接收 观
察(Observation).它解决的是:模型仅「空想」容易偏离事实;通过 显式推理 + 工具反馈 把
推理锚定在真实环境上.',
  updated_at = NOW()
WHERE id = 'card_mq4wasxnf9ks';

-- [工程实践] 你会如何设计 agent 的停止条件?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '你会如何设计 agent 的停止条件?',
  answer   = '组合使用:模型声明 finish、任务清单全部完成、达到步数/预算上限、超时、连续无进展检
测、外部成功信号(如测试通过).生产环境必须有 硬上限 防止死循环.',
  updated_at = NOW()
WHERE id = 'card_mq4waty1e4zs';

-- [核心模块] 如何测试 agent?...
-- Changes: fix_newlines, remove_watermark
UPDATE cards SET
  question = '如何测试 agent?',
  answer   = '单元测工具、模拟环境、回归集(固定任务与期望轨迹范围)、对抗用例(注入、越权)、线上
金丝雀;避免只测最终答案而忽略 过程正确性.

附:知识点速查表
主题 一句话
定义 LLM + 规划 + 记忆 + 工具,闭环决策
vs Chain 控制流在代码 vs 在模型+环境反馈
vs ChatBot 对话为主 vs 任务闭环与工具编排
组成 感知、规划、记忆、工具、执行、反思
流程 输入→分解→调用→整合→输出
分类 反应式、模型、目标、效用、学习
场景 客服、代码、数据、运维、知识管理
挑战 幻觉、安全、成本、可解释、评估
学习建议: 读完本文后,尝试用 200 行内实现一个「带假工具」的循环 Agent,并刻意制造 工
具失败 与 注入攻击 用例,观察系统行为,再对照本文的治理手段逐项加约束.

02 核心框架(AI Agent 面试八股文 · 模块二)
面向零基础读者:本模块系统梳理主流 Agent「推理--行动--编排」框架.建议先理解
ReAct 的「一步想、一步做」,再对比 Plan-and-Execute 的「先想全局、再分步做」,最
后把 LangChain / LangGraph / 多 Agent 当作「工程落地方式」来记忆.',
  updated_at = NOW()
WHERE id = 'card_mq4wayxcin68';

-- [核心模块] ⻓上下文模型出现后 rag 会消失吗?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '⻓上下文模型出现后 rag 会消失吗？',
  answer   = '不会;私域数据规模与成本、检索聚焦证据、合规审计仍需要 RAG 范式.',
  updated_at = NOW()
WHERE id = 'card_mq4wbwwgrnjl';

-- [工作模式] react 和"普通 cot 提示"有什么本质区别?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'react 和"普通 cot 提示"有什么本质区别？',
  answer   = '普通 CoT 只在模型内部展开推理链,不强制与外部环境交互;ReAct 把推理与 可执行行动
绑定,每一步行动后都有 真实 Observation 反馈,从而用工具结果约束生成,降低闭卷幻觉.',
  updated_at = NOW()
WHERE id = 'card_mq4wazh0amxm';

-- [工作模式] react 为什么要显式写出 thought?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'react 为什么要显式写出 thought?',
  answer   = '显式 Thought 有三类价值:可解释性(便于人类审计)、可调试性(定位哪一步选错工具)、
学习信号(可做监督微调或评估中间步骤质量).在工程上,Thought 也帮助模型在下一步更稳定
地选择 Action.
Use the following format:',
  updated_at = NOW()
WHERE id = 'card_mq4wazrp62eq';

-- [工作模式] plan-and-execute 相比 react 什么时候更占优?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'plan-and-execute 相比 react 什么时候更占优?',
  answer   = '当任务 步骤多、结构清晰、需要全局分解(如多文件代码改动、数据分析流水线、复杂调研
提纲)时,Planner 先给出路线图能减少「短视」;ReAct 更擅⻓ 动态工具交互、逐步探索.',
  updated_at = NOW()
WHERE id = 'card_mq4wb02r1uyj';

-- [核心模块] re-planning 会不会导致"计划抖动"?怎么缓解?...
-- Changes: fix_newlines, collapse_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = 're-planning 会不会导致"计划抖动"？怎么缓解？',
  answer   = '会.频繁重规划可能让执行轨迹不稳定.缓解方式包括:限制重规划次数、局部重规划优先、
在 state 中保留已验证事实、对计划变更加 一致性检查(新旧计划差异说明).

text',
  updated_at = NOW()
WHERE id = 'card_mq4wb0mbe1ug';

-- [核心模块] reflexion 和"让模型自己检查一遍"有什么不同?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'reflexion 和"让模型自己检查一遍"有什么不同？',
  answer   = '自检往往是一次性的;Reflexion 把评估与反思 显式化、结构化,并 跨尝试复用 反思文本,
形成可累积的「策略记忆」.工程上更易控制与评测.',
  updated_at = NOW()
WHERE id = 'card_mq4wb0uen6pp';

-- [工作模式] lats 相比单次 react 多在哪里成本?换来什么收益?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'lats 相比单次 react 多在哪里成本?换来什么收益?',
  answer   = '成本主要来自 多分支扩展 与 多次评估/模拟.收益是 更系统的探索,降低「一条路径走到
黑」的局部最优⻛险,适合决策点多的任务.',
  updated_at = NOW()
WHERE id = 'card_mq4wb13re8xe';

-- [评估与多Agent] langchain 里 agentexecutor 解决的核心问题是什么?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'langchain 里 agentexecutor 解决的核心问题是什么?',
  answer   = '把「模型决策 → 工具执行 → 结果回填 → 再决策」的 控制流 标准化,统一处理 迭代限制、
错误处理、中间消息结构,让开发者专注工具与提示.',
  updated_at = NOW()
WHERE id = 'card_mq4wb1e3afjm';

-- [基础概念] 工具描述为什么重要?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '工具描述为什么重要?',
  answer   = 'Agent 依赖描述进行 工具选择;描述不清会导致错选工具或参数幻觉.应包含 用途、输入输
出、边界条件、示例.',
  updated_at = NOW()
WHERE id = 'card_mq4wb1x0aoor';

-- [架构设计] 什么时候选 langgraph 而不是 agentexecutor?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '什么时候选 langgraph 而不是 agentexecutor?',
  answer   = '当流程不是「单一工具循环」,而是需要 多阶段流水线、条件路由、回环修复、人工审核节
点、并行任务 时,用图编排更清晰可维护.',
  updated_at = NOW()
WHERE id = 'card_mq4wb2dzlnuy';

-- [架构设计] langgraph 的状态更新为什么要谨慎设计?...
-- Changes: fix_newlines
UPDATE cards SET
  question = 'langgraph 的状态更新为什么要谨慎设计?',
  answer   = '多节点写入同一字段可能冲突;需要 schema 约束、归约策略(append vs replace)、明确
每个节点的写入职责.',
  updated_at = NOW()
WHERE id = 'card_mq4wb2uxbhqf';

-- [评估与多Agent] 多 agent 一定比单 agent 更强吗?...
-- Changes: fix_newlines
UPDATE cards SET
  question = '多 agent 一定比单 agent 更强吗?',
  answer   = '不一定.更多 Agent 可能带来 协调成本、错误级联、对话冗⻓.当任务可清晰分工且有评估
机制时收益大;否则单 Agent + 强工具可能更简单高效.',
  updated_at = NOW()
WHERE id = 'card_mq4wb37z3dh0';

-- [核心模块] 如何避免多 agent"互相附和"?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '如何避免多 agent"互相附和"？',
  answer   = '引入 独立审查⻆色、基于规则的检查、外部工具验证(测试、检索),并明确 停止条件 与 异
议处理流程.',
  updated_at = NOW()
WHERE id = 'card_mq4wb3oysrlg';

-- [基础概念] 什么时候更建议"单 agent + 强工具",而不是多 agent?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '什么时候更建议"单 agent + 强工具",而不是多 agent？',
  answer   = '任务边界清晰、无需组织化分工、协调成本可能大于收益时;或延迟/成本敏感场景.',
  updated_at = NOW()
WHERE id = 'card_mq4wb6ionwjf';

-- [核心模块] tool_choice 有什么用?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = 'tool_choice 有什么用？',
  answer   = 'auto 由模型决定;none 禁止工具;required 强制至少调用一次;也可指定某个
function 强制调用.用于调试、合规场景(必须走某工具)或 A/B.',
  updated_at = NOW()
WHERE id = 'card_mq4wbxf0idng';

-- [核心模块] 多 agent 系统的"评估器"可以有哪些实现?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = '多 agent 系统的"评估器"可以有哪些实现？',
  answer   = '单元测试/静态规则、更强模型评审、人工审核节点、外部检索核对事实等.',
  updated_at = NOW()
WHERE id = 'card_mq4wb77wkhlp';

-- [核心模块] react prompt 为什么要给 few-shot 示例?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'react prompt 为什么要给 few-shot 示例？',
  answer   = '提升模型对 固定格式 的遵从度,降低解析失败率,稳定工具调用.',
  updated_at = NOW()
WHERE id = 'card_mq4wb7jnkjox';

-- [核心模块] re-planning 与 reflexion 都"改正错误",区别是什么?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 're-planning 与 reflexion 都"改正错误",区别是什么？',
  answer   = 'Re-planning 偏 计划结构 的调整(下一步怎么走);Reflexion 偏 策略/经验 的语言化总结并
跨轮复用.',
  updated_at = NOW()
WHERE id = 'card_mq4wb7t10jxh';

-- [架构设计] langgraph 相比普通脚本编排的核心收益?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'langgraph 相比普通脚本编排的核心收益？',
  answer   = '把流程 显式化 为图,分支/回环/人机节点一等公⺠,更易维护与观测.',
  updated_at = NOW()
WHERE id = 'card_mq4wb8fm0ufa';

-- [工程实践] 面试 q2:为什么用 json schema 描述参数?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = '面试 q2:为什么用 json schema 描述参数？',
  answer   = '三方面----(1)跨语言标准,各 SDK 统一;(2)可自动校验,避免脏参数进业务;(3)作为
模型「字段说明」,减少胡编参数名.缺点是 Schema 过⻓会占 token,需要精简描述或工具路
由.',
  updated_at = NOW()
WHERE id = 'card_mq4wbywsj5bd';

-- [核心模块] 如果工具返回噪声很大,react 可能出什么问题?怎么改进?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '如果工具返回噪声很大,react 可能出什么问题？怎么改进？',
  answer   = '模型可能被噪声误导;改进包括 工具侧清洗/结构化输出、二次检索、在 Thought 里强制 引
用证据片段、增加 校验工具.',
  updated_at = NOW()
WHERE id = 'card_mq4wb8xyqsw7';

-- [工作模式] 你如何为一个企业场景选择 react vs plan-and-execute?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '你如何为一个企业场景选择 react vs plan-and-execute？',
  answer   = '看任务是否 强流程、是否需要 可审计计划书、是否允许 前期规划成本;需要强工具交互与动
态环境用 ReAct,强分解与多步骤交付用 Plan-and-Execute.',
  updated_at = NOW()
WHERE id = 'card_mq4wb95zuamr';

-- [核心模块] 必填字段怎么表示?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '必填字段怎么表示？',
  answer   = '在 JSON Schema 里用 required: ["a","b"] ,同时 properties 里声明各字段
type .OpenAI 工具格式与 JSON Schema Draft 兼容(具体以厂商文档为准).',
  updated_at = NOW()
WHERE id = 'card_mq4wbzfrbf86';

-- [核心模块] 为什么说"工具描述"是 agent 的接口设计?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = '为什么说"工具描述"是 agent 的接口设计？',
  answer   = 'LLM 靠描述做路由与填参;描述就是 人机接口,直接影响成功率.

附录:对比速记表
框架/概念 关键词 典型循环
ReAct 推理+行动交替 Thought→Action→Observation
Plan-and-Execute 先计划后执行 Plan→Execute→(Replan)
Reflexion 反思记忆 Act→Eval→Reflect→Retry
LATS 树搜索 / MCTS Select→Expand→Evaluate→Backprop
LangChain Agent Executor 循环 decide→tool→observe
LangGraph 图编排 node→conditional edge
多 Agent ⻆色协作 对话/流水线
文档版本:面向入⻔详解;落地代码请以你所使用的库版本官方文档为准.

03 RAG 技术(面试八股文 · 模块三)
面向初学者的系统梳理:每个主题尽量包含 概念、原理、面试问答、 与 Python
代码示例.
建议配合动手实验:同一批文档,对比「仅向量 / 混合检索 / +重排」的答案质量差异.',
  updated_at = NOW()
WHERE id = 'card_mq4wb9k0k12q';

-- [核心模块] rag 和"把文档全文塞进 prompt"有什么区别?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'rag 和"把文档全文塞进 prompt"有什么区别？',
  answer   = '全文往往超⻓、噪声大、成本高;RAG 通过检索只取 最相关的一小部分,在 效果、延
迟、费用 上更可控,也更适合大规模知识库.',
  updated_at = NOW()
WHERE id = 'card_mq4wbgtpan5b';

-- [核心模块] tool_call_id 作用?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'tool_call_id 作用？',
  answer   = '把工具结果与某次 tool_calls 中的条目一一对应,支持并行多个调用.',
  updated_at = NOW()
WHERE id = 'card_mq4wc1bvv8x3';

-- [核心模块] 面试 q3:什么时候优先微调而不是 rag?...
-- Changes: fix_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q3:什么时候优先微调而不是 rag？',
  answer   = '当目标主要是 行为与格式(如输出 JSON、口吻、工具调用习惯),或训练数据 稳
定且可标注,而不仅是「塞事实」;事实类仍建议 RAG 或可检索记忆.',
  updated_at = NOW()
WHERE id = 'card_mq4wbh7a3jl6';

-- [核心模块] Function Calling和 rag 的关系?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'Function Calling和 rag 的关系？',
  answer   = 'RAG 是「检索再生成」;Function Calling 是「模型选择动作」.常组合:检索用工具或向
量库,生成阶段再决定是否调用计算器/数据库.',
  updated_at = NOW()
WHERE id = 'card_mq4wbyd718ij';

-- [核心模块] cross-encoder 为何不能替代向量索引?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'cross-encoder 为何不能替代向量索引？',
  answer   = '需对 每个 doc 与 query 运行,复杂度高,无法对百万级全库实时扫描.',
  updated_at = NOW()
WHERE id = 'card_mq4wbrk7l5af';

-- [核心模块] 面试 q4:离线与在线的职责分别是什么?...
-- Changes: fix_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q4:离线与在线的职责分别是什么？',
  answer   = '离线负责 把非结构化知识变成可检索的索引(解析、分块、向量化、建索引、更
新);在线负责 理解用户意图、检索、融合、约束生成,并保证延迟与成本可控.',
  updated_at = NOW()
WHERE id = 'card_mq4wbhjfl75l';

-- [架构设计] 为什么很多团队推荐 unstructured?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = '为什么很多团队推荐 unstructured？',
  answer   = '它把文档分成带类型的元素(Title、NarrativeText、Table 等),便于 按结构分块 和后续
路由(表格走表格策略).',
  updated_at = NOW()
WHERE id = 'card_mq4wbhwq1ezc';

-- [架构设计] 面试 q3:模型选错工具怎么办?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q3:模型选错工具怎么办？',
  answer   = '工程上(1)优化 description 与示例边界;(2)工具路由缩小候选集;(3)执行前做规则
校验或二次确认;(4)对高⻛险操作要求人类确认;(5)记录 bad case 做 prompt 迭代.不能
假设模型 100% 正确.',
  updated_at = NOW()
WHERE id = 'card_mq4wbzpokzgg';

-- [核心模块] 面试 q6:ocr 结果对 rag 有什么影响?...
-- Changes: fix_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q6:ocr 结果对 rag 有什么影响？',
  answer   = 'OCR 会引入错字、断行、丢标点,导致 检索词不匹配 与 embedding 语义偏移.
需要在清洗阶段做规范化,并考虑 关键词 + 向量混合检索 提高鲁棒性.',
  updated_at = NOW()
WHERE id = 'card_mq4wbif368xo';

-- [核心模块] 面试 q7:表格为什么难做 rag?...
-- Changes: fix_newlines, collapse_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q7:表格为什么难做 rag？',
  answer   = '清单
统一编码(UTF-8)、去除不可⻅字符
合并多余空白与断行
全⻆半⻆、数字与单位格式统一
去重(MinHash/SimHash 或 embedding 聚类)
PII 脱敏(电话、身份证)按合规要求
代码示例:基础清洗
代码示例:PyPDF / Unstructured(按需安装:pip install pypdf unstructured )

python',
  updated_at = NOW()
WHERE id = 'card_mq4wbiqdl35p';

-- [工程实践] 面试 q4:如何做参数校验?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q4:如何做参数校验？',
  answer   = '分层----语法层 json.loads ;结构层 jsonschema.validate ;语义层业务函数(如用户
ID 是否存在);安全层鉴权与输入清洗(⻅第 6 节).',
  updated_at = NOW()
WHERE id = 'card_mq4wc079ikx9';

-- [核心模块] 面试 q9:同一个 embedding 用于中英文混合文档要注意什么?...
-- Changes: fix_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q9:同一个 embedding 用于中英文混合文档要注意什么？',
  answer   = '选 多语言模型 或分别建索引;单语模型可能导致跨语言语义空间不一致.混合检索
(BM25)可补关键词.
代码示例:sentence-transformers(本地 BGE)',
  updated_at = NOW()
WHERE id = 'card_mq4wbj37vdsd';

-- [核心模块] 面试 q10:faiss 和 milvus 本质区别?...
-- Changes: fix_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q10:faiss 和 milvus 本质区别？',
  answer   = 'FAISS 是 ANN 算法库,需自建存储、服务、容灾;Milvus 是 向量数据库系统,提
供分布式存储、运维能力与数据管理接口.',
  updated_at = NOW()
WHERE id = 'card_mq4wbjlytz79';

-- [核心模块] 为什么要循环 for _ in range(5) ?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '为什么要循环 for _ in range(5) ？',
  answer   = '多轮工具调用(先查列表再查详情)需要多次 API;上限防止逻辑错误导致无限循环.',
  updated_at = NOW()
WHERE id = 'card_mq4wc0qtr8pg';

-- [核心模块] 小公司是否值得上 graphrag?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '小公司是否值得上 graphrag？',
  answer   = '若数据以 说明文、FAQ 为主,向量 RAG + 混合检索 + 重排 通常足够;图适合 关系问题
占比高 且团队有 图谱与评测 能力时再投入.',
  updated_at = NOW()
WHERE id = 'card_mq4wbkd059ik';

-- [核心模块] 为什么需要 chunk_overlap?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '为什么需要 chunk_overlap？',
  answer   = '防止关键句被切断在两块边界,检索时丢上下文;代价是存储增加.',
  updated_at = NOW()
WHERE id = 'card_mq4wbm99svgj';

-- [核心模块] 父子文档如何存储?...
-- Changes: fix_newlines, remove_watermark, normalize_qmark
UPDATE cards SET
  question = '父子文档如何存储？',
  answer   = '子块带 parent_id ,检索子块→映射父块文本再生成.',
  updated_at = NOW()
WHERE id = 'card_mq4wbni4wj62';

-- [核心模块] embedding 是否需要归一化?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'embedding 是否需要归一化？',
  answer   = '若用 内积/余弦 且框架假设归一化向量,应归一化以稳定相似度.',
  updated_at = NOW()
WHERE id = 'card_mq4wbo0bjz7z';

-- [基础概念] faiss indexflatip 与 indexhnsw 区别?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'faiss indexflatip 与 indexhnsw 区别？',
  answer   = 'Flat 精确但慢;HNSW 近似快,适合大规模.',
  updated_at = NOW()
WHERE id = 'card_mq4wbobxlsk3';

-- [核心模块] 混合检索权重 alpha 怎么定?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '混合检索权重 alpha 怎么定？',
  answer   = '验证集网格搜索;或 RRF 避免调权.',
  updated_at = NOW()
WHERE id = 'card_mq4wbqiryig3';

-- [核心模块] hyde 的⻛险如何缓解?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = 'hyde 的⻛险如何缓解？',
  answer   = '重排序、引用约束、拒答、对比多条检索结果.',
  updated_at = NOW()
WHERE id = 'card_mq4wbqtp789u';

-- [工程实践] 面试 q5:tool 与业务里的普通 python 函数有何不同?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q5:tool 与业务里的普通 python 函数有何不同？',
  answer   = 'Tool 多了面向模型的元数据(描述、Schema)和统一执行接口(记录日志、超时、权限).
业务函数关注领域逻辑;Tool 是 Agent 可调度的「外壳」.',
  updated_at = NOW()
WHERE id = 'card_mq4wc28lco2q';

-- [架构设计] 描述太⻓怎么办?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '描述太⻓怎么办？',
  answer   = '分层----核心描述保持短;细节放 parameter.description ;超大工具集用路由先筛选
(⻅第 4 节).',
  updated_at = NOW()
WHERE id = 'card_mq4wc2sl1lx1';

-- [核心模块] 面试 q6:工具返回 10mb 日志怎么办?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q6:工具返回 10mb 日志怎么办？',
  answer   = '不应直接返回.应(1)截断 + 摘要;(2)写入对象存储返回链接;(3)提供 grep_in_log
等缩小工具;(4)向量索引仅检索相关片段.',
  updated_at = NOW()
WHERE id = 'card_mq4wc345m5dl';

-- [基础概念] @tool 和手写 structuredtool 区别?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '@tool 和手写 structuredtool 区别？',
  answer   = '@tool 从 docstring 推断描述与参数,开发快;复杂 Schema 或需自定义校验时用
StructuredTool 更可控.',
  updated_at = NOW()
WHERE id = 'card_mq4wc3d88nnp';

-- [评估与多Agent] 面试 q7:mcp 里 client 和你在 openai 里写的"执行工具的 python 代码"是什么关系?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q7:mcp 里 client 和你在 openai 里写的"执行工具的 python 代码"是什么关系？',
  answer   = 'OpenAI 场景下你手写 run_tool ;MCP 下 Client 把远端/子进程 Server 的工具列表拉平,
调用时按协议发 RPC,结果再转成 tool 消息.你仍要写 Host 逻辑,但工具实现可独立进程、
独立语言.',
  updated_at = NOW()
WHERE id = 'card_mq4wc3w3nbip';

-- [基础概念] mcp 和 openapi 网关区别?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'mcp 和 openapi 网关区别？',
  answer   = 'OpenAPI 面向通用 HTTP 客户端;MCP 面向 AI Host 与模型工具循环,带会话、资源、
提示等 AI 原生语义.',
  updated_at = NOW()
WHERE id = 'card_mq4wc7ln5590';

-- [工程实践] 面试 q8:企业为什么愿意接 mcp 而不是每个业务线自己写 function?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q8:企业为什么愿意接 mcp 而不是每个业务线自己写 function？',
  answer   = '降低重复建设、统一安全与观测、加快试点(换模型不换工具链)、利于平台组与业务组分
工.',
  updated_at = NOW()
WHERE id = 'card_mq4wc7vo8ydw';

-- [核心模块] 面试 q9:向量路由选出来的工具不对怎么兜底?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '面试 q9:向量路由选出来的工具不对怎么兜底？',
  answer   = 'Top-K 调大、混合关键词打分、加一层 LLM「是否适用」二分类、允许用户澄清、保留「通
用搜索」工具作后备.',
  updated_at = NOW()
WHERE id = 'card_mq4wc8iixalm';

-- [核心模块] apache tika 在 python 里怎么用?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = 'apache tika 在 python 里怎么用？',
  answer   = '常⻅做法是 Java 起 Tika Server,Python 用 HTTP 调用;或在 JVM 服务内解析后把文
本推给 Python 流水线.适合已有 Java 中间件、需统一解析多种 Office 格式的企业.',
  updated_at = NOW()
WHERE id = 'card_mq4wc974n81o';

-- [核心模块] 面试 q8:分块太大或太小分别会怎样?...
-- Changes: fix_newlines, remove_watermark, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q8:分块太大或太小分别会怎样？',
  answer   = '太小 → 语义不完整、检索片段缺主语或条件;太大 → 混入无关内容、噪声干扰生

成、embedding 语义模糊、费用上升.',
  updated_at = NOW()
WHERE id = 'card_mq4wca98kofj';

-- [核心模块] 面试 q8a:父子块在向量库里怎么建索引?...
-- Changes: fix_newlines, collapse_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q8a:父子块在向量库里怎么建索引？',
  answer   = '仅对 子块 写入向量与 child_id ;元数据中存 parent_id 与父块全文或父块存
储路径.检索命中子块后,用 parent_id 取父块 拼进 Prompt.若父块过⻓,可对父块再 摘要
后送入.
代码示例:父子块数据结构(最小示意)

@dataclass
class ParentChunk:
parent_id: str
text: str
children: List["ChildChunk"]
@dataclass
class ChildChunk:
child_id: str
parent_id: str
text: str # 小块,用于 embedding',
  updated_at = NOW()
WHERE id = 'card_mq4wcat7paaf';

-- [核心模块] 为什么生产常用 recursive 而不是 fixed?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '为什么生产常用 recursive 而不是 fixed？',
  answer   = 'Recursive 尽量在 自然边界 断开,减少半句半段,提高检索与阅读连贯性.',
  updated_at = NOW()
WHERE id = 'card_mq4wcburi3uw';

-- [核心模块] 面试 q11b:查询改写会不会引入噪声?...
-- Changes: fix_newlines, remove_watermark, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q11b:查询改写会不会引入噪声？',
  answer   = '会.LLM 可能 篡改实体 或 添加未提及条件.对策:多路检索 + RRF、重排、引用
校验,高敏场景用 人工词表 + 模板 优先.',
  updated_at = NOW()
WHERE id = 'card_mq4wccuzvrkb';

-- [核心模块] 需要保留原 query 吗?...
-- Changes: normalize_qmark
UPDATE cards SET
  question = '需要保留原 query 吗？',
  answer   = '需要.常 原句 + 改写句 同时检索再融合,避免改写跑偏.',
  updated_at = NOW()
WHERE id = 'card_mq4wcdfdd094';

-- [工作模式] 面试 q11c:子问题分解的典型失败模式?...
-- Changes: fix_newlines, remove_watermark, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q11c:子问题分解的典型失败模式？',
  answer   = '分解错误(实体指代错)、子问题遗漏约束、或 合并时矛盾未检测.需要 一致性检
查 与 重排 过滤无关块.',
  updated_at = NOW()
WHERE id = 'card_mq4wcefymfmj';

-- [基础概念] 和 agent 多步检索有什么区别?...
-- Changes: fix_newlines, normalize_qmark
UPDATE cards SET
  question = '和 agent 多步检索有什么区别？',
  answer   = '子问题分解可以是 固定模板/一次 LLM 调用;Agentic 更强调 动态决定是否再检索,工
具边界更宽.',
  updated_at = NOW()
WHERE id = 'card_mq4wcfoc2o5o';

-- [核心模块] 面试 q12:hyde 适合什么场景?不适合什么?...
-- Changes: fix_newlines, remove_watermark, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q12:hyde 适合什么场景？不适合什么？',
  answer   = '适合 表述差距大、短查询难对⻬⻓文档;不适合 强事实约束 且模型易胡编的领
域,除非加强校验与拒答.',
  updated_at = NOW()
WHERE id = 'card_mq4wcgllcj4a';

-- [核心模块] 面试 q12a:step-back prompting 与 hyde 有何异同?...
-- Changes: fix_newlines, remove_answer_prefix, normalize_qmark
UPDATE cards SET
  question = '面试 q12a:step-back prompting 与 hyde 有何异同？',
  answer   = '二者都试图 拉近查询与文档的语义距离.HyDE 用 假想答案文档 做 embedding;
Step-back 用 更抽象的问题 再检索 原理/背景类 段落.HyDE 更激进(易引入虚构事实),
Step-back 相对 克制(仍停留在问题空间).实践中可 并行检索 后由重排裁决.
代码示例:Step-back(两次检索拼上下文,示意)',
  updated_at = NOW()
WHERE id = 'card_mq4wcgyhs2vk';


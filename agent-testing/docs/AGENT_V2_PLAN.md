# Agent Testing V2 Plan — Multi-Agent 自主协作系统

## 1. 项目说明

`agent-testing` 当前已经完成 22-phase offline roadmap，形成了一个面向 `agent-note` 项目的小型系统测试程序。当前版本以 deterministic pipeline 为核心，能够在离线、纯内存、无真实外部副作用的条件下完成：

* 需求上下文构建；
* 验收点抽取；
* 测试用例生成；
* 运维检查项生成；
* evidence 标准化；
* severity 分类；
* defect analysis；
* regression suggestion；
* release recommendation；
* markdown report 生成；
* approval policy evaluation；
* audit trail / observability metrics 构建；
* persistence snapshot 设计；
* in-memory API boundary；
* UI view model / component shell；
* offline end-to-end demo。

当前系统的定位是：

> 面向 `agent-note` 的小型系统测试智能体底座。

但当前版本本质上仍然是 **代码编写的硬链路测试流水线**，即：

```text
Input / Fixture
  → Fixed Orchestrator
  → Deterministic Skills
  → Evidence / Severity / Report / UI View Model
```

它具有稳定、可验证、边界清晰、不会乱执行工具的优点，但还不是真正意义上的多 Agent 测试智能体。

V2 的目标是在现有 deterministic foundation 之上，新增真正的 **Multi-Agent Runtime Layer**，让多个角色 Agent 能够围绕测试任务进行分工、协作、计划、反思、调用 Skill、请求 MCP、等待审批、产出 evidence，并最终由 Test Lead Agent 汇总报告与上线建议。

---

## 2. V1 当前能力边界

### 2.1 V1 已具备能力

| 能力 | 状态 |
| --- | --- |
| 需求分析 | 已具备 |
| 验收点抽取 | 已具备 |
| 测试用例生成 | 已具备 |
| evidence 标准化 | 已具备 |
| severity 分类 | 已具备 |
| defect analysis | 已具备 |
| regression suggestion | 已具备 |
| release recommendation | 已具备 |
| markdown report | 已具备 |
| approval policy | 已具备 |
| audit trail | 已具备 |
| observability metrics | 已具备 |
| MCP request/result contract | 已具备 |
| read-only MCP pilot | 已具备，fake/in-memory |
| controlled execution boundary | 已具备，dry-run/simulated only |
| persistence model | 已具备，model/interface/snapshot only |
| API boundary | 已具备，in-memory service only |
| UI view model | 已具备，component shell only |
| offline E2E demo | 已具备 |

### 2.2 V1 不具备能力

| 能力 | 状态 |
| --- | --- |
| 真正多 Agent runtime | 未实现 |
| Agent message bus | 未实现 |
| Agent task queue | 未实现 |
| Shared blackboard | 未实现 |
| LLM planner | 未接入 |
| Agent 动态选择 Skill | 未实现 |
| Agent 动态请求 MCP | 未实现 |
| 真实 MCP server | 未接入 |
| 真实命令执行 | 未接入 |
| 真实 API 调用 | 未接入 |
| 真实浏览器自动化 | 未接入 |
| 真实数据库持久化 | 未接入 |
| 真实审批 runtime | 未接入 |
| 真实审计日志持久化 | 未接入 |
| 生产级 UI route | 未接入 |

---

## 3. V2 项目目标

V2 的目标不是重写 V1，而是在 V1 上新增一层：

```text
Multi-Agent Runtime Layer
  ↓
调用现有 deterministic skills / approval / audit / evidence / MCP boundary
```

V2 需要实现：

1. 多角色 Agent 注册与 profile 管理；
2. Agent session；
3. Agent task queue；
4. Agent message bus；
5. Shared blackboard；
6. Agent runner；
7. Skill router；
8. MCP request router；
9. Approval gate bridge；
10. Audit emitter；
11. Evidence collector；
12. LLM planner adapter，后续可选；
13. 多 Agent 协作流程；
14. 多 Agent session UI，后续可选。

V2 的核心目标是让测试流程从固定硬链路变成可控的动态协作链路：

```text
Test Lead Agent
  → 分配任务
  → Product Acceptance Agent
  → Test Design Agent
  → Ops Check Agent
  → Developer Analysis Agent
  → User Representative Agent
  → 汇总 evidence / risk / report / recommendation
```

---

## 4. V2 核心原则

### 4.1 不推翻 V1

V1 的 deterministic pipeline 是安全底座，不应删除。V2 Agent Runtime 必须复用 V1 的：

* Skill contracts；
* Evidence model；
* Severity rules；
* Approval policy；
* Audit trail；
* Observability metrics；
* MCP request/result contracts；
* Controlled execution boundary；
* Persistence model；
* API boundary；
* UI view model。

### 4.2 Agent 不能绕过 evidence

任何 Agent 都不能直接声称测试通过。必须满足：

```text
test conclusion
  → linked evidence
  → normalized evidence
  → severity / defect / release rule
```

Agent reasoning 只能作为辅助分析，不能作为 pass evidence。

### 4.3 Agent action 必须受控

所有 Agent action 必须经过：

```text
Agent Action Request
  → Action Policy
  → Approval Policy
  → Skill Router or MCP Router
  → Evidence / Audit
```

HIGH action 必须 pending approval。FORBIDDEN action 必须直接拒绝。Agent 不允许直接执行 MCP、命令、API、浏览器或数据库操作。

### 4.4 LLM 只做规划和建议

LLM 可以用于：

* 任务规划；
* 分析建议；
* 测试点候选生成；
* 缺陷原因候选生成；
* 报告草稿总结；
* 补充 evidence 建议。

LLM 不可以直接用于：

* 判定测试通过；
* 绕过 evidence；
* 绕过 approval；
* 执行 MCP；
* 修改数据库；
* 最终批准上线。

### 4.5 多 Agent 协作必须可审计

每个 Agent 的关键行为都必须产生 audit-friendly trace：

* 谁发起；
* 发起什么任务；
* 调用了什么 Skill；
* 请求了什么 MCP；
* 是否需要审批；
* 产生了什么 evidence；
* 输出影响了哪个 test case / defect / report / release recommendation。

---

## 5. V2 目标架构

V2 推荐架构如下：

```text
agent-testing/src/agent-runtime/
  index.ts
  agentRuntimeTypes.ts
  agentRegistry.ts
  agentSession.ts
  agentMessageBus.ts
  agentTaskQueue.ts
  sharedBlackboard.ts
  agentRunner.ts
  skillRouter.ts
  mcpActionRouter.ts
  approvalBridge.ts
  auditEmitter.ts
  evidenceCollector.ts
```

整体结构：

```text
AgentTestingRuntime
  ├─ AgentRegistry
  ├─ AgentSession
  ├─ AgentMessageBus
  ├─ AgentTaskQueue
  ├─ SharedBlackboard
  ├─ AgentRunner
  ├─ SkillRouter
  ├─ McpActionRouter
  ├─ ApprovalBridge
  ├─ AuditEmitter
  └─ EvidenceCollector
```

---

## 6. V2 多 Agent 角色设计

V2 默认包含以下角色。

### 6.1 Test Lead Agent

职责：

* 创建测试任务；
* 分配任务给其他 Agent；
* 汇总测试状态；
* 判断 evidence gap；
* 触发 release recommendation；
* 汇总 markdown report；
* 输出最终测试结论草案。

能力：

* advanced planning；
* advanced reflection；
* standard short-term memory；
* standard skill invocation；
* approval request；
* audit emission。

限制：

* 不能绕过 evidence；
* 不能直接执行 MCP；
* 不能直接批准 HIGH action；
* 不能把 Agent reasoning 当成 pass evidence。

### 6.2 Product Acceptance Agent

职责：

* 理解需求；
* 抽取验收点；
* 标记需求歧义；
* 判断验收标准是否完整；
* 从产品视角提出风险。

能力：

* standard persona modeling；
* standard reflection；
* standard planning；
* acceptance extraction skill；
* requirement ambiguity detection。

限制：

* 不执行 MCP；
* 不判断代码根因；
* 不给最终 release recommendation。

### 6.3 Test Design Agent

职责：

* 根据验收点生成测试用例；
* 生成正向、反向、边界、权限、多用户、异常用例；
* 标记 required evidence；
* 生成回归测试建议。

能力：

* advanced planning；
* test case generation skill；
* regression suggestion skill；
* standard reflection。

限制：

* 不执行真实测试；
* 不把测试用例生成当成测试通过；
* 不直接请求高风险 MCP。

### 6.4 Developer Analysis Agent

职责：

* 分析失败 evidence；
* 判断 suspected layer；
* 输出 possible cause；
* 生成 fix suggestion；
* 生成 regression suggestion；
* 标记证据不足情况。

能力：

* defect analysis skill；
* regression suggestion skill；
* standard reflection；
* evidence-aware reasoning。

限制：

* 不能编造代码位置；
* 不能编造日志；
* 不能把 tool failure 直接等同于 product defect；
* 不能声称 root cause 已确认，除非 evidence 足够。

### 6.5 Ops Check Agent

职责：

* 生成 ops checklist；
* 检查部署、备份、恢复、日志、监控、权限、网络暴露风险；
* 未来可请求 read-only MCP；
* 未来可请求 controlled execution；
* 提出运维 evidence gap。

能力：

* ops checklist skill；
* approval request；
* MCP request proposal；
* audit emission；
* advanced action request capability。

限制：

* HIGH action 必须 approval；
* FORBIDDEN action 必须拒绝；
* 不允许生产破坏性操作；
* 不直接执行真实命令。

### 6.6 User Representative Agent

职责：

* 从普通用户、小团队用户、管理员用户视角审查流程；
* 发现可用性问题；
* 提出用户路径测试建议；
* 补充真实使用场景。

能力：

* persona modeling；
* usability-oriented reflection；
* scenario analysis；
* basic planning。

限制：

* 不执行高风险 action；
* 不请求生产 MCP；
* 不判断 release approval。

---

## 7. V2 Runtime 核心模型

### 7.1 AgentSession

用于表示一次多 Agent 测试会话。

核心字段：

```text
id
runId
targetSystemName
status
agents
tasks
messages
blackboard
auditEvents
createdAt
updatedAt
limitations
```

状态：

```text
draft
running
waiting_for_evidence
waiting_for_approval
blocked
completed
cancelled
failed
```

### 7.2 AgentMessage

用于 Agent 之间通信。

核心字段：

```text
id
sessionId
fromAgent
toAgent
messageType
summary
payloadRef
relatedTaskId
relatedEvidenceIds
relatedTestCaseIds
createdAt
limitations
```

消息类型：

```text
task_assignment
task_result
evidence_request
approval_request
risk_warning
reflection_note
report_update
blocked_notice
```

### 7.3 AgentTask

用于调度 Agent 工作。

核心字段：

```text
id
sessionId
assignedTo
taskType
goal
inputRefs
expectedOutput
status
priority
requiresApproval
relatedEvidenceIds
relatedTestCaseIds
createdAt
completedAt
limitations
```

任务类型：

```text
build_context
extract_acceptance
generate_test_cases
generate_ops_checklist
normalize_evidence
classify_severity
analyze_defect
suggest_regression
recommend_release
generate_report
request_mcp_read
request_controlled_execution
review_evidence_gap
```

### 7.4 SharedBlackboard

用于保存多 Agent 共享状态。

核心字段：

```text
sessionId
requirements
context
acceptancePoints
testCases
rawEvidence
normalizedEvidence
severityClassifications
defects
defectAnalyses
regressionSuggestions
opsChecklist
releaseRecommendation
report
approvalRequests
auditEvents
observabilityMetrics
unknowns
limitations
```

原则：

* blackboard 存结构化数据；
* 不存敏感原文；
* evidence 必须有 ID；
* report 必须能追溯 evidence；
* simulated result 必须标记为 simulated；
* no evidence 不能变成 pass。

**Blackboard 并发策略（M1-M3，in-memory）：**

```
- 每个 Agent 只能写自己 assigned task 对应的 key
- 两个 Agent 不能同时 owned 同一个 task（TaskQueue 分配即锁定）
- Blackboard 单线程访问（Node.js event loop），天然无竞态
- 读无限制（Agent 可以读任何区域的 blackboard）
- 如果未来接数据库，换成 optimistic locking（version 字段）
```

### 7.5 AgentRunner

每个 Agent 执行一个 bounded loop：

```text
observe blackboard
  → pick task
  → plan action
  → validate action boundary
  → invoke skill or request MCP
  → write result
  → emit audit event
  → bounded reflection
  → complete or block task
```

限制：

* 每次 runner 只处理有限步数；
* 不做无限循环；
* 不递归调用自己；
* 不直接执行外部工具；
* 所有 action 都走 policy gate。

**AgentRunner 决策策略（M1，无 LLM）：**

```
pick task 逻辑:
  1. 从 TaskQueue 取 priority 最高且 assignedTo 为自己的 task
  2. 如果 task.taskType 匹配 agent profile 中的 allowedTaskTypes → 接受
  3. 如果 task 不匹配 → 拒绝并写 refusal note 到 blackboard
  4. 如果无可用 task → Agent 进入 idle，等 Test Lead 分配新任务

plan action 逻辑:
  1. 根据 task.taskType 查映射表 → targetSkill
  2. 从 blackboard 收集 inputRefs 指向的数据
  3. 组装 SkillInvocationRequest → 通过 SkillRouter 执行
  4. 将 SkillResult 写入 blackboard → emit audit event → 标记 task.completedAt

taskType → targetSkill 映射表:
  build_context              → context_building
  extract_acceptance         → acceptance_extraction
  generate_test_cases        → test_case_generation
  generate_ops_checklist     → ops_checklist
  normalize_evidence         → evidence_normalization
  classify_severity          → severity_classification
  analyze_defect             → defect_analysis
  suggest_regression         → regression_suggestion
  recommend_release          → release_recommendation
  generate_report            → report_generation
  request_mcp_read           → read_only_mcp_pilot
  review_evidence_gap        → evidence_normalization + defect_analysis
```

---

## 8. Skill Router 设计

V2 不让 Agent 直接调用底层函数，而是通过 Skill Router。

```text
Agent
  → SkillInvocationRequest
  → SkillRouter
  → Deterministic Skill
  → SkillResult
  → Blackboard
  → Audit Event
```

Skill Router 负责：

* 检查 Agent 是否允许调用该 Skill；
* 检查输入是否满足 schema；
* 调用已有 deterministic skill；
* 记录 trace；
* 输出 SkillResult；
* 将结果写入 blackboard。

V2 初始支持以下 Skill：

* context_building；
* acceptance_extraction；
* test_case_generation；
* evidence_normalization；
* severity_classification；
* ops_checklist；
* defect_analysis；
* regression_suggestion；
* report_generation；
* release_recommendation；
* approval_policy；
* audit_trail；
* controlled_execution；
* read_only_mcp_pilot。

---

## 9. MCP Action Router 设计

V2 不直接执行真实 MCP。Agent 只能创建 MCP request proposal。

```text
Agent
  → McpActionRequest
  → McpActionRouter
  → Approval Policy
  → pending / forbidden / ready_for_future_execution
```

在 V2 初期：

* read-only MCP 可以继续使用 fake/in-memory pilot；
* command/API/browser 仍使用 dry-run/simulated boundary；
* 不接真实 MCP server；
* 不执行真实外部动作。

未来生产化时再增加 real MCP adapter。

---

## 10. LLM Planner Adapter 设计

V2 可以预留 LLM planner，但不建议第一步就接真实 LLM。

### 10.1 LLM 输入

LLM planner 输入应是 summary-only：

```text
agent profile
task summary
blackboard summary
available skills
available MCP capabilities
constraints
evidence gaps
limitations
```

不直接输入完整敏感原文。

### 10.2 LLM 输出

LLM 必须输出结构化 JSON：

```text
nextAction
reason
targetSkill
targetMcpCapability
requiredInputs
expectedOutputs
riskLevel
requiresApproval
limitations
```

### 10.3 Validator

LLM 输出必须经过：

```text
schema validation
role policy validation
action policy validation
approval policy validation
```

不允许 LLM 直接调用工具或修改状态。

---

## 11. V2 分阶段计划

### M0：Core Type Contracts — 接口定义先行（1-2 天）

**目标：** 在写任何实现代码之前，先把核心类型定义好，确保 M1-M6 的实现不会互相冲突。

**产出：**

```
agent-testing/src/agent-runtime/
  agentRuntimeTypes.ts    # AgentSession, AgentMessage, AgentTask, Blackboard 全量类型
  agentProfileTypes.ts    # AgentProfile, CapabilityConfig, AllowedSkills, AllowedTaskTypes
```

**核心类型定义：**

- `AgentSession` — 会话状态机（draft → running → waiting → blocked → completed）
- `AgentMessage` — 8 种消息类型（task_assignment / task_result / evidence_request / approval_request / risk_warning / reflection_note / report_update / blocked_notice）
- `AgentTask` — 14 种任务类型 + 优先级 + 状态
- `SharedBlackboard` — 全量共享数据结构
- `AgentProfile` — 角色配置（role / systemPrompt / allowedSkills / allowedTaskTypes / capabilityLevels）
- `AgentCapabilityConfig` — 能力级别（planning / reflection / memory / action / collaboration）

**验证标准：**

- [ ] 所有类型通过 TypeScript 检查
- [ ] AgentSession 状态机完整（所有合法转换已定义）
- [ ] 6 个 Agent 的 Profile 配置可实例化
- [ ] Blackboard 的 key 与 task 的 inputRefs 对齐

---

### M1：In-memory Multi-Agent Runtime（3-5 天）

**目标：** 新增 agent runtime 基础模型，在纯内存中跑通第一个 6 Agent 协作流程。

**产出：**

```
agent-testing/src/agent-runtime/
  index.ts
  agentRegistry.ts        # 6 个 Agent 的注册与查询
  agentSession.ts         # 会话创建、状态转换
  agentMessageBus.ts      # 消息发送/订阅/请求响应
  agentTaskQueue.ts       # 任务创建、分配、优先级排序
  sharedBlackboard.ts     # 共享数据读写
  agentRunner.ts          # Agent 执行循环（含决策策略）
```

**AgentRunner 决策策略（M1，无 LLM）：**

```
pick task 逻辑:
  1. 从 TaskQueue 取 priority 最高且 assignedTo 为自己的 task
  2. 如果 task.taskType 匹配 agent profile 中的 allowedTaskTypes → 接受
  3. 如果 task 不匹配 → 拒绝并写 refusal note 到 blackboard
  4. 如果无可用 task → Agent 进入 idle，等 Test Lead 分配新任务

plan action 逻辑:
  1. 根据 task.taskType 查映射表 → targetSkill
  2. 从 blackboard 收集 inputRefs 指向的数据
  3. 组装 SkillInvocationRequest → 通过 SkillRouter 执行
  4. 将 SkillResult 写入 blackboard → emit audit event → 标记 task.completedAt
```

**验收标准：**

- [ ] 可以创建 small note multi-agent session
- [ ] 能注册 6 个默认角色 Agent
- [ ] 每个 Agent 有 profile / capability / allowed task types
- [ ] Test Lead 能创建任务并分配到对应 Agent
- [ ] Product Acceptance 能处理验收点任务
- [ ] Test Design 能生成测试用例
- [ ] Ops Check 能生成 checklist
- [ ] Developer Analysis 能分析 defect
- [ ] Test Lead 能汇总 report / release recommendation
- [ ] AgentRunner 按 pick → plan → invoke → write → emit 循环运行
- [ ] 全流程只在内存中运行，不依赖任何外部系统

---

### M2：Agent-to-Skill Dynamic Invocation（2-3 天）

**目标：** 新增 SkillRouter，Agent 不再直接调用 skill，而是通过路由层做权限校验。

**产出：**

```
agent-testing/src/agent-runtime/
  skillRouter.ts          # Skill 路由 + 权限校验 + trace 记录
```

**验收标准：**

- [ ] Test Design Agent 只能调用 test case / regression 相关 skill
- [ ] Ops Check Agent 能调用 ops checklist
- [ ] Developer Analysis Agent 能调用 defect analysis
- [ ] User Representative Agent 无法调用高风险 action
- [ ] 未授权 Skill 调用会被拒绝并记录 audit event
- [ ] 每次 Skill 调用产生 trace（who / what skill / input summary / output summary）

---

### M3：Shared Blackboard and Evidence-aware Collaboration（2-3 天）

**目标：** 完善 blackboard 数据结构，支持 evidence gap 追踪、task 依赖、弱证据状态传播。

**产出：**

```
agent-testing/src/agent-runtime/
  evidenceCollector.ts    # Evidence 汇总 + gap 检测 + 强度统计
```

**验收标准：**

- [ ] 没有 evidence 的 test case 不会 pass（标记为 not_run 或 inconclusive）
- [ ] weak evidence 会影响 release recommendation（降级为 inconclusive 或 blocked）
- [ ] Developer Analysis 可以引用 evidence ID 做缺陷分析
- [ ] Test Lead 可以基于 blackboard 一次性汇总所有 evidence / severity / defect / risk
- [ ] Blackboard 并发写入安全：每个 Agent 只能写自己 assigned task 对应的 key

---

### M4：LLM Planner Adapter Preview（2-3 天）

**目标：** 新增 LLM planner contract + fake planner + validator，为后续接真实 LLM 铺路。

**产出：**

```
agent-testing/src/llm-planner/
  index.ts
  llmPlannerTypes.ts        # LLMPlannerInput / LLMPlannerOutput / PlannerAction 类型
  fakeLlmPlanner.ts         # 确定性 fake planner（规则匹配 + 模板生成）
  plannerOutputValidator.ts # schema 校验 + 角色权限校验 + 审批策略校验
```

**验收标准：**

- [ ] fake planner 可以生成 next action proposal（基于 task type + blackboard 状态）
- [ ] invalid planner output（schema 不匹配的 JSON）会被 validator 拒绝
- [ ] high-risk action proposal 会进入 approval pending
- [ ] planner reasoning 会被标记为 agent_reasoning，不会成为 evidence

---

### M5：Agent-to-MCP Request Flow（2-3 天）

**目标：** Agent 能提出 MCP request proposal，McpActionRouter 连接审批策略。

**产出：**

```
agent-testing/src/agent-runtime/
  mcpActionRouter.ts      # MCP 请求路由 + 审批策略 + fake 执行
  approvalBridge.ts        # 连接 approval policy → pending / forbidden / approved
```

**验收标准：**

- [ ] read-only request 可以 fake 执行（走现有的 read-only MCP pilot）
- [ ] HIGH permission request 进入 approval pending，不自动执行
- [ ] FORBIDDEN request 被拒绝并记录拒绝原因
- [ ] MCP result 映射为 evidence draft（标记为 simulated / fake）
- [ ] 每次 MCP request 产生 audit event draft

---

### M6：Multi-Agent Session UI View Model（2-3 天）

**目标：** 新增 multi-agent session UI view model，展示多 Agent 协作状态。

**产出：**

```
agent-testing/src/ui-v2/
  index.ts
  multiAgentSessionTypes.ts
  multiAgentSessionMappers.ts
  MultiAgentSessionPanel.tsx          # 会话总览
  AgentTaskQueuePanel.tsx             # 任务队列
  AgentMessageTimeline.tsx            # 消息时间线
  SharedBlackboardPanel.tsx           # Blackboard 摘要
```

**验收标准：**

- [ ] UI view model 能展示 6 个 Agent 的状态（idle / running / blocked / completed）
- [ ] UI view model 能展示 task queue + 每个 task 的 assigned agent + status
- [ ] UI view model 能展示 message timeline
- [ ] UI view model 能展示 blackboard summary（evidence / severity / defect / release 汇总）
- [ ] UI view model 能展示 pending approval 列表
- [ ] 不直接调用底层 domain，不连接数据库，不接真实 MCP

---

## 12. V2 最小可用流程

V2 最小流程如下：

```text
createMultiAgentTestingSession
  → register default agents
  → Test Lead creates initial tasks
  → Product Acceptance extracts acceptance points
  → Test Design generates test cases
  → Ops Check generates ops checklist
  → Evidence Normalizer processes raw evidence
  → Severity Classifier classifies failures
  → Developer Analysis analyzes defects
  → Regression Suggestion generated
  → Release Recommendation generated
  → Report generated
  → Audit / Observability updated
  → Session completed
```

所有步骤都必须保持：

* in-memory；
* deterministic；
* evidence-driven；
* approval-gated；
* audit-friendly；
* no real external side effects。

---

## 13. V2 非目标

V2 初期不做：

* 真实 MCP server；
* 真实命令执行；
* 真实 HTTP 调用；
* 真实浏览器自动化；
* 真实数据库写入；
* 真实审批 UI；
* 真实审计日志持久化；
* 生产级 UI route；
* 自动修复代码；
* 自动部署；
* 自动上线批准。

这些属于后续 productionization，不属于 V2 runtime 最小闭环。

---

## 14. V2 验收标准（按 M 分级）

### M0 — Core Type Contracts

- [ ] 所有类型通过 TypeScript 检查
- [ ] AgentSession 状态机完整（所有合法转换已定义）
- [ ] 6 个 Agent 的 Profile 配置可实例化
- [ ] Blackboard 的 key 与 task 的 inputRefs 对齐

### M1 — In-memory Multi-Agent Runtime

- [ ] 能创建 multi-agent testing session
- [ ] 能注册 6 个默认角色 Agent
- [ ] 每个 Agent 有 profile / capability / allowed task types
- [ ] AgentRunner 按 pick → plan → invoke → write → emit 循环运行
- [ ] Test Lead 能创建和分配任务
- [ ] 全流程 in-memory 跑通，不依赖任何外部系统

### M2 — Agent-to-Skill Dynamic Invocation

- [ ] Agent 通过 SkillRouter 调用 Skill（非直接调用）
- [ ] 越权 Skill 调用被拒绝并记录
- [ ] 每次 Skill 调用产生 trace

### M3 — Shared Blackboard + Evidence-aware

- [ ] 没有 evidence 的 test case 不会 pass
- [ ] weak evidence 影响 release recommendation
- [ ] Blackboard 并发写入安全

### M4 — LLM Planner Adapter Preview

- [ ] fake planner 可以生成 next action proposal
- [ ] invalid planner output 被 validator 拒绝
- [ ] planner reasoning 不成为 evidence

### M5 — Agent-to-MCP Request Flow

- [ ] read-only MCP request 可以 fake 执行
- [ ] HIGH request 进入 approval pending
- [ ] FORBIDDEN request 被拒绝

### M6 — Multi-Agent Session UI

- [ ] UI view model 展示多 Agent 协作状态
- [ ] 不连接数据库、不接真实 MCP

### 全局约束（所有 M 适用）

- [ ] Agent 不能绕过 evidence
- [ ] Agent reasoning 不能作为 pass evidence
- [ ] TypeScript 检查通过
- [ ] 不新增外部依赖
- [ ] 不连接数据库
- [ ] 不接真实 MCP
- [ ] 不调用真实 LLM（M4 除外，仅 fake planner）
- [ ] 不执行真实测试

---

## 15. 推荐目录结构

建议后续新增：

```text
agent-testing/src/agent-runtime/
  index.ts
  agentRuntimeTypes.ts
  agentProfileTypes.ts
  agentRegistry.ts
  agentSession.ts
  agentMessageBus.ts
  agentTaskQueue.ts
  sharedBlackboard.ts
  agentRunner.ts
  skillRouter.ts
  mcpActionRouter.ts
  approvalBridge.ts
  auditEmitter.ts
  evidenceCollector.ts
```

后续可选：

```text
agent-testing/src/llm-planner/
  index.ts
  llmPlannerTypes.ts
  fakeLlmPlanner.ts
  plannerOutputValidator.ts
```

后续 UI：

```text
agent-testing/src/ui-v2/
  index.ts
  multiAgentSessionTypes.ts
  multiAgentSessionMappers.ts
  MultiAgentSessionPanel.tsx
  AgentTaskQueuePanel.tsx
  AgentMessageTimeline.tsx
  SharedBlackboardPanel.tsx
```

---

## 16. 与现有 22-phase roadmap 的关系

V2 不替代 Phase 1–22。V2 是 Phase 1–22 之后的新层。

关系如下：

```text
Phase 1–22
  → deterministic testing foundation

Agent V2
  → multi-agent runtime and collaboration layer

Productionization
  → real route / database / auth / real MCP / real approval / real audit persistence
```

当前推荐顺序：

```text
1. 完成并验收 Phase 1–22 offline roadmap
2. 使用真实小系统试跑
3. 如果离线结果有效，再进入 Agent V2 M0
4. Agent V2 稳定后，再考虑 productionization
```

---

## 17. 结论

`agent-testing` V1 已经完成了可信测试底座。V2 的目标是把该底座升级为真正的多 Agent 测试智能体。

核心升级点是：

```text
固定硬链路
  → 多 Agent 动态协作

固定 orchestrator
  → Agent task queue + message bus + shared blackboard

直接函数调用
  → role-aware SkillRouter

静态 demo
  → multi-agent session

未来 LLM
  → schema-constrained planner, not direct executor
```

V2 必须继续坚持：

* evidence-driven；
* approval-gated；
* audit-friendly；
* deterministic-first；
* no unsafe tool execution；
* no fake pass；
* no uncontrolled LLM action。

只有这样，后续真正接入 MCP、LLM、UI 和数据库时，系统才不会失控。

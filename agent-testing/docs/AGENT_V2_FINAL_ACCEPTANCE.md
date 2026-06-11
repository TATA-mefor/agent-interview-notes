# Agent Testing V2 Final Acceptance Checklist

## 1. M0 Core Type Contracts

- [x] `AgentSession` defined with 8-status state machine (draft/running/waiting_for_evidence/waiting_for_approval/blocked/completed/cancelled/failed).
- [x] `AgentMessage` defined with 8 message types (task_assignment/task_result/evidence_request/approval_request/risk_warning/reflection_note/report_update/blocked_notice).
- [x] `AgentTask` defined with 14 task types + 8 statuses + 4 priorities.
- [x] `SharedBlackboard` defined with 22 keys covering all pipeline data.
- [x] `AGENT_SESSION_ALLOWED_TRANSITIONS` defined with 12 valid transitions, each with reason.
- [x] `AGENT_TASK_BLACKBOARD_CONTRACTS` defined covering all 14 task types with explicit reads/writes.
- [x] `AgentProfile` defined with role/systemPrompt/allowedSkills/allowedTaskTypes/capabilities.
- [x] `AgentCapabilityConfig` defined with planning/reflection/memory/action/collaboration levels.
- [x] 6 default Agent profiles defined and exported.
- [x] `validateAgentProfiles()` validates role uniqueness, field completeness, and role-level rules.
- [x] All types pass TypeScript strict mode check.

**File:** `agent-testing/src/agent-runtime/agentRuntimeTypes.ts`, `agentProfileTypes.ts`

---

## 2. M1 In-memory Multi-Agent Runtime

- [x] `createAgentRegistry()` creates registry from profiles with fail-fast validation.
- [x] `createDefaultAgentRegistry()` returns registry with all 6 default profiles.
- [x] `createAgentSession()` creates session in `draft` state.
- [x] `canTransitionAgentSessionStatus()` validates state transitions against allowed list.
- [x] `transitionAgentSessionStatus()` enforces valid transitions, throws on invalid.
- [x] `summarizeAgentSession()` returns stats without leaking internal references.
- [x] `createAgentTask()` creates task in `pending` state.
- [x] `sortAgentTasksByPriority()` sorts by priority then createdAt.
- [x] `pickNextAgentTask()` selects highest-priority pending/assigned task for a role.
- [x] `assignAgentTask()` / `completeAgentTask()` / `failAgentTask()` / `refuseAgentTask()` / `blockAgentTask()` handle all lifecycle transitions.
- [x] `validateTaskBlackboardContract()` checks inputRefs against declared reads.
- [x] `createSharedBlackboard()` initializes with sessionId and empty unknowns/limitations.
- [x] `readBlackboardValue()` / `writeBlackboardValue()` / `appendBlackboardArrayValue()` support read/write/append.
- [x] `validateBlackboardWrite()` enforces write contract (M1 lenient: warns, doesn't block).
- [x] `summarizeSharedBlackboard()` produces 12-dimension stats.
- [x] `createAgentMessage()` / `sendAgentMessage()` / `listMessagesForAgent()` support message lifecycle.
- [x] `summarizeAgentMessages()` produces by-type and broadcast/direct counts.
- [x] `runAgentOnce()` executes pick → validate → invoke → write → emit message cycle.
- [x] `runAllAgentsOnce()` runs all profiles sequentially in one round.
- [x] `runSmallNoteMultiAgentRuntimeDemo()` runs 3 rounds maximum on small note fixture.
- [x] All runtime state is in-memory only; no database, filesystem, or network access.

**Files:** `agent-testing/src/agent-runtime/agentRegistry.ts`, `agentSession.ts`, `agentTaskQueue.ts`, `sharedBlackboard.ts`, `agentMessageBus.ts`, `agentRunner.ts`

---

## 3. M2 SkillRouter

- [x] `AGENT_TASK_SKILL_CONTRACTS` maps all 14 task types to skill names (10 real + 4 placeholder).
- [x] `getSkillNameForTaskType()` resolves task type to skill name.
- [x] `validateSkillInvocation()` performs 5-layer validation:
  - [x] agentRole matches profile role
  - [x] taskType in profile.allowedTaskTypes
  - [x] taskType has registered SkillRouter contract
  - [x] skillName in profile.allowedSkills
  - [x] inputRef keys are valid SharedBlackboard keys and in contract reads
- [x] `invokeSkillThroughRouter()` routes validated requests to V1 skills.
- [x] Refused invocations produce `status: 'refused'` with reason.
- [x] Placeholder tasks (MCP/controlled/evidence_gap/summarize) produce `status: 'unsupported'`.
- [x] `AgentRunner` invokes skills only through SkillRouter; direct invocation removed.

**Files:** `agent-testing/src/agent-runtime/skillRouter.ts`

---

## 4. M3 Evidence-aware Blackboard

- [x] `typedInputBuilder.ts` provides 10 task-specific builders: context, acceptance, test_cases, ops, evidence_normalization, severity, defect, regression, release, report.
- [x] Each builder returns `ready`, `missing_input`, or `unsupported`.
- [x] Missing input produces `status: 'blocked'` — no data fabrication.
- [x] `collectEvidenceFromBlackboard()` produces `BlackboardEvidenceSummary` with coverage, gaps, warnings.
- [x] `detectEvidenceGaps()` identifies 8 gap types: missing_evidence, weak_evidence, inconclusive_evidence, agent_reasoning_only, simulated_or_placeholder_only, conflicting_evidence, missing_test_case_link, unknown.
- [x] `summarizeEvidenceGaps()` produces open/partially_covered/covered counts and by-reason breakdown.
- [x] `enforceNoEvidenceNoPass()` scans report/release text for pass claims on no-evidence test cases.
- [x] `buildEvidenceAwareBlackboardNotes()` combines gaps and safety violations.
- [x] `appendBlackboardUnknowns()` / `appendBlackboardLimitations()` / `mergeBlackboardEvidenceSummary()` support immutable blackboard updates.
- [x] `runAllAgentsOnce()` calls `updateEvidenceAwareBlackboard()` after each round.
- [x] No evidence gap auto-closes; gaps only close when real evidence is written to blackboard.

**Files:** `agent-testing/src/agent-runtime/typedInputBuilder.ts`, `evidenceCollector.ts`, `sharedBlackboard.ts`, `agentRunner.ts`

---

## 5. M4 LLM Planner Preview

- [x] `LlmPlannerInput` defined: summary-only (no raw evidence, no full reports, no secrets).
- [x] `LlmPlannerOutput` defined: action proposal only (cannot execute).
- [x] `createLlmPlannerInput()` builds input from profile + task + blackboard + evidence summary.
- [x] `runFakeLlmPlanner()` provides 5 deterministic rules (controlled_exec → evidence_gap → summarize → ops_mcp → no_op).
- [x] Fake planner does NOT call any LLM provider (OpenAI, Claude, DeepSeek, etc.).
- [x] `validateLlmPlannerOutput()` performs 15+ checks:
  - [x] session/trace/role/mode matching
  - [x] confidence range validation
  - [x] action type and risk level whitelist
  - [x] task/skill/MCP/controlled_exec permission checks
  - [x] high risk requires approval
  - [x] forbidden risk is rejected
  - [x] blackboard key validation
  - [x] secret/token/password pattern rejection
  - [x] pass claim rejection
- [x] `mapPlannerOutputToActionProposal()` validates then maps to proposal with status (accepted/needs_approval/rejected/unsupported).
- [x] `mapPlannerOutputToTaskDraft()` creates AgentTask drafts marked "not inserted into session".
- [x] Planner reasoning is not evidence and cannot mark tests passed.

**Files:** `agent-testing/src/llm-planner/llmPlannerTypes.ts`, `fakeLlmPlanner.ts`, `plannerOutputValidator.ts`, `plannerActionMapper.ts`

---

## 6. M5 MCP Request Flow

- [x] `approvalBridge.ts` wraps existing `evaluateApprovalPolicy` for agent runtime use.
- [x] `evaluateAgentRuntimeApproval()` returns approval result with status/risk/forbidden/requiresApproval.
- [x] `mcpActionRouter.ts` routes 3 action types: read_only_mcp, controlled_execution, unsupported.
- [x] `createAgentMcpActionRequest()` creates typed MCP action request.
- [x] `routeAgentMcpAction()` dispatches to read_only or controlled_execution handlers.
- [x] Read-only MCP: checks `canRequestMcp` → approval gate → forbidden → pending_approval → fake execution via `runReadOnlyMcpPilot`.
- [x] Controlled execution: checks `canRequestControlledExecution` → safety evaluation → forbidden → pending_approval → dry-run + simulated execution.
- [x] Fake MCP results are explicitly marked as fake/simulated/draft and not treated as pass evidence.
- [x] `summarizeAgentMcpActionResult()` provides structured summary.
- [x] `skillRouter.ts` routes `request_mcp_read` and `request_controlled_execution` through `mcpActionRouter`.
- [x] `appendBlackboardMcpRequestDrafts()` / `appendBlackboardMcpResultDrafts()` / `appendBlackboardControlledExecutionDrafts()` support blackboard updates.
- [x] No real MCP server is contacted.
- [x] No real command, HTTP, browser, database, or filesystem action is executed.

**Files:** `agent-testing/src/agent-runtime/approvalBridge.ts`, `mcpActionRouter.ts`, `skillRouter.ts`, `sharedBlackboard.ts`

---

## 7. M6 UI View Model

- [x] 10 UI view model types defined: AgentUiTone, AgentStatusBadge, AgentRuntimeOverviewViewModel, AgentProfileCardViewModel, AgentTaskQueueRow, AgentMessageTimelineItem, SharedBlackboardSummaryViewModel, AgentEvidenceGapRow, AgentApprovalRow, MultiAgentSessionViewModel.
- [x] 7 mapper functions: session overview, profiles, tasks, messages, blackboard, evidence gaps, approvals.
- [x] `buildMultiAgentSessionViewModel()` composes all mappers into single view model.
- [x] Status badge tones mapped: completed/covered→success, pending/running→info, waiting/blocked→warning, failed/refused/forbidden→danger.
- [x] 7 props-only React components: MultiAgentSessionPanel, AgentTaskQueuePanel, AgentMessageTimeline, SharedBlackboardPanel, AgentApprovalPanel, AgentEvidenceGapPanel, MultiAgentRuntimeDemoShell.
- [x] All components are props-only: no fetch, no window, no localStorage, no service creation, no MCP, no test execution.
- [x] Task completed badge includes limitation: "Task completed means runtime step finished — not system passed."
- [x] Evidence gap open status shows danger badge; partially_covered shows warning.
- [x] No new React dependencies added.
- [x] No new routes created.

**Files:** `agent-testing/src/ui-v2/multiAgentSessionTypes.ts`, `multiAgentSessionMappers.ts`, `MultiAgentSessionPanel.tsx`, `AgentTaskQueuePanel.tsx`, `AgentMessageTimeline.tsx`, `SharedBlackboardPanel.tsx`, `AgentApprovalPanel.tsx`, `AgentEvidenceGapPanel.tsx`, `MultiAgentRuntimeDemoShell.tsx`, `index.ts`

---

## 8. Global Safety Boundaries

- [x] Agent reasoning is not evidence. `agent_reasoning` executorType is automatically downgraded.
- [x] No evidence → no pass. `enforceNoEvidenceNoPass()` blocks false pass claims.
- [x] SkillRouter blocks unauthorized skill access.
- [x] HIGH risk actions require approval.
- [x] FORBIDDEN actions are refused before execution.
- [x] Fake/simulated/draft results are explicitly marked.
- [x] Task completed ≠ test passed (limitations in UI and runtime).
- [x] No real LLM calls (M4 fake planner only).
- [x] No real MCP connections (M5 fake snapshot only).
- [x] No real command/HTTP/browser/database/filesystem execution.
- [x] No persistence to disk or database.
- [x] No API routes or UI routes created.
- [x] No external dependencies added.
- [x] `agent-testing/src/index.ts` not modified (V1/V2 export conflict avoided).

---

## 9. TypeScript Validation

- [x] All agent-runtime files pass `tsc --noEmit --strict`.
- [x] All llm-planner files pass `tsc --noEmit --strict`.
- [x] All ui-v2 files pass `tsc --noEmit --strict --jsx react-jsx`.
- [ ] Project-wide `tsc --noEmit` has pre-existing errors in `test-agent-notes.ts` (V1 fixture types: `deploymentMode`, `OpsChecklistItem.releaseBlocking`, `DefectAnalysisOutput.title`). These are not introduced by V2.

---

## 10. Ready for Manual Trial

- [x] `trial-run-agent-notes.ts` exists and runs successfully.
- [x] Demo produces: session with 6 agents, 10 completed tasks, 11 evidence items, blocked release recommendation.
- [x] Evidence gaps detected: 25 total, 21 open.
- [x] Agent reasoning evidence correctly flagged as `agent_reasoning_only` gap.
- [x] No-evidence-no-pass violations correctly detected.
- [x] UI view model builds without errors.
- [x] All 6 agent profiles validated.
- [x] Runtime is deterministic — same input produces same output.

---

## Summary

| Area | Status |
|---|---|
| M0 Core Type Contracts | ✅ 10/10 |
| M1 In-memory Runtime | ✅ 18/18 |
| M2 SkillRouter | ✅ 7/7 |
| M3 Evidence-aware Blackboard | ✅ 10/10 |
| M4 LLM Planner Preview | ✅ 9/9 |
| M5 MCP Request Flow | ✅ 10/10 |
| M6 UI View Model | ✅ 10/10 |
| Global Safety Boundaries | ✅ 14/14 |
| TypeScript (V2 files) | ✅ |
| Ready for Manual Trial | ✅ 10/10 |

**V2 offline multi-agent roadmap (M0–M6): ALL ACCEPTED.**

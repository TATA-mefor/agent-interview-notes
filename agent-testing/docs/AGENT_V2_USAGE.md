# Agent Testing V2 Usage Guide

## 1. Current Status

`agent-testing` has completed two major milestones:

- **V1 (22-phase offline roadmap):** Deterministic testing pipeline — context building, acceptance extraction, test case generation, evidence normalization, severity classification, defect analysis, regression suggestions, release recommendation, markdown report generation, approval policy, audit trail, observability metrics, persistence model, API boundary, UI view model, and offline E2E demo.

- **V2 (M0–M6 offline multi-agent roadmap):** Multi-Agent Runtime Layer built on top of V1 — 6 role-based Agents, AgentSession, TaskQueue, MessageBus, SharedBlackboard, AgentRunner, SkillRouter, EvidenceCollector, Fake LLM Planner, MCP Action Router (approval-gated), and Multi-Agent Session UI View Model.

**Current system classification:** Offline multi-agent prototype. Not a production system. Not connected to real LLM, real MCP, real commands, real HTTP, real browser, real database, or real audit persistence.

---

## 2. What V2 Can Do

| Capability | Status |
|---|---|
| Register 6 role-based Agents with profiles | ✅ |
| Create multi-agent testing sessions | ✅ |
| Assign tasks via priority-ordered TaskQueue | ✅ |
| Route skill invocations through role-aware SkillRouter | ✅ |
| Share state across agents via SharedBlackboard | ✅ |
| Communicate between agents via MessageBus | ✅ |
| Normalize evidence and detect weak/agent-reasoning evidence | ✅ |
| Classify severity (P0–P3) | ✅ |
| Analyze defects with suspected layer and root cause hypotheses | ✅ |
| Generate regression suggestions | ✅ |
| Generate ops checklists from deployment profiles | ✅ |
| Produce advisory release recommendations (approved/blocked/inconclusive) | ✅ |
| Generate Markdown test reports | ✅ |
| Detect evidence gaps (8 gap types) | ✅ |
| Enforce no-evidence-no-pass safety rule | ✅ |
| Evaluate approval policy (LOW/MEDIUM/HIGH/FORBIDDEN) | ✅ |
| Route MCP requests through approval gate (fake execution only) | ✅ |
| Route controlled execution through safety evaluation (dry-run/simulated) | ✅ |
| Generate fake LLM planner proposals (deterministic rules, no real LLM) | ✅ |
| Build UI view models and props-only React components | ✅ |
| Run deterministic end-to-end multi-agent demo | ✅ |

---

## 3. What V2 Cannot Do Yet

| Limitation | Reason |
|---|---|
| Call a real LLM | M4 fake planner only; real LLM integration requires productionization |
| Connect to a real MCP server | M5 fake read-only pilot only |
| Execute real shell commands | Controlled execution is dry-run/simulated only |
| Send real HTTP requests | No network access |
| Launch a real browser | No browser automation |
| Connect to a real database | All data is in-memory |
| Persist audit logs to disk or DB | Audit events are in-memory drafts only |
| Persist approval decisions | Approval is evaluated but not stored |
| Serve real API routes | API boundary is in-memory service only |
| Serve real UI pages | UI components are props-only shells |
| Auto-fix code | Agent proposals are advisory only |
| Auto-deploy | Not in scope |
| Auto-approve releases | Human-in-the-loop is required for HIGH risk |

---

## 4. Architecture Overview

```
┌──────────────────────────────────────────┐
│              AgentRegistry                │
│  6 Agent Profiles (role / skills / caps)  │
└──────────────────┬───────────────────────┘
                   │
┌──────────────────┴───────────────────────┐
│              AgentSession                 │
│  State machine: draft → running → done   │
└──────────────────┬───────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌────────────┐
│TaskQueue│  │MessageBus│  │Blackboard  │
│priority │  │send/sub  │  │shared state│
│pick     │  │broadcast │  │read/write  │
└────┬────┘  └──────────┘  └─────┬──────┘
     │                           │
     ▼                           │
┌─────────┐                      │
│AgentRunner  ◄──────────────────┘
│pick→plan                       
│→SkillRouter                     
│→write result                    
│→emit message                    
└────┬────┘
     │
     ▼
┌─────────────┐
│SkillRouter  │
│validate role│
│→typed input │
│→V1 skill    │
└────┬────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│           V1 Deterministic Skills         │
│  context / acceptance / test case / ops  │
│  evidence / severity / defect / regression│
│  release / report / approval / audit     │
└──────────────────────────────────────────┘
```

---

## 5. Run the Offline Multi-Agent Demo

### Quick Start

```bash
npx tsx agent-testing/trial-run-agent-notes.ts
```

This runs the real project data (11 evidence items, 5 defects, 13 modules) through the V2 multi-agent runtime.

### What You'll See

```
📋 Session: 6 Agents registered, 10 Tasks created
🔄 Round 1: 5 Agents work in parallel
🔄 Round 2: Remaining tasks run as dependencies are satisfied
📊 Blackboard: 17 acceptance points, 21 test cases, 11 evidence items
🔍 Evidence Gaps: 25 total, 21 open
🛡️ No-Evidence-No-Pass: violations detected
🚦 Release Recommendation: blocked
```

### Run the Small Note Fixture Demo

```ts
import { runSmallNoteMultiAgentRuntimeDemo } from './agent-testing/src/agent-runtime/agentRunner';

const demo = runSmallNoteMultiAgentRuntimeDemo();
console.log(demo.session.status);       // 'running'
console.log(demo.steps.length);         // steps per round × agents
console.log(demo.blackboardSummary);    // 12-dimension stats
```

### Build the UI View Model

```ts
import { buildMultiAgentSessionViewModel } from './agent-testing/src/ui-v2/multiAgentSessionMappers';
import { DEFAULT_AGENT_PROFILES } from './agent-testing/src/agent-runtime/agentProfileTypes';

const vm = buildMultiAgentSessionViewModel({
  session: demo.session,
  profiles: DEFAULT_AGENT_PROFILES,
});

// vm.overview / vm.agentProfiles / vm.taskQueue / vm.messageTimeline
// vm.blackboardSummary / vm.evidenceGaps / vm.approvals
```

---

## 6. Understand Agent Roles

| Agent | Role | Allowed Skills | Key Limitation |
|---|---|---|---|
| **Test Lead** | Orchestrator | context, release, report, approval, audit | Cannot bypass evidence. Cannot approve HIGH action. |
| **Product Acceptance** | Requirement extraction | acceptance_extraction, context_building | Does not execute MCP. Does not judge root cause. |
| **Test Design** | Test case generation | test_case_generation, regression_suggestion, context_building | Does not execute real tests. Generated cases ≠ passed tests. |
| **Developer Analysis** | Defect analysis | defect_analysis, regression_suggestion, evidence_normalization | Cannot invent code locations or logs. |
| **Ops Check** | Operations readiness | ops_checklist, read_only_mcp_pilot, controlled_execution | HIGH action requires approval. FORBIDDEN refused. |
| **User Representative** | Usability review | test_case_generation, context_building, acceptance_extraction | Does not request MCP. Does not judge release. |

---

## 7. Understand Task Queue and Message Bus

### Task Lifecycle

```
pending → assigned → running → completed
                            → blocked
                            → failed
                            → refused
                            → cancelled
```

- Tasks are created by Test Lead and assigned to specific Agent roles.
- `pickNextAgentTask()` selects the highest-priority pending/assigned task for a role.
- Tasks that are refused (permission denied) or blocked (missing input) write explanations to blackboard `unknowns`.

### Message Types

| Type | Sender | Meaning |
|---|---|---|
| `task_result` | Any Agent → Test Lead | Task completed successfully |
| `blocked_notice` | Any Agent → Test Lead | Task blocked or refused |
| `risk_warning` | Any Agent → Test Lead | Task completed with warnings |

Non-Test-Lead agents always send results back to Test Lead. Test Lead sends `broadcast`.

---

## 8. Understand Shared Blackboard

The SharedBlackboard is the single source of truth for all agents. Key fields:

| Field | Written By | Read By |
|---|---|---|
| `requirements` | Session init | context, acceptance |
| `context` | build_context | acceptance, test_cases, ops, report |
| `acceptancePoints` | extract_acceptance | test_cases, report |
| `testCases` | generate_test_cases | ops, severity, regression, release, report |
| `normalizedEvidence` | normalize_evidence | severity, defect, release, report |
| `severityClassifications` | classify_severity | defect, regression, release, report |
| `defectAnalyses` | analyze_defect | regression, release, report |
| `releaseRecommendation` | recommend_release | report, summarize_session |
| `unknowns` | All agents | review_evidence_gap |

Each task type has a declared contract (`AGENT_TASK_BLACKBOARD_CONTRACTS`) specifying which keys it reads and writes. Writing an undeclared key produces a warning (M3 lenient policy).

---

## 9. Understand SkillRouter

The SkillRouter is the gatekeeper between Agents and V1 deterministic Skills:

```
Agent → SkillRouter.invoke()
  → validateSkillInvocation() — 5 checks:
      ① agentRole matches profile
      ② taskType in profile.allowedTaskTypes
      ③ taskType has registered contract
      ④ skillName in profile.allowedSkills
      ⑤ inputRefs are valid blackboard keys & in contract.reads
  → buildTypedSkillInputFromBlackboard() — typedInputBuilder
  → V1 Skill function call
  → SkillRouterInvocationResult (output + writes + artifacts)
```

**Refused:** Permission denied (profile violation).
**Blocked:** Missing input data (typedInputBuilder returns `missing_input`).
**Unsupported:** Placeholder task (MCP/controlled_exec in M2-M4, now routed in M5).

---

## 10. Understand Evidence-aware Collaboration

After each round of agent execution, `runAllAgentsOnce` calls `updateEvidenceAwareBlackboard()`:

1. `collectEvidenceFromBlackboard()` — scans `testCases` and `normalizedEvidence`
2. `detectEvidenceGaps()` — identifies 8 gap types
3. `enforceNoEvidenceNoPass()` — checks report/release text for pass claims on no-evidence test cases
4. Gaps and warnings are appended to blackboard `unknowns` and `limitations`

**8 Evidence Gap Types:**

| Gap | Trigger |
|---|---|
| `missing_evidence` | Test case has zero linked evidence |
| `weak_evidence` | Evidence has `strength: 'weak'` |
| `inconclusive_evidence` | Evidence result is `inconclusive` or `not_run` |
| `agent_reasoning_only` | Evidence `executorType` is `agent_reasoning` |
| `simulated_or_placeholder_only` | Evidence text contains `simulated`/`placeholder`/`draft` |
| `conflicting_evidence` | Same test case has both pass and fail evidence |
| `missing_test_case_link` | Evidence has no `testCaseId` |
| `unknown` | Cannot classify from blackboard data |

---

## 11. Understand Fake LLM Planner

M4 provides a deterministic fake planner, not a real LLM:

```ts
import { createLlmPlannerInput, runFakeLlmPlanner } from './agent-testing/src/llm-planner';

const input = createLlmPlannerInput({ sessionId, traceId, agentProfile, blackboard });
const output = runFakeLlmPlanner(input);
// output.actionType: 'create_task' | 'invoke_skill' | 'request_mcp' | 'no_op'
```

**Fake planner rules (priority order):**
1. `request_controlled_execution` task → high-risk approval proposal
2. Open evidence gaps + agent can `review_evidence_gap` → create gap review task
3. Test Lead `summarize_session` → propose `report_generation` or `release_recommendation`
4. Ops Check + gap + MCP available → propose `read_only_snapshot`
5. Fallback → `no_op`

**The fake planner:**
- Does NOT call any LLM provider.
- Does NOT execute any action.
- Output is a proposal only, validated by `plannerOutputValidator`.
- Validator rejects: secrets/tokens, pass claims, forbidden risk, permission violations.

---

## 12. Understand MCP Request Flow

M5 routes MCP and controlled execution requests through approval gates:

```
Agent → SkillRouter → mcpActionRouter
  → check agent profile permission (canRequestMcp / canRequestControlledExecution)
  → approval bridge (evaluateApprovalPolicy)
  → forbidden? → reject, write audit event
  → pending approval? → pause, write pending result
  → allowed? → execute fake:
      read_only_mcp → runReadOnlyMcpPilot(fake snapshot)
      controlled_execution → buildDryRunExecutionPlan + simulateControlledExecution
  → map result to draft evidence (marked fake/simulated/draft)
```

**Key safety:** Fake MCP results are explicitly marked and are not treated as real pass evidence.

---

## 13. Understand UI View Model

M6 provides props-only React components for visualizing multi-agent sessions:

```tsx
import { MultiAgentRuntimeDemoShell } from './agent-testing/src/ui-v2';
import { buildMultiAgentSessionViewModel } from './agent-testing/src/ui-v2/multiAgentSessionMappers';

const vm = buildMultiAgentSessionViewModel({ session, profiles });
// <MultiAgentRuntimeDemoShell viewModel={vm} />
```

**Components (all props-only, no side effects):**

| Component | Displays |
|---|---|
| `MultiAgentSessionPanel` | Session overview + Agent profile cards |
| `AgentTaskQueuePanel` | Task table (id/agent/type/status/priority/goal) |
| `AgentMessageTimeline` | Message timeline (from→to/type/summary/time) |
| `SharedBlackboardPanel` | 12-dimension stat grid |
| `AgentEvidenceGapPanel` | Gap table (test case/reason/status/action) |
| `AgentApprovalPanel` | Approval table (agent/action/status/risk/reason) |
| `MultiAgentRuntimeDemoShell` | Full demo page composing all panels |

---

## 14. Important Safety Boundaries

These rules are enforced by the runtime, not just documented:

1. **Agent reasoning is not evidence.** Evidence with `executorType: 'agent_reasoning'` is automatically downgraded to weak.
2. **No evidence → no pass.** `enforceNoEvidenceNoPass()` scans report/release text and flags violations.
3. **SkillRouter blocks unauthorized access.** Agents cannot invoke skills outside their profile's `allowedSkills`.
4. **HIGH risk actions require approval.** `requiresApproval` must be true for high-risk planner output and MCP requests.
5. **FORBIDDEN actions are refused.** Destructive production operations are rejected before execution.
6. **Fake/simulated results are marked.** All MCP and controlled execution results include limitations stating they are fake/simulated/draft.
7. **Task completed ≠ test passed.** UI components display task completion status but include limitations clarifying the distinction.

---

## 15. Recommended Manual Trial Workflow

To trial V2 on a real small project:

1. **Collect requirements:** Write down your project's requirements as text (can be from README, product docs, or notes).
2. **Collect evidence:** For each requirement area, gather real evidence — code review notes, manual test screenshots, API response samples, config file excerpts, git log findings.
3. **Create an input:** Follow the pattern in `trial-run-agent-notes.ts` — define `requirements`, `rawEvidence`, `existingDefects`, and a task list.
4. **Run the runtime:** `runAllAgentsOnce()` in a loop, 2-3 rounds.
5. **Review the blackboard:** Check `releaseRecommendation`, `evidenceGaps`, `unknowns`.
6. **Build UI view model:** `buildMultiAgentSessionViewModel()` to get structured output.
7. **Act on gaps:** For each open evidence gap, collect real execution evidence (not agent reasoning).
8. **Re-run:** Feed new evidence back into the runtime and check if gaps close.

# Phase 15: Agent Capability Framework Contracts

Phase 15 adds a unified Agent capability framework inside the isolated `agent-testing/` module. It defines role profiles, capability levels, summary-only memory, draft planning, bounded reflection, action policy evaluation, and task loop drafts.

This phase does not add a runtime, API route, UI page, database migration, external dependency, MCP adapter, LLM call, scheduler, persistent memory, audit runtime, observability dashboard, or real system test execution.

## Capability Contracts Added

`agent-testing/src/agent-framework/` defines:

- `AgentCapabilityName`
- `AgentCapabilityLevel`
- `AgentCapabilityConfig`
- `AgentCapabilityMatrix`
- `AgentProfile`
- `AgentMemoryItem`
- `AgentMemoryState`
- `AgentPlan`
- `AgentPlanStep`
- `AgentReflectionNote`
- `AgentActionRequest`
- `AgentActionDecision`
- `AgentTask`
- `AgentTaskLoopDraft`

The module also adds deterministic utilities:

- `createCapabilityConfig`
- `buildCapabilityMatrix`
- `buildDefaultAgentProfiles`
- `createRunMemoryState`
- `summarizeAgentMemory`
- `filterMemoryForAgent`
- `createAgentPlanDraft`
- `validateAgentPlanBoundaries`
- `createReflectionNote`
- `buildBoundaryReflection`
- `evaluateAgentActionRequest`
- `createTaskLoopDraft`

## Unified Framework

The framework is shared across role Agents instead of giving each role a separate heavy Agent runtime. Each role gets a profile and capability matrix that enables different capability levels:

- Test Lead Agent: advanced planning and reflection, standard action, broad low-risk Skill access, and approval request drafting.
- Product Acceptance Agent: acceptance and ambiguity focus with standard persona modeling, reflection, and planning.
- Test Design Agent: advanced test-case planning and low-risk test design actions.
- Developer Analysis Agent: evidence-bounded defect analysis and regression suggestion.
- Ops Check Agent: advanced future action request capability, but approval-bound and forbidden from production destructive actions.
- User Representative Agent: advanced persona modeling, low action capability, and no high-risk MCP access by default.

This keeps capability reuse consistent across small-system scenarios while preserving role-specific boundaries.

## Memory Boundary

Memory is summary-only. `AgentMemoryItem` stores summaries, source references, evidence IDs, test case IDs, defect IDs, scope, kind, owner, sensitivity, and limitations.

The utilities do not persist memory, read files, call LLMs, call MCP, or store sensitive raw text. Memory summaries use deterministic redaction for secret-looking phrases. Memory is a coordination aid and must not be treated as proof that system behavior occurred.

## Reflection Boundary

Reflection is bounded one-shot self-check output. It can check coverage, evidence, severity, report, release, or boundary concerns, but it does not run an infinite reflection loop.

Reflection notes are analysis records. They are not execution evidence, cannot prove a pass, and cannot override missing evidence or release-blocking rules.

## Planning Boundary

Plans are drafts only. `createAgentPlanDraft` normalizes supplied steps and marks forbidden steps blocked. High-risk MCP-capable steps are marked `requiresApproval`.

`validateAgentPlanBoundaries` checks supplied metadata but does not execute steps, schedule work, call tools, request approval, or persist state.

## Action Boundary

Agent actions must be represented as deterministic Skill requests or future MCP adapter requests. `evaluateAgentActionRequest` delegates to the Phase 12 approval policy engine and returns an `AgentActionDecision`.

The action policy utility does not execute actions. HIGH-risk actions require approval. FORBIDDEN actions are rejected. Future MCP actions must still pass adapter, approval, audit, and evidence boundaries before any real execution can exist.

## Task Loop Boundary

`createTaskLoopDraft` returns a draft grouping of provided tasks into ready, blocked, and completed lists. It does not implement scheduling, concurrency, runtime dispatch, LLM planning, MCP execution, or task persistence.

Tasks requiring approval are treated as blocked until a future approval runtime supplies a decision.

## Instrumentation Boundary

Phase 15 prepares instrumentation-friendly structures through capability matrices, action decisions, reflection notes, plan validation, and task loop drafts. These objects can be referenced by future audit and observability flows.

No audit persistence, metrics exporter, observability dashboard, or live instrumentation runtime is implemented in this phase.

## Why No Real Runtime

A real multi-Agent runtime would require scheduler semantics, persistent state, identity, approval execution, audit storage, MCP adapters, data retention rules, UI/API integration, and operational monitoring.

This phase only defines the contracts and deterministic utilities needed before runtime work is safe.

## Next Phase

Phase 16 should implement MCP adapter contracts. That phase should define adapter request and response models, permission and side-effect metadata, approval-gate references, audit references, evidence references, tool failure classification, and strict boundaries before any read-only MCP pilot is introduced.

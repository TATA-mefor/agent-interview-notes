# Agent Testing V2 - M3: Evidence-aware Blackboard

M3 adds shared blackboard collaboration utilities for evidence-aware multi-agent runtime behavior. It stays inside `agent-testing/` and does not connect to LLMs, MCP servers, HTTP, browser automation, databases, filesystem evidence, or project runtime APIs.

## Typed Input Builder

`agent-testing/src/agent-runtime/typedInputBuilder.ts` extracts blackboard-to-skill input construction from `skillRouter.ts`.

It builds typed inputs for:

- context building
- acceptance extraction
- test case generation
- ops checklist generation
- evidence normalization
- severity classification
- defect analysis
- regression suggestion
- release recommendation
- report generation

If required blackboard data is missing, the builder returns `missing_input` with issues, warnings, and limitations. It does not invent test results or read external state.

## Evidence Collector

`agent-testing/src/agent-runtime/evidenceCollector.ts` summarizes evidence coverage from `SharedBlackboard`.

It detects:

- test cases with no linked evidence
- weak evidence
- inconclusive or not-run evidence
- agent-reasoning-only evidence
- simulated, placeholder, or draft evidence
- conflicting pass and fail or blocked evidence
- evidence records without `testCaseId`

These findings become evidence gaps. They are not treated as test failures by the runtime, but they are written into blackboard `unknowns` and `limitations` so later release decisions and reports can see the risk.

## No Evidence No Pass

M3 keeps the rule that no evidence cannot be treated as pass. Planned test cases are only plans until real execution evidence is supplied. Agent reasoning, placeholder output, and simulated data are not strong evidence and cannot support a pass claim.

## Blackboard Updates

`sharedBlackboard.ts` now provides immutable helpers to append unknowns, append limitations, and merge evidence summaries. These helpers trim empty strings and deduplicate notes to avoid repeated warning spam across runtime rounds.

`agentRunner.ts` calls the evidence collector once per `runAllAgentsOnce()` round. The runner preserves task completion semantics: evidence gaps become warnings and blackboard notes, not automatic task failures.

## Boundaries

M3 remains deterministic and in-memory only:

- no LLM calls
- no real MCP server or MCP tool calls
- no command execution as runtime behavior
- no HTTP requests
- no browser startup
- no database access
- no persistence
- no API route
- no UI
- no new dependency

## Next Phase

M4 is expected to introduce an LLM Planner Adapter Preview while preserving the rule that planner output is not execution evidence.

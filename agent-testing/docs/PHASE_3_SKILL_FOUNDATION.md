# Phase 3 Skill Foundation

## Scope

Phase 3 adds the first offline Skill foundation for the Small System Test Agent Team. The implementation stays inside `agent-testing/src/skills/` and builds on the Phase 2 domain types.

This phase adds deterministic pure functions only. It does not integrate these Skills into the main app runtime, API routes, UI, database, LLM services, MCP tools, shell commands, or production systems.

## Added Skill Interfaces

`agent-testing/src/skills/skillTypes.ts` defines:

- `SkillExecutionContext`
  - Records the run ID, invoking agent, timestamp, source, and run limitations.
- `SkillIssue`
  - Records process-level issues from a Skill run.
  - Uses `SkillIssueSeverity` (`info`, `warning`, `error`) to avoid treating Skill execution problems as product defects.
- `SkillTraceEntry`
  - Records short non-sensitive summaries of deterministic steps.
- `SkillResult<TOutput>`
  - Wraps Skill output with success status, issues, required evidence, produced process artifacts, limitations, and trace.
  - `evidenceProduced` is not real system execution evidence unless later evidence normalization links it to real observations.
- `DeterministicSkill<TInput, TOutput>`
  - Defines the shared offline contract: `name`, `riskLevel`, and `run(input, context)`.
- `createSkillResult`
  - Small helper for constructing consistent Skill results.

## Added Deterministic Skills

### Context Building Skill

File: `agent-testing/src/skills/contextBuildingSkill.ts`

Function:

```ts
buildContext(input, context)
```

Input:

- Target system name.
- Target system type.
- Description.
- Module list.
- Context sources.
- Known constraints.

Output:

- Target system summary.
- Module map.
- Deterministic risk areas.
- Context sources.
- Unknowns.
- Recommended next Skills.

Boundary:

- Uses only provided input.
- Does not read README, project files, logs, services, database, or runtime state.
- Risk areas are keyword-based hints, not proof of system behavior.
- Missing description or modules are recorded as issues and unknowns.

### Acceptance Extraction Skill

File: `agent-testing/src/skills/acceptanceExtractionSkill.ts`

Function:

```ts
extractAcceptancePoints(input, context)
```

Input:

- Requirement text.
- Source reference.
- Target modules.
- Default acceptance priority.

Output:

- `AcceptancePoint[]`.
- Ambiguity questions.
- Unknowns.

Boundary:

- Splits input by line and matches deterministic requirement keywords.
- Does not use LLM inference.
- Does not invent requirements.
- Does not verify implementation.
- Ambiguous or insufficient text remains ambiguous instead of being upgraded into a formal requirement.

### Test Case Generation Skill

File: `agent-testing/src/skills/testCaseGenerationSkill.ts`

Function:

```ts
generateSystemTestCases(input, context)
```

Input:

- Acceptance points.
- Target system type.
- Flags for ops, permission, and negative cases.

Output:

- `SystemTestCase[]`.
- Coverage notes.
- Unknowns.

Boundary:

- Generates planned cases only.
- Every acceptance point gets at least one positive planned case.
- Optional keyword rules add permission, ops, and negative or boundary planned cases.
- Required evidence lists describe future evidence needs such as human observation, browser screenshot, API response, command output, log excerpt, database check, and backup artifact.
- The Skill does not execute tests, mark cases as pass, or generate fake evidence.

## Why No LLM

This phase needs deterministic, fixture-testable behavior. LLM output would make acceptance extraction and test case generation harder to reproduce and harder to validate offline. Future phases may add optional LLM assistance only behind explicit boundaries and tests.

## Why No MCP

MCP is external context or tool access. Phase 3 Skills are internal project capabilities. They must run from supplied input only, without filesystem, terminal, browser, API, database, log, screenshot, or external service access.

## Why No Real File Reads

Reading repository files would turn these Skills into context-access tools. That belongs in a later MCP or adapter phase with permission, side-effect, trace, and evidence records. Phase 3 keeps the functions pure so they can be tested with fixtures.

## Evidence Boundary

Skill output can support planning, extraction, case design, and later report assembly. It is not real execution evidence by itself.

A generated acceptance point does not prove the product implements it. A generated test case does not prove the test ran. A generated risk area does not prove the risk exists in runtime behavior. Real pass, fail, blocked, and release conclusions still require evidence normalized under the evidence model.

## Phase 4 Path

Phase 4 should add Evidence normalization utilities that transform explicit raw observations into `SystemTestEvidence` records. It can build on the Phase 3 Skill result shape by:

- Normalizing human notes, command output, API summaries, browser observations, logs, config review, future MCP output, and Skill output.
- Preserving executor type, confidence, strength, limitations, and source references.
- Keeping tool failure, environment failure, system failure, missing evidence, and conflicting evidence separate.
- Ensuring Skill output cannot be upgraded into `pass` without real execution evidence.

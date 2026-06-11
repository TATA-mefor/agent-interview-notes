# Phase 4 Evidence Normalization

## Scope

Phase 4 adds offline evidence normalization utilities for the Small System Test Agent Team. The code lives under `agent-testing/src/evidence/` with a Skill wrapper under `agent-testing/src/skills/`.

This phase standardizes provided raw observations into `SystemTestEvidence`. It does not collect evidence, execute tests, read logs, call MCP, call LLM, connect to databases, classify severity, or generate reports.

## Added Evidence Utilities

`agent-testing/src/evidence/evidenceNormalization.ts` defines:

- `RawEvidenceInput`
  - A permissive upstream input shape for human notes, script summaries, API summaries, browser observations, log review, config review, MCP output, Skill output, or agent reasoning.
- `EvidenceNormalizationOutput`
  - Contains normalized `SystemTestEvidence`, blocking issues, recoverable warnings, normalized field names, and downgraded claims.
- `normalizeEvidenceResult`
  - Converts raw result values into `pass`, `fail`, `blocked`, `not_run`, or `inconclusive`.
- `normalizeExecutorType`
  - Converts raw executor names into the Phase 2 executor union.
- `inferEvidenceStrength`
  - Infers `weak`, `medium`, or `strong` from executor type and available source details.
- `applyEvidenceBoundaryRules`
  - Applies evidence model boundaries for agent reasoning, Skill output, config review, MCP tool records, and log review.
- `normalizeEvidence`
  - Main pure function that returns stable normalized evidence without throwing for ordinary dirty input.

## Supported Executor Types

- `human`
- `script`
- `api`
- `browser`
- `log_review`
- `config_review`
- `mcp_tool`
- `skill`
- `agent_reasoning`

Unrecognized executor types default to `agent_reasoning` and produce a warning because unknown executor output cannot independently prove system execution.

## Result Normalization

Result normalization is conservative:

- `pass`, `passed`, `success`, `ok`, `true` become `pass`.
- `fail`, `failed`, `error`, `broken`, `false` become `fail`.
- `blocked` becomes `blocked`.
- `not_run`, `not run`, `skipped` become `not_run`.
- `inconclusive`, `unknown`, `null`, `undefined`, and unrecognized values become `inconclusive`.

Unknown values never become `pass`.

## Strength Inference

Strength describes evidence quality, not system quality.

- `agent_reasoning` is always `weak`.
- `skill` is `weak` or `medium`.
- `config_review` is `weak` or `medium`.
- `human` can be `medium` when it has summary, observed time, and environment.
- `script` can be `strong` when it has command and output summary.
- `api` can be `strong` when it has request and response summary.
- `browser` can be `strong` when it has screenshot paths or clear observation summary.
- `log_review` can be `strong` when it has log material and source or time range.
- `mcp_tool` can be `medium` or `strong` when it has tool/raw evidence references and output summary.

Missing `evidenceSummary` or `evidenceSource` caps strength at `medium`. `not_run` evidence remains `weak`.

## Downgraded Pass Claims

The boundary rules intentionally downgrade or warn on unsupported pass claims:

- `agent_reasoning + pass`
  - Changes result to `inconclusive`.
  - Forces strength to `weak`.
  - Records `agent_reasoning cannot independently prove a passing system test`.
- `skill + pass`
  - Warns that Skill output is process evidence.
  - If no external evidence source exists, changes result to `inconclusive`.
- `config_review + pass`
  - Keeps the result but warns that config review does not prove live environment behavior.
- `mcp_tool`
  - Requires `evidenceSource`, `metadata.toolName`, or `metadata.rawEvidenceRef`.
  - Missing references produce warnings and strength limits.
- `log_review`
  - Requires logs or a log summary.
  - Missing log material limits strength and records a limitation.

## Why Agent Reasoning Cannot Prove Pass

Agent reasoning can connect facts, explain uncertainty, and recommend next checks. It is not an observation of the target system. A passing system test requires real execution evidence aligned with the test case requirements.

## Why Skill Output Is Not Execution Proof

Skill output can normalize, classify, plan, or summarize. It proves only that an internal process produced a structured artifact. It does not prove the product executed correctly unless it is tied to real raw observations such as command output, API response, browser screenshot, logs, or human execution details.

## Why No MCP Integration

MCP is an external tool access layer. Phase 4 can normalize already-provided MCP summaries, but it does not call MCP servers, run tools, browse pages, read files, query APIs, inspect logs, or access databases. Future MCP adapter phases must record permission level, side effect level, tool input, output, and raw evidence references.

## Why No Real System Tests

This phase only standardizes evidence records. Running tests would require terminal, browser, API, database, or environment access, which belongs to later explicitly permissioned phases. Normalization must remain pure and fixture-testable.

## Skill Wrapper

`agent-testing/src/skills/evidenceNormalizationSkill.ts` adds:

- `normalizeEvidenceSkill`
- `evidenceNormalizationSkill`

The wrapper accepts one or more `RawEvidenceInput` items, normalizes them, and returns:

- Normalized evidence list.
- Per-item normalization results.
- Aggregated issues.
- Aggregated warnings.
- Aggregated downgraded claims.

Its risk level is `MEDIUM` because it may process external test output, but the implementation does not read files, execute commands, call MCP, call LLM, or inspect live systems.

## Phase 5 Path

Phase 5 can implement deterministic severity classification on top of normalized evidence by:

- Reading `SystemTestEvidence.result`, `strength`, `executorType`, `limitations`, and `severity`.
- Applying `SEVERITY_RULES.md`.
- Keeping insufficient or conflicting evidence as `unknown`.
- Distinguishing product failures from tool, environment, Skill, MCP, or reasoning limitations.
- Avoiding any release approval based on weak or analysis-only evidence.

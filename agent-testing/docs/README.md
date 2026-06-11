# Small System Test Agent Team Docs

## Module Goal

`agent-testing/` is the future independent module for a Small System Test Agent Team. It is intended for 10-30 person small systems such as this local-first Agent interview notes application, internal knowledge bases, small management platforms, and similar products.

The module will help with test planning, acceptance extraction, system test case design, evidence normalization, defect analysis, severity classification, operations checks, and Markdown report generation.

Agent 不能凭空证明测试通过. A pass, fail, blocked, or release recommendation must be tied to real evidence such as human execution records, command output, API responses, browser screenshots, logs, configuration review, or explicitly recorded MCP tool output. Agent reasoning can explain and classify evidence, but it is not a replacement for execution.

## Current Phase

Current status: Phase 1, documentation and domain contracts only.

This phase creates the `agent-testing/docs/` documentation root and defines domain boundaries before any runtime work. It does not add TypeScript code, API routes, UI pages, database migrations, external dependencies, real LLM integration, MCP integration, Docker requirements, network requirements, or real system tests.

## Planned Module Layout

```text
agent-testing/
  docs/       # Phase 1 documentation contracts
  src/        # Later TypeScript domain, skills, orchestrator
  tests/      # Later offline tests
  examples/   # Later sample inputs, evidence, reports
```

Only `agent-testing/docs/` is maintained in Phase 1.

## Document Index

| Document | Purpose |
| --- | --- |
| `SMALL_SYSTEM_TEST_AGENT_TEAM_ADAPTATION_REPORT.md` | Project adaptation analysis migrated into the new module root. |
| `DOMAIN_CONTRACTS.md` | Agent roles and core domain objects. |
| `EVIDENCE_MODEL.md` | Evidence structure, executor types, and evidence strength. |
| `SEVERITY_RULES.md` | P0/P1/P2/P3/none/unknown classification rules. |
| `SKILL_CONTRACTS.md` | Internal Skill contracts for deterministic, replaceable capabilities. |
| `MCP_TOOLING_CONTRACTS.md` | MCP/external tool capability contracts and permission boundaries. |
| `REPORT_TEMPLATE.md` | Final system test report template. |
| `IMPLEMENTATION_BOUNDARIES.md` | Phase 1 scope, non-goals, and future implementation phases. |

## Path Decision

This module uses `agent-testing/` as an independent root instead of `docs/agent-testing/` because the test-agent direction is expected to grow beyond documentation. Future phases may add isolated domain types, deterministic skills, offline tests, sample evidence, and report examples. Keeping all of that under one module root makes ownership clear and avoids mixing test-agent assets with general project documentation.

`docs/agent-testing/` is not used as the main path because it would make the feature look like documentation-only work and would create a parallel structure once `src/`, `tests/`, and `examples/` are introduced. The current project already has a strong `Card` domain and lightweight Agent Service pattern; test-agent concepts must not be blended into existing interview-card docs or runtime paths.

## Skills And MCP Roles

Skills are project-internal, controllable, testable, and replaceable capability units. Examples include context building, acceptance extraction, test case generation, evidence normalization, severity classification, ops checklist generation, defect analysis, report generation, and regression suggestion. Skills can produce structured outputs and analysis, but Skill output alone does not prove that the target system behaved correctly.

MCP is an external tool or context-access capability. It may read files, inspect git state, run approved commands, drive a browser, call a test API, read test logs, query a test database, or manage screenshots and attachments. MCP can provide real evidence only when its invocation records the purpose, input, output, permission level, side effect level, raw evidence reference, and limitations.

Agent orchestration may call Skills and MCP tools, but it must not exaggerate a tool result into a full system-test conclusion. A single screenshot, command output, or static config check proves only the observed scope.

## Evidence Boundary

Real evidence includes direct observation of the system or its artifacts: human execution notes, scripts, API responses, browser automation, logs, configuration files, screenshots, attachments, and traceable MCP outputs.

Agent reasoning includes summaries, hypotheses, classifications, and recommendations. It can support analysis, but cannot independently prove pass. If the evidence is insufficient, the correct result is `unknown` or `inconclusive`, not `pass`.

## Fit With Current Project

This project is a local-first Next.js/TypeScript Agent interview card system. The test-agent module must stay compatible with that direction:

- Keep basic usage offline-capable.
- Keep LLM usage optional and user-triggered.
- Keep test-agent domain separate from `Card`.
- Keep existing lightweight Agent Service style in mind for later phases.
- Do not require Docker, database, network, or API keys for Phase 1.

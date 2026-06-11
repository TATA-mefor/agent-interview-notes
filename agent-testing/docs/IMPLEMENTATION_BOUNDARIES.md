# Implementation Boundaries

## Phase 1 Scope

This phase creates the `agent-testing/` independent module documentation root and defines contracts for the future Small System Test Agent Team.

This phase does:

- Create `agent-testing/docs/`.
- Migrate useful old `docs/agent-testing/` content when present.
- Define Agent roles.
- Define system test case model.
- Define acceptance point model.
- Define evidence model.
- Define severity rules.
- Define report template.
- Define Skill contracts.
- Define MCP tooling contracts.
- Define implementation boundaries and future phases.

Agent 不能凭空证明测试通过. Phase 1 establishes that real pass/fail/release decisions require evidence and that evidence must distinguish human observation, script/API/browser/log/config evidence, MCP tool output, Skill output, and Agent reasoning.

## Phase 1 Non-Goals

This phase does not:

- Write runtime code.
- Modify existing Agent services.
- Modify the `Card` domain model.
- Add database tables or migrations.
- Add API routes.
- Add UI pages.
- Integrate a real LLM provider.
- Execute real system tests.
- Connect to production environment.
- Add external dependencies.
- Integrate MCP.
- Execute side-effecting commands.
- Require Docker, database, network, or API keys.
- Mix test cases, defects, or evidence into the existing interview-card model.

## Boundary Principles

- The test-agent module is independent from the existing interview-card agents.
- Existing RAG and import ideas may inform future context building, but retrieved context does not prove execution.
- Existing `agent_runs` can inspire traceability later, but it is not a substitute for test evidence, defects, or reports.
- Skills are internal and testable.
- MCP tools are external access paths and must be permissioned, traceable, and side-effect aware.
- Evidence quality must control pass/fail/release conclusions.
- `unknown` is the correct answer when evidence is missing, weak, or conflicting.

## Future Phases

| Phase | Goal | Expected Files | Test Method | Non-Goals |
| --- | --- | --- | --- | --- |
| Phase 2: TypeScript domain types | Convert Phase 1 contracts into isolated TypeScript domain types. | `agent-testing/src/types.ts`, possible `agent-testing/tests/types.test.ts` after test runner decision. | Offline type checks or compile/build when available; fixture validation. | No API, UI, database migration, LLM call, MCP integration, or real test execution. |
| Phase 3: Skill interfaces and deterministic skills | Add Skill interfaces and deterministic baseline implementations for context, acceptance, cases, severity, and reports. | `agent-testing/src/skills/*.ts`, `agent-testing/tests/skills/*.test.ts`. | Fixture-based offline tests with no network, database, Docker, or API keys. | No heavy multi-agent framework, no production access, no automatic pass claims. |
| Phase 4: Evidence normalization utilities | Normalize human/script/API/browser/log/config/MCP/Skill/Agent evidence into one structure. | `agent-testing/src/evidence/*.ts`, `agent-testing/tests/evidence/*.test.ts`, `agent-testing/examples/evidence/`. | Table-driven tests for executor types, strength, conflicts, limitations. | No command execution, no browser automation, no database connection. |
| Phase 5: Severity classifier | Implement deterministic severity classifier using `SEVERITY_RULES.md`. | `agent-testing/src/severity/*.ts`, `agent-testing/tests/severity/*.test.ts`. | Table-driven tests for P0, P1, P2, P3, none, unknown. | LLM must not override hard rules; no issue creation. |
| Phase 6: Ops checklist generator | Generate static and live-check ops checklist from provided deployment context. | `agent-testing/src/ops/*.ts`, `agent-testing/tests/ops/*.test.ts`. | Fixture docs/config tests covering backup, restore, logs, permissions, env, network exposure. | No server connection, no Docker execution, no production mutation. |
| Phase 7: Markdown report generator | Generate report Markdown from cases, evidence, defects, Skill usage, MCP usage, risks, and unknowns. | `agent-testing/src/report/*.ts`, `agent-testing/tests/report/*.test.ts`, `agent-testing/examples/reports/`. | Snapshot-like or structure tests for required sections and release rules. | No hidden unknowns, no unsupported approved recommendation. |
| Phase 8: MCP adapter contracts | Define adapter interfaces and safe invocation records for future MCP tools. | `agent-testing/src/mcp/*.ts`, `agent-testing/tests/mcp/*.test.ts`. | Mock adapter tests for permission level, side effect level, failure classification, evidence conversion. | No real MCP server integration, no destructive command, no production access. |
| Phase 9: Test Lead Agent orchestration | Add lightweight orchestrator that calls deterministic Skills and records traceable outputs. | `agent-testing/src/orchestrator/testLeadAgent.ts`, tests under `agent-testing/tests/orchestrator/`. | Offline tests with mocked Skills/MCP outputs and fixed evidence. | No heavy framework, no real external tool execution by default, no database persistence required. |
| Phase 10: UI/API integration | Optional integration into the main app after contracts, types, and offline tests are stable. | Future `src/app/api/agent-testing/*`, future UI route, possible repository/persistence files. | Build check, API/service tests, browser checks if UI is added. | Do not mix with existing `Card` domain; do not require LLM/API keys for basic startup. |

## Production Safety

Production access is out of scope until later explicit approval and a separate safety design. Any future production-capable tool must default to read-only, redact sensitive data, record permission and side effect levels, and refuse destructive operations without explicit human approval.

## Local-First Compatibility

The future module should preserve the current project direction:

- Basic app startup must not depend on external SaaS.
- LLM providers remain optional.
- Test-agent MVP should run offline with fixtures.
- No large multi-agent framework is assumed.
- No new runtime dependency should be introduced without a concrete implementation phase and tests.

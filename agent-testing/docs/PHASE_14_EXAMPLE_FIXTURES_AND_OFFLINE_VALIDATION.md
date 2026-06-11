# Phase 14: Example Fixtures and Offline Scenario Validation

Phase 14 adds reusable offline examples and validation utilities inside `agent-testing/`. It uses static fixture input to exercise the deterministic Test Lead orchestration loop without connecting to the production project runtime.

## Added Example Fixture

The main fixture is `smallNoteSystemFixture`.

It models `Small Team Notes`, a 10-30 user note system with:

- authentication
- note CRUD
- search
- file upload
- sharing
- backup and restore
- logging
- admin permissions

The fixture includes requirements text, an ops profile, static raw evidence, and draft defect findings. The raw evidence deliberately covers pass, fail, inconclusive, weak, and downgraded evidence behavior.

## Added Offline Validation Utilities

Phase 14 adds:

- `OfflineScenarioFixture`
- `OfflineScenarioExpectedCharacteristics`
- `OfflineScenarioCheck`
- `OfflineScenarioValidationResult`
- `validateOfflineScenario`
- `validateSmallNoteSystemScenario`

`validateOfflineScenario` calls `runTestLeadOrchestration` with fixture input and checks expected characteristics in memory. It does not read files, write files, execute commands, call MCP, call LLMs, connect to a database, or execute tests.

## Small Note System Coverage

The small note fixture covers:

- successful login API evidence
- successful note creation human-observation evidence
- successful search API evidence
- unauthorized private-note access failure
- attachment upload boundary failure
- missing restore drill evidence
- weak backup oral claim
- `agent_reasoning + pass` evidence that must be downgraded to inconclusive weak evidence

It also includes release-relevant risk signals for permission/private data exposure and backup/restore operational readiness.

## Orchestrator Loop Validation

The validation utility checks the deterministic loop from fixture input through:

1. context building
2. acceptance extraction
3. test case generation
4. ops checklist generation
5. evidence normalization
6. severity classification
7. defect analysis
8. regression suggestion
9. release recommendation
10. Markdown report generation
11. trace and audit draft generation

Validation checks include minimum acceptance points, minimum test cases, evidence count, expected severity values, expected release recommendation, downgraded agent reasoning, permission risk, ops risk, report output, trace output, audit drafts, and absence of synthesized pass evidence.

## Why This Phase Does Not Execute Real Tests

Phase 14 is for deterministic pipeline validation. Static fixture evidence is enough to verify that the orchestration wiring, boundary handling, and validation checks behave as intended.

Real tests require live system access, environment selection, tool permissions, approval policy enforcement, and audit persistence. Those belong to later MCP and runtime integration phases.

## Why This Phase Does Not Connect MCP

MCP access may read files, call APIs, drive browsers, execute commands, inspect logs, or touch deployed environments. Phase 14 intentionally avoids those side effects.

The fixture may describe evidence that future MCP tools could collect, but it does not request or execute MCP tools.

## Why Fixture Results Are Not Real Reports

The fixture output and generated Markdown string are derived from static sample data. They are useful for offline validation, documentation, and development confidence, but they are not evidence of a real deployment.

Do not treat fixture validation output as a release report, production test result, audit log, or human approval decision.

## Phase 15 Preview

Phase 15 should define the Agent capability framework. That framework can describe which agent capabilities are deterministic Skills, which are future MCP-backed actions, which permissions they need, and how they interact with approval and audit contracts before any real external execution is introduced.

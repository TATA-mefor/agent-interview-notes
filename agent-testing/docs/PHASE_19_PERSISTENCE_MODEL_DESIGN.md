# Phase 19: Persistence Model Design

Phase 19 adds persistence model contracts for controlled execution, evidence, audit, approval, reports, release recommendations, and agent framework artifacts inside the isolated `agent-testing/` module.

This phase is design-only. It does not add a database migration, ORM schema, repository implementation, runtime service, API route, UI page, MCP integration, LLM call, or real system-test execution.

## Added Persistence Models

The new `agent-testing/src/persistence/` module defines:

- Base persistence metadata: record kind, status, sensitivity, data boundary, source, timestamps, creator, and limitations.
- Record contracts for test runs, traces, test cases, acceptance points, evidence, severity classifications, defects, defect analysis, regression suggestions, release recommendations, reports, approval requests and decisions, audit events, observability snapshots, MCP requests/results, controlled execution requests/plans/results, agent memory, agent plans, agent reflections, and agent tasks.
- Relationship contracts for traceability across records.
- Repository interfaces for future run, evidence, audit, approval, report, and execution storage.
- In-memory persistence snapshot utilities.
- Deterministic redaction and summary utilities.
- Persistence validation utilities.

## Future Persisted Objects

Future API/UI/database phases can persist:

- Test run metadata and orchestration trace summaries.
- Test cases, acceptance points, evidence summaries, severity classifications, defects, and defect analysis.
- Regression suggestions, release recommendations, and report summaries.
- Approval requests, approval decisions, audit events, and observability snapshots.
- MCP tool request/result records and controlled execution request/plan/result records.
- Agent memory, plan, reflection, and task-loop draft records.

The contracts are shaped around summary, reference, and ID fields. They intentionally avoid requiring full raw evidence, full markdown, private logs, credentials, prompts, or sensitive source text.

## Traceability

Evidence, severity, defect, report, and release recommendation traceability is represented by `PersistenceRelationship` records:

- Evidence can be referenced by severity classification, defects, reports, and release recommendations.
- Reports can `reports_on` evidence and defects and `summarizes` release recommendations.
- Release recommendations can be `derived_from` or `references` evidence.
- Approval requests can `requires_approval` for MCP or controlled execution records.
- Approval decisions can `approved_by` or `rejected_by` requests.
- MCP and controlled execution records can be `audited_by` audit events.

Relationship builders are deterministic and only use supplied record IDs. They do not query storage.

## Summary-Only Persistence Boundary

Persistence records use explicit `sensitivity` and `dataBoundary` fields:

- `summary_only`
- `reference_only`
- `redacted_content`
- `structured_non_secret`
- `forbidden_raw_secret`

`forbidden_raw_secret` is included as a policy marker, not as an allowed persisted state. Validation flags it as an error.

Evidence records store `sourceSummary`, `evidenceSummary`, `rawEvidenceRef`, and related result IDs. Report records store `markdownSummary` and optional `markdownRef`; storing full markdown is not required. Agent memory and reflection records remain summary-only and cannot become proof of execution.

## Redaction

`redactPersistenceText`, `summarizeForPersistence`, and `classifyPersistenceSensitivity` apply deterministic pattern-based handling for token, password, secret, key, bearer, authorization, private key, access token, credential, and common Chinese secret terms.

This is not a security scanner. It is a conservative persistence-boundary utility for future adapters and storage layers.

## Repository Interfaces Only

Phase 19 defines repository interfaces such as `AgentTestingRunRepository`, `AgentTestingEvidenceRepository`, `AgentTestingAuditRepository`, `AgentTestingApprovalRepository`, `AgentTestingReportRepository`, `AgentTestingExecutionRepository`, and `AgentTestingPersistenceUnitOfWork`.

No class implements these interfaces in this phase. No database is connected, no file is written by these interfaces, and no ORM is introduced.

## Snapshot Is Not Storage

`buildPersistenceSnapshot` creates an in-memory export shape from supplied records and optional orchestration, approval, audit, MCP, controlled execution, or report outputs. It helps later phases preview what would be persisted.

The snapshot is not a database, not a persisted audit log, and not proof that anything was stored. It is returned data only.

## Validation

`validatePersistenceSnapshot` checks:

- Records have IDs and run IDs.
- Records declare sensitivity and data boundary.
- Raw-secret persistence boundaries are rejected.
- Evidence stores summary/ref fields instead of raw secret content.
- Report records have trace relationships to evidence, defects, release recommendation, or references.
- Approval requests are traceable to audit or approval relationships.
- Controlled execution results are marked simulated and not real execution evidence.
- Agent memory is summary-only.
- Agent reflection cannot support or produce execution evidence.
- Relationships point to existing records.

## Boundaries

Phase 19 does not:

- Add runtime integration.
- Add API routes.
- Add UI pages.
- Add database migrations.
- Add external dependencies.
- Implement repository classes.
- Connect to a database.
- Persist any data.
- Call MCP tools.
- Call LLMs.
- Execute commands, HTTP requests, browser actions, or real system tests.
- Store sensitive raw text.

## Next Phase

Phase 20 can build API integration on top of these contracts. That phase should choose how API inputs map into repository interfaces, how redaction is enforced before storage, and how relationship validation blocks unsafe persistence attempts.

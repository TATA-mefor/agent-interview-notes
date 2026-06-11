# Phase 20: API Boundary + In-memory Application Service

Phase 20 adds a stable API boundary inside the isolated `agent-testing/` module. It introduces request/response contracts, DTO mappers, structured API errors, an in-memory application service, route-handler-like functions, and a small note fixture demo.

This phase does not add a real Next.js route, server runtime, database integration, repository implementation, UI page, MCP connection, LLM call, external request, command execution, browser execution, or real system test.

## Added API Boundary Contracts

The new `agent-testing/src/api/` module contains:

- `apiTypes.ts`: method, status, request context, response, list response, and pagination contracts.
- `apiErrors.ts`: structured error codes and response builders.
- `apiModels.ts`: run, evidence, approval, audit, observability, report, and snapshot DTOs.
- `apiMappers.ts`: pure mapping utilities from internal deterministic outputs to summary-only DTOs.
- `inMemoryAgentTestingStore.ts`: volatile Map-based store for development and UI pre-integration.
- `agentTestingApiService.ts`: application service over orchestration, evidence normalization, approval policy, audit, observability, reports, and persistence snapshots.
- `agentTestingApiHandlers.ts`: route-handler-like wrappers that call service methods but do not use Web `Request` or `Response`.
- `smallNoteApiDemo.ts`: offline demo over the small note fixture.

## Why This Is Not a Real Next.js Route

The purpose of this phase is to stabilize the boundary before UI integration. Adding real `app/api` or `pages/api` files now would couple the experimental agent-testing contracts to the production runtime too early.

The handler-like functions are plain functions. Later phases can wrap them from a real Next.js route after routing, authentication, storage, and deployment boundaries are decided.

## Why In-memory Store

The in-memory store is intentionally volatile. It uses Maps for:

- runs
- orchestration outputs
- evidence
- approvals
- audit trails
- observability metrics
- reports
- persistence snapshots
- validation results

It is useful for local development and UI pre-integration. It is not a repository implementation, database, cache, localStorage layer, or production persistence mechanism. Restarting the runtime loses all stored data.

## Service Boundaries

`createRun` validates required input, maps API input to `TestLeadOrchestrationInput`, runs deterministic orchestration, builds audit trail output, aggregates observability metrics, builds a persistence snapshot, validates the snapshot, and stores summaries in memory.

`submitEvidence` accepts caller-provided raw evidence, normalizes it, and updates the in-memory evidence view. It does not execute tests, call MCP, call APIs, drive a browser, or mark anything pass by default. It does not recompute release recommendation automatically.

`evaluateApproval` calls the deterministic approval policy engine and stores the result as an in-memory draft. It does not request real human approval, notify anyone, or persist approval decisions.

`generateReport` returns report DTOs and can regenerate markdown from in-memory orchestration data. It does not write report files and report generation is not treated as evidence.

`getAuditTrail`, `getObservabilityMetrics`, `getPersistenceSnapshot`, and `validatePersistenceSnapshot` expose summary-only DTOs over in-memory data. They do not connect to storage or emit telemetry.

## Summary-only / Redacted Responses

API responses intentionally avoid exposing full raw text. DTOs use summary, ID, reference, count, warning, limitation, and trace fields. Long or sensitive text is passed through persistence redaction and summary helpers for token, password, secret, key, bearer, authorization, credential, private key, and common Chinese secret terms.

This boundary protects later UI integration from accidentally rendering raw evidence, raw logs, full prompts, private files, credentials, or sensitive report content.

## Existing Pipeline Usage

The service composes existing deterministic utilities:

- `runTestLeadOrchestration`
- `normalizeEvidence`
- `evaluateApprovalPolicy`
- `buildAuditTrail`
- `aggregateObservabilityMetrics`
- `generateMarkdownReport`
- `buildPersistenceSnapshot`
- `validatePersistenceSnapshot`

These calls are pure/in-memory within `agent-testing/`. They do not execute real systems.

## How Future Routes Can Use This Boundary

Phase 21 UI integration can call the service directly in local state or a controlled adapter.

When a later phase adds real Next.js routes, those route files should:

1. Parse the Web request.
2. Build `AgentTestingApiRequestContext`.
3. Validate authentication and authorization outside this module.
4. Call the handler-like function or service method.
5. Return the structured `AgentTestingApiResponse`.
6. Keep persistence, secret handling, and approval runtime decisions outside this Phase 20 boundary until those runtimes are explicitly implemented.

## Boundaries

Phase 20 does not:

- Add real Next.js routes.
- Add `app/api` or `pages/api`.
- Add a runtime server.
- Add UI pages.
- Add database migrations.
- Add dependencies.
- Implement real repositories.
- Connect to a database.
- Persist data to disk.
- Use localStorage.
- Call MCP tools.
- Call LLMs.
- Execute commands, HTTP requests, browser actions, or system tests.
- Read real files, configuration, or logs.
- Treat API `createRun` as real test execution.
- Treat in-memory storage as production persistence.
- Treat submitted evidence as pass unless the provided input normalizes to pass.

## Next Phase

Phase 21 can build UI integration against these API contracts. The UI should display summaries, trace IDs, evidence IDs, approval drafts, audit summaries, observability counts, report summaries, and snapshot validation status without reaching into the lower-level deterministic functions directly.

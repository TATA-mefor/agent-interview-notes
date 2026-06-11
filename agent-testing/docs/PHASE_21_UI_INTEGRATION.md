# Phase 21: UI Integration for Agent Testing API Boundary

Phase 21 adds a reusable UI integration layer inside the isolated `agent-testing/` module. It introduces view model contracts, pure UI mappers, props-only React component shells, and a small note UI demo view model.

This phase does not add a real Next.js route, production page, API route, database integration, MCP connection, LLM call, HTTP request, browser automation, external dependency, or real system test.

## UI View Models Added

The new `agent-testing/src/ui/uiTypes.ts` module defines summary-oriented view models:

- `AgentTestingUiStatusTone`
- `AgentTestingUiBadge`
- `AgentTestingSummaryCard`
- `AgentTestingRunOverviewViewModel`
- `AgentTestingEvidenceRow`
- `AgentTestingApprovalRow`
- `AgentTestingAuditTimelineItem`
- `AgentTestingObservabilityViewModel`
- `AgentTestingReportViewModel`
- `AgentTestingPersistenceViewModel`
- `AgentTestingReleasePanelViewModel`
- `AgentTestingDemoShellViewModel`

These types are designed for UI rendering and intentionally avoid exposing raw private evidence, full logs, secrets, or lower-level domain internals.

## UI Mappers Added

The new `agent-testing/src/ui/uiMappers.ts` module maps Phase 20 API DTOs and the small note API demo result into UI view models:

- `mapApiDemoToUiViewModel`
- `mapRunToOverviewViewModel`
- `mapEvidenceToRows`
- `mapApprovalsToRows`
- `mapAuditTrailToTimeline`
- `mapObservabilityToViewModel`
- `mapReportToViewModel`
- `mapPersistenceSnapshotToViewModel`
- `mapReleaseRecommendationToBadge`
- `mapSeverityToBadge`
- `mapEvidenceResultToBadge`

The mappers are pure functions. They do not call services, read files, write files, fetch data, call MCP, call LLMs, or execute tests.

Missing fields are mapped to `unknown` or `not provided`. Missing evidence and no evidence states are mapped to warning or muted badges, never success. `blocked` release recommendations map to danger, `approved_with_risks` maps to warning, and `approved` maps to success while preserving limitations.

## Components Added

The new props-only component shells are:

- `AgentTestingRunOverview`
- `AgentTestingEvidenceTable`
- `AgentTestingReleasePanel`
- `AgentTestingApprovalPanel`
- `AgentTestingAuditTimeline`
- `AgentTestingObservabilityPanel`
- `AgentTestingReportPreview`
- `AgentTestingPersistencePanel`
- `AgentTestingDemoShell`

These components accept view models or rows through props only. They do not call APIs, create services, access `window`, use `localStorage`, use `fetch`, read or write files, or create side effects. They use plain HTML elements and `className` hooks so a later integration phase can style them without adding a UI dependency here.

## Why This Phase Does Not Add a Next.js Route

The goal is to stabilize reusable UI contracts before mounting anything in the production app. A real route would introduce runtime, navigation, authorization, and deployment concerns that are outside this phase.

Future app pages can import the view models and components after routing and access-control boundaries are designed.

## Why UI Consumes API Boundary DTOs

The UI layer consumes Phase 20 DTOs and demo results instead of calling lower-level domain functions directly. This keeps rendering code decoupled from orchestration internals, persistence contracts, approval policy internals, audit event construction, and release recommendation rule details.

This also protects the UI from accidentally rendering raw evidence, raw logs, prompts, private files, credentials, or internal-only data.

## Why UI Does Not Connect to Database or MCP

This phase is presentation-only. Database access, repository implementation, MCP tool execution, approval runtime, and real evidence collection are separate integration concerns. The UI components should render already prepared view models and should not decide how evidence is collected or persisted.

## Why UI Does Not Execute Tests

A UI preview cannot prove system behavior. Test execution must produce evidence through controlled execution boundaries and audit trails in later phases. The UI must never treat a generated report, simulated result, pilot draft, or missing evidence as real pass evidence.

## Small Note UI Demo

`buildSmallNoteUiDemoViewModel()` calls Phase 20 `runSmallNoteApiDemo()` and maps the returned in-memory API demo result into `AgentTestingDemoShellViewModel`.

The demo view model is deterministic and in-memory. It does not call a real API route, start a server, execute tests, call MCP, call LLM, write files, access the browser, or connect to a database. It is a UI preview shape, not a production test report.

## Phase 22 Direction

Phase 22 can build an end-to-end demo integration by mounting the demo shell behind an explicitly experimental page or harness, wiring it to the Phase 20 API boundary, and showing approval, audit trail, evidence, report, observability, and persistence validation together.

Phase 22 should still keep production routing, real persistence, real MCP execution, real system testing, and approval runtime clearly separated unless those boundaries are explicitly added.

## Boundaries

Phase 21 does not:

- Add a real Next.js route.
- Add `app/api` or `pages/api`.
- Add a runtime server.
- Add a database migration.
- Add dependencies.
- Connect to a database.
- Implement a repository.
- Persist data to disk.
- Call MCP tools or servers.
- Call LLMs.
- Execute commands, HTTP requests, browser actions, or system tests.
- Use `fetch`, `window`, or `localStorage`.
- Read real files, configuration, or logs.
- Modify production pages, navigation, Card domain, existing agents, RAG, LLM, import, or review code.
- Treat UI demo output as real test execution.
- Treat in-memory data as production persistence.
- Treat no evidence as pass.
- Render sensitive raw content.

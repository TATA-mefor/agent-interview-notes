# End-to-end Small Note Offline Demo

This example documents the Phase 22 end-to-end demo for the isolated `agent-testing/` module.

The demo combines the previous offline contracts and deterministic utilities into one in-memory result. It does not add a script, route, server, database, MCP connection, command execution, HTTP request, browser launch, or LLM call.

## What It Shows

- Phase 14 small note fixture validation.
- Phase 20 in-memory API service demo.
- Phase 21 UI view model and component shell data.
- Phase 17 fake read-only MCP pilot over an in-memory snapshot.
- Phase 18 controlled execution dry-run and simulated previews.
- Phase 12 approval policy evaluations for LOW, HIGH, and FORBIDDEN actions.
- Phase 13 audit trail and observability metrics previews.
- Phase 19 in-memory persistence snapshot and metadata validation.
- Phase 9 markdown report preview.

## Small Note Fixture Coverage

The fixture models a small team note system with login, note creation, search, private note authorization, shared notes, file upload boundaries, backup/restore readiness, logging, and admin permissions.

The fixture intentionally includes:

- Static pass evidence for login, create note, and search.
- A P0 private note authorization failure.
- A P2 file upload feedback issue.
- A P1 restore evidence gap.
- Weak agent reasoning that must be downgraded and must not become pass evidence.

## Boundaries

The API demo uses an in-memory application service only. It does not create a real API route or start a server.

The UI demo produces a props-only view model and component shell data. It is not a production page and does not use a browser or `localStorage`.

The MCP pilot uses fake read-only snapshot adapters. It does not connect to a real MCP server or call a real MCP tool.

Controlled execution previews are dry-run or deterministic simulation outputs. They do not execute commands, send HTTP requests, launch browsers, or produce real pass evidence.

Approval preview is deterministic policy evaluation only. It does not request or record real human approval.

Audit and observability are in-memory preview objects. They are not persisted and are not dashboard runtime metrics.

Persistence snapshot is an in-memory export shape. It is not a database write, migration, repository implementation, or disk persistence.

The report preview is a deterministic markdown report over fixture-driven data. It is not a real production system test report.

## Code Usage

```ts
import {
  runSmallNoteEndToEndDemo,
  validateEndToEndDemoResult,
} from './agent-testing/src';

const demo = runSmallNoteEndToEndDemo();
const validation = validateEndToEndDemoResult(demo);
```

The returned data is meant for inspection, documentation, and future productionization planning. It must not be treated as live system evidence.

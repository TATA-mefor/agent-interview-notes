# Phase 17: Read-only MCP Pilot Contracts and Controlled Read Execution Boundary

Phase 17 adds a deterministic, in-memory read-only MCP pilot under `agent-testing/`. It validates the Phase 16 chain from MCP request to approval gate, fake snapshot read, MCP result, raw evidence draft, audit event draft, and optional normalized evidence preview.

This is not real MCP execution. It does not read files, call HTTP APIs, connect databases, start browsers, read logs, execute commands, write files, or persist evidence/audit data.

## Added Utilities

The `mcp-pilot` module adds:

- `ReadOnlyPilotAdapterKind` for the Phase 17 allowlist.
- `ReadOnlyPilotToolName` for snapshot/fixture read tools.
- `ReadOnlyPilotSnapshot` and `ReadOnlyPilotSnapshotEntry` for in-memory fixture data.
- `ReadOnlyPilotExecutionInput`, `ReadOnlyPilotExecutionOptions`, and `ReadOnlyPilotExecutionOutput`.
- Fake read adapters for fixture files, git diffs, HTTP response snapshots, database row snapshots, log excerpt snapshots, and screenshot metadata snapshots.
- `runReadOnlyMcpPilot` as the controlled executor.
- A small note system scenario fixture and runner.
- `readOnlyMcpPilotSkill` as a LOW-risk deterministic Skill wrapper.

## Why In-memory Snapshot Only

The goal is to validate contracts and boundaries before real MCP integration. In-memory snapshots make every outcome deterministic and reviewable while avoiding real environment access.

The snapshot fields are summaries supplied by the caller:

- `files`
- `gitDiffs`
- `httpResponses`
- `databaseRows`
- `logExcerpts`
- `screenshotMetadata`

None of these are paths, URLs, queries, browsers, or logs to be read at runtime.

## Reuse of Phase 16 Contracts

The pilot uses Phase 16 request/result contracts:

1. `McpToolRequest` describes the requested read.
2. `evaluateMcpToolRequestApproval` applies the approval gate.
3. A fake adapter reads only from `ReadOnlyPilotSnapshot`.
4. `McpToolResult` records success, blocked, forbidden, inconclusive, or failure state.
5. `mapMcpResultToRawEvidenceDraft` creates a raw evidence draft when enabled.
6. `buildMcpRequestAuditEventDraft` and `buildMcpResultAuditEventDraft` create audit drafts when enabled.

## Allowed Adapters and Tools

Phase 17 allows only:

- `filesystem_repository` with `read_fixture_file`
- `git` with `read_git_diff_snapshot`
- `http_api` with `read_http_response_snapshot`
- `database` with `read_database_query_snapshot`
- `log_monitoring` with `read_log_excerpt_snapshot`
- `screenshot_attachment` with `read_screenshot_metadata_snapshot`

Tool names explicitly include `snapshot` or `fixture` to avoid implying real reads.

## Why Terminal and Browser Are Excluded

`terminal_command` and `browser_automation` require execution-like behavior. Even in test environments, they can mutate state, depend on live targets, or create side effects. They belong to Phase 18 or later, after stronger controlled execution boundaries are defined.

## Approval and Boundary Rules

`runReadOnlyMcpPilot` first evaluates approval policy. Forbidden and approval-pending requests do not reach fake adapters.

The pilot also blocks requests that:

- are not on the Phase 17 adapter/tool allowlist
- are not `READ_ONLY`
- have side effects other than `NONE`
- execute commands
- mutate databases
- write files
- mutate deployments
- are destructive
- attempt production sensitive-data access

Medium-risk reads can be allowed or blocked by `allowMediumRiskRead`.

## Evidence and Audit Drafts

Pilot result mapping is conservative:

- A fake adapter success only means an in-memory snapshot entry was found.
- Pilot success does not prove a system test passed.
- Missing snapshot entries are environment/input limitations, not system-under-test failures.
- Raw evidence drafts are drafts only.
- Normalized evidence previews are previews only and are not persisted.
- Audit event drafts are summaries only and are not written to any audit runtime.

## Small Note Scenario

The built-in small note scenario includes:

- a requirements fixture summary
- a permission-check git diff summary
- an unauthorized private-note HTTP response snapshot
- notes/shares database row summary
- permission/upload/backup log excerpt summary
- upload failure screenshot metadata summary
- a forbidden database mutation request to prove blocking behavior

The scenario summarizes total requests, fake reads, forbidden requests, approval-blocked requests, evidence drafts, and audit drafts.

## Phase 18 Direction

Phase 18 can introduce command/API/browser controlled execution, but it must continue using approval gates, audit drafts, evidence mapping, environment restrictions, and explicit boundaries. Real execution should remain separate from evidence interpretation: a successful tool run is not automatically a passing system test.

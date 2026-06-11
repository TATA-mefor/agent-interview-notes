# Phase 16: MCP Adapter Contracts and Approval-Gated Tool Request Model

Phase 16 adds MCP adapter contracts, approval-gated request models, result models, evidence draft mapping, audit draft mapping, and a default adapter registry under `agent-testing/`.

This phase is contract-only. It does not connect to a real MCP server, execute tools, start browsers, run commands, access networks, read logs, query databases, persist events, or create real test evidence.

## Added MCP Contracts

The MCP module defines:

- `McpAdapterKind`, compatible with the existing `McpCapability` values.
- `McpAdapterStatus` for `not_configured`, `available`, `disabled`, `error`, and `forbidden`.
- `McpAdapterCapabilityDescriptor` for supported tools, permission level, side effect level, environments, approval defaults, production allowance, and limitations.
- `McpAdapterContract` for adapter identity, server name, status, capability descriptors, boundary text, and limitations.
- `McpAdapter`, which exposes only `contract` and `describe()`.

There is intentionally no real `execute()` method in this phase.

## Approval-Gated Request Model

`createMcpToolRequest` creates a deterministic draft request with:

- agent role and run ID
- adapter kind, server name, and tool name
- purpose, input summary, and expected output
- permission and side effect levels
- environment and production/destructive/sensitive-data flags
- deployment, database, command, external-call, filesystem-write, and network flags
- evidence that a future execution may produce
- status and limitations

It does not call approval policy and does not call MCP.

`evaluateMcpToolRequestApproval` maps a request into the Phase 12 `evaluateApprovalPolicy` contract. Its output state is conservative:

- `forbidden` remains forbidden.
- `rejected` remains rejected.
- `pending` becomes `approval_pending`.
- explicit `approved` becomes `ready_for_future_execution`.
- no approval requirement becomes `approval_not_required`.

`ready_for_future_execution` only means the request passed this deterministic policy boundary. It is not execution and does not create evidence.

## Tool Result Model

`McpToolResult` separates tool state from system-under-test state:

- `success` means the future MCP tool reported a successful tool-level outcome.
- `failed` with `tool_failure` means the tool failed.
- `failed` with `environment_failure` means the environment or setup failed.
- `failed` with `system_under_test_failure` means the output is a candidate system-under-test failure.
- `blocked_by_approval`, `forbidden`, and `not_executed` mean no useful system execution evidence exists.
- `timeout`, `permission_denied`, and `unknown` are not automatically system failures.

`buildNotExecutedMcpToolResult` represents requests that were not executed or were blocked by approval/policy. It does not produce evidence IDs.

## Evidence Draft Mapping

`mapMcpResultToRawEvidenceDraft` creates a Phase 4 `RawEvidenceInput` draft:

- executor type is `mcp_tool`.
- `system_under_test_failure` maps to `fail`.
- blocked, forbidden, and not-executed outcomes map to `not_run`.
- success maps conservatively to `inconclusive` unless later evidence normalization proves actual system behavior.
- tool, approval, permission, timeout, and environment failures are not treated as system-under-test failures.

MCP success is not a test pass. A future MCP tool can succeed while only proving that the tool ran, not that the target workflow passed.

## Audit Draft Mapping

`buildMcpRequestAuditEventDraft` and `buildMcpResultAuditEventDraft` create Phase 13 `AuditEventInput` drafts for:

- `mcp_requested`
- `mcp_completed`
- `mcp_failed`

The drafts store summaries, IDs, policy state, permission level, side effect level, MCP capability, result status, artifact references, and limitations. They do not store full sensitive tool input and are not persisted.

## Default Adapter Registry

`createDefaultMcpAdapterContracts` returns not-configured contracts for:

- filesystem repository
- git
- terminal command
- browser automation
- HTTP API
- database
- log monitoring
- screenshot attachment

Terminal, browser, HTTP, database, and log-related contracts are marked with higher-risk limitations and approval expectations. Filesystem, git, and screenshot contracts are still bounded by permission, environment, evidence, and audit constraints.

## Why This Phase Does Not Execute MCP

MCP adapters may eventually run commands, access APIs, automate browsers, read databases, read logs, or manage evidence artifacts. Those actions can reveal sensitive data, mutate test environments, call external systems, or affect release decisions.

For that reason, Phase 16 only defines contracts and deterministic gates. Real execution must wait until approval policy, audit drafts, evidence mapping, and adapter boundaries are explicit.

## Phase 17 Direction

Phase 17 should implement a read-only MCP pilot. The pilot should keep adapters limited to approved read-only capabilities, use `McpToolRequest` as the request boundary, pass approval policy before execution, map every result into evidence drafts, and create audit event drafts without treating MCP success as an automatic test pass.

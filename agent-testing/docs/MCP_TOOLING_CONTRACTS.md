# MCP Tooling Contracts

## MCP Definition

MCP 不是 Agent 的替代品，而是为 Agent 提供真实上下文、工具执行和证据来源。Agent 必须记录 MCP 工具调用目的、输入、输出、权限、副作用和证据引用。

MCP is not the same as Skill. Skill is internal project capability. MCP is external tool or context access. Agent orchestration may use both, but Agent 不能凭空证明测试通过 and cannot expand a tool result beyond its observed scope.

Phase 1 only defines MCP contracts. It does not integrate MCP, run real tests, connect to production, or execute side-effecting tools.

## Permission Levels

| Permission Level | Meaning |
| --- | --- |
| `READ_ONLY` | Reads files, logs, git state, or metadata without changing state. |
| `WRITE_LIMITED` | Writes only approved local artifacts, normally inside `agent-testing/`. |
| `EXECUTE_LIMITED` | Executes approved allowlisted commands in local or test environment. |
| `WRITE_DANGEROUS` | Can modify data, services, deployment, or environment state. Not allowed in MVP. |
| `PRODUCTION_FORBIDDEN` | Must not be used against production or sensitive real user data. |

## Side Effect Levels

| Side Effect Level | Meaning |
| --- | --- |
| `NONE` | No state change. |
| `LOCAL_WRITE` | Writes local report, fixture, screenshot, or cache artifact. |
| `TEST_ENV_WRITE` | Changes state in a declared test environment. |
| `EXTERNAL_CALL` | Calls external service, network endpoint, or browser target. |
| `DESTRUCTIVE` | Deletes, overwrites, migrates, restores, deploys, or otherwise risks data/service state. Forbidden in MVP. |

## Filesystem / Repository MCP

### Purpose

Read project README, architecture docs, deployment docs, configuration files, scripts, and test reports. Scan directory structure. Later phases may write reports or examples inside `agent-testing/`.

### Typical Tools

Filesystem read, directory listing, search, file metadata, controlled file write.

### Input

Approved repository paths, document list, search patterns, target output path inside `agent-testing/`.

### Output

File contents, file inventory, matched lines, written report path if write is allowed.

### Evidence Produced

`mcp_tool` evidence for static file content, source references, and report artifact paths.

### Permission Level

`READ_ONLY` by default. `WRITE_LIMITED` only for approved writes under `agent-testing/`.

### Side Effect Level

`NONE` for reads. `LOCAL_WRITE` for approved report/example writes.

### Boundary

MVP is read-first. Writes are limited to the `agent-testing/` module. Must not delete unrelated project files. Static file reads do not prove live behavior.

### MVP Status

Contracted only in Phase 1. Future MVP can use read-only filesystem access for context building and report generation.

## Git MCP

### Purpose

Inspect diff, changed files, branch state, and test-related modifications. Generate change summaries for risk-based testing.

### Typical Tools

Git status, git diff, git log, changed files listing.

### Input

Repository path, revision range, file filters.

### Output

Changed files, diff summaries, affected areas, commit metadata.

### Evidence Produced

Change evidence for test scope selection. It is not execution evidence.

### Permission Level

`READ_ONLY`.

### Side Effect Level

`NONE`.

### Boundary

MVP must not automatically commit, push, reset, switch branches, rewrite history, or modify git state.

### MVP Status

Contracted only in Phase 1. Later read-only use is allowed for risk analysis.

## Terminal / Command MCP

### Purpose

Later phases may execute build, lint, type check, unit test, smoke test, or approved scripts and collect output as evidence.

### Typical Tools

Shell command execution, process status, command output capture.

### Input

Allowlisted command, working directory, environment label, timeout, expected side effects.

### Output

Exit code, stdout/stderr summary, output artifact path, duration.

### Evidence Produced

Command evidence. Strong when command, exit status, environment, and output are recorded.

### Permission Level

`EXECUTE_LIMITED`.

### Side Effect Level

`NONE`, `LOCAL_WRITE`, or `TEST_ENV_WRITE` depending on command.

### Boundary

Phase 1 does not execute real tests. Later commands must be allowlisted. Destructive commands are forbidden. Command output must be saved or referenced as evidence. A command harness failure must be distinguished from target-system failure.

### MVP Status

Not integrated in Phase 1. Later offline checks can start with non-destructive commands.

## Browser Automation MCP

### Purpose

Later phases may run UI workflows, capture screenshots, verify page behavior, and collect browser artifacts.

### Typical Tools

Browser navigation, click/type actions, DOM inspection, screenshot, video/trace capture.

### Input

Test URL, credentials for test environment only, steps, viewport, artifact output path.

### Output

Observed UI state, screenshot paths, trace/video paths, console errors, network errors.

### Evidence Produced

Browser evidence. Strong for UI behavior when actions, page state, environment, and screenshots are recorded.

### Permission Level

`EXECUTE_LIMITED` and `PRODUCTION_FORBIDDEN`.

### Side Effect Level

`EXTERNAL_CALL` and possibly `TEST_ENV_WRITE`.

### Boundary

MVP does not connect browser automation. Later use is limited to local/test environments. Do not use production sensitive accounts. Screenshots must be reviewed for private data and should be redacted when needed.

### MVP Status

Not integrated in Phase 1.

## HTTP / API MCP

### Purpose

Later phases may run API smoke tests and record requests, responses, status codes, and errors.

### Typical Tools

HTTP client, API test runner, request/response recorder.

### Input

Endpoint, method, headers summary, payload summary, environment, expected status/body.

### Output

Status code, response summary, headers summary, timing, error message, side effect notes.

### Evidence Produced

API evidence. Strong when request, response, environment, and expected result are recorded.

### Permission Level

`EXECUTE_LIMITED` and `PRODUCTION_FORBIDDEN` by default. Write APIs require explicit permission.

### Side Effect Level

`EXTERNAL_CALL`, `TEST_ENV_WRITE` for write APIs.

### Boundary

MVP must not request real production APIs. Later tests should use local/test environments. Write operations must be explicitly marked with side effects.

### MVP Status

Not integrated in Phase 1.

## Database MCP

### Purpose

Later phases may validate data writes, queries, backup results, restore results, and data consistency in test databases.

### Typical Tools

Read-only query, schema inspection, migration status, backup/restore verification in test DB.

### Input

Test database connection reference, query purpose, read/write mode, expected result.

### Output

Query result summary, row counts, schema facts, backup/restore verification output.

### Evidence Produced

Database evidence. Strong for data state when tied to test environment and query reference.

### Permission Level

`READ_ONLY` by default. `WRITE_DANGEROUS` is forbidden in MVP and production.

### Side Effect Level

`NONE` for read-only, `TEST_ENV_WRITE` for approved test writes, `DESTRUCTIVE` for restore/delete/migration.

### Boundary

MVP does not connect to a real database. Later default is read-only. Writes must use test databases. Production destructive operations are forbidden.

### MVP Status

Not integrated in Phase 1.

## Log / Monitoring MCP

### Purpose

Read test environment logs, inspect errors, alerts, and abnormal events within a time range.

### Typical Tools

Log reader, container logs, application logs, monitoring query, alert list.

### Input

Log source, time range, filters, environment, sensitive-data handling notes.

### Output

Log excerpts, counts, error summaries, time range coverage, limitations.

### Evidence Produced

Log review evidence. Medium or strong depending on specificity and reproducibility.

### Permission Level

`READ_ONLY` and `PRODUCTION_FORBIDDEN` unless explicitly authorized later.

### Side Effect Level

`NONE` or `EXTERNAL_CALL`.

### Boundary

Must record log source, time range, and filters. Must not leak sensitive logs. Absence of logs must not be misread as proof that no issue occurred.

### MVP Status

Not integrated in Phase 1.

## Screenshot / Attachment MCP

### Purpose

Manage screenshots, attachments, test report artifacts, command outputs, and evidence files.

### Typical Tools

Artifact storage, screenshot capture, file reference management, redaction helpers.

### Input

Source file, artifact type, related test case, privacy classification, destination path.

### Output

Attachment path, metadata, redaction status, evidence reference.

### Evidence Produced

Attachment evidence. Can support UI/API/log/command evidence when linked to a test case and source.

### Permission Level

`WRITE_LIMITED`.

### Side Effect Level

`LOCAL_WRITE`.

### Boundary

Must record file source. Must handle privacy information. A screenshot alone does not prove every test passed.

### MVP Status

Contracted only in Phase 1. Later use should be limited to `agent-testing/examples/` or approved report artifact paths.

## Tool Failure Classification

All MCP failures must be classified as:

- `tool_failed`: tool crashed, timed out, or returned invalid output.
- `environment_failed`: target environment was unavailable or misconfigured.
- `system_failed`: target system executed and failed expected behavior.
- `blocked`: permission, safety, or missing prerequisite stopped execution.

Only `system_failed` directly supports product defect classification. Other failures usually produce `unknown`, `blocked`, or test-process findings.

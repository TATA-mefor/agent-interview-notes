# Phase 18: Command/API/browser MCP Controlled Execution Boundaries

Phase 18 adds controlled execution contracts for future command, HTTP/API, and browser MCP-style actions inside the isolated `agent-testing/` module.

This phase is a boundary and planning layer only. It does not execute commands, send HTTP requests, start a browser, connect to MCP servers, read files, read logs, access databases, persist audit data, or call an LLM.

## Added Contracts And Utilities

The controlled execution module adds:

- `ControlledExecutionRequest` for metadata-only execution requests.
- `ControlledExecutionPlan` for dry-run plans.
- `ControlledExecutionResult` for deterministic simulated or blocked result drafts.
- `ControlledExecutionSafetyEvaluation` for approval-gated safety decisions.
- Command, API, and browser request boundary builders.
- Evidence draft mapping for controlled execution results.
- Audit event draft mapping for request/result summaries.
- `controlledExecutionSkill` as a LOW-risk deterministic Skill wrapper.

## Command Boundary

`buildControlledCommandExecutionRequest` creates a controlled request for a command summary. It never calls a shell.

Forbidden command patterns include destructive deletion, formatting, shutdown/reboot, unsafe SQL mutation, and pipe-to-shell installers. High-risk command patterns such as dependency installs, migrations, deploys, `git push`, `git reset --hard`, Docker teardown, and Kubernetes mutation remain approval-gated and dry-run only.

## API Boundary

`buildControlledApiExecutionRequest` creates a controlled request for HTTP/API metadata. It never sends an HTTP request.

Read-style methods such as `GET`, `HEAD`, and `OPTIONS` can be LOW/MEDIUM depending on metadata. Write-style methods such as `POST`, `PUT`, `PATCH`, and `DELETE` are high risk by default. `DELETE` against production or sensitive data is forbidden. Header and body summaries redact obvious secret markers.

## Browser Boundary

`buildControlledBrowserExecutionRequest` creates a controlled browser action request. It never starts a browser or visits a page.

Read-style actions such as `navigate`, `inspect_text`, and `screenshot` can be LOW/MEDIUM. Interactive actions such as `click`, `type`, `submit`, `upload_file`, and `download_file` are high risk. Production form submission is forbidden or approval-blocked by policy metadata.

## Safety Policy

`evaluateControlledExecutionSafety` reuses Phase 12 `evaluateApprovalPolicy`.

The deterministic policy is:

- `FORBIDDEN` stays forbidden and cannot produce simulated completion.
- `HIGH` becomes `approval_pending` and cannot produce simulated completion.
- `MEDIUM` can produce a dry-run plan and may produce a deterministic simulation.
- `LOW` can produce a dry-run plan and may produce a deterministic simulation.
- `future_live_disabled` is always blocked in Phase 18.
- Future live execution is always disabled by this phase.

The safety policy records policy violations and limitations, but does not request real approval or execute anything.

## Dry-run And Simulation

`buildDryRunExecutionPlan` produces a plan with approval, evidence, and audit boundaries. It is not execution.

`simulateControlledExecution` can only complete for LOW/MEDIUM requests in `simulated` mode that do not require approval. HIGH, FORBIDDEN, blocked, or approval-pending requests produce blocked/not-executed result drafts instead of simulated completion.

Simulated success is not real execution success. It is also not a system test pass.

## Evidence Mapping

`mapControlledExecutionResultToRawEvidenceDraft` maps a controlled result to a Phase 4 `RawEvidenceInput` draft.

The mapping is conservative:

- Simulated completion maps to `inconclusive`, not `pass`.
- Forbidden, approval-pending, blocked, or not-executed results map to `not_run`.
- Tool, approval, policy, or simulation failure is not treated as a system-under-test failure.
- No real evidence ID is produced or persisted.

## Audit Mapping

`buildControlledExecutionRequestAuditDraft` and `buildControlledExecutionResultAuditDraft` create Phase 13 `AuditEventInput` drafts.

The drafts use summary-only content, policy references, request/result status, risk, and MCP-style capability references. They do not write audit logs, persist events, or store full sensitive inputs.

## Skill Wrapper

`controlledExecutionSkill` accepts one or more `ControlledExecutionRequest` objects and returns:

- dry-run plans
- simulated result drafts where allowed
- warnings
- forbidden request summaries
- approval-pending request summaries
- raw evidence drafts
- audit event drafts

The Skill risk level is `LOW` because it only transforms provided metadata into deterministic plans and drafts. It does not execute command/API/browser actions.

## Why Phase 18 Does Not Execute

Command, API, and browser execution can affect files, services, accounts, data, deployments, and production systems. Before any real execution exists, the project needs deterministic contracts for request metadata, approval gates, safety evaluation, evidence boundaries, and audit traces.

For that reason Phase 18 stops at dry-run planning and deterministic simulation. Real execution belongs to later phases after persistence, runtime integration, approval runtime, audit persistence, and environment scoping are designed.

## Next Phase

Phase 19 should design the persistence model for controlled execution request/result records, evidence drafts, audit drafts, reports, approval references, and observability summaries. It should still avoid real command/API/browser execution until persistence, approval runtime, and audit runtime boundaries are explicit.

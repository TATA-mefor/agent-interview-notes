# Small System Test Agent Team Roadmap

This roadmap keeps the small-system testing work isolated under `agent-testing/`. It does not change the production runtime, API, UI, database, RAG, LLM, import, review, Card domain, or existing agents.

## Completed Phases

- Phase 1: Documentation and domain contracts
- Phase 2: TypeScript domain types
- Phase 3: Skill interfaces and deterministic skills
- Phase 4: Evidence normalization utilities
- Phase 5: Deterministic severity classifier
- Phase 6 + 7: Ops checklist generator + Defect analysis skill
- Phase 8 + 9: Regression suggestion skill + Markdown report generator
- Phase 10 + 11: Release recommendation rules + Test Lead Agent orchestration
- Phase 12: Human-in-the-Loop approval contracts and policy engine
- Phase 13: Agent audit trail and observability event model
- Phase 14: Example fixtures and offline scenario validation
- Phase 15: Agent capability framework contracts and instrumentation boundaries
- Phase 16: MCP adapter contracts and approval-gated tool request model
- Phase 17: Read-only MCP pilot contracts and controlled read execution boundary
- Phase 18: Command/API/browser MCP controlled execution boundaries
- Phase 19: Persistence model design
- Phase 20: API integration
- Phase 21: UI integration
- Phase 22: End-to-end demo with approval, audit trail, evidence, report, and observability

The 22-phase offline roadmap is now complete. Phase 22 adds a deterministic in-memory E2E demo package that combines fixture validation, API boundary demo, UI view model, read-only MCP pilot, controlled execution previews, approval policy outputs, audit trail, observability metrics, persistence snapshot, and report preview.

## Post-Phase-22 Productionization Candidates

- Real Next.js route integration
- Database-backed repository implementation
- Authenticated UI route
- Human approval runtime
- Audit persistence
- Observability dashboard runtime
- Real MCP server opt-in
- Deployment hardening
- CI / docs harness
- Formal test suite

## Human-in-the-Loop Approval Gate

Human-in-the-Loop is the approval gate for high-risk actions.

The intended policy model is:

- Low-risk Skills can run directly when they only transform provided input and do not create side effects.
- Medium-risk Actions can be configured to require approval or to execute with a recorded audit entry.
- High-risk MCP Actions must receive explicit human approval before execution.
- Forbidden actions must be rejected without execution.
- Production destructive operations are forbidden by default.
- Database writes, data deletion, deployment mutation, production operations, and dangerous shell commands must be approved or rejected before any execution path can continue.

The approval system belongs to a later phase. The current deterministic Skills do not execute real checks, mutate data, call MCP, or request approvals.

## Agent Audit Trail

The agent audit trail is the basis for trustworthy test conclusions. It should record enough information to reconstruct how a conclusion was produced without storing sensitive full content.

The audit model should track:

- Which Agent initiated the action.
- Which Skill was invoked.
- Which MCP capability was requested.
- Whether human approval was required, granted, rejected, or skipped by policy.
- Input summaries and output summaries.
- Evidence IDs produced or consumed.
- Trace IDs for execution chains.
- Approval IDs for approved or rejected actions.
- Which severity classifications, defect analyses, and release recommendations depended on which evidence.

The audit trail should store summaries, references, evidence IDs, trace IDs, approval IDs, capability names, policy decisions, and timestamps. It should avoid storing full sensitive prompts, full private data, secrets, raw credentials, private files, or complete production logs.

## Observability Dashboard

The observability dashboard is a future operational view over test-agent execution, evidence quality, approvals, MCP use, and release risk. This roadmap only defines the need for the dashboard; it does not implement dashboard runtime, UI, API, persistence, or metrics collection in the current phase.

The dashboard should display:

- Test task count.
- Test case count.
- Evidence count.
- P0 / P1 / P2 / P3 / unknown severity distribution.
- Weak / medium / strong evidence distribution.
- Downgraded pass claim count.
- Pending approval count.
- MCP requested / approved / rejected / failed counts.
- Skill invocation / failure counts.
- Blocked release count.

## Why Approval And Audit Precede Real MCP Execution

MCP adapters may eventually execute commands, access APIs, drive browsers, read databases, read logs, or inspect deployed environments. These capabilities have permissions and side effects, even when they are used for testing.

Without approval and audit, the Agent execution chain is not traceable. A release conclusion would not be able to show who requested an action, which capability ran, what evidence was produced, which policy applied, or whether a risky operation was approved.

For that reason, Phase 12 and Phase 13 must precede high-risk MCP execution. Real MCP execution should start with read-only pilots, then move to controlled command/API/browser execution only after approval policy, audit trail contracts, evidence references, and observability events are defined.

## Current Boundaries

The `agent-testing/` module remains an offline, deterministic design and utility layer. Current and near-term phases must not:

- Add runtime integration.
- Add API routes.
- Add UI pages.
- Add database migrations.
- Add external dependencies.
- Connect MCP servers.
- Call LLMs.
- Execute real system tests.
- Read real configuration or logs.
- Connect to databases.
- Run shell commands as Skill behavior.
- Implement report generation before Phase 9.
- Implement Agent orchestration before Phase 11.
- Implement Human-in-the-Loop runtime before Phase 12.
- Implement audit log runtime before Phase 13.
- Implement observability dashboard runtime before later integration phases.

# Phase 13: Agent Audit Trail And Observability Event Model

Phase 13 adds an Agent audit trail event model, deterministic audit event builders, in-memory observability metrics aggregation, and a LOW risk Skill wrapper inside the isolated `agent-testing/` module.

This phase does not add runtime persistence, API routes, UI pages, database migrations, metrics exporters, dashboards, MCP integration, LLM calls, command execution, real system tests, or real approval execution.

## Audit Event Model

`agent-testing/src/audit/` defines:

- `AuditEventType`
- `AuditEventOutcome`
- `AuditPrivacyLevel`
- `AuditActorRef`
- `AuditPolicyRef`
- `AuditArtifactRefs`
- `AuditMcpRef`
- `AuditSkillRef`
- `AuditEventInput`
- `AuditEvent`
- `AuditTrailInput`
- `AuditTrailOutput`

Audit events are summary records. They are designed to reconstruct how a conclusion was produced without storing complete sensitive content.

Each event can reference:

- run ID
- trace ID
- parent event ID
- event type
- actor
- outcome
- input summary
- output summary
- issues
- limitations
- evidence IDs
- test case IDs
- defect IDs
- report IDs
- release recommendation
- approval request or decision IDs
- approval status and risk level
- MCP capability metadata
- Skill metadata

## Audit Utilities

The audit module provides:

- `summarizeAuditText`
- `buildAuditEvent`
- `buildAuditTrail`
- `aggregateObservabilityMetrics`

All utilities are pure and deterministic. They only transform provided input and do not read files, write files, connect databases, access networks, call MCP, call LLMs, or execute actions.

## Summary And Redaction Boundary

Audit events store summaries and references, not raw private data.

`summarizeAuditText` normalizes whitespace, truncates long summaries, and redacts summaries that appear to contain sensitive tokens such as API keys, access tokens, private keys, credentials, passwords, or comparable secret markers.

This redaction is a deterministic safety boundary, not a full data-loss-prevention system. Future runtime phases should add stronger redaction, retention, and access-control policies before storing real audit data.

## Observability Metrics

`aggregateObservabilityMetrics` computes in-memory metrics from provided audit events:

- run count
- event count
- counts by event type
- counts by outcome
- counts by privacy level
- Skill invocation counts
- Skill failure counts
- MCP requested, completed, and failed counts
- approval required, pending, approved, rejected, and forbidden counts
- policy violation count
- evidence created and consumed counts
- severity distribution
- release recommendation distribution
- report generated count
- unknown recorded count
- redacted event count

Metrics are returned as structured data only. They are not persisted, emitted, scraped, pushed, or displayed in a dashboard.

## Audit Trail Skill

`auditTrailSkill` wraps the audit utilities as a LOW risk deterministic Skill.

The Skill accepts `AuditTrailSkillInput`, builds an `AuditTrailOutput`, and optionally returns `ObservabilityMetrics`.

The Skill:

- does not persist audit events
- does not emit metrics
- does not call MCP
- does not call LLMs
- does not read files
- does not write files
- does not access a database
- does not implement a dashboard
- does not execute tests or actions

## Relationship To Approval Policy

Phase 12 introduced approval request and policy contracts. Phase 13 can record references to those approval objects:

- approval request ID
- approval decision ID
- approval status
- approval risk level
- approval action type
- policy violations
- whether human approval is required

The audit model does not grant or reject approvals. It records supplied approval metadata as traceable references.

## Relationship To MCP

The event model includes MCP references such as capability, permission level, side effect level, and result. These are metadata fields for future adapters.

This phase does not connect MCP servers or invoke MCP tools. Real MCP execution remains blocked until adapter contracts, approval gating, audit recording, and controlled execution are implemented in later phases.

## Relationship To Release Recommendations

Audit events can reference evidence IDs, severity classification events, defect analysis events, approval events, and release recommendation outcomes. This gives later release reports a traceable chain from input artifacts to recommendation.

The audit trail does not make a release decision and does not replace Human-in-the-Loop approval.

## Why No Runtime Persistence

Real audit persistence requires storage design, access control, retention policy, redaction rules, schema migrations, query paths, and operational monitoring. This phase only defines the data structures and pure utilities needed before persistence is safe to add.

## Why No Dashboard

The observability dashboard belongs to a later integration phase. This phase only returns dashboard-ready metrics from provided events. It does not add UI, API, metrics collection runtime, or external telemetry.

## Next Phase

Phase 14 should add example fixtures and offline scenario validation. Fixtures should cover approval-required actions, forbidden actions, evidence creation, severity classification, release recommendation, audit trail construction, and observability metric aggregation without introducing runtime integrations.

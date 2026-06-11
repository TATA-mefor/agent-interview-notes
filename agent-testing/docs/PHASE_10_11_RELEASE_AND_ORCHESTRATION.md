# Phase 10 + Phase 11: Release Recommendation And Test Lead Orchestration

This stage combines two adjacent deterministic capabilities inside the independent `agent-testing/` module:

- Phase 10: deterministic release recommendation rules.
- Phase 11: lightweight Test Lead Agent orchestration over existing deterministic utilities.

No runtime integration, MCP connection, LLM call, real system test execution, Human-in-the-Loop runtime, audit runtime, observability dashboard, API route, UI page, database migration, or production code integration is added.

## Release Recommendation Utilities Added

`agent-testing/src/release/` provides:

- `recommendRelease`
- `summarizeReleaseInputs`
- `findReleaseBlockingFactors`
- `findEvidenceGaps`
- `hasCoreEvidence`
- `hasCriticalUnknowns`
- `buildReleaseRecommendation`
- `ReleaseRecommendationInput`
- `ReleaseRecommendationOutput`
- `ReleaseRecommendationValue`
- `ReleaseBlockingFactor`

The release utility consumes provided test cases, normalized evidence, severity classifications, defect findings, ops checklist items, regression suggestions, unknowns, limitations, manual override notes, and free-form notes.

The output includes:

- `recommendation`
- `reason`
- `blockingFactors`
- `riskSummary`
- `requiredActions`
- `evidenceGaps`
- `confidence`
- `limitations`

## Recommendation Rules

Release recommendation is deterministic. It does not infer hidden context and does not treat a generated report as proof of execution.

`blocked` is returned when deterministic inputs show unresolved release-blocking risk, such as:

- Unresolved P0 or `blockingRelease=true`.
- Release-blocking ops checks without medium-or-strong passing evidence.
- Permission bypass, private data leakage, data loss, backup or restore failure, core deployment unavailability, or unresolved multi-user overwrite risk.
- Failed or blocked core evidence without a workaround.

`inconclusive` is returned when approval would depend on missing or weak information, such as:

- No evidence.
- No test cases.
- Many test cases without linked evidence.
- Core test evidence missing.
- Unknown severity affecting core, permission, data safety, or deployment risk.
- Mostly weak evidence.
- Conflicting evidence and severity or defect inputs.

This is why no evidence cannot produce `approved`. Test plans, agent reasoning, reports, and checklist items are not execution proof.

`approved_with_risks` is returned when core workflows have medium-or-strong evidence and no blocking factor exists, but residual non-blocking risk remains, such as P2/P3 issues, non-blocking P1 risk, accepted unknowns, existing regression suggestions, or follow-up mitigation work.

`approved` is returned only when core tests have medium-or-strong evidence, no deterministic blocking factor exists, no critical unknown exists, no unaddressed failed evidence exists, and residual risks are not detected from the provided input. Confidence remains conservative because the utility only evaluates supplied artifacts.

## Test Lead Orchestration Utilities Added

`agent-testing/src/orchestration/` provides:

- `runTestLeadOrchestration`
- `TestLeadOrchestrationInput`
- `TestLeadOrchestrationOptions`
- `TestLeadOrchestrationOutput`
- `TestLeadOrchestrationTraceEntry`
- `ApprovalRequiredActionDraft`
- `AuditEventDraft`

The orchestrator is a pure function. It accepts provided input and coordinates deterministic capabilities:

1. `buildContext`
2. `extractAcceptancePoints`
3. `generateSystemTestCases`
4. `generateOpsChecklist`
5. `normalizeEvidence`
6. `classifySeverity`
7. `analyzeDefect`
8. `suggestRegression`
9. `recommendRelease`
10. `generateMarkdownReport`

The orchestrator does not read files, write files, execute commands, access networks, connect databases, call MCP, call LLMs, execute tests, or persist state.

## Evidence Boundary

The orchestration flow preserves evidence boundaries:

- No `rawEvidence` means no pass evidence is generated.
- Test cases without linked evidence remain unproven.
- Inconclusive or weak normalized evidence flows into severity and release recommendation limitations.
- Failed evidence may create defect analysis draft context, but it does not create a formal external defect unless the caller provided one.
- Report generation is a derived artifact and never becomes evidence.
- Release recommendation is advisory and does not become Human-in-the-Loop approval.

## Trace, Approval, And Audit Drafts

Each orchestration step records a trace entry with:

- `step`
- `skillName`
- `success`
- `inputSummary`
- `outputSummary`
- `issues`
- `limitations`

Trace entries store summaries rather than sensitive full content.

`approvalRequiredActions` is reserved for future approval policy. This phase may draft items for blocked or inconclusive release recommendations and missing critical evidence, but it does not request or grant approval.

`auditEventDrafts` is reserved for future audit trail work. This phase may draft events such as run started, skill completed, evidence normalized, severity classified, release recommendation generated, and report generated, but it does not write logs, persist audit records, or power a dashboard.

## Why No MCP

MCP adapters may eventually execute commands, drive browsers, inspect APIs, read logs, read configuration, or connect to databases. Those capabilities require permission policy, approval gates, audit trail contracts, side-effect classification, and evidence references before use.

This phase only transforms provided input. It does not request or execute MCP capabilities.

## Why No LLM

Release recommendations must be reproducible and explainable from evidence, severity, defects, ops risks, unknowns, and limitations. Deterministic rules keep approval decisions testable and prevent model variance from overriding hard evidence boundaries.

LLM assistance may be considered later, but it must not turn missing evidence into pass evidence or override release-blocking rules.

## Why No Human-in-the-Loop Runtime

This phase can identify that human approval or missing evidence is needed, but it does not implement the approval lifecycle. There is no approval request, approver identity validation, approval persistence, policy execution, or final release sign-off.

Phase 12 should implement Human-in-the-Loop approval contracts and a policy engine. That phase should define approval states, policy inputs, risk levels, approver roles, approval IDs, rejection handling, and how approval decisions interact with future MCP actions and release decisions.

## Why No Audit Runtime Or Dashboard

Audit and observability require storage, retention rules, redaction, query models, UI/API integration, and runtime event capture. This phase only returns trace-friendly draft structures. It does not implement audit persistence, metrics collection, or an observability dashboard.

Those concerns remain future work after approval contracts and policy boundaries are defined.

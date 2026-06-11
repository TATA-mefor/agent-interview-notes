# Phase 5: Deterministic Severity Classifier

Phase 5 adds deterministic severity classification for the Small System Test Agent Team. It operates only on already-normalized `SystemTestEvidence` and structured impact hints.

## Added Utilities

The new `agent-testing/src/severity/` module provides:

- `summarizeEvidenceForSeverity`
- `hasMinimumEvidenceStrength`
- `isCriticalImpact`
- `isImportantImpact`
- `isStandardImpact`
- `isSuggestionImpact`
- `buildSeverityClassification`
- `classifySeverity`

The classifier is a pure TypeScript utility. It does not execute tests, read files, call MCP tools, call an LLM, connect to a database, or inspect live systems.

## Input And Output

`SeverityClassificationInput` accepts one normalized evidence item or a list of normalized evidence items plus optional impact hints:

- `impactAreas`
- `affectedUsers`
- `isCoreWorkflow`
- `hasWorkaround`
- `isReproducible`
- `isSecurityRelated`
- `isDataSafetyRelated`
- `isOperationalRisk`
- `isToolFailure`
- `isSkillQualityIssue`
- `notes`

`SeverityClassificationOutput` returns:

- `classification`
- `matchedRules`
- `blockingRelease`
- `requiresRegression`
- `confidence`
- `reason`
- `limitations`

The embedded `classification` reuses the Phase 2 `SeverityClassification` contract.

## Severity Rules

The classifier applies rules in this order:

1. `unknown` for missing, weak, analysis-only, inconclusive, not-run, conflicting, or insufficient evidence.
2. `P0` for critical safety, security, data, or core workflow blockers.
3. `P1` for important product, security, or operational risks.
4. `P2` for bounded defects or test-process issues.
5. `P3` for usability, documentation, or low-risk improvement suggestions.
6. `none` for passing medium-or-strong evidence with no impact hints.

`P0` requires at least medium evidence plus critical impact such as data loss, permission bypass, private data leak, no-workaround core outage, critical backup/restore failure, destructive multi-user conflict, or security risk affecting core/private data.

`P1` requires at least medium evidence plus important impact such as partial core failure, serious attachment/search/logging issue, high operational risk, limited security risk, or backup failure with a manual workaround.

`P2` covers bounded non-core failures, workaround-backed issues, partial search or attachment failures, non-blocking docs/log gaps, MCP tool failure without product failure evidence, and incomplete Skill output that can be manually supplemented.

`P3` covers usability, text, layout, minor interaction, documentation clarity, test case wording, and low-risk optimization suggestions.

`none` requires medium-or-strong pass evidence, no fail/blocked/inconclusive/not_run result, and no impact or risk hints.

`unknown` is returned when evidence is missing, all evidence is weak, only agent reasoning is present, results are inconclusive or not run, evidence conflicts with impact hints, tool/environment/system failure cannot be separated, or the input is insufficient.

## Evidence Strength

Weak evidence cannot directly classify a product defect as `P0`, `P1`, `P2`, or `P3`. Weak evidence can explain why an item is unknown, but it is not enough to prove product impact.

Medium or strong evidence is required for product defect classification. Strong evidence can raise confidence, but the severity level still depends on impact and risk hints.

## MCP Tool Failure Boundary

An MCP tool failure is not automatically a target-system failure. A failed browser, terminal, filesystem, or API tool can indicate a test-process problem, environment problem, or missing setup. The classifier treats tool-only failures as `P2` process issues or `unknown` unless there is separate evidence that the product itself failed.

## Skill Quality Boundary

Incomplete Skill output is a test-process quality issue. It can block confidence in a test result, but it is not direct proof of a product defect. The classifier records this in limitations and avoids upgrading Skill quality issues into product severity without normalized product evidence.

## Explicit Non-Goals

Phase 5 does not implement a report generator. Reports require aggregation across cases, defects, release recommendation, unknowns, and owner decisions; this classifier only classifies individual severity inputs.

Phase 5 does not connect to MCP. MCP integration still requires concrete server choices, permission boundaries, evidence capture, and failure-mode mapping.

## Recommended Phase 6

Phase 6 should implement an Ops checklist generator before a full report generator. The existing evidence normalization and severity classification outputs can drive a deterministic checklist for backups, restore, logging, configuration, deployment, permissions, unknowns, and release readiness without requiring orchestration or live MCP integration.

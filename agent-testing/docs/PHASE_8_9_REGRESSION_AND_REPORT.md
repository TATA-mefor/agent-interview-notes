# Phase 8 + Phase 9: Regression Suggestion And Markdown Report

This stage combines two low-risk deterministic capabilities inside the independent `agent-testing/` module:

- Phase 8: deterministic regression suggestion utility and Skill.
- Phase 9: deterministic Markdown report generator and Skill.

No runtime integration, MCP connection, LLM call, real test execution, release recommendation rules, or agent orchestration is added.

## Regression Utilities Added

`agent-testing/src/regression/` provides:

- `suggestRegression`
- `RegressionScopeCategory`
- `RegressionSuggestionInput`
- `RegressionSuggestionItem`
- `RegressionSuggestionOutput`

The utility uses only provided defect findings, defect analysis, severity classification, original test cases, evidence, ops risks, available test cases, affected module, fix summary, and notes.

It can suggest regression scope for authentication, authorization, permission, data integrity, multi-user usage, file upload, search, backup/restore, logging/monitoring, deployment, database, UI usability, API contract, ops, or unknown areas.

Regression suggestions are planning artifacts only. They do not execute regression tests, modify existing test cases, modify defect status, call MCP, call LLM, read files, connect to a database, or create evidence.

## Markdown Report Utilities Added

`agent-testing/src/report/` provides:

- `generateMarkdownReport`
- `MarkdownReportInput`
- `MarkdownReportOutput`
- `ReportSectionSummary`

The report generator assembles provided structured data into Markdown. It includes the required report sections, test case table, evidence table, severity table, defect table, ops checklist table, regression suggestion table, unknowns, limitations, and appendix.

The generator does not write files. The returned Markdown string is a derived artifact that a caller may persist later in an explicit integration phase.

## Evidence And Status Boundary

The report generator must not mark unexecuted or unsupported cases as passed.

Test case status is inferred only from linked `SystemTestEvidence.result`:

- Linked `fail` evidence produces `fail`.
- Linked `blocked` evidence produces `blocked`.
- Linked `inconclusive` evidence produces `inconclusive`.
- Only linked `not_run` evidence produces `not_run`.
- Linked `pass` evidence can produce `pass`.
- No linked evidence produces `no evidence`.

Weak evidence, inconclusive evidence, unknown severity, missing evidence, and missing release recommendation are surfaced as warnings.

## Release Recommendation Boundary

This stage does not implement release recommendation rules.

If `releaseRecommendation` is provided in the report input, the report displays that input value. If it is missing, the report displays `inconclusive / not provided`.

The generator does not infer `approved`, `approved_with_risks`, or `blocked` from severity, defects, or ops risks. Phase 10 is responsible for deterministic release recommendation rules.

## Why No MCP

MCP integration can execute commands, access APIs, drive browsers, read logs, inspect databases, or collect files. Those capabilities require approval policy, audit trail, side-effect classification, and evidence references before use.

This phase only transforms provided input into regression suggestions and Markdown. It does not request or execute MCP capabilities.

## Why No LLM

The goal is reproducible offline behavior. Keyword rules, evidence linkage, warning rules, and report assembly must be deterministic and testable without API keys or model variance.

LLM assistance may be considered later, but it must not override evidence boundaries or release recommendation rules.

## Skill Wrappers Added

`agent-testing/src/skills/regressionSuggestionSkill.ts` exposes `regressionSuggestionSkill` and `suggestRegressionSkill`.

`agent-testing/src/skills/reportGenerationSkill.ts` exposes `reportGenerationSkill` and `generateReportSkill`.

Both Skills are `LOW` risk and operate only over provided input. They do not execute tests, write files, call MCP, call LLM, modify defects, or modify test cases.

## Recommended Phase 10 + 11

Phase 10 should implement deterministic release recommendation rules that consume evidence, severity classifications, defects, ops checks, regression suggestions, unknowns, limitations, and explicit risk acceptance.

Phase 11 should implement Test Lead Agent orchestration over deterministic Skills with traceable inputs, outputs, limitations, and evidence references, without introducing high-risk MCP execution before Human-in-the-Loop approval and audit trail phases.

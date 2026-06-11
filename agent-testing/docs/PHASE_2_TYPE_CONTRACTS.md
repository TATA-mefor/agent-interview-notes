# Phase 2 Type Contracts

## Scope

Phase 2 converts the Phase 1 documentation contracts for the Small System Test Agent Team into isolated TypeScript domain types under `agent-testing/src/`.

This phase keeps the test-agent domain separate from the existing application domain. It does not modify production code, API routes, UI pages, database migrations, LLM services, RAG behavior, Card models, or existing agent services.

## Added TypeScript Files

- `agent-testing/src/types.ts`
  - Shared primitive aliases such as `IsoDateTimeString`, `MarkdownString`, `EvidenceId`, `TestCaseId`, `DefectId`, `ConfidenceScore`, `SourceReference`, and `NonEmptyString`.
  - Agent role contracts including `AgentRole` and `AgentRoleContract`.
  - Acceptance contracts including `AcceptancePoint`, `AcceptancePriority`, and `AmbiguityLevel`.
  - Test case contracts including `SystemTestCase`, `TestCaseStep`, and `TestPriority`.
  - Evidence contracts including `SystemTestEvidence`, `EvidenceResult`, `EvidenceExecutorType`, `EvidenceStrength`, and `TestEnvironment`.
  - Severity contracts including `Severity`, `SeverityRule`, and `SeverityClassification`.
  - Defect contracts including `DefectFinding`, `DefectStatus`, and `SuspectedLayer`.
  - Skill contracts including `SkillName`, `SkillRiskLevel`, `SkillContract`, and `SkillInvocation`.
  - MCP contracts including `McpCapability`, `McpPermissionLevel`, `McpSideEffectLevel`, `McpToolContract`, `McpToolInvocation`, and `McpToolResult`.
  - Report contracts including `SystemTestReport`, `ReleaseRecommendation`, `ReportSummary`, `OpsRisk`, and `UnknownItem`.
- `agent-testing/src/index.ts`
  - Re-exports the Phase 2 public type surface for later phases.

## Mapping To Phase 1 Documents

| Phase 1 document | Phase 2 type mapping |
| --- | --- |
| `DOMAIN_CONTRACTS.md` | `AgentRole`, `AgentRoleContract`, `AcceptancePoint`, `SystemTestCase`, `TestCaseStep`, `DefectFinding`, `SystemTestReport` |
| `EVIDENCE_MODEL.md` | `SystemTestEvidence`, `EvidenceResult`, `EvidenceExecutorType`, `EvidenceStrength`, `TestEnvironment`, `ConfidenceScore` |
| `SEVERITY_RULES.md` | `Severity`, `SeverityRule`, `SeverityClassification` |
| `REPORT_TEMPLATE.md` | `SystemTestReport`, `ReportSummary`, `ReleaseRecommendation`, `OpsRisk`, `UnknownItem` |
| `SKILL_CONTRACTS.md` | `SkillName`, `SkillRiskLevel`, `SkillContract`, `SkillInvocation` |
| `MCP_TOOLING_CONTRACTS.md` | `McpCapability`, `McpPermissionLevel`, `McpSideEffectLevel`, `McpToolContract`, `McpToolInvocation`, `McpToolResult` |
| `IMPLEMENTATION_BOUNDARIES.md` | Comments and type boundaries for evidence, severity, Skill, MCP, and reports |

## Runtime Capabilities Not Implemented

Phase 2 intentionally does not implement:

- Skill runtime behavior.
- MCP server integration.
- Test Lead Agent orchestration.
- Evidence normalization logic.
- Severity classification logic.
- Report generation logic.
- Browser automation, API calls, terminal command execution, database access, or log access.
- External dependencies or runtime validation libraries.
- Test framework setup.
- Production code integration.

The type comments preserve the Phase 1 rule that agent reasoning is analysis-only. It can explain evidence, but it cannot independently prove that a test passed.

## Phase 3 Path

Phase 3 can build deterministic skills on top of these types:

- A context-building skill can output source references, module maps, and unknowns using shared source and Markdown types.
- An acceptance-extraction skill can produce `AcceptancePoint[]` with explicit ambiguity and questions.
- A test-case-generation skill can produce `SystemTestCase[]` without claiming execution.
- An evidence-normalization skill can transform raw observations into `SystemTestEvidence[]` while preserving executor type, strength, confidence, and limitations.
- A severity-classification skill can return `SeverityClassification` from evidence and impact inputs without overriding missing or weak evidence.
- A report-generation skill can assemble `SystemTestReport` while keeping untested areas in `unknowns` and avoiding unsupported approval recommendations.

Phase 3 should stay fixture-based and deterministic, with no network, database, Docker, production access, LLM dependency, or MCP execution required for basic tests.

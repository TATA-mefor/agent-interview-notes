# Domain Contracts

## Scope

This document defines the domain vocabulary for the Small System Test Agent Team. The contracts are documentation-level agreements for Phase 1 and are not runtime TypeScript types yet.

The test-agent domain is independent from the existing interview-card `Card` domain. Test cases, evidence, defects, and reports must not be stored inside `Card`, `review_priority`, `llm_suggestions`, or existing card relationships.

Agent 不能凭空证明测试通过. Agents can plan, analyze, classify, and report, but pass/fail/blocking conclusions require real evidence.

## Agent Role Contract

| Agent | Responsibility | Input | Output | Boundary |
| ----- | -------------- | ----- | ------ | -------- |
| Test Lead Agent | Owns the test mission, coordinates specialist agents, merges evidence, applies severity rules, and drafts release recommendation. | Project context, acceptance points, test cases, evidence, defects, ops risks, unknowns. | Consolidated test report draft, release recommendation, unresolved risks, next actions. | Must not mark tests passed without evidence. Must not execute destructive actions. |
| Product Acceptance Agent | Extracts acceptance points, user workflows, business impact, and unclear requirements. | README, product docs, user request, issue text, screenshots, manual notes. | `AcceptancePoint` list, ambiguity list, questions, business priority notes. | Does not verify implementation. Does not invent requirements. |
| Test Design Agent | Converts acceptance points and risks into system test cases. | Acceptance points, module map, known pages/APIs, deployment constraints, risk areas. | `SystemTestCase` list with required evidence and owner agent. | Does not claim execution. Avoids unbounded exhaustive cases. |
| Developer Analysis Agent | Analyzes failed or blocked cases using evidence, logs, API responses, diffs, source snippets, and configuration. | Failed evidence, logs, command output, API responses, relevant files, config snippets. | Suspected layer, root-cause hypothesis, fix suggestion, regression suggestion. | Must label uncertainty. Must not fabricate logs, code behavior, or runtime state. |
| Ops Check Agent | Designs and reviews deployment, backup, restore, logging, permission, environment, and network exposure checks. | Dockerfile, docker compose files, deployment docs, env examples, backup scripts, logs or check outputs. | Ops checklist, ops risks, required evidence, mitigation notes. | Static config review must be separated from live environment validation. No production access in MVP. |
| User Representative Agent | Reviews small-team workflows and usability risks from a user perspective. | Workflow descriptions, page map, screenshots, manual observations, acceptance points. | Usability findings, misuse scenarios, small-team collaboration concerns. | Does not replace real user testing. Must tie subjective claims to a scenario. |

## SystemTestCase

`SystemTestCase` describes a planned system-level test. It does not mean the test was executed.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Stable test case identifier. | `STC-CARD-001` |
| `title` | Yes | Short human-readable test title. | `Create an interview card from the card page` |
| `scope` | Yes | Functional or operational area covered by the case. | `cards`, `import`, `search`, `backup` |
| `sourceRequirement` | Yes | Requirement, acceptance point, document, or user request that created the case. | `README: 题库管理` |
| `preconditions` | Yes | State that must exist before execution. | `Local app is running; database has seed data` |
| `steps` | Yes | Ordered execution steps for human, script, API, or browser execution. | `Open /cards/new; fill fields; save` |
| `expectedResult` | Yes | Observable expected behavior. | `New card appears in /cards and detail page opens` |
| `priority` | Yes | Test priority, separate from defect severity. | `high`, `medium`, `low` |
| `requiredEvidence` | Yes | Evidence needed before pass/fail can be trusted. | `browser screenshot + API response + database row check` |
| `ownerAgent` | Yes | Agent responsible for designing or reviewing the case. | `Test Design Agent` |
| `tags` | No | Search/filter labels. | `["card-crud", "core-flow"]` |

Allowed execution status values in later phases should be `not_run`, `pass`, `fail`, `blocked`, and `inconclusive`. A generated test case starts as `not_run`.

## AcceptancePoint

`AcceptancePoint` captures a user-visible or business-relevant requirement that can be tested.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Stable acceptance identifier. | `AP-IMPORT-001` |
| `source` | Yes | Source material used for extraction. | `README.md 当前能力` |
| `description` | Yes | Requirement written as an observable acceptance point. | `Users can import Markdown files and preview parsed QA candidates before saving` |
| `businessValue` | Yes | Why the point matters to users or operations. | `Reduces manual card creation effort` |
| `relatedModule` | Yes | Product module related to the point. | `import` |
| `ambiguityLevel` | Yes | Clarity level. | `low`, `medium`, `high` |
| `questions` | No | Open questions if the source is unclear. | `What file size limit is expected?` |
| `priority` | Yes | Acceptance priority. | `must`, `should`, `could` |

The Product Acceptance Agent must not convert guesses into formal acceptance criteria. If source material is unclear, `ambiguityLevel` must increase and questions must be recorded.

## DefectFinding

`DefectFinding` describes an observed or suspected product defect tied to evidence.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Stable defect identifier. | `DEF-001` |
| `testCaseId` | Yes | Test case that exposed the finding. | `STC-BACKUP-003` |
| `title` | Yes | Short defect title. | `Restore script fails on missing role` |
| `actualResult` | Yes | What was observed. | `restore-db.sh exits with role error` |
| `expectedResult` | Yes | Expected behavior. | `Backup restores into a clean local database` |
| `severity` | Yes | Severity according to rules. | `P0`, `P1`, `P2`, `P3`, `none`, `unknown` |
| `affectedArea` | Yes | User or system area affected. | `backup/restore`, `permissions`, `search` |
| `suspectedLayer` | No | Likely technical layer. | `script`, `database`, `api`, `ui`, `deployment`, `unknown` |
| `evidenceIds` | Yes | Evidence references supporting the finding. | `["EV-012", "EV-013"]` |
| `recommendation` | Yes | Suggested fix, mitigation, or next check. | `Add restore preflight role creation check` |
| `status` | Yes | Current finding status. | `open`, `fixed`, `won't_fix`, `needs_evidence`, `duplicate` |

Evidence IDs are mandatory unless severity is `unknown` because evidence is insufficient. In that case the finding should remain `needs_evidence`.

## SystemTestReport

`SystemTestReport` is the final report artifact generated from accepted scope, cases, evidence, defects, and risks.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Stable report identifier. | `STR-2026-06-11-001` |
| `title` | Yes | Report title. | `Agent Notes Local Deployment System Test Report` |
| `targetSystem` | Yes | System under test. | `agent-notes local Next.js app` |
| `testScope` | Yes | Included and excluded scope. | `Card CRUD, import, search, backup; excludes production auth` |
| `contextSources` | Yes | Documents and files used for planning. | `README.md`, `docs/ARCHITECTURE.md` |
| `summary` | Yes | Executive summary. | `12 cases designed, 8 executed, 2 blocked` |
| `cases` | Yes | Test case list or references. | `SystemTestCase[]` |
| `evidence` | Yes | Evidence list or references. | `SystemTestEvidence[]` |
| `defects` | Yes | Defect list. | `DefectFinding[]` |
| `opsRisks` | Yes | Deployment/backup/logging/permission risks. | `Public deployment lacks authentication` |
| `unknowns` | Yes | Missing evidence, unclear requirements, untested areas. | `No live restore evidence` |
| `releaseRecommendation` | Yes | Release recommendation. | `approved`, `approved_with_risks`, `blocked`, `inconclusive` |
| `generatedAt` | Yes | Report generation timestamp. | `2026-06-11T14:30:00+08:00` |

## SkillInvocation

`SkillInvocation` records use of an internal Skill.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Invocation identifier. | `SKI-001` |
| `skillName` | Yes | Internal Skill name. | `Evidence Normalization Skill` |
| `invokedByAgent` | Yes | Agent that requested the Skill. | `Test Lead Agent` |
| `inputSummary` | Yes | Non-sensitive input summary. | `Normalized three browser observations` |
| `outputSummary` | Yes | Output summary. | `Produced EV-001 to EV-003` |
| `evidenceProduced` | No | Evidence IDs created by the Skill, if any. | `["EV-001"]` |
| `evidenceRequired` | No | Evidence the Skill needed but did not receive. | `Missing command output` |
| `riskLevel` | Yes | Skill risk level. | `LOW`, `MEDIUM`, `HIGH`, `FORBIDDEN_IN_MVP` |
| `limitations` | Yes | Known limits of the output. | `Manual observation has no screenshot` |
| `createdAt` | Yes | Invocation timestamp. | `2026-06-11T14:30:00+08:00` |

Skill is a project-internal controllable capability. It can be tested offline and replaced without changing the whole agent workflow.

## McpToolInvocation

`McpToolInvocation` records MCP or external tool access.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Invocation identifier. | `MCP-001` |
| `serverName` | Yes | MCP server or tool source. | `filesystem` |
| `toolName` | Yes | Concrete tool name. | `read_file` |
| `invokedByAgent` | Yes | Agent that requested the tool. | `Context Building Skill via Test Lead Agent` |
| `purpose` | Yes | Why the tool was called. | `Read architecture documentation for context` |
| `inputSummary` | Yes | Non-sensitive input summary. | `docs/ARCHITECTURE.md` |
| `outputSummary` | Yes | Output summary. | `Confirmed service/repository architecture` |
| `rawEvidenceRef` | Yes when evidence is produced | Reference to raw output, file, log, screenshot, or attachment. | `EV-RAW-ARCH-001` |
| `permissionLevel` | Yes | Permission class. | `READ_ONLY`, `WRITE_LIMITED`, `EXECUTE_LIMITED`, `WRITE_DANGEROUS`, `PRODUCTION_FORBIDDEN` |
| `sideEffectLevel` | Yes | Side effect class. | `NONE`, `LOCAL_WRITE`, `TEST_ENV_WRITE`, `EXTERNAL_CALL`, `DESTRUCTIVE` |
| `result` | Yes | Tool result status. | `success`, `tool_failed`, `environment_failed`, `system_failed`, `blocked` |
| `limitations` | Yes | Tool limitations. | `Static file read only; no live verification` |
| `createdAt` | Yes | Invocation timestamp. | `2026-06-11T14:30:00+08:00` |

MCP is an external tool or context-access capability. It is not the same as a Skill. MCP can provide real evidence when the call is traceable, but tool output still proves only its observed scope.

## Skill And MCP Boundary

- Skill is internal, controlled by this project, and should be deterministic or testable where possible.
- MCP is external context/tool access and must be treated as permissioned I/O.
- Agent may orchestrate both Skill and MCP.
- Agent must not treat Skill output, MCP output, or Agent reasoning as a complete test conclusion unless the required evidence is present.
- MCP tools with side effects must explicitly record risk, permission level, side effect level, input, output, and raw evidence reference.

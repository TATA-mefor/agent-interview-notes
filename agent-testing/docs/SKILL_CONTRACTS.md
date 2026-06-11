# Skill Contracts

## Skill Definition

Skill 是项目内部可控、可测试、可替换的能力单元。Agent 可以调用 Skill，但 Skill 本身不应越权访问生产环境，也不应凭空制造测试结论。

Skills are not MCP tools. A Skill is internal logic such as parsing, normalization, classification, or report assembly. MCP is external context or tool access such as filesystem, git, terminal, browser, API, database, logs, screenshots, and attachments.

Agent 不能凭空证明测试通过. A Skill can create plans, cases, normalized records, and reports, but it cannot turn missing or weak evidence into a real pass.

## Skill Risk Levels

| Risk Level | Meaning | MVP Use |
| --- | --- | --- |
| `LOW` | Read-only reasoning over provided input; generates documents or structured results. | Allowed. |
| `MEDIUM` | Reads local files, parses logs, or reads test output. | Allowed with explicit input and no production access. |
| `HIGH` | May trigger external commands, access services, or modify state. | Not implemented in Phase 1; later requires strict allowlist. |
| `FORBIDDEN_IN_MVP` | Production write operations, deletion, deployment mutation, destructive environment actions. | Forbidden. |

## Context Building Skill

### Responsibility

Read system descriptions, README, architecture documentation, deployment documentation, interface descriptions, and other provided context. Produce a test context summary.

### Input

- Document path list.
- User-provided system description.
- Target system type.

### Output

- Module map.
- Risk areas.
- Context sources.
- Unknowns.

### Evidence Produced

Context summary evidence with source references. Usually `skill` evidence and, if file contents were read through MCP or filesystem access, linked `mcp_tool` or file evidence.

### Evidence Required

Actual document paths or pasted source text. Missing files must be recorded as unknowns.

### Risk Level

`MEDIUM` when reading local files. `LOW` when using only provided text.

### Boundary

Does not execute real tests. Does not prove system behavior. Does not infer undocumented runtime behavior as fact.

### Offline Test Strategy

Use fixture documents and assert that output includes module map, source references, and unknowns without requiring LLM, network, Docker, database, or API keys.

## Acceptance Extraction Skill

### Responsibility

Extract acceptance points from requirement documents, README sections, user stories, issue text, or user-provided descriptions.

### Input

- Requirement text or document references.
- Product/module scope.
- Optional business priority hints.

### Output

- `AcceptancePoint` list.
- Ambiguity level for each point.
- Unclear question list.

### Evidence Produced

Structured acceptance-point records tied to sources.

### Evidence Required

Requirement sources. If a source is ambiguous, the Skill must preserve ambiguity instead of filling gaps.

### Risk Level

`LOW`.

### Boundary

Does not invent requirements. Does not treat guesses as formal acceptance criteria. Does not verify implementation.

### Offline Test Strategy

Use deterministic fixture requirements and validate extracted fields, source links, ambiguity handling, and no invented acceptance points.

## Test Case Generation Skill

### Responsibility

Generate system test cases from acceptance points, project modules, and risk areas.

### Input

- `AcceptancePoint` list.
- Module map.
- Target test scope.
- Risk areas.

### Output

- `SystemTestCase` list with steps, expected result, priority, required evidence, owner agent, and tags.

### Evidence Produced

Test design evidence showing traceability from acceptance points to cases.

### Evidence Required

Acceptance points and scope. Without source requirements, generated cases must be marked as exploratory or unknown-origin.

### Risk Level

`LOW`.

### Boundary

Only generates test cases. Does not declare that tests were executed or passed.

### Offline Test Strategy

Validate that each case has required fields, source requirement, required evidence, and no execution status beyond `not_run`.

## Evidence Normalization Skill

### Responsibility

Convert human notes, script outputs, API responses, log excerpts, browser observations, screenshots, attachments, and MCP tool outputs into `SystemTestEvidence`.

### Input

- Raw evidence text or references.
- Test case IDs.
- Environment metadata.
- Executor type and source.

### Output

- Normalized `SystemTestEvidence` records.
- Limitations and missing fields.
- Conflicting evidence warnings.

### Evidence Produced

Normalized evidence records. It may produce `skill` evidence that references stronger raw evidence.

### Evidence Required

Raw observation details. A vague summary without source details must be classified as weak.

### Risk Level

`MEDIUM`.

### Boundary

Can standardize evidence. Cannot upgrade weak evidence into strong evidence. Cannot mark a test as pass when required evidence is absent.

### Offline Test Strategy

Use sample command output, API response, manual note, screenshot path, and conflicting evidence fixtures. Assert confidence and limitations.

## Severity Classification Skill

### Responsibility

Classify severity based on evidence, impact, affected users, reproducibility, workaround, data/security risk, and operational risk.

### Input

- `SystemTestEvidence`.
- Expected vs actual result.
- Affected area.
- Workaround status.
- Severity rules.

### Output

- Severity: `P0`, `P1`, `P2`, `P3`, `none`, or `unknown`.
- Rationale.
- Regression requirement.
- Release impact.

### Evidence Produced

Severity rationale evidence. This is analysis evidence, not execution evidence.

### Evidence Required

Real evidence for product behavior. If evidence is missing or conflicting, output must be `unknown`.

### Risk Level

`LOW`.

### Boundary

Evidence不足时必须输出 `unknown`. LLM explanation cannot override hard rules for data loss, permission bypass, privacy leak, core outage, or missing evidence.

### Offline Test Strategy

Table-driven tests for data loss, permission bypass, privacy leak, backup/restore failure, inaccurate search, workaround downgrade, MCP failure, Skill incomplete output, and script/human conflict.

## Ops Checklist Skill

### Responsibility

Generate deployment, backup, restore, logging, permission, environment variable, network exposure, and operations checks.

### Input

- Deployment docs.
- Docker/Nginx/config files.
- Env examples.
- Backup/restore scripts.
- Target environment description.

### Output

- Ops checklist.
- Required evidence per check.
- Static review findings.
- Live verification checklist.

### Evidence Produced

Ops planning and static review evidence.

### Evidence Required

File references and environment description. Live verification requires separate command/log/API/browser evidence.

### Risk Level

`MEDIUM`.

### Boundary

Static checks and real environment validation must be separate. Does not connect to production. Does not run deployment or destructive commands.

### Offline Test Strategy

Use fixture deployment docs and config snippets. Verify checks include backup, restore, logs, permissions, secrets, public exposure, and local-first constraints.

## Defect Analysis Skill

### Responsibility

Analyze failed cases, logs, API responses, configuration snippets, and relevant source references to propose likely causes and fixes.

### Input

- Failed or blocked test evidence.
- Logs or command output.
- API response summaries.
- Config/source snippets.
- Known environment constraints.

### Output

- Suspected layer.
- Root-cause hypothesis.
- Confidence and limitations.
- Fix recommendation.
- Regression suggestion.

### Evidence Produced

Analysis evidence and recommendation, linked to raw evidence.

### Evidence Required

Failure evidence and source/log/config references. Missing material must be called out.

### Risk Level

`MEDIUM`.

### Boundary

Must label uncertainty. Must not invent source code, logs, database state, API behavior, or environment behavior.

### Offline Test Strategy

Use known failing fixtures and assert the Skill preserves evidence IDs, uncertainty, and suspected layer without claiming proof beyond evidence.

## Report Generation Skill

### Responsibility

Generate a Markdown system test report from test cases, evidence, defects, ops risks, unknowns, Skill usage, and MCP usage.

### Input

- `SystemTestCase` list.
- `SystemTestEvidence` list.
- `DefectFinding` list.
- Skill and MCP invocation records.
- Release recommendation inputs.

### Output

- Markdown report using `REPORT_TEMPLATE.md`.
- Summary tables.
- Unknowns and limitations.
- Release recommendation.

### Evidence Produced

Report artifact. The report is a derived artifact, not raw execution evidence.

### Evidence Required

All report conclusions must reference cases and evidence. Missing evidence must appear in unknowns.

### Risk Level

`LOW`.

### Boundary

Must not hide `unknown` or `inconclusive`. Must not write unexecuted cases as pass. Must not produce `approved` without execution evidence.

### Offline Test Strategy

Use fixture cases/evidence/defects and assert required sections, tables, unknowns, release recommendation rules, and no unsupported pass claims.

## Regression Suggestion Skill

### Responsibility

Generate regression test scope based on defects, suspected fixes, affected modules, and risk areas.

### Input

- Defect findings.
- Affected modules.
- Fix recommendations.
- Existing test cases.

### Output

- Regression test case suggestions.
- Impacted areas.
- Required evidence for regression.
- Priority order.

### Evidence Produced

Regression planning evidence.

### Evidence Required

Defect evidence and fix scope. If fix scope is unknown, output must mark assumptions.

### Risk Level

`LOW`.

### Boundary

Does not execute regression tests. Only generates recommendations.

### Offline Test Strategy

Use defect fixtures and verify suggested regression cases cover direct fix path, adjacent modules, data safety, permission safety, and ops checks when relevant.

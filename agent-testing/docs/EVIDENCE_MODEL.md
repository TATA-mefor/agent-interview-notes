# Evidence Model

## Core Rule

Agent 不能凭空证明测试通过. All `pass`, `fail`, `blocked`, and release-readiness conclusions must be bound to real evidence. Agent reasoning may summarize or interpret evidence, but it cannot independently prove that the target system behaved correctly.

If required evidence is missing, the result must be `unknown`, `not_run`, `blocked`, or `inconclusive` rather than `pass`.

## SystemTestEvidence

`SystemTestEvidence` is the normalized record for observations collected from humans, scripts, APIs, browsers, logs, configuration review, MCP tools, Skills, or Agent reasoning.

| Field | Required | Meaning | Example |
| --- | --- | --- | --- |
| `id` | Yes | Stable evidence identifier. | `EV-001` |
| `testCaseId` | Yes when tied to a case | Related test case. | `STC-CARD-001` |
| `testScope` | Yes | Scope covered by the evidence. | `card-create-flow`, `backup-restore` |
| `executionMethod` | Yes | How the observation was made. | `manual browser run`, `npm build`, `GET /api/cards` |
| `executorType` | Yes | Evidence executor type. | `human`, `script`, `api`, `browser`, `log_review`, `config_review`, `mcp_tool`, `skill`, `agent_reasoning` |
| `result` | Yes | Observed result. | `pass`, `fail`, `blocked`, `not_run`, `inconclusive` |
| `evidenceSource` | Yes | Source of evidence. | `tester note`, `terminal output`, `browser screenshot`, `docker logs` |
| `evidenceSummary` | Yes | Short summary of observation. | `Card saved and visible in list` |
| `command` | No | Command executed, if any. | `npm run build` |
| `apiRequest` | No | API request summary. | `POST /api/cards` |
| `apiResponse` | No | API response status/body summary. | `201 with card id` |
| `logs` | No | Log excerpts, references, or time range. | `web logs 14:00-14:05, no error` |
| `screenshotPaths` | No | Screenshot file paths. | `agent-testing/examples/screenshots/card-create.png` |
| `attachmentPaths` | No | Other evidence attachments. | `agent-testing/examples/output/build.log` |
| `observedAt` | Yes | Observation timestamp. | `2026-06-11T14:30:00+08:00` |
| `environment` | Yes | Environment under observation. | `local dev`, `test docker compose`, `staging` |
| `severity` | Yes for findings | Severity linked to observed issue. | `P0`, `P1`, `P2`, `P3`, `none`, `unknown` |
| `recommendation` | No | Suggested next action. | `Add regression case for restore` |
| `confidence` | Yes | Confidence level. | `low`, `medium`, `high` |
| `limitations` | Yes | What the evidence does not prove. | `Manual check only; no API trace` |

## Executor Types

| Executor Type | Meaning | Evidence Boundary |
| --- | --- | --- |
| `human` | Human manually executed or observed a test. | Must record executor identity or role, time, environment, steps, and observed result. A human note without detail is weak. |
| `script` | Local or test-environment script/test command output. | Must record command, exit status, output reference, and environment. |
| `api` | HTTP/API request and response evidence. | Must record request, status code, relevant response body, and side effects. |
| `browser` | Browser automation or manual browser observation with artifacts. | Must record page, action, observed UI state, screenshot/video when available, and browser environment. |
| `log_review` | Review of application, container, system, or monitoring logs. | Must include log source, time range, filters, and relevant excerpts. No logs does not automatically mean no problem. |
| `config_review` | Static review of files such as Docker, Nginx, env examples, scripts, or permissions. | Proves only static configuration facts. It does not equal live environment validation. |
| `mcp_tool` | Evidence collected through an MCP or external tool capability. | Must record tool name, server, purpose, input, output, permission level, side effect level, and raw evidence reference. |
| `skill` | Evidence-like output produced by an internal Skill, such as normalized records or reports. | Can support planning and normalization, but does not automatically prove real system execution. |
| `agent_reasoning` | Agent analysis, summary, severity rationale, or hypothesis. | Analysis evidence only. It cannot independently prove pass. |

## Skill, MCP, And Reasoning Boundary

`skill` evidence can show that an internal capability generated acceptance points, test cases, normalized evidence, classified severity, or drafted a report. It does not prove that the product executed correctly unless it normalized real execution evidence.

`mcp_tool` evidence can be strong when it captures real command output, API response, browser result, log excerpt, file content, or screenshot. It must still be scoped to the exact tool call and environment.

`agent_reasoning` is useful for connecting facts, explaining risks, and producing recommendations. It is normally weak evidence and must not be used alone to approve release or mark a test passed.

## Evidence Strength

| Strength | Definition | Typical Sources | Use |
| --- | --- | --- | --- |
| `weak` | Indirect, incomplete, or analysis-only evidence. | Agent reasoning, unsourced human memory, static config review without live check. | Can raise questions or support `unknown`; usually not enough for pass. |
| `medium` | Concrete but limited evidence for a narrow scope. | Detailed human observation, config review with file references, partial logs, Skill-normalized real evidence. | Can support limited conclusions when scope is clear. |
| `strong` | Direct, reproducible, traceable evidence for the tested behavior. | API response, test script output, browser automation screenshot/video, reproducible logs, command output with exit status. | Can support pass/fail when aligned with required evidence. |

Agent reasoning is usually `weak`. Static configuration review is usually `weak` or `medium`. API responses, test script output, browser automation screenshots, and reproducible logs are usually `strong`. Multiple independent sources that agree can increase confidence.

No evidence means no pass. If evidence conflicts, the result should be `unknown`, `inconclusive`, or `blocked` until the conflict is resolved.

## Result Interpretation

| Result | Meaning | Minimum Evidence |
| --- | --- | --- |
| `pass` | Expected result was observed for the defined scope. | Required evidence for the case, usually medium or strong. |
| `fail` | Actual result contradicts expected result. | Real observation tied to expected behavior. |
| `blocked` | Test could not execute because preconditions, tools, environment, data, or access were unavailable. | Evidence of the blocking condition. |
| `not_run` | Test has not been executed. | No execution evidence required, but must not be counted as pass. |
| `inconclusive` | Evidence is conflicting, incomplete, or too weak for pass/fail. | Record the limitation and next evidence needed. |

## Failure Source Classification

Evidence must distinguish:

- Tool failure: MCP tool, script harness, browser automation, or command failed before proving system behavior.
- Environment failure: test environment is missing, misconfigured, unavailable, or lacks required data.
- System failure: the target system executed and behaved incorrectly.

MCP failure, Skill incomplete output, or Agent uncertainty should not automatically become a product defect without corroborating evidence.

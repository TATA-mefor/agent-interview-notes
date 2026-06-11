# Phase 6 + Phase 7: Ops Checklist And Defect Analysis

This stage combines two low-risk deterministic capabilities inside the independent `agent-testing/` module:

- Phase 6: deterministic ops checklist generator.
- Phase 7: deterministic defect analysis Skill.

No runtime integration, MCP connection, LLM call, real system test execution, report generation, or agent orchestration is added.

## Ops Utilities Added

`agent-testing/src/ops/` provides:

- `generateOpsChecklist`
- `DeploymentMode`
- `OpsCheckCategory`
- `OpsCheckExecutionType`
- `OpsChecklistInput`
- `OpsChecklistItem`
- `OpsChecklistOutput`
- `UserScale`

The generator uses the supplied profile to create checklist items for deployment, authentication, authorization, backup, restore, logging, monitoring, database, file storage, search, network exposure, multi-user usage, maintenance, and security.

Each item includes required evidence, suggested execution type, related risk, priority, owner agent, tags, notes, and whether failure should block release.

The ops checklist only describes what should be checked. It does not execute checks, read configuration, read logs, query databases, access networks, or claim that any check has passed.

## Defect Analysis Utilities Added

`agent-testing/src/defects/` provides:

- `analyzeDefect`
- `DefectAnalysisInput`
- `DefectAnalysisOutput`
- `SuspectedCauseCategory`

The analyzer uses only provided defect metadata, test case metadata, normalized evidence, severity classification, ops risks, affected module, and notes.

It outputs suspected layer, cause category, possible cause, fix suggestion, regression suggestion, uncertainty, additional evidence needed, related risks, confidence, and limitations.

## Defect Analysis Rules

The analyzer maps deterministic keyword patterns to suspected areas:

- permission, authorization, private, shared, unauthorized, 权限, 私密 -> `permission_policy`
- login, session, token, auth, 登录, 会话 -> `authentication_flow`
- data loss, overwrite, conflict, concurrent, 数据丢失, 覆盖, 冲突 -> `database_state`
- upload, attachment, file, storage, 上传, 附件 -> `file_storage`
- search, index, query, 搜索, 索引 -> `search_index`
- backup, restore, recovery, 备份, 恢复 -> `backup_restore`
- log, monitoring, alert, 日志, 监控, 告警 -> `logging_monitoring`
- deploy, env, proxy, nginx, port, network, 部署, 环境变量, 反向代理, 端口 -> deployment, environment, or network categories

Tool failures are classified as `tooling` and do not directly become product defects. Incomplete Skill output is classified as `test_process` until independent product evidence exists.

## Confidence Boundary

Confidence is limited by evidence quality:

- Strong evidence plus a clear matched pattern and known severity can produce high confidence.
- Medium evidence with clear patterns usually produces medium confidence.
- Weak evidence, unknown severity, inconclusive evidence, only agent reasoning, or missing evidence produces low confidence.

The analyzer does not inspect source code, logs, configuration, databases, or live environments, so output remains a suspected cause, not a confirmed root cause.

## Why No MCP

MCP integration would require concrete adapters, permission levels, side-effect handling, raw evidence capture, and failure classification. This stage only generates deterministic structures over provided input.

## Why No LLM

The goal is reproducible, offline behavior. LLM reasoning could be added later as an optional assistant, but it must not override deterministic evidence and severity boundaries.

## Tool And Skill Boundaries

Tool failure can mean tool crash, environment failure, permission block, or setup issue. It is not direct proof that the product failed.

Skill output can be incomplete because input was ambiguous or evidence was missing. That is a test-process issue until real product behavior is observed.

## Recommended Phase 8 + 9

Phase 8 should implement deterministic regression suggestion utilities. Phase 9 should implement a Markdown report generator using existing cases, evidence, severity classifications, ops checks, defect analyses, unknowns, and release rules without hiding missing evidence or unsupported pass claims.

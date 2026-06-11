# Phase 6: Deterministic Ops Checklist Generator

Phase 6 adds a deterministic operations checklist generator for the Small System Test Agent Team. It converts a provided system and deployment profile into review and verification checklist items. It does not perform any real operational validation.

## Added Utilities

The new `agent-testing/src/ops/` module provides:

- `generateOpsChecklist`
- `OpsChecklistInput`
- `OpsChecklistOutput`
- `OpsChecklistItem`
- `DeploymentMode`
- `OpsCheckCategory`
- `OpsCheckExecutionType`
- `UserScale`

The new `opsChecklistSkill` wraps the generator as the `ops_checklist` deterministic Skill.

## Input And Output

`OpsChecklistInput` describes the target system profile:

- target system name and type
- deployment mode
- user scale and modules
- authentication, authorization, admin role
- file upload, search, backup, restore
- logging, monitoring, database, external storage
- public access and multi-user usage
- known constraints and known ops risks

`OpsChecklistOutput` returns:

- generated checklist items
- checks that may block release if failed
- recommended evidence types
- unknown profile fields
- limitations

Each `OpsChecklistItem` includes priority, required evidence, suggested execution type, related risk, owner agent, tags, notes, and whether a failed check should block release.

## Covered Categories

The generator covers:

- deployment
- authentication
- authorization
- backup
- restore
- logging
- monitoring
- database
- file storage
- search
- network exposure
- environment variables
- multi-user usage
- maintenance
- security

Long-term maintenance checks are always generated. Other categories are generated only when the input profile says the capability exists or the deployment mode requires it.

## Required Evidence Mapping

The checklist describes evidence that a future verification phase should collect. Examples include:

- human observation
- config snippet
- command output
- API response
- browser screenshot
- log excerpt
- backup artifact
- restore record
- database check
- deployment document
- environment variable checklist
- permission matrix
- monitoring screenshot

This phase does not create evidence and does not claim any check has passed.

## Release Blocking Checks

Checks are marked `blockingIfFailed` when failure would make release operationally unsafe. Examples include:

- authentication bypass
- authorization bypass
- private data exposure
- public exposure of internal ports or sensitive configuration
- critical backup or restore failure
- core deployment unreachable
- unsafe database write or migration behavior
- attachment permission failure
- multi-user overwrite or data loss risk

Documentation gaps, maintenance clarity issues, non-sensitive logging gaps, and general monitoring gaps are usually non-blocking unless later evidence shows they block safe operation.

## Execution Type Boundary

`OpsCheckExecutionType` separates current planning from future verification:

- `static_review`
- `manual_verification`
- `script`
- `api`
- `browser`
- `database`
- `log_review`
- `mcp_future`

Future MCP adapters can use these fields to choose the right evidence source. Phase 6 only records the intended verification type.

## Non-Goals

Phase 6 does not execute real operational checks. It does not read server configuration, inspect logs, connect to a database, run shell commands, call APIs, open browsers, or access infrastructure.

Phase 6 does not connect to MCP. MCP integration still needs explicit adapter contracts, permission levels, side-effect handling, and evidence normalization.

Phase 6 does not implement a report generator or agent orchestration. It only produces structured checklist items.

## Recommended Phase 7

Phase 7 should implement a deterministic defect analysis Skill. It can consume failed or blocked evidence, severity classification, related ops checklist items, and provided source or log snippets to produce suspected layer, root-cause hypothesis, confidence, limitations, fix recommendation, and regression suggestions without claiming proof beyond evidence.

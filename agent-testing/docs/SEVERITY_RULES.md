# Severity Rules

## Core Rules

No evidence means no `pass`. Evidence不足时 severity 应为 `unknown`.

Agent 不能凭空证明测试通过. Severity classification must use observed impact, affected users, reproducibility, workaround, data/security risk, operational risk, and evidence strength.

MCP tool failure is not automatically a target-system failure. Skill quality issues are testing-process issues unless real product behavior is affected.

## Severity Levels

| Severity | Definition | Judgment Conditions | Examples | Blocks Release | Regression Required | Minimum Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `P0 / blocking` | Critical issue that makes release unsafe. | Data loss, permission bypass, private data leak, core flow unavailable with no workaround, backup/restore cannot protect data, destructive behavior. | Cards disappear after save; private notes visible to unauthorized user; restore destroys data. | Yes | Yes | Strong, or medium if risk is severe and reproducible enough to block. |
| `P1 / important` | Important issue that should be fixed before release. | Major workflow broken, high operational risk, security/privacy concern with limited exposure, core feature unreliable but workaround exists. | Import fails for common Markdown files; login/core access intermittently unavailable; backup fails in documented path. | Usually yes | Yes | Medium or strong. |
| `P2 / standard` | Valid defect with limited impact or workable mitigation. | Non-core behavior wrong, partial failure, inaccurate result, workaround available, limited users affected. | Search misses some expected results; attachment upload fails for one format; multi-user conflict on rare edit path. | Usually no | Usually yes | Medium. |
| `P3 / suggestion` | Improvement, usability issue, documentation gap, or low-risk polish. | Does not block core work and does not create data/security risk. | Confusing button label; incomplete docs for optional setup; minor layout issue. | No | Optional | Weak or medium is acceptable when clearly labeled. |
| `none` | No defect identified for the tested scope. | Required evidence supports expected behavior. | API returns expected status and UI shows saved card. | No | No | Required case evidence, usually medium or strong. |
| `unknown` | Insufficient, missing, or conflicting evidence. | Test not run, evidence missing, script and human observations conflict, tool failed before observing system. | MCP browser failed to launch; no logs available for claimed outage; human says pass but screenshot shows error. | Cannot approve based on this item | Depends on later result | Evidence of insufficiency; do not classify as pass. |

## Scenario Rules

| Scenario | Default Severity | Notes |
| --- | --- | --- |
| Data loss | `P0` | Includes deleted notes/cards, import overwrites without confirmation, restore damages existing data. |
| Permission bypass | `P0` | Includes unauthorized write/read, bypassing expected access control, or public deployment exposure beyond documented assumptions. |
| Private notes leak | `P0` | Private imported documents, notes, API keys, or card content exposed to unauthorized users. |
| Login or core function unavailable | `P0` or `P1` | `P0` if no workaround for core use; `P1` if limited, intermittent, or workaround exists. |
| Backup failure | `P1` by default, `P0` if data cannot be protected before release | Static script concern may be `unknown` until executed. |
| Restore failure | `P0` if it prevents recovery, otherwise `P1` | Restore is critical for local-first data safety. |
| Missing logs | `P1` for production/staging critical paths, `P2` for local-only noncritical paths | Lack of logs can block diagnosis but is not always product failure. |
| Multi-user conflict | `P1` if data can be overwritten or lost, `P2` if limited display/state issue | Must record concurrency scenario. |
| Attachment upload failure | `P1` if core import path fails, `P2` if limited format/size case, `P3` if unclear message only | Evidence should include file type, size, and response. |
| Inaccurate search | `P1` if core retrieval unusable, `P2` for partial ranking/recall issue, `P3` for tuning suggestion | Search quality needs representative examples. |
| UI usability issue | `P2` if it causes task failure, `P3` for confusion or polish | Tie to workflow and user impact. |
| Incomplete documentation | `P2` if setup/deployment becomes blocked, `P3` for optional gaps | Docs issue is not product runtime failure unless it blocks operation. |
| Insufficient evidence | `unknown` | Never convert to `none` or `pass`. |
| MCP tool execution failure | `unknown` until source is known | Distinguish tool failure, environment failure, and system failure. |
| Skill incomplete output | `unknown` for test-process result, not product defect by itself | May require rerun or improved input. |
| Script result and human observation conflict | `unknown` or `inconclusive` | Requires triage; do not choose the preferred result without reconciliation. |

## Downgrade And Upgrade Rules

Issues involving data loss, permission bypass, private information exposure, or core workflow unavailability default to at least `P0` or `P1`.

Non-core issues with a reliable workaround can be downgraded to `P2` when evidence shows limited blast radius.

Pure experience improvements are usually `P3`.

If the only evidence is Agent reasoning, severity should normally be `unknown` unless it is clearly a planning risk rather than a product defect.

If multiple strong evidence sources agree, confidence increases. If strong evidence conflicts, keep `unknown` until resolved.

## Release Impact

- Any unresolved `P0` must produce `blocked`.
- Multiple unresolved `P1` issues should normally produce `blocked` or `approved_with_risks` only with explicit owner acceptance.
- `P2` issues can allow `approved_with_risks` when workarounds and regression scope are documented.
- `P3` issues can allow `approved` or `approved_with_risks`.
- Critical missing evidence should produce `inconclusive`, not `approved`.

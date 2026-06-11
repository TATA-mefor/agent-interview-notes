# Report Template

Use this template for small-system test reports covering systems used by roughly 10-30 people, such as notes systems, internal knowledge bases, and small management platforms.

Agent 不能凭空证明测试通过. A report must not mark cases as passed, recommend approval, or hide risks without real evidence.

```markdown
# System Test Report

## 1. Test Summary

- Report ID:
- Generated At:
- Prepared By:
- Target System:
- Test Window:
- Total Cases:
- Executed:
- Passed:
- Failed:
- Blocked:
- Inconclusive:
- Release Recommendation:

## 2. Target System

- Name:
- Version / Commit / Build:
- System Type:
- Primary Users:
- Critical Workflows:

## 3. Test Scope

### Included

- 

### Excluded

- 

### Assumptions

- 

## 4. Test Environment

- Environment:
- URL / Access Path:
- Database:
- Browser / Device:
- LLM Provider:
- Network:
- Test Data:

## 5. Context Sources

| Source | Type | Purpose | Notes |
| ------ | ---- | ------- | ----- |
| README.md | documentation | module understanding | |

## 6. Acceptance Points

| ID | Source | Description | Business Value | Priority | Ambiguity |
| -- | ------ | ----------- | -------------- | -------- | --------- |
| AP-001 | | | | must | low |

## 7. Test Cases

### Test Case Table

| ID | Title | Scope | Priority | Required Evidence | Status |
| -- | ----- | ----- | -------- | ----------------- | ------ |
| STC-001 | | | high | | not_run |

## 8. Skills and MCP Usage

### Skill Usage Table

| Skill | Invoked By | Input | Output | Evidence Produced | Limitation |
| ----- | ---------- | ----- | ------ | ----------------- | ---------- |
| Context Building Skill | Test Lead Agent | | | | |

### MCP Usage Table

| MCP Capability | Tool | Purpose | Permission | Side Effect | Evidence |
| -------------- | ---- | ------- | ---------- | ----------- | -------- |
| Filesystem / Repository MCP | | | READ_ONLY | NONE | |

## 9. Execution Evidence

### Evidence Table

| Evidence ID | Test Case ID | Source | Result | Summary | Confidence |
| ----------- | ------------ | ------ | ------ | ------- | ---------- |
| EV-001 | STC-001 | | inconclusive | | low |

### Evidence Limitations

- 

## 10. Defect Findings

### Defect Table

| Defect ID | Severity | Title | Evidence | Recommendation | Status |
| --------- | -------- | ----- | -------- | -------------- | ------ |
| DEF-001 | unknown | | | | needs_evidence |

## 11. Ops and Deployment Checks

| Check | Evidence | Result | Risk | Recommendation |
| ----- | -------- | ------ | ---- | -------------- |
| Backup works | | not_run | unknown | |

## 12. Permission and Data Safety Checks

| Check | Evidence | Result | Severity | Notes |
| ----- | -------- | ------ | -------- | ----- |
| Private notes are not exposed | | not_run | unknown | |

## 13. Unknowns and Limitations

- 

## 14. Release Recommendation

Recommendation:

Rationale:

Blocking Issues:

Accepted Risks:

Missing Evidence:

## 15. Regression Suggestions

| Area | Trigger | Suggested Regression | Required Evidence |
| ---- | ------- | -------------------- | ----------------- |
| | | | |

## 16. Appendix

- Raw evidence references:
- Commands:
- API requests:
- Screenshots:
- Attachments:
- Open questions:
```

## Release Recommendation

| Value | Use When |
| --- | --- |
| `approved` | All critical scope has required execution evidence, no unresolved `P0` or blocking `P1`, and remaining issues are `none` or accepted low-risk `P3`. |
| `approved_with_risks` | Required evidence exists for critical scope, no unresolved `P0`, and unresolved `P1`/`P2` risks have documented workaround, owner acceptance, and regression plan. |
| `blocked` | Any unresolved `P0` exists, core workflow is unavailable, data/privacy/security risk is unresolved, or release cannot be operated safely. |
| `inconclusive` | Critical evidence is missing, cases are not run, evidence conflicts, MCP/Skill/tool failures prevent observation, or the team cannot distinguish tool/environment/system failure. |

## Mandatory Report Rules

- No execution evidence means the report cannot be `approved`.
- Any unresolved `P0` must result in `blocked`.
- Key evidence gaps should result in `inconclusive`.
- Non-blocking risks may result in `approved_with_risks`.
- Unexecuted cases must remain `not_run`.
- Agent reasoning, Skill output, and MCP output must be distinguished from real execution evidence.
- Tool failure, environment failure, and target-system failure must be separated.
- `P0`, `P1`, `P2`, `P3`, `none`, and `unknown` must use `SEVERITY_RULES.md`.

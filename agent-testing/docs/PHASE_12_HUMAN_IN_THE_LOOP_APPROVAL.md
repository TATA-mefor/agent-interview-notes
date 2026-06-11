# Phase 12: Human-in-the-Loop Approval Contracts And Policy Engine

Phase 12 adds Human-in-the-Loop approval contracts and a deterministic approval policy engine inside the isolated `agent-testing/` module.

This phase does not add approval UI, API routes, database persistence, MCP integration, command execution, real test execution, audit runtime, observability dashboard, notifications, or permission-system integration.

## Approval Types Added

`agent-testing/src/approval/` defines:

- `ApprovalActionType`
- `ApprovalRiskLevel`
- `ApprovalStatus`
- `ApprovalDecisionValue`
- `RequiredApproverRole`
- `ApprovalRequest`
- `ApprovalDecision`
- `ApprovalPolicyInput`
- `ApprovalPolicyOutput`
- `ApprovalRiskAssessment`

The approval request records the run, requesting Agent, action type, target, purpose, permission level, side effect level, input summary, expected output, evidence to produce, approval requirement, status, creation timestamp field, and limitations.

The approval decision model records a decision value, approver identity field, reason, conditions, decided timestamp field, and limitations. It is a contract only; this phase does not persist decisions or validate real approver identity.

## Policy Engine Utilities

`approvalPolicy.ts` provides:

- `evaluateApprovalPolicy`
- `assessActionRisk`
- `requiresHumanApproval`
- `buildApprovalRequest`
- `isForbiddenAction`

All functions are pure and deterministic. They only evaluate supplied action metadata. They do not read files, write files, access network, connect databases, call MCP, call LLMs, request real human approval, or execute actions.

## Risk Levels

`LOW` applies to internal deterministic actions that produce plans, suggestions, reports, release recommendations, evidence normalization results, severity classifications, or other structured outputs without side effects.

LOW actions require:

- `READ_ONLY` permission.
- `NONE` side effect level.
- No production access.
- No filesystem write.
- No external call.
- No database operation.
- No command execution.
- No deployment change.
- No sensitive raw data processing.

LOW actions produce `requiresHumanApproval=false` and `status=not_required`.

`MEDIUM` applies to actions such as local project reads, git diff reads, test-environment log reads, non-destructive checks, read-only test APIs, read-only browser access, and redacted or summary handling of potentially sensitive logs.

MEDIUM actions are not approval-required by default in this phase because there is no configuration system yet. The output explains that MEDIUM approval behavior is configurable in a later phase.

`HIGH` applies to actions such as shell command execution, write APIs, browser form submission, database writes, filesystem writes outside `agent-testing/`, configuration changes, deployment changes, external calls with side effects, and sensitive raw data handling.

HIGH actions produce:

- `requiresHumanApproval=true`
- `status=pending`
- a required approver role such as `test_lead`, `ops_owner`, `project_owner`, `security_owner`, or `data_owner`
- required evidence before approval

`FORBIDDEN` applies to production destructive operations, production data deletion, production database writes, production deployment mutation, raw secret access or exposure, unauthorized production access, dangerous commands, and destructive actions without a safe test-sandbox policy.

FORBIDDEN actions produce:

- `riskLevel=FORBIDDEN`
- `requiresHumanApproval=false`
- `status=forbidden`
- policy violations explaining why the action is rejected

Forbidden actions do not request more evidence. They are directly rejected by policy.

## Permission And Side Effect Mapping

The policy is compatible with the MCP contract types:

- `McpPermissionLevel`
- `McpSideEffectLevel`

The deterministic mapping is:

- `READ_ONLY + NONE` can be LOW for pure internal actions or MEDIUM for external read contexts.
- `WRITE_LIMITED + LOCAL_WRITE` is MEDIUM inside `agent-testing/` and HIGH when writing outside the module.
- `EXECUTE_LIMITED` is HIGH when command execution is requested.
- `WRITE_DANGEROUS` is HIGH unless production or destructive flags make it FORBIDDEN.
- `PRODUCTION_FORBIDDEN` is FORBIDDEN when `isProduction=true`.
- `DESTRUCTIVE` is FORBIDDEN in this phase.
- `EXTERNAL_CALL` is MEDIUM for read-only access and HIGH when side effects are possible.
- `TEST_ENV_WRITE` is HIGH.
- `LOCAL_WRITE` outside `agent-testing/` is HIGH.

## Approval Request IDs

If an input does not provide an ID, the policy builds a deterministic fallback:

```text
approval-{runId}-{actionType}-{riskLevel}
```

No crypto dependency is introduced.

## Evidence Before Approval

HIGH-risk actions include required evidence before approval, such as:

- target environment confirmation
- command preview
- expected side effect summary
- rollback plan
- test data confirmation
- approver identity
- audit trace id
- external endpoint and network scope confirmation
- sensitive data handling and redaction plan

These are contract requirements only. No approval is requested in this phase.

## Approval Policy Skill

`approvalPolicySkill` evaluates one or more approval policy inputs and returns:

- `evaluations`
- `issues`
- `warnings`
- `forbiddenActions`
- `pendingApprovals`

The Skill risk level is `LOW` because it only evaluates metadata. It does not execute actions, call MCP, call LLMs, read or write files, access network, connect databases, or request real human approval.

## Why No Real Approval UI

Approval UI needs identity, authorization, persistence, notification, expiry, audit retention, and a user interaction model. This phase only defines the contracts and deterministic policy decisions needed before that runtime exists.

## Why No MCP

MCP tools may later read files, execute commands, drive browsers, call APIs, inspect databases, or read logs. Those capabilities need policy gates before execution. This phase defines those gates but does not connect or invoke MCP tools.

## Why No Action Execution

Approval policy evaluation must happen before risky actions run. Executing the action while evaluating whether it needs approval would break the safety model. Therefore this phase never executes HIGH or FORBIDDEN actions.

## Why Approval Policy Must Precede Real MCP Execution

Real MCP execution can create evidence, change state, leak sensitive data, or damage environments. The system must know which actions are low risk, approval-required, or forbidden before adapters are allowed to run.

Approval policy also creates the decision points that Phase 13 audit trail work can record. Without this contract, future evidence and release recommendations would not be able to show whether a risky action was approved, rejected, skipped, or forbidden.

## Next Phase

Phase 13 should implement the Agent audit trail and observability event model. It should define audit event records, policy decision references, approval request references, trace IDs, evidence references, redaction rules, and dashboard-ready observability events without adding dashboard runtime unless explicitly scoped.

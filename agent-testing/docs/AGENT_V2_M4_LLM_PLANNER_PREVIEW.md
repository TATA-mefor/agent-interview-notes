# Agent Testing V2 M4 - LLM Planner Adapter Preview

## Scope

M4 adds a preview-only LLM Planner Adapter layer under `agent-testing/src/llm-planner/`.
It defines the contracts that a future real planner must obey, plus a deterministic fake planner, validator, and action mapper.

M4 does not connect to any real LLM provider. It does not call OpenAI, Claude, DeepSeek, DashScope, local models, MCP servers, commands, HTTP APIs, browsers, databases, or filesystem readers.

## Contracts Added

`llmPlannerTypes.ts` defines:

- `LlmPlannerInput`
- `LlmPlannerOutput`
- `LlmPlannerValidationIssue`
- `LlmPlannerValidationResult`
- `LlmPlannerActionProposal`
- planner action, risk, mode, and proposal status unions

`LlmPlannerInput` is summary-only. It carries profile/task/blackboard/evidence-gap summaries, available skills, available task types, available MCP capability names, constraints, and limitations. It intentionally excludes full raw evidence, full reports, logs, files, secrets, and raw requirements text.

`LlmPlannerOutput` is only an action proposal. It can suggest a task draft, skill proposal, MCP request draft, controlled execution request draft, blackboard note draft, session summary proposal, or no-op. It cannot execute any of them.

## Fake Deterministic Planner

`fakeLlmPlanner.ts` provides:

- `createLlmPlannerInput()`
- `runFakeLlmPlanner()`

The fake planner is deterministic and rule-based:

- open evidence gaps can produce a `review_evidence_gap` task proposal;
- Test Lead `summarize_session` can propose `report_generation` or `release_recommendation`;
- Ops Check can propose a conservative approval-gated `read_only_snapshot` MCP request draft;
- controlled execution tasks produce high-risk approval-required proposals;
- unmatched summaries return `no_op`.

Planner reasoning is recorded only as explanation text. It is not evidence and cannot mark tests passed.

## Validator

`plannerOutputValidator.ts` validates planner output before mapping:

- session, trace, role, and mode must match;
- M4 only accepts `fake_deterministic`;
- confidence must be within `0..1`;
- action type and risk level must be legal;
- task and skill targets must be allowed by the agent profile;
- MCP requests require `canRequestMcp`;
- controlled execution requests require `canRequestControlledExecution`;
- high risk must require approval;
- forbidden output is invalid;
- input refs must use legal `SharedBlackboard` keys;
- obvious secret/token/password/private-key text is rejected;
- pass claims are rejected because planner output is not execution evidence.

## Action Mapper

`plannerActionMapper.ts` maps validated output to `LlmPlannerActionProposal`.

The mapper can create a pending `AgentTask` draft with `createAgentTask()` for `create_task` proposals, but it does not insert the draft into a session. It does not write the blackboard, send messages, call SkillRouter, call MCP, execute controlled actions, or complete tasks.

High-risk or explicitly approval-required proposals return `needs_approval`.
Forbidden or invalid proposals return `rejected`.
Unsupported preview-only actions remain `unsupported` unless approval is required.

## Boundaries

M4 keeps these boundaries:

- no real LLM;
- no real MCP;
- no SkillRouter invocation;
- no command, HTTP, browser, database, or filesystem execution;
- no persistence;
- no API route;
- no UI;
- no dependency changes;
- no evidence creation;
- no pass evidence from planner reasoning.

## Next Step

M5 should add Agent-to-MCP Request Flow. That phase can connect planner or agent proposals to an MCP request router and approval bridge while still keeping execution controlled and audit-friendly.

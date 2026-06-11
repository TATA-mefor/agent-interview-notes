# Small System Test Agent Team Adaptation Report

## 1. Executive Summary

The current project is suitable for introducing a "Small System Test Agent Team", but it should be introduced as a separated, evidence-driven module rather than mixed into the existing interview-card agents.

The best fit is a layered addition that starts with documentation and domain contracts under `agent-testing/docs/`, then moves into isolated domain models and offline tests, and only later adds UI/API/Agent orchestration. The existing project already has useful foundations: a local-first Next.js architecture, lightweight Agent Service pattern, LLM provider abstraction, RAG retrieval, document import pipeline, `agent_runs` persistence, Docker deployment docs, and backup/restore scripts. However, it does not yet have a general test management domain, automated system-test runner, evidence ingestion model, markdown lint, CI, or a formal test suite beyond one extraction script.

The first implementation phase should not execute real production tests or decide release readiness by conversation. The system test agents must generate plans, classify risks, and summarize evidence, while actual pass/fail claims must be backed by human results, scripts, logs, screenshots, API responses, or deployment checks.

## 2. Current Project Understanding

### 2.1 System Type

This repository is a local-first Agent interview knowledge-card system. It is built with Next.js 14 App Router, React, TypeScript, Tailwind CSS, PostgreSQL, pgvector, Supabase-compatible local access through PostgREST, and optional LLM providers.

The core product domain is not generic QA automation. It is centered on `Card`, where each card represents an Agent engineering interview question with structured answers, notes, difficulty, frequency, mastery, related cards, AI suggestions, and review metadata.

### 2.2 Main Functional Modules

Observed modules include:

- Dashboard at `/`.
- Card CRUD and detail flows under `/cards`.
- Import flow under `/import`.
- Markdown notes under `/notes`.
- Knowledge documents under `/knowledge`.
- Search under `/search`.
- Mind map under `/mindmap`.
- Knowledge graph under `/graph`.
- Review center and Gantt page under `/review`.
- Agent panel under `/agents`.
- Settings pages under `/settings`, `/settings/llm`, `/settings/local`, and `/settings/backup`.

### 2.3 Existing Agent / Tool / Skill-Like Capabilities

The project uses lightweight service-style agents, not LangGraph or another heavy workflow framework.

Existing agent-related code and patterns:

- `src/lib/agents/cardUnderstandingAgent.ts`
  - Generates structured interview-card suggestions.
  - Uses RAG context when available.
  - Output is suggestion-only and should not auto-apply user content.
- `src/lib/agents/relatedQuestionAgent.ts`
  - Finds related card relationships.
  - Returns relation type, reason, and score.
- `src/app/agents/page.tsx`
  - Presents an Agent panel with five logical agents: card understanding, related question, review planner, knowledge import, and mind map.
- `src/lib/repositories/agentRunRepository.ts`
  - Persists `agent_runs` with status, input, output, provider, model, tokens, and error fields.
- `src/lib/llm.ts`
  - Provides LLM provider abstraction for Dify, DeepSeek, OpenAI, Zhipu, Ollama, and Qwen.
  - Supports structured JSON calls and streaming.
- `src/lib/rag/retriever.ts`
  - Provides hybrid retrieval with vector search, keyword search, LLM rewrite, fallback merge, optional rerank, and source references.

There is no discovered `docs/agent/`, `docs/decisions/`, `docs/quality/`, or `docs/exec-plans/` directory. There is an `agent.md` file that acts like an AGENTS.md-style project instruction document.

### 2.4 Existing Document, Import, and RAG Capabilities

Useful foundations for a system-test agent team:

- Document importers exist for CSV, JSON, Markdown, Word, PDF, and LLM-assisted extraction.
- QA extraction pipeline exists under `src/lib/extraction/`.
- RAG components exist under `src/lib/rag/`.
- Knowledge upload and search API routes exist.
- `SourceReference` in `src/lib/types.ts` already models citation-like references.

These are directly reusable for requirement ingestion, acceptance-point extraction, and report evidence references, but should not be reused blindly as system-test proof. They can support context building; they cannot prove execution outcomes.

### 2.5 Deployment, Permissions, Logs, and Operations Baseline

Deployment-related files and docs:

- `Dockerfile`
- `docker-compose.yml`
- `docs/LOCAL_DEPLOYMENT.md`
- `docs/SERVER_DEPLOYMENT.md`
- `nginx/postgrest-proxy.conf`
- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `scripts/deploy.sh`

The project supports local deployment with web, PostgreSQL, pgvector, PostgREST, Nginx proxy, and optional Ollama. Server deployment docs describe VPS, Nginx, HTTPS, firewall, backup, restore, logs, and a warning that public deployment currently needs authentication.

Observed permission/security baseline:

- `.gitignore` excludes `.env`, `.env.local`, `.env*.local`, and `.env.production`.
- `docker-compose.yml` keeps PostgreSQL and Ollama bound to `127.0.0.1` where exposed.
- `SERVER_DEPLOYMENT.md` explicitly says public deployments must add authentication.
- Database roles and PostgREST setup are represented by `supabase/init_roles.sql` and schema role grants.

Observed logging baseline:

- No dedicated application logging framework was found.
- Docker logs are documented for operations.
- `agent_runs`, `import_jobs`, `review_log`, and `llm_suggestions` provide domain event traces, but they are not a full audit/logging system.

## 3. Existing Testing and Quality Baseline

### 3.1 Available Scripts

`package.json` currently defines:

```text
npm run dev
npm run build
npm run start
```

No `npm test`, `npm run lint`, markdown lint, Playwright, Vitest, Jest, Cypress, or CI workflow was found in the inspected files.

### 3.2 Existing Test-Like Assets

The only discovered test-like script is:

- `scripts/test-extraction.ts`

It validates the rule-based QA extraction pipeline with positive and negative cases. It is useful evidence that the extraction subsystem can be tested offline, but it is not wired into `package.json` and does not cover the application, API routes, UI, deployment, permissions, backup, or multi-user workflows.

### 3.3 Quality Baseline Gaps

Current gaps relevant to the proposed direction:

- No formal system test case model.
- No test execution result model.
- No evidence attachment/reference model.
- No defect/severity model.
- No system test report generator.
- No automated API smoke test suite discovered.
- No UI E2E framework discovered.
- No CI or documented quality gate discovered.
- No documented markdown lint or docs test.
- No realistic multi-user or permission test harness discovered.

## 4. Fit Assessment

### 4.1 Why This Direction Fits

The direction fits because the project already has several compatible architectural ideas:

- Lightweight Agent Service classes are the preferred pattern.
- Agent output is already treated as suggestion-only.
- `agent_runs` can provide traceability for agent executions.
- RAG and import pipelines can build context from requirements, docs, deployment files, and historical reports.
- The local-first requirement aligns with an offline-capable test planning and evidence review workflow.
- The product already has report-friendly domains: imports, suggestions, review logs, knowledge sources, and structured cards.
- Small team usage is already part of the deployment story: local desktop server plus mobile/browser access.

### 4.2 What Should Not Be Directly Reused

Some existing capabilities should not be reused as-is:

- Interview-card `Card` should not become the test case entity. Test cases need their own domain model.
- `review_priority` and card mastery should not be reused for defect severity.
- `llm_suggestions` can inspire traceability, but test results and evidence need stronger structure.
- `agent_runs` can record orchestration runs, but should not be the only storage for test cases, defects, or evidence.
- RAG retrieval can provide context, but cannot be treated as execution proof.

### 4.3 Missing Prerequisites

Before adding runtime features, the project needs:

- A test-agent domain vocabulary.
- A structured evidence model.
- A severity model and classification rules.
- A report contract.
- Offline tests for severity classification and report generation.
- A clear boundary between generated test plans and verified execution results.

### 4.4 Design Risks to Avoid

- Letting multiple agents "discuss" and declare a system ready without execution evidence.
- Treating LLM-generated test cases as passed tests.
- Binding MVP to real LLM providers, Docker, database, external network, or API keys.
- Mixing test-agent code into interview-card agents.
- Creating broad database migrations before the domain contract is stable.
- Building a complex multi-agent runtime before simple single-run report generation works.
- Running tests against production systems in the first phase.

## 5. Proposed Agent Roles

| Agent | Responsibility | Input | Output | Boundary |
|---|---|---|---|---|
| Test Lead Agent | Own test mission, identify scope, coordinate specialist agents, merge outputs, classify release recommendation. | Project context packet, requirement summary, target environment, execution evidence, specialist outputs. | Test plan summary, agent task allocation, consolidated risk list, final release recommendation draft. | Must not mark tests passed without evidence. Must not execute destructive actions. |
| Product Acceptance Agent | Extract acceptance criteria, user workflows, missing requirements, and business acceptance impact. | README, product docs, user stories, pasted requirements, screenshots or manual notes. | Acceptance-point list, unclear requirement list, business impact notes. | Does not verify technical implementation. Does not invent requirements when source is unclear. |
| Test Design Agent | Generate system test cases covering functional, exception, boundary, permission, data consistency, backup, logs, deployment, and multi-user scenarios. | Acceptance points, system modules, API/page list, risk profile, constraints. | Structured test cases with scope, steps, expected result, priority, and required evidence. | Does not claim execution status. Should not generate low-value exhaustive cases without scope control. |
| Developer Analysis Agent | Analyze failed cases using logs, API responses, stack traces, diffs, and system behavior. | Failed test evidence, logs, API responses, relevant source files, config snippets. | Suspected root cause, affected layer, fix suggestion, regression test recommendation. | Must label uncertainty. Must not fabricate logs or source behavior. |
| Ops Check Agent | Check deployment, environment, backup, restore, logging, permissions, secrets, network exposure, and maintenance risk. | Dockerfile, docker-compose, Nginx config, deployment docs, env examples, backup scripts, runtime check outputs. | Ops checklist, risk findings, required evidence, mitigation suggestions. | Must separate static config review from live environment verification. Should not require production access in MVP. |
| User Representative Agent | Review usability and 10-30 person usage flows from a small-team perspective. | Page map, workflows, screenshots/manual observations, product scenario, test cases. | Usability risks, confusing flows, accidental misuse scenarios, small-team collaboration concerns. | Does not replace real user testing. Must avoid subjective claims without scenario linkage. |

## 6. Proposed Workflow

### 6.1 End-to-End Flow

1. Context building
   - Agent reasoning: summarize project type, modules, deployment model, pages, APIs, and constraints.
   - Evidence required: README, architecture docs, deployment docs, package scripts, schema, source file inventory.

2. Requirement acceptance extraction
   - Agent reasoning: Product Acceptance Agent extracts acceptance points and ambiguity.
   - Evidence required: requirement docs, product docs, pasted user request, issue text, or manually entered requirement.

3. Test case generation
   - Agent reasoning: Test Design Agent maps acceptance points and risk areas to structured cases.
   - Evidence required: source acceptance points and explicit test scope.

4. Ops and permission check generation
   - Agent reasoning: Ops Check Agent generates static config checks and live verification checklist.
   - Evidence required: Dockerfile, docker-compose, Nginx config, env examples, deployment docs, backup scripts.

5. Test execution evidence ingestion
   - Agent reasoning: normalize and summarize evidence.
   - Evidence required: human result, API response, command output, log excerpt, screenshot path, attachment, or test runner output.

6. Failure analysis
   - Agent reasoning: Developer Analysis Agent maps observed failure to likely layer and fix path.
   - Evidence required: failed test id, actual result, logs/responses/screenshots, relevant code/config references.

7. Risk classification
   - Agent reasoning: Test Lead Agent classifies severity using rules and evidence.
   - Evidence required: impact, reproducibility, affected users, workaround, data/security/deployment impact.

8. Final report generation
   - Agent reasoning: Test Lead Agent composes report and release recommendation.
   - Evidence required: test case list, execution results, unresolved risks, severity labels, exclusions, unknowns.

### 6.2 Evidence vs Reasoning Boundary

Agent reasoning is appropriate for:

- Understanding requirements.
- Proposing acceptance points.
- Designing test cases.
- Mapping risks to modules.
- Summarizing evidence.
- Classifying likely severity.
- Suggesting debug/fix directions.
- Drafting final reports.

Real evidence is mandatory for:

- Claiming a test passed.
- Claiming a defect is reproducible.
- Claiming deployment, backup, restore, logs, or permissions were verified.
- Claiming a fix resolved a defect.
- Claiming a live environment is safe to release.
- Claiming API behavior, UI behavior, or database state.

## 7. Evidence Model

The following contract is recommended for the first domain model. It can live as Markdown in Phase 1, then become TypeScript types in Phase 2 or Phase 3.

```text
SystemTestEvidence
- id
- testCaseId
- testScope
- executionMethod
- executorType: human | script | api | browser | log_review | config_review | agent_reasoning
- result: pass | fail | blocked | not_run | inconclusive
- evidenceSource
- evidenceSummary
- command
- apiRequest
- apiResponse
- logs
- screenshotPaths
- attachmentPaths
- observedAt
- environment
- severity: P0 | P1 | P2 | P3 | none | unknown
- recommendation
- confidence
- limitations
```

Recommended severity interpretation:

- `P0 / blocking`: blocks release; data loss, security exposure, critical path unavailable, or no viable workaround.
- `P1 / important`: should fix before release; important workflow broken or high operational risk.
- `P2 / standard`: valid defect that can be scheduled after release if workaround exists.
- `P3 / suggestion`: usability, maintainability, or minor improvement.
- `none`: no defect identified.
- `unknown`: insufficient evidence.

Minimum test case fields:

```text
SystemTestCase
- id
- title
- scope
- sourceRequirement
- preconditions
- steps
- expectedResult
- priority
- requiredEvidence
- ownerAgent
- tags
```

Minimum report fields:

```text
SystemTestReport
- id
- title
- targetSystem
- testScope
- contextSources
- summary
- cases
- evidence
- defects
- opsRisks
- unknowns
- releaseRecommendation
- generatedAt
```

## 8. MVP Proposal

The MVP should be small and isolated. It should not add a full multi-agent runtime at first.

MVP scope:

- Requirement/system description input.
- Acceptance-point extraction.
- System test case generation.
- Ops checklist generation.
- Manual or tool result entry.
- Defect severity judgment.
- Final Markdown test report generation.

MVP non-requirements:

- No production environment connection.
- No automatic browser testing.
- No real Docker orchestration.
- No new external dependencies.
- No mandatory LLM provider.
- No database migration in the first phase.
- No UI route until the document and type contracts are stable.

Recommended MVP shape:

- Store all test-agent design docs under `agent-testing/docs/`.
- Add TypeScript contracts under the future isolated module path `agent-testing/src/`.
- Start with deterministic utility functions for severity classification and report assembly.
- Add offline unit tests once a test runner is selected.
- Later add an API route and UI page only after contracts are validated.

## 9. Suggested Implementation Phases

### Phase 1: Documentation and Domain Contracts

- Goal: Define the testing-agent domain without runtime integration.
- Files:
  - `agent-testing/docs/SMALL_SYSTEM_TEST_AGENT_TEAM_ADAPTATION_REPORT.md`
  - Future: `agent-testing/docs/DOMAIN_CONTRACTS.md`
- Add/change:
  - Agent roles.
  - Evidence model.
  - Severity model.
  - Report contract.
- Test method:
  - Manual Markdown review.
  - Check required sections exist.
- Do not:
  - Add database tables.
  - Add API routes.
  - Add LLM calls.
  - Modify existing card agents.

### Phase 2: TypeScript Domain Types

- Goal: Convert the documentation contracts into isolated TypeScript domain types.
- Files:
  - `agent-testing/src/types.ts`
  - Future tests under `agent-testing/tests/types.test.ts` if a test runner is added.
- Add/change:
  - TypeScript types for acceptance points and test cases.
  - TypeScript types for evidence, defects, reports, Skill invocations, and MCP tool invocations.
  - Runtime-independent validation helpers only if needed.
- Test method:
  - Offline type checks or fixture validation.
- Do not:
  - Persist data.
  - Execute tests.
  - Require API keys.

### Phase 3: Skill Interfaces and Deterministic Skills

- Goal: Add Skill interfaces and deterministic baseline Skills after the domain types are stable.
- Files:
  - `agent-testing/src/skills/*.ts`
  - Future tests under `agent-testing/tests/skills/`.
- Add/change:
  - Context building, acceptance extraction, test case generation, evidence normalization, severity classification, ops checklist, defect analysis, report generation, and regression suggestion interfaces.
- Test method:
  - Offline fixture tests with no network, database, Docker, or API keys.
- Do not:
  - Introduce a heavy multi-agent framework.
  - Execute real tests.
  - Require a live LLM.

### Phase 4: Evidence Normalization Utilities

- Goal: Normalize manual and tool-provided evidence.
- Files:
  - `agent-testing/src/evidence/*.ts`
  - `agent-testing/tests/evidence/*.test.ts`
  - `agent-testing/examples/evidence/`
- Add/change:
  - Evidence validation.
  - Result status normalization.
  - Attachment/reference metadata.
- Test method:
  - Offline tests for pass/fail/blocked/inconclusive normalization.
- Do not:
  - Upload attachments.
  - Read production logs automatically.
  - Claim verification without evidence.

### Phase 5: Severity Classifier

- Goal: Add deterministic severity rules with optional Agent explanation.
- Files:
  - `agent-testing/src/severity/*.ts`
  - `agent-testing/tests/severity/*.test.ts`
- Add/change:
  - P0/P1/P2/P3 classification rules.
  - Unknown/insufficient evidence handling.
  - Regression recommendation contract.
- Test method:
  - Offline tests for security/data-loss/blocking/workaround cases.
- Do not:
  - Let LLM override hard severity rules without evidence.
  - Auto-create issues.

### Phase 6: Ops Checklist Generator

- Goal: Generate static operations checklists from project deployment files.
- Files:
  - `agent-testing/src/ops/*.ts`
  - `agent-testing/tests/ops/*.test.ts`
- Add/change:
  - Checks for Docker, Nginx, env, secrets, backup, restore, logs, network exposure, authentication warning.
- Test method:
  - Fixture-based tests using copied sample config snippets.
- Do not:
  - Connect to real servers.
  - Modify deployment config.
  - Require Docker to be running.

### Phase 7: Markdown Report Generator

- Goal: Generate a structured Markdown system test report from cases and evidence.
- Files:
  - `agent-testing/src/report/*.ts`
  - `agent-testing/tests/report/*.test.ts`
  - `agent-testing/examples/reports/`
- Add/change:
  - Report template.
  - Unknowns and exclusions section.
  - Release recommendation rules.
- Test method:
  - Snapshot-like offline tests or string-structure tests.
- Do not:
  - Claim all tests passed when cases are not run.
  - Hide inconclusive evidence.

### Phase 8: MCP Adapter Contracts

- Goal: Define adapter interfaces and safe invocation records for future MCP tools.
- Files:
  - `agent-testing/src/mcp/*.ts`
  - `agent-testing/tests/mcp/*.test.ts`
- Add/change:
  - Permission levels.
  - Side effect levels.
  - Tool failure classification.
  - Evidence conversion.
- Test method:
  - Mock adapter tests.
- Do not:
  - Connect real MCP servers.
  - Execute destructive commands.
  - Access production.

### Phase 9: Test Lead Agent Orchestration

- Goal: Add a lightweight orchestrator after contracts and utilities are stable.
- Files:
  - `agent-testing/src/orchestrator/testLeadAgent.ts`
  - `agent-testing/tests/orchestrator/*.test.ts`
- Add/change:
  - Test Lead Agent orchestration.
  - Optional persistence through `agent_runs`.
  - Optional bridge points for future UI/API integration.
- Test method:
  - Offline service tests with mocked LLM/evidence.
  - Build check.
- Do not:
  - Mix into `/agents` until the module is stable.
  - Require a live database in default tests.

### Phase 10: UI/API Integration

- Goal: Add optional main-app API/UI integration after isolated contracts and offline tests are stable.
- Files:
  - Future `src/app/api/agent-testing/route.ts`
  - Future `src/app/agent-testing/page.tsx`
  - Future repository/persistence files only after a storage decision.
- Add/change:
  - UI for uploading context, entering evidence, and viewing generated reports.
  - API for deterministic report workflows.
- Test method:
  - Build check, service/API tests, and browser checks if UI is added.
- Do not:
  - Mix test cases, evidence, or defects into the existing `Card` domain.
  - Require LLM/API keys for basic startup.

## 10. Risks and Non-goals

### 10.1 Risks

- Agent output can look authoritative even when no test was actually run.
- LLMs may infer behavior that is not present in the code or environment.
- Release recommendations can become unsafe if not tied to evidence.
- Ops checks can be wrong if static files differ from the live server.
- Multi-agent workflows can add complexity before the domain model is stable.
- Public deployment is risky until authentication and access control are addressed.
- The current project has limited automated testing, so generated reports may initially depend heavily on manual evidence.

### 10.2 Non-goals

- Agents must not claim that system testing passed without evidence.
- Agents must not decide production release readiness only through conversation.
- The first phase must not connect to a real production environment.
- The first phase must not introduce external service dependencies.
- The first phase must not require real LLM providers, network access, database, Docker, or API keys.
- The first phase must not break default local/offline operation.
- The test-agent domain should not replace the existing interview-card domain.
- The test-agent domain should not overwrite existing AgentRun, Card, or LLM suggestion paths.

## 11. Recommended Next Codex Prompt

Implement Phase 1: create the Small System Test Agent Team domain contracts under `agent-testing/docs/`, including evidence model, severity rules, report template, and implementation boundaries. Do not add runtime code, database migrations, API routes, UI routes, or mandatory LLM calls.

## 12. Files and Sources Reviewed

Key files reviewed:

- `README.md`
- `agent.md`
- `package.json`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_PLAN.md`
- `docs/LOCAL_DEPLOYMENT.md`
- `docs/SERVER_DEPLOYMENT.md`
- `Dockerfile`
- `docker-compose.yml`
- `.gitignore`
- `supabase/schema.sql`
- `src/app/agents/page.tsx`
- `src/lib/agents/cardUnderstandingAgent.ts`
- `src/lib/agents/relatedQuestionAgent.ts`
- `src/lib/llm.ts`
- `src/lib/rag/retriever.ts`
- `src/lib/repositories/agentRunRepository.ts`
- `src/lib/services/importService.ts`
- `src/lib/services/reviewService.ts`
- `scripts/test-extraction.ts`

Files or directories checked but not found:

- `AGENTS.md` at repository root. A similar `agent.md` file exists.
- `docs/agent/`
- `docs/decisions/`
- `docs/deploy/`
- `docs/quality/`
- `docs/exec-plans/`
- `src/main/`
- `src/test/`
- `build.gradle`
- `pom.xml`

## 13. Main Conclusions

- The proposed direction is a good architectural fit if isolated under a new testing-agent module.
- The strongest existing reuse points are LLM abstraction, RAG context building, import/extraction utilities, agent run tracing, and deployment documentation.
- The weakest baseline is testing and quality automation: no formal test runner, lint script, CI, or system test model was found.
- The new system should enter through a documentation/domain-model layer first, not through immediate UI/API/runtime integration.
- Agent reasoning should produce plans, analysis, and reports, while execution status must come from evidence.
- `agent-testing/docs/` is the right first home for all testing-agent design documents.
- MVP should be offline-capable and should not require Docker, database, network, or an API key.

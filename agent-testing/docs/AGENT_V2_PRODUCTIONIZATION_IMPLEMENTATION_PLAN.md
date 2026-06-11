# Agent Testing V2 Productionization Implementation Plan

## Context

V2 offline multi-agent runtime (M0-M6) is complete: 6 Agents, SkillRouter, EvidenceCollector, Blackboard, MessageBus, Fake Planner, MCP Router, UI View Model. Everything is in-memory.

This plan converts the offline prototype into a real, database-backed, API-served, accessible system via 10 productionization tracks.

**Core principle:** `Auth before Route. Persistence before Audit Dashboard. Approval + Audit before Real MCP. Approval + Audit + Sandbox before Real Execution.`

---

## Track 0: Productionization Preflight

### Goal
Stabilize the offline codebase before any productionization work begins.

### Scope
- Fix existing TypeScript errors in `agent-testing/test-agent-notes.ts`.
- Confirm `tsc --noEmit` passes for all V2 runtime files.
- Confirm `runSmallNoteMultiAgentRuntimeDemo()` still works.
- Confirm UI V2 mapper smoke test passes.
- Tag offline version as `agent-testing-v2-offline-multi-agent`.
- Freeze V2 offline behavior before Track A–G.

### Acceptance
- [ ] `tsc --noEmit --pretty false` passes, or known legacy files are excluded with explicit rationale.
- [ ] `trial-run-agent-notes.ts` runs without errors.
- [ ] V2 offline behavior unchanged after fixes.

---

## Track A: Route Integration + Admin UI

### Goal
Make agent-testing accessible from `/admin/agent-testing` with real API routes.

### Prerequisites
- Track C (Auth) — routes must not be public.

### API Routes (11 endpoints)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agent-testing/sessions` | List sessions |
| `POST` | `/api/agent-testing/sessions` | Create session with requirements/evidence |
| `GET` | `/api/agent-testing/sessions/[id]` | Session detail + blackboard summary |
| `POST` | `/api/agent-testing/sessions/[id]/tasks` | Add task |
| `GET` | `/api/agent-testing/sessions/[id]/tasks` | List tasks |
| `POST` | `/api/agent-testing/sessions/[id]/round` | Run one agent execution round |
| `GET` | `/api/agent-testing/sessions/[id]/messages` | Message timeline |
| `GET` | `/api/agent-testing/sessions/[id]/evidence-gaps` | Evidence gaps |
| `GET` | `/api/agent-testing/sessions/[id]/report` | Generated report |
| `POST` | `/api/agent-testing/sessions/[id]/blackboard` | Write to blackboard |
| `POST` | `/api/agent-testing/sessions/[id]/transition` | Transition status |

### New Files

```
src/app/api/agent-testing/
  sessions/route.ts                    # GET list + POST create
  sessions/[id]/route.ts              # GET detail
  sessions/[id]/tasks/route.ts        # GET list + POST create
  sessions/[id]/round/route.ts        # POST run round
  sessions/[id]/messages/route.ts     # GET list
  sessions/[id]/evidence-gaps/route.ts # GET list
  sessions/[id]/report/route.ts       # GET report
  sessions/[id]/blackboard/route.ts   # POST write
  sessions/[id]/transition/route.ts   # POST transition
src/lib/services/agentTestingService.ts  # Wraps V2 runtime + DB
src/app/admin/
  login/page.tsx                      # Login form
  agent-testing/page.tsx              # Session list + create
  agent-testing/[id]/page.tsx         # Detail dashboard
```

### Pattern
Follows existing `NextRequest → Service → NextResponse` convention with `{ data }` wrapper.

---

## Track B: Database-backed Persistence

### Goal
Replace in-memory state with PostgreSQL tables.

### DB Approach
Use Supabase SQL migrations + `db.from(TABLE)` repository pattern — consistent with existing project infrastructure. **Do not introduce Prisma or Drizzle.** The project already uses Supabase client + raw SQL in `supabase/schema.sql`.

### 7 New Tables (add to `supabase/schema.sql`)

```sql
agent_testing_sessions      -- id PK, run_id, target_system_name, status, agents JSONB, limitations JSONB, timestamps
agent_testing_tasks         -- id PK, session_id FK, assigned_to, task_type, status, priority, input_refs JSONB, ...
agent_testing_messages      -- id PK, session_id FK, from_agent, to_agent, message_type, summary, payload_ref JSONB, ...
agent_testing_blackboards   -- session_id PK FK, data JSONB (entire blackboard as one document)
agent_testing_evidence_gaps -- id PK, session_id FK, test_case_id, reason, status, summary, ...
agent_testing_approval_requests -- id PK, session_id FK, status, risk_level, reason, ...
agent_testing_audit_events  -- id PK, session_id FK, event_type, actor JSONB, outcome, summary, ...
```

### 7 Repositories

```
src/lib/repositories/
  agentTestingSessionRepository.ts
  agentTestingTaskRepository.ts
  agentTestingMessageRepository.ts
  agentTestingBlackboardRepository.ts
  agentTestingEvidenceGapRepository.ts
  agentTestingApprovalRepository.ts
  agentTestingAuditRepository.ts
```

Pattern: `const TABLE = 'agent_testing_*'` + `db.from(TABLE).select()` → `{ data, error }`

### Persistence Service

```
src/lib/services/agentTestingPersistenceService.ts
  saveSession(session) → writes session + tasks + messages + blackboard
  loadSession(sessionId) → reads from DB, reconstructs AgentSession
  listSessions() → queries sessions table
  deleteSession(sessionId) → cascade delete
```

### Data Classification

| Data Type | Store Raw? | Store Summary? | Redaction Required |
|---|---:|---:|---:|
| Agent reasoning | no | yes | yes |
| Raw evidence | limited | yes | yes |
| Logs | no by default | yes | yes |
| Screenshots | opt-in | metadata yes | yes |
| Secrets/tokens/passwords | never | never | mandatory |
| Approval decisions | yes | yes | actor/time required |
| MCP outputs | no raw by default | yes | yes |

**Rule:** Audit log must never store raw secrets, full logs, full HTTP responses, or raw database rows.

---

## Track C: Authenticated UI and Approval Runtime

### Goal
Add real authentication, permission control, and human approval workflow.

### Prerequisites
- Track 0 (codebase stable).

### Auth
- Password stored in `app_settings` key `admin_password` (hashed).
- `/admin/login` page with simple form.
- Middleware checks cookie for `/admin/*` and `/api/agent-testing/*`.
- Two roles: `admin` (full CRUD + approve actions), `viewer` (read-only).

### Approval Runtime
- `/admin/agent-testing/approvals` — list pending approvals.
- Approve / Reject / Request More Evidence buttons.
- `POST /api/agent-testing/approvals/[id]/decide`.
- Audit event logged per decision.
- M5 flow already handles `pending_approval` — AgentRunner pauses until approved.

### Acceptance
- [ ] Unauthenticated users cannot access admin UI.
- [ ] Viewer cannot approve actions.
- [ ] Admin approval creates audit event.
- [ ] Rejected approval prevents execution.

---

## Track D: Real MCP Server Opt-in

### Goal
Connect real MCP tools under safety gates.

### Prerequisites
- Track C (Approval Runtime).
- Track E (Audit Persistence).

### Read-only first, in order
1. Filesystem MCP — read files within project root
2. Git MCP — `git log`, `git diff`, `git status`
3. Log MCP — tail application logs
4. HTTP API MCP — GET to test endpoints
5. Database MCP — read-only queries on test DB
6. Browser MCP — screenshot capture

### Per-adapter safety
- Opt-in flag (disabled by default, controlled by Feature Flags).
- Approval required per call.
- Environment restriction (test/dev only, never production).
- Path/query restriction.
- Timeout (30s).
- Output size limit (100KB).
- Output redaction before storage.
- Audit event per call.

### Acceptance
- [ ] MCP call without approval is blocked.
- [ ] MCP call writes audit event.
- [ ] MCP output is redacted.
- [ ] Production environment MCP is disabled.

---

## Track E: Audit Persistence and Observability Dashboard

### Goal
Persist audit events and build a real observability dashboard.

### Prerequisites
- Track B (Database Persistence).

### Audit
- Every `buildAuditEvent()` writes to `agent_testing_audit_events`.
- Immutable — INSERT only, no UPDATE.
- 90-day retention.
- Redaction applied before persistence per Data Classification rules.

### Dashboard (`/admin/agent-testing/observability`)
- Session completion rate, agent task distribution, evidence gap trends.
- Approval decision history, MCP request outcomes.
- Filter by date range.
- Export CSV.

---

## Track F: Controlled Execution Hardening

### Goal
Make controlled execution safe for real use.

### Prerequisites
- Track C (Approval Runtime).
- Track E (Audit Persistence).
- Sandbox environment.

### Command Allowlist
```
typecheck: ['tsc', '--noEmit']
lint: ['eslint', '--format=json']
test: ['npm', 'test']
build: ['npm', 'run', 'build']
git_status: ['git', 'status', '--porcelain']
git_diff: ['git', 'diff', '--stat']
```

### Safety Rules
- Command must match allowlisted category.
- Working directory restricted to project root.
- Network access disabled.
- 30-second timeout.
- Environment variables filtered (secrets removed).
- Output truncated at 100KB, ANSI stripped.
- Production execution forbidden.
- Pre-execution approval required.
- Post-execution audit event.

### Acceptance
- [ ] Dangerous command is rejected.
- [ ] Command runs only in restricted cwd.
- [ ] Timeout works.
- [ ] Network is disabled.
- [ ] Output is truncated and redacted.

---

## Track G: CI / Formal Test Suite

### Goal
Test the testing system itself.

### Prerequisites
- Track 0 (codebase stable).

### Framework: vitest

### Test Matrix (12 categories)

| Category | Tests |
|---|---|
| AgentRegistry | Profile validation, duplicate rejection |
| AgentSession | State transitions (valid + invalid) |
| TaskQueue | Priority ordering, lifecycle |
| Blackboard | Read/write/append, contract validation |
| MessageBus | Send/receive/filter |
| SkillRouter | Valid, refused (permission), blocked (missing input) |
| EvidenceCollector | 8 gap types, no-evidence-no-pass |
| ApprovalBridge | LOW/MEDIUM/HIGH/FORBIDDEN |
| MCP Router | Forbidden, pending, fake execution |
| Fake Planner | 5 rules, validator rejection |
| UI Mappers | 7 mappers produce correct shapes |
| Integration | Full demo produces expected output |

### CI: GitHub Actions
```yaml
name: Agent Testing CI
on: [push, pull_request]
jobs:
  test:
    steps:
      - checkout
      - npm ci
      - tsc --noEmit --strict
      - vitest run agent-testing/
```

---

## Track L: Real LLM Planner Opt-in

### Goal
Replace fake deterministic planner with a real LLM provider behind strict planner boundary.

### Prerequisites
- Track C (Approval Runtime).
- Track E (Audit Persistence).
- Planner output validator (already exists in M4).

### Scope
- Provider adapter (reuse existing `callLLM()` from `src/lib/llm.ts`).
- JSON-schema planner output.
- Model timeout (30s).
- Token/cost budget per session.
- Prompt redaction (no raw evidence, no secrets in prompt).
- Prompt injection detection.
- Planner audit logging.
- Fallback to fake planner on error/timeout/budget exceeded.

### Do NOT
- Let LLM directly call SkillRouter.
- Let LLM directly call MCP.
- Let LLM directly write blackboard.
- Let LLM directly approve actions.
- Treat LLM reasoning as evidence.

---

## Safety Gate Matrix

Every real capability must pass its safety gate before activation.

| Capability | Auth | Approval | Audit | Sandbox | Env Limit | Output Redaction |
|---|---:|---:|---:|---:|---:|---:|
| Admin UI | required | optional | required | n/a | required | required |
| Evidence Submit | required | optional | required | n/a | required | required |
| Read-only MCP | required | required | required | n/a | test-first | required |
| Controlled Command | required | required | required | required | test-only | required |
| Browser Automation | required | required | required | required | test-only | required |
| DB Read MCP | required | required | required | n/a | test-only | required |
| DB Write MCP | required | required | required | required | non-prod only | required |
| Real LLM Planner | required | required | required | n/a | required | required |

---

## Runtime Feature Flags

All dangerous capabilities must be gated behind explicit feature flags. Default: **all disabled.**

```
AGENT_TESTING_ENABLED=false                    # Master kill switch
AGENT_TESTING_REAL_MCP_ENABLED=false           # Real MCP (vs fake/dry-run)
AGENT_TESTING_CONTROLLED_EXECUTION_ENABLED=false # Real commands
AGENT_TESTING_REAL_LLM_ENABLED=false           # Real LLM planner
AGENT_TESTING_BROWSER_AUTOMATION_ENABLED=false  # Real browser
AGENT_TESTING_DB_MCP_ENABLED=false             # Real DB MCP
AGENT_TESTING_WRITE_ACTIONS_ENABLED=false       # Any write-capable action
```

**Kill switch behavior:**
- If `AGENT_TESTING_ENABLED=false`, all routes return `{ error: 'disabled' }` with 503.
- If real MCP flag is false, only fake/simulated MCP is allowed.
- If controlled execution flag is false, commands stay dry-run only.
- If real LLM flag is false, only fake planner is used.
- Flags are read from `app_settings` at request time (no restart needed).

---

## Execution Order

```
Week 0:  Track 0  — Preflight (fix TS errors, tag offline version)
Week 1:  Track G  — CI / Test Suite (safe, immediate value)
Week 2:  Track B0 — DB schema design + migration (no code yet)
Week 3-4: Track C — Auth + Approval Runtime
Week 5-6: Track B1 — DB repositories + persistence service
Week 7-8: Track A — Routes + Admin UI (now behind auth)
Week 9:   Track E — Audit Persistence + Observability Dashboard
Week 10+: Track D — Real MCP (read-only, one adapter at a time)
Week 11+: Track F — Controlled Execution Hardening
Week 12+: Track L — Real LLM Planner Opt-in
```

**Dependency chain:**
```
Track 0 → G (parallel)
Track 0 → B0 → C → B1 → A → E → D → F → L
            └──────────┘   └──────────┘   └──────────┘
            Auth first     Routes behind    High-risk last
```

---

## Key Design Decisions

1. **No ORM** — follow existing Supabase client + raw SQL in `supabase/schema.sql` pattern.
2. **JSONB for complex types** — consistent with existing `llm_suggestions.output_content`, `import_jobs.result_summary`.
3. **Service layer bridges V2 runtime ↔ DB** — V2 runtime functions stay pure/in-memory; service handles persistence.
4. **Simple password auth** — consistent with local-first design; no OAuth/OIDC needed.
5. **MCP opt-in per adapter** — no blanket enable; each tool requires explicit config + feature flag.
6. **Controlled execution uses allowlist** — not LLM-driven command selection; hard-coded allowlist is the safety boundary.
7. **All dangerous capabilities default OFF** — Feature Flags as kill switches.
8. **Auth before Route, Approval before MCP, Audit before Execution** — never skip the safety chain.

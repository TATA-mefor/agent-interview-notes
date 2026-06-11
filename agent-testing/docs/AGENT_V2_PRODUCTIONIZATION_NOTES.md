# Agent Testing V2 Productionization Notes

## 1. Why Productionization Is Separate

The current V2 multi-agent runtime (M0–M6) is an **offline deterministic prototype**. All execution is in-memory, fake, simulated, or draft. No real MCP, no real LLM, no real commands, no database, no persistence, no UI routes.

Productionization means making these capabilities **real** — connecting to live systems, persisting data, serving authenticated routes, and executing controlled actions. This is a fundamentally different risk profile from offline prototyping and should be treated as a separate track (or set of tracks), **not** as M7/M8 continuations of the offline roadmap.

**Core principle for all tracks:** Never connect a real capability before its safety boundary is in place. Approval must precede execution. Audit must precede side effects. Auth must precede access.

---

## 2. Track A: Real Route Integration

**What:** Replace the in-memory `agentTestingApiService` with real Next.js API routes.

**Prerequisites:** Auth (Track C).

**Scope:**
- `POST /api/agent-testing/runs` — create a testing session
- `GET /api/agent-testing/runs/:id` — get session status
- `POST /api/agent-testing/runs/:id/evidence` — submit evidence
- `GET /api/agent-testing/runs/:id/report` — get generated report
- `GET /api/agent-testing/runs/:id/observability` — get metrics

**Risks:** Exposing testing data without authentication. **Mitigation:** Add auth middleware before route integration.

---

## 3. Track B: Database-backed Persistence

**What:** Replace the in-memory `InMemoryAgentTestingStore` with PostgreSQL repository implementations.

**Prerequisites:** Database migration tooling (currently missing in the main project).

**Scope:**
- `agent_testing_runs` table — session metadata
- `agent_testing_evidence` table — evidence records
- `agent_testing_reports` table — generated reports
- `agent_testing_approval_requests` table — approval records
- Migrations for schema creation and evolution

**Risks:** Schema drift without migration management. **Mitigation:** Introduce Prisma or Drizzle before creating tables.

---

## 4. Track C: Authenticated UI and Approval Runtime

**What:** Add authentication to the agent-testing UI routes and implement real human approval flow.

**Prerequisites:** The main project currently has no authentication system. This must be built first.

**Scope:**
- Token-based or password-based auth middleware
- `/agent-testing` UI route behind auth
- Real approval decision UI (approve/reject/request_more_evidence)
- Approval decision persistence
- Audit log of all approval decisions

**Risks:** Exposing testing controls without auth is dangerous. **Mitigation:** Auth must be in place before any UI route or approval runtime goes live.

---

## 5. Track D: Real MCP Server Opt-in

**What:** Connect the read-only MCP pilot to a real MCP server, and add write-capable adapters under approval control.

**Prerequisites:** Approval runtime (Track C), Audit persistence (Track E).

**Recommended order:**
1. Filesystem MCP (read-only) — safest first step
2. Git MCP (read-only)
3. Log monitoring MCP (read-only)
4. HTTP API MCP (read-only, test environment only)
5. Database MCP (read-only, test environment only)
6. Browser automation (screenshot capture, read-only)
7. Write-capable adapters (only after all safety gates are verified)

**Risks:** MCP tools can read sensitive data or have side effects. **Mitigation:** Every MCP call must go through approval gate. Read-only first. Test environment only. Production MCP is the last thing to enable.

**Do NOT:**
- Connect MCP to production environments before all safety gates are verified.
- Allow MCP write operations without explicit per-operation approval.
- Allow Agent to directly choose MCP tools — always route through McpActionRouter.

---

## 6. Track E: Audit Persistence and Observability Dashboard

**What:** Persist audit events to database and build a real observability dashboard.

**Prerequisites:** Database persistence (Track B).

**Scope:**
- `agent_testing_audit_events` table
- Audit event persistence on every skill invocation, MCP request, approval decision
- Real observability dashboard (not props-only component shell)
- Metrics aggregation queries
- Time-range filtering and export

**Risks:** Audit logs may contain sensitive data. **Mitigation:** Redact sensitive fields before persistence. Do not store raw evidence in audit logs. Apply `AuditPrivacyLevel` classification.

---

## 7. Track F: Controlled Execution Hardening

**What:** Graduate controlled execution from dry-run/simulated to real execution with safety boundaries.

**Prerequisites:** Approval runtime (Track C), Audit persistence (Track E).

**Scope:**
- Real command execution sandbox (Docker container or restricted shell)
- Real API call capability (test environment only)
- Real browser automation (headed or headless, test environment only)
- Execution timeout and resource limits
- Output capture and redaction
- Automatic audit event generation on every execution

**Risks:** Real execution can cause damage. **Mitigation:**
- Never execute in production.
- Always require human approval.
- Always run in a sandboxed environment.
- Always capture and audit full execution traces.
- Set strict timeouts and resource limits.

**Do NOT:**
- Allow Agent to directly execute commands.
- Skip approval for any execution, even "safe" commands.
- Execute in production under any circumstances.

---

## 8. Track G: CI / Formal Test Suite

**What:** Add automated tests for the agent-testing module and integrate with CI.

**Prerequisites:** None (can start immediately).

**Scope:**
- Unit tests for all deterministic skills
- Unit tests for SkillRouter validation
- Unit tests for evidence collector
- Unit tests for approval policy
- Integration tests for multi-agent session lifecycle
- CI pipeline (GitHub Actions or similar)
- TypeScript strict mode in CI

**Risks:** Minimal — this track is safe to start now, even while other tracks are planned.

---

## 9. Recommended Order

```
Phase A (Safe, can start now):
  Track G — CI / Formal Test Suite
  Track B — Database-backed Persistence (schema design only)

Phase B (Requires auth foundation):
  Track C — Authentication (build auth system for main project first)
  Track A — Real Route Integration (depends on auth)

Phase C (Requires approval + audit):
  Track E — Audit Persistence and Observability Dashboard
  Track D — Real MCP Server Opt-in (read-only first)
  Track F — Controlled Execution Hardening (last, highest risk)
```

**The most important constraint:** Tracks D and F must not start before Tracks C and E are solid. Real MCP and real execution without approval and audit is dangerous. Fake planner output must never be treated as a reason to skip approval.

---

## Summary

| Track | Risk Level | Prerequisites | Can Start |
|---|---|---|---|
| G — CI / Test Suite | Low | None | Now |
| B — DB Persistence | Low | Migration tooling | After migration tool added |
| C — Auth + Approval UI | High | Main project auth | After auth foundation |
| A — Route Integration | Medium | Auth (Track C) | After Track C |
| E — Audit Persistence | Medium | DB (Track B) | After Track B |
| D — Real MCP | High | Approval + Audit | After Tracks C + E |
| F — Real Execution | Critical | Approval + Audit + Sandbox | After Tracks C + E + sandbox |

**Do NOT productionize these tracks in parallel without safety gates.** Each track's safety boundary must be verified before the next riskier track begins.

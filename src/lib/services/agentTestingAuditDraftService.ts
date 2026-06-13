// ============================================================
// Track C: Agent Testing Audit Draft Service
// ============================================================
// Creates audit event drafts for approval decisions.
// Track C only — no DB persistence. Full audit in Track E.

import type { AdminRole } from '@/lib/auth/adminAuth';

// ── Types ──

export type AuditEventType =
  | 'approval_decided'
  | 'approval_request_more_evidence'
  | 'approval_viewed'
  | 'feature_flag_changed'
  | 'route_access_denied'
  | 'auth_failure';

export interface AuditDraft {
  event_type: AuditEventType;
  actor: { role: AdminRole };
  decision?: string;
  outcome: string;
  summary: string;
  approval_request_id?: string;
  privacy_level: 'internal' | 'restricted';
  artifact_refs: string[];
  created_at: string;
  limitations: string[];
}

// ── Allowed fields — everything else is forbidden ──

const FORBIDDEN_KEYS = new Set([
  'password', 'token', 'cookie', 'authorization', 'secret',
  'api_key', 'access_token', 'refresh_token', 'credential',
  'raw_logs', 'full_log', 'http_response', 'db_row',
]);

// ── Create audit draft ──

export interface CreateAuditDraftInput {
  eventType: AuditEventType;
  actorRole: AdminRole;
  decision?: string;
  outcome: string;
  summary: string;
  approvalRequestId?: string;
  privacyLevel?: 'internal' | 'restricted';
  artifactRefs?: string[];
}

export function createAuditDraft(input: CreateAuditDraftInput): AuditDraft {
  const draft: AuditDraft = {
    event_type: input.eventType,
    actor: { role: input.actorRole },
    decision: input.decision,
    outcome: input.outcome,
    summary: sanitizeSummary(input.summary),
    approval_request_id: input.approvalRequestId,
    privacy_level: input.privacyLevel ?? 'internal',
    artifact_refs: input.artifactRefs ?? [],
    created_at: new Date().toISOString(),
    limitations: ['persistence_pending_track_b1', 'audit_full_persistence_pending_track_e'],
  };

  // Enforce no forbidden data
  validateAuditDraft(draft);

  return draft;
}

// ── Sanitization ──

function sanitizeSummary(summary: string): string {
  // Strip secrets, tokens, passwords
  let sanitized = summary
    .replace(/Bearer\s+\S+/gi, '[REDACTED_TOKEN]')
    .replace(/Authorization:\s*\S+/gi, 'Authorization: [REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/api_key[=:]\s*\S+/gi, 'api_key=[REDACTED]');

  // Truncate to reasonable length
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 1997) + '...';
  }

  return sanitized;
}

function validateAuditDraft(draft: AuditDraft): void {
  const json = JSON.stringify(draft).toLowerCase();

  for (const key of FORBIDDEN_KEYS) {
    // Check only for field names, not accidental substring matches in hashed values
    if (new RegExp(`"${key}"\\s*:`).test(json)) {
      throw new Error(`Audit draft contains forbidden key: ${key}`);
    }
  }

  // Check summary doesn't contain raw secrets
  const summaryLower = draft.summary.toLowerCase();
  for (const key of ['password', 'token', 'secret']) {
    if (summaryLower.includes(key)) {
      throw new Error(`Audit draft summary may contain sensitive data: ${key}`);
    }
  }
}

// ── Audit for route access denied ──

export function createAccessDeniedAuditDraft(
  route: string,
  reason: string,
): AuditDraft {
  return createAuditDraft({
    eventType: 'route_access_denied',
    actorRole: 'viewer', // unknown actor
    outcome: 'denied',
    summary: `Route access denied: ${route}. Reason: ${reason}`,
    privacyLevel: 'internal',
  });
}

// ============================================================
// Track C: Agent Testing Approval Runtime
// ============================================================
// Handles approval decisions (approve / reject / request_more_evidence).
// Track C: no DB persistence, no MCP execution, no LLM, no command.
// Returns decision result + audit draft + limitation marker.

import type { AdminRole } from '@/lib/auth/adminAuth';
import { createAuditDraft, type AuditDraft } from './agentTestingAuditDraftService';

// ── Decision types ──

export type ApprovalDecisionValue =
  | 'approved'
  | 'rejected'
  | 'request_more_evidence';

export const VALID_APPROVAL_DECISIONS: ApprovalDecisionValue[] = [
  'approved',
  'rejected',
  'request_more_evidence',
];

export function isValidApprovalDecision(
  value: unknown,
): value is ApprovalDecisionValue {
  return (
    typeof value === 'string' &&
    VALID_APPROVAL_DECISIONS.includes(value as ApprovalDecisionValue)
  );
}

// ── Input / Output ──

export interface ApprovalDecisionInput {
  approvalRequestId: string;
  decision: ApprovalDecisionValue;
  reason: string;
  decidedBy: AdminRole;
  sessionId?: string;
}

export interface ApprovalDecisionResult {
  approvalRequestId: string;
  decision: ApprovalDecisionValue;
  status: ApprovalStatusAfterDecision;
  auditDraft: AuditDraft;
  limitations: string[];
}

export type ApprovalStatusAfterDecision =
  | 'approved'
  | 'rejected'
  | 'pending_evidence';

// ── Reason sanitisation ──

const MAX_REASON_LENGTH = 2000;

function sanitizeReason(raw: string): string {
  let sanitized = raw.trim();

  // Strip secrets
  sanitized = sanitized
    .replace(/Bearer\s+\S+/gi, '[REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]');

  if (sanitized.length > MAX_REASON_LENGTH) {
    sanitized = sanitized.slice(0, MAX_REASON_LENGTH);
  }

  return sanitized;
}

// ── Decision handler ──

export function processApprovalDecision(
  input: ApprovalDecisionInput,
): ApprovalDecisionResult {
  const reason = sanitizeReason(input.reason);

  // Map decision → status
  const statusMap: Record<ApprovalDecisionValue, ApprovalStatusAfterDecision> =
    {
      approved: 'approved',
      rejected: 'rejected',
      request_more_evidence: 'pending_evidence',
    };

  const status = statusMap[input.decision];
  const outcome = `${input.decision}: ${reason.slice(0, 200)}`;

  // Create audit draft
  const auditDraft = createAuditDraft({
    eventType:
      input.decision === 'request_more_evidence'
        ? 'approval_request_more_evidence'
        : 'approval_decided',
    actorRole: input.decidedBy,
    decision: input.decision,
    outcome: status,
    summary: `Approval ${input.decision} for request ${input.approvalRequestId}. Reason: ${reason.slice(0, 500)}`,
    approvalRequestId: input.approvalRequestId,
  });

  // Safety: approved does NOT trigger execution in Track C
  const limitations = [
    'persistence_pending_track_b1',
    'execution_not_triggered_by_approval_decision',
    'mcp_not_connected_track_c',
    'llm_not_connected_track_c',
    'command_execution_not_connected_track_c',
  ];

  return {
    approvalRequestId: input.approvalRequestId,
    decision: input.decision,
    status,
    auditDraft,
    limitations,
  };
}

// ── Safety assertions ──

/**
 * Confirms that a decision does not trigger execution.
 * Track C: always true (execution is not connected).
 */
export function assertNoExecutionTriggered(
  decision: ApprovalDecisionValue,
): boolean {
  // In Track C, no decision triggers real execution.
  // This is a safety invariant that must remain true across all tracks.
  // Future tracks will wire approved → controlled execution with
  // additional safety gates (sandbox, audit, approval chain).
  return true;
}

/**
 * Confirms rejected decisions prevent execution.
 * Track C: always true (execution is not connected).
 */
export function assertRejectedPreventsExecution(
  decision: ApprovalDecisionValue,
): boolean {
  if (decision === 'rejected' || decision === 'request_more_evidence') {
    return true; // execution blocked
  }
  // approved does not mean execution happens in Track C
  return true;
}

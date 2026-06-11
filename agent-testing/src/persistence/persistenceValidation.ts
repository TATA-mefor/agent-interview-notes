import type {
  MarkdownString,
} from '../types';
import type {
  AgentTestingPersistenceSnapshot,
} from './persistenceSnapshot';
import type {
  AgentTestingPersistenceRecord,
} from './persistenceRecords';
import type {
  PersistenceRelationship,
} from './persistenceRelationships';
import {
  classifyPersistenceSensitivity,
} from './persistenceRedaction';

export type PersistenceValidationIssueSeverity =
  | 'error'
  | 'warning';

export interface PersistenceValidationIssue {
  severity: PersistenceValidationIssueSeverity;
  code: MarkdownString;
  message: MarkdownString;
  recordId?: MarkdownString;
  relationshipId?: MarkdownString;
}

export interface PersistenceValidationResult {
  valid: boolean;
  issues: PersistenceValidationIssue[];
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

function issue(params: PersistenceValidationIssue): PersistenceValidationIssue {
  return params;
}

function hasSecretLikeSummary(record: AgentTestingPersistenceRecord): boolean {
  const values = Object.values(record)
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return classifyPersistenceSensitivity(values) === 'secret_redacted' &&
    record.dataBoundary !== 'redacted_content' &&
    record.sensitivity !== 'secret_redacted';
}

function validateRecord(
  record: AgentTestingPersistenceRecord
): PersistenceValidationIssue[] {
  const issues: PersistenceValidationIssue[] = [];

  if (!record.id) {
    issues.push(issue({
      severity: 'error',
      code: 'record_missing_id',
      message: 'Persistence record is missing id.',
      recordId: record.id,
    }));
  }

  if (!record.runId) {
    issues.push(issue({
      severity: 'error',
      code: 'record_missing_run_id',
      message: 'Persistence record is missing runId.',
      recordId: record.id,
    }));
  }

  if (!record.sensitivity) {
    issues.push(issue({
      severity: 'error',
      code: 'record_missing_sensitivity',
      message: 'Persistence record is missing sensitivity.',
      recordId: record.id,
    }));
  }

  if (!record.dataBoundary) {
    issues.push(issue({
      severity: 'error',
      code: 'record_missing_data_boundary',
      message: 'Persistence record is missing dataBoundary.',
      recordId: record.id,
    }));
  }

  if (record.dataBoundary === 'forbidden_raw_secret') {
    issues.push(issue({
      severity: 'error',
      code: 'forbidden_raw_secret_boundary',
      message: 'Persistence records must not use forbidden_raw_secret as a persisted data boundary.',
      recordId: record.id,
    }));
  }

  if (hasSecretLikeSummary(record)) {
    issues.push(issue({
      severity: 'warning',
      code: 'secret_like_text_requires_redaction_boundary',
      message: 'Record contains secret-like text and should be marked secret_redacted/redacted_content.',
      recordId: record.id,
    }));
  }

  if (record.kind === 'evidence' && !record.evidenceSummary) {
    issues.push(issue({
      severity: 'error',
      code: 'evidence_missing_summary',
      message: 'Evidence record must store a summary instead of raw evidence content.',
      recordId: record.id,
    }));
  }

  if (record.kind === 'evidence' && record.dataBoundary === 'forbidden_raw_secret') {
    issues.push(issue({
      severity: 'error',
      code: 'evidence_raw_secret_forbidden',
      message: 'Evidence record cannot persist raw secret evidence.',
      recordId: record.id,
    }));
  }

  if (record.kind === 'controlled_execution_result') {
    if (!record.simulated) {
      issues.push(issue({
        severity: 'error',
        code: 'controlled_execution_result_not_simulated',
        message: 'Phase 19 persistence contracts must not treat controlled execution result as live execution evidence.',
        recordId: record.id,
      }));
    }

    if (!record.limitations.join(' ').toLowerCase().includes('not persisted as real execution evidence')) {
      issues.push(issue({
        severity: 'warning',
        code: 'controlled_execution_result_missing_evidence_boundary',
        message: 'Controlled execution result should explicitly state it is not real execution evidence.',
        recordId: record.id,
      }));
    }
  }

  if (record.kind === 'agent_memory' && record.dataBoundary !== 'summary_only') {
    issues.push(issue({
      severity: 'error',
      code: 'agent_memory_not_summary_only',
      message: 'Agent memory persistence must remain summary-only.',
      recordId: record.id,
    }));
  }

  if (record.kind === 'agent_reflection') {
    issues.push(issue({
      severity: 'warning',
      code: 'agent_reflection_not_evidence',
      message: 'Agent reflection may reference evidence but must not be treated as execution evidence.',
      recordId: record.id,
    }));
  }

  return issues;
}

function validateRelationship(
  relationship: PersistenceRelationship,
  recordIds: Set<MarkdownString>,
  recordsById: Map<MarkdownString, AgentTestingPersistenceRecord>
): PersistenceValidationIssue[] {
  const issues: PersistenceValidationIssue[] = [];

  if (!recordIds.has(relationship.fromRecordId)) {
    issues.push(issue({
      severity: 'error',
      code: 'relationship_missing_from_record',
      message: 'Relationship fromRecordId does not point to an existing record.',
      relationshipId: relationship.id,
    }));
  }

  if (!recordIds.has(relationship.toRecordId)) {
    issues.push(issue({
      severity: 'error',
      code: 'relationship_missing_to_record',
      message: 'Relationship toRecordId does not point to an existing record.',
      relationshipId: relationship.id,
    }));
  }

  const fromRecord = recordsById.get(relationship.fromRecordId);
  const toRecord = recordsById.get(relationship.toRecordId);
  if (
    fromRecord?.kind === 'agent_reflection' &&
    toRecord?.kind === 'evidence' &&
    ['supports', 'produced_by'].includes(relationship.relationshipType)
  ) {
    issues.push(issue({
      severity: 'error',
      code: 'reflection_cannot_support_evidence',
      message: 'Agent reflection cannot support or produce execution evidence.',
      relationshipId: relationship.id,
    }));
  }

  return issues;
}

function validateTraceRequirements(
  snapshot: AgentTestingPersistenceSnapshot
): PersistenceValidationIssue[] {
  const issues: PersistenceValidationIssue[] = [];
  const relationshipPairs = new Set(snapshot.relationships.map((relationship) =>
    `${relationship.fromRecordId}:${relationship.relationshipType}:${relationship.toRecordId}`
  ));
  const hasRelationshipFrom = (recordId: MarkdownString, types: MarkdownString[]) =>
    snapshot.relationships.some((relationship) =>
      relationship.fromRecordId === recordId && types.includes(relationship.relationshipType)
    );
  const hasRelationshipTo = (recordId: MarkdownString, types: MarkdownString[]) =>
    snapshot.relationships.some((relationship) =>
      relationship.toRecordId === recordId && types.includes(relationship.relationshipType)
    );

  for (const record of snapshot.records) {
    if (record.kind === 'report' && !hasRelationshipFrom(record.id, ['reports_on', 'summarizes', 'references'])) {
      issues.push(issue({
        severity: 'warning',
        code: 'report_missing_trace_relationship',
        message: 'Report record should trace to evidence, defects, or release recommendation records.',
        recordId: record.id,
      }));
    }

    if (record.kind === 'approval_request' && !hasRelationshipFrom(record.id, ['audited_by']) && !hasRelationshipTo(record.id, ['requires_approval'])) {
      issues.push(issue({
        severity: 'warning',
        code: 'approval_request_missing_audit_relationship',
        message: 'Approval request should be traceable to an audit event.',
        recordId: record.id,
      }));
    }

    if (record.kind === 'release_recommendation' && record.relatedEvidenceIds.length > 0) {
      const missing = record.relatedEvidenceIds.filter((evidenceId) =>
        !relationshipPairs.has(`${record.id}:derived_from:${evidenceId}`) &&
        !relationshipPairs.has(`${record.id}:supports:${evidenceId}`) &&
        !relationshipPairs.has(`${record.id}:references:${evidenceId}`)
      );

      if (missing.length > 0) {
        issues.push(issue({
          severity: 'warning',
          code: 'release_recommendation_missing_evidence_relationship',
          message: `Release recommendation references evidence without explicit relationship: ${missing.join(', ')}.`,
          recordId: record.id,
        }));
      }
    }
  }

  return issues;
}

export function validatePersistenceSnapshot(
  snapshot: AgentTestingPersistenceSnapshot
): PersistenceValidationResult {
  const recordsById = new Map(snapshot.records.map((record) => [record.id, record]));
  const recordIds = new Set(recordsById.keys());
  const issues = [
    ...snapshot.records.flatMap(validateRecord),
    ...snapshot.relationships.flatMap((relationship) =>
      validateRelationship(relationship, recordIds, recordsById)
    ),
    ...validateTraceRequirements(snapshot),
  ];
  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = [
    ...snapshot.warnings,
    ...issues.filter((item) => item.severity === 'warning').map((item) => item.message),
  ];

  return {
    valid: errors.length === 0,
    issues,
    warnings: Array.from(new Set(warnings)),
    limitations: [
      ...snapshot.limitations,
      'Persistence validation is deterministic metadata validation only; it does not connect to storage or prove persistence success.',
      'Validation checks summary/ref/id boundaries and trace relationships but cannot inspect external referenced artifacts.',
    ],
  };
}

import type {
  MarkdownString,
} from '../types';
import type {
  PersistenceRecordKind,
} from './persistenceTypes';
import type {
  AgentTestingPersistenceRecord,
} from './persistenceRecords';
import {
  summarizeForPersistence,
} from './persistenceRedaction';

export type PersistenceRelationshipType =
  | 'produced_by'
  | 'consumes'
  | 'supports'
  | 'blocks'
  | 'requires_approval'
  | 'approved_by'
  | 'rejected_by'
  | 'audited_by'
  | 'derived_from'
  | 'references'
  | 'summarizes'
  | 'reports_on';

export interface PersistenceRelationship {
  id: MarkdownString;
  runId: MarkdownString;
  fromRecordId: MarkdownString;
  fromKind: PersistenceRecordKind;
  toRecordId: MarkdownString;
  toKind: PersistenceRecordKind;
  relationshipType: PersistenceRelationshipType;
  summary: MarkdownString;
  limitations: MarkdownString[];
}

export interface PersistenceRelationshipEndpoint {
  id: MarkdownString;
  kind: PersistenceRecordKind;
}

export interface CreatePersistenceRelationshipInput {
  runId: MarkdownString;
  from: PersistenceRelationshipEndpoint;
  to: PersistenceRelationshipEndpoint;
  relationshipType: PersistenceRelationshipType;
  summary?: MarkdownString;
  limitations?: MarkdownString[];
}

function sanitizeIdPart(value: MarkdownString): MarkdownString {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'unknown';
}

export function createPersistenceRelationship(
  input: CreatePersistenceRelationshipInput
): PersistenceRelationship {
  const id = [
    'rel',
    input.runId,
    input.from.id,
    input.relationshipType,
    input.to.id,
  ].map(sanitizeIdPart).join('-');

  return {
    id,
    runId: input.runId,
    fromRecordId: input.from.id,
    fromKind: input.from.kind,
    toRecordId: input.to.id,
    toKind: input.to.kind,
    relationshipType: input.relationshipType,
    summary: summarizeForPersistence(input.summary ?? `${input.from.kind} ${input.relationshipType} ${input.to.kind}`),
    limitations: [
      ...(input.limitations ?? []),
      'Persistence relationship is an in-memory trace contract only; it was not written to storage.',
    ],
  };
}

function endpoint(record: AgentTestingPersistenceRecord): PersistenceRelationshipEndpoint {
  return {
    id: record.id,
    kind: record.kind,
  };
}

export function buildEvidenceTraceRelationships(params: {
  runId: MarkdownString;
  evidenceRecords: AgentTestingPersistenceRecord[];
  derivedRecords: AgentTestingPersistenceRecord[];
}): PersistenceRelationship[] {
  return params.derivedRecords.flatMap((record) =>
    params.evidenceRecords
      .filter((evidence) => evidence.kind === 'evidence')
      .map((evidence) => createPersistenceRelationship({
        runId: params.runId,
        from: endpoint(record),
        to: endpoint(evidence),
        relationshipType: 'derived_from',
        summary: `${record.kind} is derived from evidence ${evidence.id}.`,
      }))
  );
}

export function buildApprovalAuditRelationships(params: {
  runId: MarkdownString;
  approvalRecords: AgentTestingPersistenceRecord[];
  auditRecords: AgentTestingPersistenceRecord[];
}): PersistenceRelationship[] {
  return params.approvalRecords.flatMap((approval) =>
    params.auditRecords
      .filter((audit) => audit.kind === 'audit_event')
      .map((audit) => createPersistenceRelationship({
        runId: params.runId,
        from: endpoint(approval),
        to: endpoint(audit),
        relationshipType: 'audited_by',
        summary: `${approval.kind} is traceable through audit event ${audit.id}.`,
      }))
  );
}

export function buildReportTraceRelationships(params: {
  runId: MarkdownString;
  reportRecord: AgentTestingPersistenceRecord;
  evidenceRecords?: AgentTestingPersistenceRecord[];
  releaseRecommendationRecord?: AgentTestingPersistenceRecord;
  defectRecords?: AgentTestingPersistenceRecord[];
}): PersistenceRelationship[] {
  const related = [
    ...(params.evidenceRecords ?? []),
    ...(params.defectRecords ?? []),
    ...(params.releaseRecommendationRecord ? [params.releaseRecommendationRecord] : []),
  ];

  return related.map((record) => createPersistenceRelationship({
    runId: params.runId,
    from: endpoint(params.reportRecord),
    to: endpoint(record),
    relationshipType: record.kind === 'release_recommendation' ? 'summarizes' : 'reports_on',
    summary: `Report ${params.reportRecord.id} references ${record.kind} ${record.id}.`,
  }));
}

import {
  createMcpToolRequest,
} from '../mcp';
import {
  runReadOnlyMcpPilot,
} from './readOnlyPilotExecutor';
import type {
  ReadOnlyPilotExecutionOptions,
  ReadOnlyPilotScenarioResult,
  ReadOnlyPilotSnapshot,
} from './readOnlyPilotTypes';

export function createSmallNoteReadOnlyPilotSnapshot(): ReadOnlyPilotSnapshot {
  return {
    id: 'small-note-read-only-pilot-snapshot',
    name: 'Small Note read-only MCP pilot snapshot',
    description: 'In-memory snapshot for validating the read-only MCP pilot chain without real environment access.',
    files: [
      {
        key: 'requirements-summary',
        summary: 'Private notes must only be readable by the owner or explicitly shared users.',
        detail: 'Upload failure should display a user-visible error and preserve existing notes.',
        limitations: ['Fixture summary is synthetic and was provided in memory.'],
      },
    ],
    gitDiffs: [
      {
        key: 'permission-check-diff',
        summary: 'Permission check moved from note owner validation to a shared-note helper.',
        detail: 'Diff snapshot highlights missing explicit deny path for unshared private notes.',
        limitations: ['Git diff is an in-memory summary, not a live repository diff.'],
      },
    ],
    httpResponses: [
      {
        key: 'private-note-unauthorized-response',
        summary: 'Unauthorized private note request returned HTTP 200 with note title in body summary.',
        detail: 'Expected response should be 403 or redacted not-found behavior.',
        limitations: ['HTTP response is a snapshot and no network request was made.'],
      },
    ],
    databaseRows: [
      {
        key: 'notes-shares-permissions',
        summary: 'Snapshot contains note N-7 owned by user A and no share row for user B.',
        detail: 'This supports investigating unauthorized read behavior but is not live database evidence.',
        limitations: ['Database rows are in-memory fixture rows, not a database query result.'],
      },
    ],
    logExcerpts: [
      {
        key: 'permission-upload-backup-log',
        summary: 'Log excerpt includes permission denied warnings, upload failure, and backup warning.',
        detail: 'Entries are timestamp-free summaries for pilot validation only.',
        limitations: ['Log excerpt is synthetic/in-memory and not read from real logs.'],
      },
    ],
    screenshotMetadata: [
      {
        key: 'upload-failure-page',
        summary: 'Screenshot metadata says upload failure page has no visible error message region.',
        detail: 'Metadata includes viewport and element summaries only, not an image file.',
        limitations: ['Screenshot metadata is an in-memory artifact summary.'],
      },
    ],
    limitations: [
      'Snapshot is fully in-memory and synthetic.',
      'Scenario does not read files, call APIs, query databases, start browsers, read logs, or connect MCP.',
    ],
  };
}

export function createSmallNoteReadOnlyPilotRequests(runId: string) {
  return [
    createMcpToolRequest({
      runId,
      requestedByAgent: 'test_lead',
      adapterKind: 'filesystem_repository',
      serverName: 'filesystem_repository-server-draft',
      toolName: 'read_fixture_file',
      purpose: 'Read requirements fixture summary from in-memory snapshot.',
      inputSummary: 'key: requirements-summary',
      expectedOutput: 'Requirements summary for private note and upload behavior.',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      evidenceToProduce: ['requirements fixture summary evidence draft'],
    }),
    createMcpToolRequest({
      runId,
      requestedByAgent: 'developer_analysis',
      adapterKind: 'git',
      serverName: 'git-server-draft',
      toolName: 'read_git_diff_snapshot',
      purpose: 'Read permission-check diff snapshot.',
      inputSummary: 'key: permission-check-diff',
      expectedOutput: 'Diff summary for permission check changes.',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      evidenceToProduce: ['git diff snapshot evidence draft'],
    }),
    createMcpToolRequest({
      runId,
      requestedByAgent: 'test_design',
      adapterKind: 'http_api',
      serverName: 'http_api-server-draft',
      toolName: 'read_http_response_snapshot',
      purpose: 'Read stored HTTP response snapshot for unauthorized private note access.',
      inputSummary: 'key: private-note-unauthorized-response',
      expectedOutput: 'HTTP response snapshot summary.',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      callsExternalService: false,
      requiresNetwork: false,
      evidenceToProduce: ['http response snapshot evidence draft'],
    }),
    createMcpToolRequest({
      runId,
      requestedByAgent: 'developer_analysis',
      adapterKind: 'database',
      serverName: 'database-server-draft',
      toolName: 'read_database_query_snapshot',
      purpose: 'Read stored notes/shares permission row snapshot.',
      inputSummary: 'key: notes-shares-permissions',
      expectedOutput: 'Database row snapshot summary.',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      modifiesDatabase: false,
      evidenceToProduce: ['database row snapshot evidence draft'],
    }),
    createMcpToolRequest({
      runId,
      requestedByAgent: 'ops_check',
      adapterKind: 'log_monitoring',
      serverName: 'log_monitoring-server-draft',
      toolName: 'read_log_excerpt_snapshot',
      purpose: 'Read redacted in-memory log excerpt snapshot.',
      inputSummary: 'key: permission-upload-backup-log redacted summary',
      expectedOutput: 'Redacted log excerpt summary.',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      callsExternalService: false,
      requiresNetwork: false,
      touchesSensitiveData: true,
      evidenceToProduce: ['log excerpt snapshot evidence draft'],
    }),
    createMcpToolRequest({
      runId,
      requestedByAgent: 'test_design',
      adapterKind: 'screenshot_attachment',
      serverName: 'screenshot_attachment-server-draft',
      toolName: 'read_screenshot_metadata_snapshot',
      purpose: 'Read screenshot metadata snapshot for upload failure page.',
      inputSummary: 'key: upload-failure-page',
      expectedOutput: 'Screenshot metadata summary.',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      writesToFilesystem: false,
      evidenceToProduce: ['screenshot metadata evidence draft'],
    }),
    createMcpToolRequest({
      runId,
      requestedByAgent: 'ops_check',
      adapterKind: 'database',
      serverName: 'database-server-draft',
      toolName: 'read_database_query_snapshot',
      purpose: 'Forbidden pilot request that attempts database mutation.',
      inputSummary: 'key: notes-shares-permissions',
      expectedOutput: 'This request should be blocked before pilot adapter execution.',
      permissionLevel: 'WRITE_DANGEROUS',
      sideEffectLevel: 'DESTRUCTIVE',
      modifiesDatabase: true,
      isDestructive: true,
      evidenceToProduce: ['forbidden request should not produce evidence'],
    }),
  ];
}

export function runSmallNoteReadOnlyPilotScenario(): ReadOnlyPilotScenarioResult {
  const snapshot = createSmallNoteReadOnlyPilotSnapshot();
  const requests = createSmallNoteReadOnlyPilotRequests('small-note-read-only-pilot-run');
  const options: ReadOnlyPilotExecutionOptions = {
    allowMediumRiskRead: true,
    requireApprovalGate: true,
    mapResultToEvidenceDraft: true,
    mapResultToAuditDraft: true,
    normalizeEvidencePreview: true,
  };
  const outputs = requests.map((request) => runReadOnlyMcpPilot({
    request,
    snapshot,
    options,
  }));
  const evidenceDraftsProduced = outputs.filter((output) => output.rawEvidenceDraft).length;
  const auditDraftsProduced = outputs.reduce((count, output) =>
    count + (output.requestAuditDraft ? 1 : 0) + (output.resultAuditDraft ? 1 : 0), 0);

  return {
    snapshot,
    requests,
    outputs,
    summary: {
      totalRequests: requests.length,
      executedFakeReads: outputs.filter((output) => output.result.status === 'success').length,
      forbiddenRequests: outputs.filter((output) => output.result.status === 'forbidden').length,
      approvalBlockedRequests: outputs.filter((output) => output.result.status === 'blocked_by_approval').length,
      evidenceDraftsProduced,
      auditDraftsProduced,
    },
    warnings: outputs.flatMap((output) => output.warnings),
    limitations: [
      ...snapshot.limitations,
      'Scenario validates the deterministic pilot chain only.',
      'Scenario output is not real evidence and was not persisted.',
    ],
  };
}

import type {
  MarkdownString,
} from '../types';
import type {
  McpToolRequest,
  McpToolResult,
} from '../mcp';
import type {
  ReadOnlyPilotSnapshot,
  ReadOnlyPilotSnapshotEntry,
} from './readOnlyPilotTypes';

function evidenceIdFor(request: McpToolRequest): string {
  return `EV-MCP-PILOT-${request.id}`.toUpperCase().replace(/[^A-Z0-9-]+/g, '-');
}

function keyFromRequest(request: McpToolRequest): MarkdownString {
  const keyMatch = request.inputSummary.match(/(?:key|snapshot key|fixture key):\s*([A-Za-z0-9_.:/-]+)/i);

  return keyMatch?.[1] ?? request.inputSummary.trim();
}

function resultForEntry(
  request: McpToolRequest,
  entry: ReadOnlyPilotSnapshotEntry | undefined,
  sourceLabel: MarkdownString
): McpToolResult {
  const key = keyFromRequest(request);

  if (!entry) {
    return {
      id: `mcp-result-${request.id}`,
      requestId: request.id,
      runId: request.runId,
      adapterKind: request.adapterKind,
      serverName: request.serverName,
      toolName: request.toolName,
      status: 'inconclusive',
      failureKind: 'environment_failure',
      outputSummary: `In-memory snapshot entry was not found for key "${key}" in ${sourceLabel}.`,
      rawEvidenceRef: `${sourceLabel}:${key}`,
      producedEvidenceIds: [],
      startedAt: '',
      completedAt: '',
      limitations: [
        'Read-only pilot adapter only inspects the provided in-memory snapshot.',
        'Missing snapshot data is an environment/input limitation, not a system-under-test failure.',
        'No real MCP server, file, network, database, browser, command, or log access occurred.',
      ],
    };
  }

  return {
    id: `mcp-result-${request.id}`,
    requestId: request.id,
    runId: request.runId,
    adapterKind: request.adapterKind,
    serverName: request.serverName,
    toolName: request.toolName,
    status: 'success',
    failureKind: 'unknown',
    outputSummary: `${entry.summary}${entry.detail ? ` Detail: ${entry.detail}` : ''}`,
    rawEvidenceRef: `${sourceLabel}:${entry.key}`,
    producedEvidenceIds: [evidenceIdFor(request)],
    startedAt: '',
    completedAt: '',
    limitations: [
      ...entry.limitations,
      'Read-only pilot success only means the in-memory snapshot entry was found.',
      'Pilot success does not prove the target system passed a test.',
      'No real MCP server, file, network, database, browser, command, or log access occurred.',
    ],
  };
}

function findEntry(entries: ReadOnlyPilotSnapshotEntry[], request: McpToolRequest): ReadOnlyPilotSnapshotEntry | undefined {
  const key = keyFromRequest(request).toLowerCase();

  return entries.find((entry) => entry.key.toLowerCase() === key);
}

export function executeReadFixtureFile(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  return resultForEntry(request, findEntry(snapshot.files, request), 'snapshot.files');
}

export function executeReadGitDiffSnapshot(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  return resultForEntry(request, findEntry(snapshot.gitDiffs, request), 'snapshot.gitDiffs');
}

export function executeReadHttpResponseSnapshot(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  return resultForEntry(request, findEntry(snapshot.httpResponses, request), 'snapshot.httpResponses');
}

export function executeReadDatabaseQuerySnapshot(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  return resultForEntry(request, findEntry(snapshot.databaseRows, request), 'snapshot.databaseRows');
}

export function executeReadLogExcerptSnapshot(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  return resultForEntry(request, findEntry(snapshot.logExcerpts, request), 'snapshot.logExcerpts');
}

export function executeReadScreenshotMetadataSnapshot(
  request: McpToolRequest,
  snapshot: ReadOnlyPilotSnapshot
): McpToolResult {
  return resultForEntry(request, findEntry(snapshot.screenshotMetadata, request), 'snapshot.screenshotMetadata');
}

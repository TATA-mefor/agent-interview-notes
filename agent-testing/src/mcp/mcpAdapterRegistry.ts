import type {
  MarkdownString,
  McpPermissionLevel,
  McpSideEffectLevel,
} from '../types';
import {
  createMcpAdapterDescriptor,
  type McpAdapterCapabilityDescriptor,
  type McpAdapterContract,
  type McpAdapterKind,
} from './mcpAdapterContracts';

function descriptor(params: {
  kind: McpAdapterKind;
  displayName: MarkdownString;
  description: MarkdownString;
  supportedTools: MarkdownString[];
  defaultPermissionLevel: McpPermissionLevel;
  defaultSideEffectLevel: McpSideEffectLevel;
  allowedEnvironments?: MarkdownString[];
  requiresApprovalByDefault?: boolean;
  productionAllowed?: boolean;
  limitations?: MarkdownString[];
}): McpAdapterCapabilityDescriptor {
  return createMcpAdapterDescriptor({
    kind: params.kind,
    displayName: params.displayName,
    description: params.description,
    supportedTools: params.supportedTools,
    defaultPermissionLevel: params.defaultPermissionLevel,
    defaultSideEffectLevel: params.defaultSideEffectLevel,
    allowedEnvironments: params.allowedEnvironments ?? ['local', 'test', 'staging'],
    requiresApprovalByDefault: params.requiresApprovalByDefault ?? false,
    productionAllowed: params.productionAllowed ?? false,
    limitations: params.limitations ?? [],
  });
}

function contract(params: {
  kind: McpAdapterKind;
  displayName: MarkdownString;
  description: MarkdownString;
  supportedTools: MarkdownString[];
  defaultPermissionLevel: McpPermissionLevel;
  defaultSideEffectLevel: McpSideEffectLevel;
  requiresApprovalByDefault?: boolean;
  productionAllowed?: boolean;
  limitations?: MarkdownString[];
}): McpAdapterContract {
  return {
    id: `mcp-adapter-${params.kind}`,
    kind: params.kind,
    serverName: `${params.kind}-server-draft`,
    status: 'not_configured',
    capabilities: [
      descriptor({
        kind: params.kind,
        displayName: params.displayName,
        description: params.description,
        supportedTools: params.supportedTools,
        defaultPermissionLevel: params.defaultPermissionLevel,
        defaultSideEffectLevel: params.defaultSideEffectLevel,
        requiresApprovalByDefault: params.requiresApprovalByDefault,
        productionAllowed: params.productionAllowed,
        limitations: params.limitations,
      }),
    ],
    defaultPermissionLevel: params.defaultPermissionLevel,
    defaultSideEffectLevel: params.defaultSideEffectLevel,
    boundary: 'Contract only. Future MCP adapter must pass approval, audit, evidence, and environment boundaries before execution.',
    limitations: [
      ...(params.limitations ?? []),
      'Default adapter contract is not configured and does not connect to an MCP server.',
    ],
  };
}

export function createDefaultMcpAdapterContracts(): McpAdapterContract[] {
  return [
    contract({
      kind: 'filesystem_repository',
      displayName: 'Filesystem Repository MCP',
      description: 'Future repository file listing and read access for approved paths.',
      supportedTools: ['read_file', 'list_directory', 'search_text'],
      defaultPermissionLevel: 'READ_ONLY',
      defaultSideEffectLevel: 'NONE',
      limitations: ['Static file reads do not prove live system behavior.'],
    }),
    contract({
      kind: 'git',
      displayName: 'Git MCP',
      description: 'Future read-only git status, diff, log, and changed-file inspection.',
      supportedTools: ['git_status', 'git_diff', 'git_log'],
      defaultPermissionLevel: 'READ_ONLY',
      defaultSideEffectLevel: 'NONE',
      limitations: ['Git evidence is change-scope evidence, not execution evidence.'],
    }),
    contract({
      kind: 'terminal_command',
      displayName: 'Terminal Command MCP',
      description: 'Future allowlisted command execution in local or test environments.',
      supportedTools: ['run_command', 'capture_output'],
      defaultPermissionLevel: 'EXECUTE_LIMITED',
      defaultSideEffectLevel: 'LOCAL_WRITE',
      requiresApprovalByDefault: true,
      limitations: ['Command execution is high risk and must be approval-gated.'],
    }),
    contract({
      kind: 'browser_automation',
      displayName: 'Browser Automation MCP',
      description: 'Future browser navigation, interaction, and screenshot capture for local/test targets.',
      supportedTools: ['navigate', 'click', 'type', 'screenshot'],
      defaultPermissionLevel: 'EXECUTE_LIMITED',
      defaultSideEffectLevel: 'EXTERNAL_CALL',
      requiresApprovalByDefault: true,
      limitations: ['Browser actions can mutate test data and must not target production sensitive accounts.'],
    }),
    contract({
      kind: 'http_api',
      displayName: 'HTTP API MCP',
      description: 'Future API smoke checks with request and response summaries.',
      supportedTools: ['http_request', 'api_smoke_check'],
      defaultPermissionLevel: 'EXECUTE_LIMITED',
      defaultSideEffectLevel: 'EXTERNAL_CALL',
      requiresApprovalByDefault: true,
      limitations: ['Write APIs and production endpoints require explicit approval and environment confirmation.'],
    }),
    contract({
      kind: 'database',
      displayName: 'Database MCP',
      description: 'Future database schema, read-only query, and test-environment verification access.',
      supportedTools: ['schema_read', 'read_query', 'backup_restore_check'],
      defaultPermissionLevel: 'READ_ONLY',
      defaultSideEffectLevel: 'NONE',
      requiresApprovalByDefault: true,
      limitations: ['Database writes, destructive restore, and production access remain forbidden by default.'],
    }),
    contract({
      kind: 'log_monitoring',
      displayName: 'Log Monitoring MCP',
      description: 'Future test-environment log and monitoring summary access.',
      supportedTools: ['read_logs', 'query_alerts', 'summarize_errors'],
      defaultPermissionLevel: 'READ_ONLY',
      defaultSideEffectLevel: 'NONE',
      requiresApprovalByDefault: true,
      limitations: ['Logs may contain sensitive data and must be summarized or redacted.'],
    }),
    contract({
      kind: 'screenshot_attachment',
      displayName: 'Screenshot Attachment MCP',
      description: 'Future controlled screenshot and artifact reference management.',
      supportedTools: ['attach_screenshot', 'register_artifact', 'redact_attachment'],
      defaultPermissionLevel: 'WRITE_LIMITED',
      defaultSideEffectLevel: 'LOCAL_WRITE',
      limitations: ['Attachments support evidence but do not prove full workflow success alone.'],
    }),
  ];
}

export function findMcpAdapterContract(
  contracts: McpAdapterContract[],
  kind: McpAdapterKind
): McpAdapterContract | undefined {
  return contracts.find((contractItem) => contractItem.kind === kind);
}

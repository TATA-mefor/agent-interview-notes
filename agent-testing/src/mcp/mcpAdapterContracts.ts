import type {
  MarkdownString,
  McpCapability,
  McpPermissionLevel,
  McpSideEffectLevel,
} from '../types';

export type McpAdapterKind = McpCapability;

export type McpAdapterStatus =
  | 'not_configured'
  | 'available'
  | 'disabled'
  | 'error'
  | 'forbidden';

export interface McpAdapterCapabilityDescriptor {
  kind: McpAdapterKind;
  displayName: MarkdownString;
  description: MarkdownString;
  supportedTools: MarkdownString[];
  defaultPermissionLevel: McpPermissionLevel;
  defaultSideEffectLevel: McpSideEffectLevel;
  allowedEnvironments: MarkdownString[];
  requiresApprovalByDefault: boolean;
  productionAllowed: boolean;
  limitations: MarkdownString[];
}

export interface McpAdapterContract {
  id: MarkdownString;
  kind: McpAdapterKind;
  serverName: MarkdownString;
  status: McpAdapterStatus;
  capabilities: McpAdapterCapabilityDescriptor[];
  defaultPermissionLevel: McpPermissionLevel;
  defaultSideEffectLevel: McpSideEffectLevel;
  boundary: MarkdownString;
  limitations: MarkdownString[];
}

export interface McpAdapter {
  contract: McpAdapterContract;
  describe(): McpAdapterContract;
}

export function createMcpAdapterDescriptor(params: McpAdapterCapabilityDescriptor): McpAdapterCapabilityDescriptor {
  return {
    ...params,
    limitations: [
      ...params.limitations,
      'Descriptor is a contract only and does not configure or execute an MCP server.',
    ],
  };
}

export function describeMcpAdapterContract(contract: McpAdapterContract): McpAdapterContract {
  return {
    ...contract,
    limitations: [
      ...contract.limitations,
      'Adapter contract is descriptive metadata only; no tool execution is available in this phase.',
    ],
  };
}

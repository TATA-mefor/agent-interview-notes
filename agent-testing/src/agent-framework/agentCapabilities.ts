import type {
  AgentRole,
  MarkdownString,
} from '../types';

export type AgentCapabilityName =
  | 'short_term_memory'
  | 'long_term_memory'
  | 'reflection'
  | 'planning'
  | 'action'
  | 'persona_modeling'
  | 'task_loop'
  | 'skill_invocation'
  | 'mcp_request'
  | 'approval_request'
  | 'audit_emission'
  | 'observability_emission';

export type AgentCapabilityLevel =
  | 'disabled'
  | 'basic'
  | 'standard'
  | 'advanced';

export interface AgentCapabilityConfig {
  capability: AgentCapabilityName;
  level: AgentCapabilityLevel;
  enabled: boolean;
  boundary: MarkdownString;
  allowedInputs: MarkdownString[];
  allowedOutputs: MarkdownString[];
  requiredEvidence: MarkdownString[];
  requiresApproval: boolean;
  limitations: MarkdownString[];
}

export interface AgentCapabilityMatrix {
  role: AgentRole;
  capabilities: AgentCapabilityConfig[];
  defaultActionBoundary: MarkdownString;
  defaultMemoryBoundary: MarkdownString;
  defaultReflectionBoundary: MarkdownString;
  limitations: MarkdownString[];
}

export function createCapabilityConfig(params: {
  capability: AgentCapabilityName;
  level: AgentCapabilityLevel;
  boundary: MarkdownString;
  allowedInputs?: MarkdownString[];
  allowedOutputs?: MarkdownString[];
  requiredEvidence?: MarkdownString[];
  requiresApproval?: boolean;
  limitations?: MarkdownString[];
}): AgentCapabilityConfig {
  return {
    capability: params.capability,
    level: params.level,
    enabled: params.level !== 'disabled',
    boundary: params.boundary,
    allowedInputs: params.allowedInputs ?? [],
    allowedOutputs: params.allowedOutputs ?? [],
    requiredEvidence: params.requiredEvidence ?? [],
    requiresApproval: params.requiresApproval ?? false,
    limitations: [
      ...(params.limitations ?? []),
      'Capability config is a contract only and does not execute runtime behavior.',
    ],
  };
}

export function buildCapabilityMatrix(params: {
  role: AgentRole;
  capabilities: AgentCapabilityConfig[];
  defaultActionBoundary?: MarkdownString;
  defaultMemoryBoundary?: MarkdownString;
  defaultReflectionBoundary?: MarkdownString;
  limitations?: MarkdownString[];
}): AgentCapabilityMatrix {
  return {
    role: params.role,
    capabilities: params.capabilities,
    defaultActionBoundary: params.defaultActionBoundary ??
      'Actions must go through deterministic Skills or future approval-gated MCP adapters.',
    defaultMemoryBoundary: params.defaultMemoryBoundary ??
      'Memory stores summaries and references only; it is not persistent in this phase.',
    defaultReflectionBoundary: params.defaultReflectionBoundary ??
      'Reflection is bounded one-shot self-check output and is not execution evidence.',
    limitations: [
      ...(params.limitations ?? []),
      'Capability matrix does not grant permission to bypass evidence, approval, audit, or MCP boundaries.',
    ],
  };
}

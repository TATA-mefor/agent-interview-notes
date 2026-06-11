import type {
  AgentRuntimeRole,
  AgentTaskPriority,
  AgentTaskType,
} from './agentRuntimeTypes';

export type AgentCapabilityLevel = 'none' | 'basic' | 'standard' | 'advanced';

export interface AgentCapabilityConfig {
  planning: AgentCapabilityLevel;
  reflection: AgentCapabilityLevel;
  memory: AgentCapabilityLevel;
  action: AgentCapabilityLevel;
  collaboration: AgentCapabilityLevel;
}

export type AgentRuntimeSkillName =
  | 'context_building'
  | 'acceptance_extraction'
  | 'test_case_generation'
  | 'evidence_normalization'
  | 'severity_classification'
  | 'ops_checklist'
  | 'defect_analysis'
  | 'regression_suggestion'
  | 'report_generation'
  | 'release_recommendation'
  | 'approval_policy'
  | 'audit_trail'
  | 'controlled_execution'
  | 'read_only_mcp_pilot';

export interface AgentProfile {
  role: AgentRuntimeRole;
  displayName: string;
  systemPrompt: string;

  allowedSkills: AgentRuntimeSkillName[];
  allowedTaskTypes: AgentTaskType[];

  capabilities: AgentCapabilityConfig;

  defaultPriority: AgentTaskPriority;

  canRequestMcp: boolean;
  canRequestControlledExecution: boolean;
  canApproveHighRiskAction: boolean;

  limitations: string[];
}

export const TEST_LEAD_AGENT_PROFILE: AgentProfile = {
  role: 'test_lead',
  displayName: 'Test Lead Agent',
  systemPrompt:
    'Coordinate the multi-agent testing session, assign bounded tasks, review evidence gaps, and produce advisory release and report outputs.',
  allowedSkills: [
    'context_building',
    'release_recommendation',
    'report_generation',
    'approval_policy',
    'audit_trail',
  ],
  allowedTaskTypes: [
    'build_context',
    'recommend_release',
    'generate_report',
    'summarize_session',
    'review_evidence_gap',
  ],
  capabilities: {
    planning: 'advanced',
    reflection: 'advanced',
    memory: 'standard',
    action: 'standard',
    collaboration: 'advanced',
  },
  defaultPriority: 'high',
  canRequestMcp: false,
  canRequestControlledExecution: false,
  canApproveHighRiskAction: false,
  limitations: [
    'Cannot bypass evidence.',
    'Cannot directly execute MCP.',
    'Cannot directly approve HIGH action.',
    'Cannot treat agent reasoning as pass evidence.',
  ],
};

export const PRODUCT_ACCEPTANCE_AGENT_PROFILE: AgentProfile = {
  role: 'product_acceptance',
  displayName: 'Product Acceptance Agent',
  systemPrompt:
    'Extract acceptance points, preserve ambiguity, and review product-facing evidence gaps without making code root-cause or final release decisions.',
  allowedSkills: [
    'acceptance_extraction',
    'context_building',
  ],
  allowedTaskTypes: [
    'extract_acceptance',
    'review_evidence_gap',
  ],
  capabilities: {
    planning: 'standard',
    reflection: 'standard',
    memory: 'standard',
    action: 'basic',
    collaboration: 'standard',
  },
  defaultPriority: 'normal',
  canRequestMcp: false,
  canRequestControlledExecution: false,
  canApproveHighRiskAction: false,
  limitations: [
    'Does not execute MCP.',
    'Does not judge code root cause.',
    'Does not provide final release recommendation.',
  ],
};

export const TEST_DESIGN_AGENT_PROFILE: AgentProfile = {
  role: 'test_design',
  displayName: 'Test Design Agent',
  systemPrompt:
    'Generate system test cases and regression suggestions from acceptance points, risks, and supplied evidence while keeping generated cases not-run until real evidence exists.',
  allowedSkills: [
    'context_building',
    'test_case_generation',
    'regression_suggestion',
  ],
  allowedTaskTypes: [
    'generate_test_cases',
    'suggest_regression',
    'review_evidence_gap',
  ],
  capabilities: {
    planning: 'advanced',
    reflection: 'standard',
    memory: 'standard',
    action: 'basic',
    collaboration: 'standard',
  },
  defaultPriority: 'normal',
  canRequestMcp: false,
  canRequestControlledExecution: false,
  canApproveHighRiskAction: false,
  limitations: [
    'Does not execute real tests.',
    'Does not treat generated test cases as passed tests.',
    'Does not directly request high-risk MCP.',
  ],
};

export const DEVELOPER_ANALYSIS_AGENT_PROFILE: AgentProfile = {
  role: 'developer_analysis',
  displayName: 'Developer Analysis Agent',
  systemPrompt:
    'Analyze failed or inconclusive evidence, suspected layers, possible causes, and regression needs without inventing code, logs, or confirmed root cause.',
  allowedSkills: [
    'defect_analysis',
    'regression_suggestion',
    'evidence_normalization',
    'severity_classification',
  ],
  allowedTaskTypes: [
    'normalize_evidence',
    'classify_severity',
    'analyze_defect',
    'suggest_regression',
    'review_evidence_gap',
  ],
  capabilities: {
    planning: 'standard',
    reflection: 'advanced',
    memory: 'standard',
    action: 'basic',
    collaboration: 'standard',
  },
  defaultPriority: 'normal',
  canRequestMcp: false,
  canRequestControlledExecution: false,
  canApproveHighRiskAction: false,
  limitations: [
    'Cannot invent code locations.',
    'Cannot invent logs.',
    'Cannot treat tool failure as product defect by itself.',
    'Cannot claim root cause is confirmed unless evidence is sufficient.',
  ],
};

export const OPS_CHECK_AGENT_PROFILE: AgentProfile = {
  role: 'ops_check',
  displayName: 'Ops Check Agent',
  systemPrompt:
    'Generate operational readiness checks and draft approval-gated read or controlled-execution requests without directly executing real commands.',
  allowedSkills: [
    'ops_checklist',
    'read_only_mcp_pilot',
    'controlled_execution',
    'approval_policy',
  ],
  allowedTaskTypes: [
    'generate_ops_checklist',
    'request_mcp_read',
    'request_controlled_execution',
    'review_evidence_gap',
  ],
  capabilities: {
    planning: 'standard',
    reflection: 'standard',
    memory: 'standard',
    action: 'advanced',
    collaboration: 'standard',
  },
  defaultPriority: 'high',
  canRequestMcp: true,
  canRequestControlledExecution: true,
  canApproveHighRiskAction: false,
  limitations: [
    'HIGH action requires approval.',
    'FORBIDDEN action must be refused.',
    'Production destructive operations are not allowed.',
    'Does not directly execute real commands.',
  ],
};

export const USER_REPRESENTATIVE_AGENT_PROFILE: AgentProfile = {
  role: 'user_representative',
  displayName: 'User Representative Agent',
  systemPrompt:
    'Represent small-team user workflows, usability expectations, and scenario coverage while avoiding production MCP, high-risk actions, and release approval decisions.',
  allowedSkills: [
    'context_building',
    'acceptance_extraction',
    'test_case_generation',
  ],
  allowedTaskTypes: [
    'review_evidence_gap',
    'generate_test_cases',
  ],
  capabilities: {
    planning: 'basic',
    reflection: 'standard',
    memory: 'basic',
    action: 'basic',
    collaboration: 'standard',
  },
  defaultPriority: 'normal',
  canRequestMcp: false,
  canRequestControlledExecution: false,
  canApproveHighRiskAction: false,
  limitations: [
    'Does not execute high-risk action.',
    'Does not request production MCP.',
    'Does not judge release approval.',
  ],
};

export const DEFAULT_AGENT_PROFILES: readonly AgentProfile[] = [
  TEST_LEAD_AGENT_PROFILE,
  PRODUCT_ACCEPTANCE_AGENT_PROFILE,
  TEST_DESIGN_AGENT_PROFILE,
  DEVELOPER_ANALYSIS_AGENT_PROFILE,
  OPS_CHECK_AGENT_PROFILE,
  USER_REPRESENTATIVE_AGENT_PROFILE,
];

export interface AgentProfileValidationIssue {
  role: AgentRuntimeRole;
  field: string;
  message: string;
}

export interface AgentProfileValidationResult {
  valid: boolean;
  issues: AgentProfileValidationIssue[];
}

const DEFAULT_AGENT_ROLES: readonly AgentRuntimeRole[] = [
  'test_lead',
  'product_acceptance',
  'test_design',
  'developer_analysis',
  'ops_check',
  'user_representative',
];

function hasHighApprovalLimitation(profile: AgentProfile): boolean {
  return profile.limitations.some((limitation) => {
    const normalized = limitation.toLowerCase();
    return normalized.includes('high') && normalized.includes('approval');
  });
}

export function validateAgentProfiles(
  profiles: readonly AgentProfile[]
): AgentProfileValidationResult {
  const issues: AgentProfileValidationIssue[] = [];
  const seenRoles = new Set<AgentRuntimeRole>();

  for (const requiredRole of DEFAULT_AGENT_ROLES) {
    if (!profiles.some((profile) => profile.role === requiredRole)) {
      issues.push({
        role: requiredRole,
        field: 'role',
        message: 'Default Agent role is missing.',
      });
    }
  }

  for (const profile of profiles) {
    if (seenRoles.has(profile.role)) {
      issues.push({
        role: profile.role,
        field: 'role',
        message: 'Duplicate Agent role is not allowed.',
      });
    }

    seenRoles.add(profile.role);

    if (profile.allowedTaskTypes.length === 0) {
      issues.push({
        role: profile.role,
        field: 'allowedTaskTypes',
        message: 'allowedTaskTypes must not be empty.',
      });
    }

    if (profile.allowedSkills.length === 0) {
      issues.push({
        role: profile.role,
        field: 'allowedSkills',
        message: 'allowedSkills must not be empty.',
      });
    }

    if (profile.systemPrompt.trim().length === 0) {
      issues.push({
        role: profile.role,
        field: 'systemPrompt',
        message: 'systemPrompt must not be empty.',
      });
    }

    if (profile.role === 'test_lead' && profile.canApproveHighRiskAction) {
      issues.push({
        role: profile.role,
        field: 'canApproveHighRiskAction',
        message: 'test_lead cannot directly approve HIGH action.',
      });
    }

    if (profile.role === 'user_representative' && profile.canRequestMcp) {
      issues.push({
        role: profile.role,
        field: 'canRequestMcp',
        message: 'user_representative cannot request MCP.',
      });
    }

    if (
      profile.role === 'ops_check' &&
      profile.canRequestMcp &&
      !hasHighApprovalLimitation(profile)
    ) {
      issues.push({
        role: profile.role,
        field: 'limitations',
        message: 'ops_check MCP access must state that HIGH action requires approval.',
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

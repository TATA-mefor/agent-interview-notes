import type {
  AgentRole,
  MarkdownString,
  McpCapability,
  SkillName,
} from '../types';
import type {
  ApprovalRiskLevel,
} from '../approval';
import {
  buildCapabilityMatrix,
  createCapabilityConfig,
  type AgentCapabilityLevel,
  type AgentCapabilityMatrix,
  type AgentCapabilityName,
} from './agentCapabilities';

export interface AgentProfile {
  id: MarkdownString;
  role: AgentRole;
  displayName: MarkdownString;
  purpose: MarkdownString;
  persona: MarkdownString;
  responsibilities: MarkdownString[];
  decisionPolicy: MarkdownString[];
  capabilityMatrix: AgentCapabilityMatrix;
  allowedSkills: SkillName[];
  allowedMcpCapabilities: McpCapability[];
  defaultApprovalPolicy: {
    defaultRiskLevel: ApprovalRiskLevel;
    highRiskRequiresApproval: boolean;
    forbiddenActionsRejected: boolean;
    limitations: MarkdownString[];
  };
  memoryPolicy: MarkdownString[];
  reflectionPolicy: MarkdownString[];
  planningPolicy: MarkdownString[];
  actionPolicy: MarkdownString[];
  limitations: MarkdownString[];
}

const LOW_RISK_SKILLS: SkillName[] = [
  'context_building',
  'acceptance_extraction',
  'test_case_generation',
  'evidence_normalization',
  'severity_classification',
  'ops_checklist',
  'defect_analysis',
  'report_generation',
  'regression_suggestion',
  'release_recommendation',
  'approval_policy',
  'audit_trail',
];

function capability(
  capabilityName: AgentCapabilityName,
  level: AgentCapabilityLevel,
  boundary: MarkdownString,
  requiresApproval = false
) {
  return createCapabilityConfig({
    capability: capabilityName,
    level,
    boundary,
    allowedInputs: ['provided orchestration input', 'deterministic skill outputs', 'summary references'],
    allowedOutputs: ['structured draft output', 'summary', 'trace-friendly reference'],
    requiredEvidence: ['Real pass/fail claims must reference normalized execution evidence.'],
    requiresApproval,
    limitations: [
      'Capability cannot convert planning, memory, reflection, or report text into real test evidence.',
    ],
  });
}

function commonApprovalPolicy(defaultRiskLevel: ApprovalRiskLevel = 'LOW') {
  return {
    defaultRiskLevel,
    highRiskRequiresApproval: true,
    forbiddenActionsRejected: true,
    limitations: [
      'Default approval policy is a profile contract and delegates concrete action decisions to the Phase 12 approval policy engine.',
    ],
  };
}

function commonPolicies(role: AgentRole): Pick<
  AgentProfile,
  'memoryPolicy' | 'reflectionPolicy' | 'planningPolicy' | 'actionPolicy' | 'limitations'
> {
  return {
    memoryPolicy: [
      'Use summary-only memory with evidence, test case, defect, or source references.',
      'Do not store raw secrets, raw private data, full logs, credentials, or complete sensitive prompts.',
    ],
    reflectionPolicy: [
      'Use bounded one-shot reflection for coverage, evidence, severity, report, release, or boundary checks.',
      'Reflection notes are analysis records and are not evidence that a system behavior occurred.',
    ],
    planningPolicy: [
      'Create draft plans only; do not schedule, execute, or mark steps completed without external evidence.',
      'High-risk MCP or side-effecting actions must be marked requiresApproval.',
    ],
    actionPolicy: [
      'Actions must be represented as Skill invocations or future MCP requests.',
      'Action policy evaluation must not execute the action.',
    ],
    limitations: [
      `${role} profile is a deterministic contract only and does not create a runtime Agent.`,
      'No LLM, MCP, scheduler, database, UI, API, or persistent memory is connected by this profile.',
    ],
  };
}

function makeProfile(params: {
  id: MarkdownString;
  role: AgentRole;
  displayName: MarkdownString;
  purpose: MarkdownString;
  persona: MarkdownString;
  responsibilities: MarkdownString[];
  decisionPolicy: MarkdownString[];
  capabilities: ReturnType<typeof capability>[];
  allowedSkills: SkillName[];
  allowedMcpCapabilities?: McpCapability[];
  defaultRiskLevel?: ApprovalRiskLevel;
}): AgentProfile {
  const policies = commonPolicies(params.role);

  return {
    id: params.id,
    role: params.role,
    displayName: params.displayName,
    purpose: params.purpose,
    persona: params.persona,
    responsibilities: params.responsibilities,
    decisionPolicy: params.decisionPolicy,
    capabilityMatrix: buildCapabilityMatrix({
      role: params.role,
      capabilities: params.capabilities,
    }),
    allowedSkills: params.allowedSkills,
    allowedMcpCapabilities: params.allowedMcpCapabilities ?? [],
    defaultApprovalPolicy: commonApprovalPolicy(params.defaultRiskLevel),
    ...policies,
  };
}

export function buildDefaultAgentProfiles(): AgentProfile[] {
  return [
    makeProfile({
      id: 'agent-profile-test-lead',
      role: 'test_lead',
      displayName: 'Test Lead Agent',
      purpose: 'Coordinate deterministic test planning, evidence review, release recommendation, approval requests, and audit-ready trace summaries.',
      persona: 'Conservative release-quality coordinator.',
      responsibilities: [
        'Coordinate test scope and orchestration outputs.',
        'Escalate missing evidence and blocked release decisions.',
        'Keep release recommendations advisory until human approval exists.',
      ],
      decisionPolicy: [
        'Do not approve a release without medium or strong core evidence.',
        'Do not bypass approval policy for high-risk actions.',
      ],
      capabilities: [
        capability('planning', 'advanced', 'Can draft multi-step plans over deterministic skills.'),
        capability('reflection', 'advanced', 'Can perform bounded coverage, evidence, release, and boundary checks.'),
        capability('short_term_memory', 'standard', 'Can use run-scoped summary memory.'),
        capability('long_term_memory', 'basic', 'Can reference project-level summary memory when provided.'),
        capability('action', 'standard', 'Can request low-risk Skill actions and approval-gated future actions.'),
        capability('skill_invocation', 'standard', 'Can invoke most deterministic low-risk skills.'),
        capability('approval_request', 'standard', 'Can draft approval requests but cannot grant them.', true),
        capability('audit_emission', 'standard', 'Can draft audit event summaries.'),
        capability('observability_emission', 'basic', 'Can produce dashboard-ready metric summaries only.'),
      ],
      allowedSkills: LOW_RISK_SKILLS,
    }),
    makeProfile({
      id: 'agent-profile-product-acceptance',
      role: 'product_acceptance',
      displayName: 'Product Acceptance Agent',
      purpose: 'Extract acceptance points, preserve ambiguity, and represent product intent.',
      persona: 'Requirement-focused acceptance reviewer.',
      responsibilities: [
        'Identify acceptance criteria and ambiguous requirements.',
        'Keep product intent separate from execution evidence.',
      ],
      decisionPolicy: [
        'Do not invent requirements from missing context.',
        'Escalate ambiguity as unknowns.',
      ],
      capabilities: [
        capability('persona_modeling', 'standard', 'Can reason from product acceptance persona.'),
        capability('reflection', 'standard', 'Can check acceptance coverage and ambiguity.'),
        capability('planning', 'standard', 'Can draft acceptance-focused plan steps.'),
        capability('action', 'basic', 'Can request low-risk deterministic skills only.'),
        capability('skill_invocation', 'standard', 'Can invoke context and acceptance skills.'),
      ],
      allowedSkills: ['context_building', 'acceptance_extraction', 'report_generation'],
    }),
    makeProfile({
      id: 'agent-profile-test-design',
      role: 'test_design',
      displayName: 'Test Design Agent',
      purpose: 'Create test cases and regression scope from requirements, risks, and defects.',
      persona: 'Risk-based system test designer.',
      responsibilities: [
        'Generate system test cases from acceptance points.',
        'Suggest regression coverage without executing tests.',
      ],
      decisionPolicy: [
        'Generated cases must remain not-run until real evidence exists.',
        'Do not request MCP execution by default.',
      ],
      capabilities: [
        capability('planning', 'advanced', 'Can draft detailed test design plans.'),
        capability('reflection', 'standard', 'Can check case coverage and missing evidence.'),
        capability('action', 'basic', 'Can request low-risk design skills.'),
        capability('skill_invocation', 'standard', 'Can invoke test generation and regression skills.'),
        capability('mcp_request', 'disabled', 'Cannot execute or request MCP actions by default.'),
      ],
      allowedSkills: ['acceptance_extraction', 'test_case_generation', 'regression_suggestion', 'report_generation'],
    }),
    makeProfile({
      id: 'agent-profile-developer-analysis',
      role: 'developer_analysis',
      displayName: 'Developer Analysis Agent',
      purpose: 'Analyze failed evidence, likely layers, and regression suggestions from supplied artifacts.',
      persona: 'Evidence-bounded defect analyst.',
      responsibilities: [
        'Analyze defects and likely causes from provided evidence.',
        'Preserve uncertainty when source, logs, or environment facts are missing.',
      ],
      decisionPolicy: [
        'Do not claim root cause without supporting evidence.',
        'Keep fix suggestions advisory until validated.',
      ],
      capabilities: [
        capability('reflection', 'standard', 'Can check defect and severity evidence boundaries.'),
        capability('planning', 'standard', 'Can draft analysis and regression plan steps.'),
        capability('action', 'standard', 'Can request analysis Skills and approval-gated future reads.'),
        capability('skill_invocation', 'standard', 'Can invoke severity, defect, and regression skills.'),
      ],
      allowedSkills: ['severity_classification', 'defect_analysis', 'regression_suggestion', 'audit_trail'],
      allowedMcpCapabilities: ['filesystem_repository', 'git', 'log_monitoring'],
      defaultRiskLevel: 'MEDIUM',
    }),
    makeProfile({
      id: 'agent-profile-ops-check',
      role: 'ops_check',
      displayName: 'Ops Check Agent',
      purpose: 'Draft operational checks and future approval-gated MCP requests for deployment, logs, backups, restore, and environment readiness.',
      persona: 'Operations risk reviewer.',
      responsibilities: [
        'Identify release-blocking operational risks.',
        'Request approval for high-risk future MCP actions.',
        'Reject production destructive operations.',
      ],
      decisionPolicy: [
        'High-risk command, database, browser, API, or environment actions require approval.',
        'Production destructive actions are forbidden.',
      ],
      capabilities: [
        capability('planning', 'standard', 'Can draft ops verification plans.'),
        capability('action', 'advanced', 'Can draft future MCP action requests, never execute them.', true),
        capability('mcp_request', 'advanced', 'Can request logs, config, database, browser, terminal, API, and attachments in future phases.', true),
        capability('approval_request', 'advanced', 'Can require approval for high-risk operational actions.', true),
        capability('reflection', 'standard', 'Can check ops and boundary risks.'),
        capability('skill_invocation', 'standard', 'Can invoke ops, severity, approval, and audit skills.'),
      ],
      allowedSkills: ['ops_checklist', 'severity_classification', 'approval_policy', 'audit_trail', 'report_generation'],
      allowedMcpCapabilities: [
        'filesystem_repository',
        'git',
        'terminal_command',
        'browser_automation',
        'http_api',
        'database',
        'log_monitoring',
        'screenshot_attachment',
      ],
      defaultRiskLevel: 'HIGH',
    }),
    makeProfile({
      id: 'agent-profile-user-representative',
      role: 'user_representative',
      displayName: 'User Representative Agent',
      purpose: 'Represent small-team user workflows, usability concerns, and scenario expectations.',
      persona: 'Small-team workflow and usability representative.',
      responsibilities: [
        'Identify usability gaps and user-flow unknowns.',
        'Keep persona reasoning separate from execution evidence.',
      ],
      decisionPolicy: [
        'Do not request high-risk MCP actions.',
        'Do not treat persona expectations as pass evidence.',
      ],
      capabilities: [
        capability('persona_modeling', 'advanced', 'Can reason about small-team scenarios and usability expectations.'),
        capability('planning', 'basic', 'Can draft scenario review tasks.'),
        capability('reflection', 'basic', 'Can check user-flow unknowns.'),
        capability('action', 'basic', 'Can request low-risk deterministic skills only.'),
        capability('mcp_request', 'disabled', 'No high-risk MCP access by default.'),
      ],
      allowedSkills: ['acceptance_extraction', 'test_case_generation', 'report_generation'],
    }),
  ];
}

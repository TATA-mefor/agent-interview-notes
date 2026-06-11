import type {
  AgentRole,
  EvidenceId,
  IsoDateTimeString,
  MarkdownString,
  TestCaseId,
} from '../types';

export type AgentReflectionPromptType =
  | 'coverage_check'
  | 'evidence_check'
  | 'severity_check'
  | 'report_check'
  | 'release_check'
  | 'boundary_check';

export interface AgentReflectionNote {
  id: MarkdownString;
  runId: MarkdownString;
  agentRole: AgentRole;
  promptType: AgentReflectionPromptType;
  summary: MarkdownString;
  findings: MarkdownString[];
  recommendedActions: MarkdownString[];
  relatedEvidenceIds: EvidenceId[];
  relatedTestCaseIds: TestCaseId[];
  limitations: MarkdownString[];
  createdAt: IsoDateTimeString;
}

export function createReflectionNote(params: {
  id?: MarkdownString;
  runId: MarkdownString;
  agentRole: AgentRole;
  promptType: AgentReflectionPromptType;
  summary: MarkdownString;
  findings?: MarkdownString[];
  recommendedActions?: MarkdownString[];
  relatedEvidenceIds?: EvidenceId[];
  relatedTestCaseIds?: TestCaseId[];
  limitations?: MarkdownString[];
  createdAt?: IsoDateTimeString;
}): AgentReflectionNote {
  return {
    id: params.id ?? `reflection-${params.runId}-${params.agentRole}-${params.promptType}`,
    runId: params.runId,
    agentRole: params.agentRole,
    promptType: params.promptType,
    summary: params.summary,
    findings: params.findings ?? [],
    recommendedActions: params.recommendedActions ?? [],
    relatedEvidenceIds: params.relatedEvidenceIds ?? [],
    relatedTestCaseIds: params.relatedTestCaseIds ?? [],
    limitations: [
      ...(params.limitations ?? []),
      'Reflection note is a bounded one-shot self-check record.',
      'Reflection is not execution evidence and cannot prove a test passed.',
      'No LLM, MCP, file read, command execution, or external lookup was used by this utility.',
    ],
    createdAt: params.createdAt ?? '',
  };
}

export function buildBoundaryReflection(params: {
  runId: MarkdownString;
  agentRole: AgentRole;
  checkedBoundaries: MarkdownString[];
  violations?: MarkdownString[];
  missingEvidence?: MarkdownString[];
  relatedEvidenceIds?: EvidenceId[];
  relatedTestCaseIds?: TestCaseId[];
}): AgentReflectionNote {
  const violations = params.violations ?? [];
  const missingEvidence = params.missingEvidence ?? [];
  const findings = [
    ...params.checkedBoundaries.map((boundary) => `Checked boundary: ${boundary}`),
    ...violations.map((violation) => `Boundary violation: ${violation}`),
    ...missingEvidence.map((gap) => `Missing evidence: ${gap}`),
  ];

  return createReflectionNote({
    runId: params.runId,
    agentRole: params.agentRole,
    promptType: 'boundary_check',
    summary: violations.length > 0
      ? `Boundary reflection found ${violations.length} violation(s).`
      : 'Boundary reflection found no supplied boundary violations.',
    findings,
    recommendedActions: [
      ...violations.map((violation) => `Resolve or block boundary issue: ${violation}`),
      ...missingEvidence.map((gap) => `Collect or record missing evidence: ${gap}`),
    ],
    relatedEvidenceIds: params.relatedEvidenceIds,
    relatedTestCaseIds: params.relatedTestCaseIds,
  });
}

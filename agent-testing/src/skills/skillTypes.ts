import type {
  AgentRole,
  EvidenceId,
  IsoDateTimeString,
  MarkdownString,
  SkillName,
  SkillRiskLevel,
  SourceReference,
} from '../types';

export type SkillIssueSeverity = 'info' | 'warning' | 'error';

export interface SkillExecutionContext {
  runId: string;
  invokedByAgent: AgentRole;
  createdAt: IsoDateTimeString;
  source: SourceReference;
  limitations: MarkdownString[];
}

export interface SkillIssue {
  code: string;
  message: MarkdownString;
  severity: SkillIssueSeverity;
  field?: string;
  recoverable: boolean;
}

export interface SkillTraceEntry {
  step: string;
  summary: MarkdownString;
}

export interface SkillResult<TOutput> {
  skillName: SkillName;
  success: boolean;
  output: TOutput;
  issues: SkillIssue[];
  /*
   * Skill-produced evidence IDs are process artifacts only unless later
   * evidence normalization links them to real execution observations.
   */
  evidenceProduced: EvidenceId[];
  evidenceRequired: MarkdownString[];
  limitations: MarkdownString[];
  trace: SkillTraceEntry[];
}

export interface DeterministicSkill<TInput, TOutput> {
  name: SkillName;
  riskLevel: SkillRiskLevel;
  run(
    input: TInput,
    context: SkillExecutionContext
  ): SkillResult<TOutput>;
}

export function createSkillResult<TOutput>(params: {
  skillName: SkillName;
  output: TOutput;
  issues?: SkillIssue[];
  evidenceProduced?: EvidenceId[];
  evidenceRequired?: MarkdownString[];
  limitations?: MarkdownString[];
  trace?: SkillTraceEntry[];
}): SkillResult<TOutput> {
  const issues = params.issues ?? [];

  return {
    skillName: params.skillName,
    success: issues.filter((issue) => issue.severity === 'error').length === 0,
    output: params.output,
    issues,
    evidenceProduced: params.evidenceProduced ?? [],
    evidenceRequired: params.evidenceRequired ?? [],
    limitations: params.limitations ?? [],
    trace: params.trace ?? [],
  };
}

import {
  generateMarkdownReport,
  type MarkdownReportInput,
  type MarkdownReportOutput,
} from '../report';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface ReportGenerationSkillInput {
  report: MarkdownReportInput;
}

export interface ReportGenerationSkillOutput extends MarkdownReportOutput {}

export function generateReportSkill(
  input: ReportGenerationSkillInput,
  context: SkillExecutionContext
): SkillResult<ReportGenerationSkillOutput> {
  const output = generateMarkdownReport(input.report);
  const skillIssues: SkillIssue[] = [];

  for (const missingInput of output.missingInputs) {
    skillIssues.push({
      code: 'REPORT_INPUT_MISSING',
      message: `Missing report input: ${missingInput}`,
      severity: 'warning',
      field: missingInput,
      recoverable: true,
    });
  }

  for (const warning of output.warnings) {
    skillIssues.push({
      code: 'REPORT_WARNING',
      message: warning,
      severity: 'warning',
      recoverable: true,
    });
  }

  return createSkillResult({
    skillName: 'report_generation',
    output,
    issues: skillIssues,
    evidenceProduced: [],
    evidenceRequired: [],
    limitations: [
      ...context.limitations,
      ...output.limitations,
      'Report generation Skill did not write files, call MCP, call LLM, execute tests, or calculate release recommendation rules.',
    ],
    trace: [
      {
        step: 'generate_markdown_report',
        summary: `Generated Markdown report with ${output.sections.length} section summary entries.`,
      },
      {
        step: 'collect_report_warnings',
        summary: `Recorded ${output.warnings.length} warning(s) and ${output.missingInputs.length} missing input(s).`,
      },
    ],
  });
}

export const reportGenerationSkill: DeterministicSkill<
  ReportGenerationSkillInput,
  ReportGenerationSkillOutput
> = {
  name: 'report_generation',
  riskLevel: 'LOW',
  run: generateReportSkill,
};

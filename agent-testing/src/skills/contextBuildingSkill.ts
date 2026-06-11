import type {
  MarkdownString,
  SourceReference,
} from '../types';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface ContextBuildingInput {
  targetSystemName: string;
  targetSystemType: string;
  description: MarkdownString;
  modules: string[];
  contextSources: SourceReference[];
  knownConstraints: MarkdownString[];
}

export interface ModuleContext {
  name: string;
  riskHints: MarkdownString[];
}

export interface ContextBuildingOutput {
  targetSystem: {
    name: string;
    type: string;
    description: MarkdownString;
  };
  moduleMap: ModuleContext[];
  riskAreas: MarkdownString[];
  contextSources: SourceReference[];
  unknowns: MarkdownString[];
  recommendedNextSkills: Array<
    'acceptance_extraction' | 'test_case_generation' | 'ops_checklist'
  >;
}

const SMALL_SYSTEM_RISK_RULES: Array<{
  keywords: string[];
  risk: MarkdownString;
}> = [
  {
    keywords: ['multi-user', 'multi user', '多人', '协作', '共享'],
    risk: 'Multi-user workflows may need conflict, ownership, and permission checks.',
  },
  {
    keywords: ['permission', 'private', 'auth', 'login', '权限', '私密', '登录'],
    risk: 'Permission and privacy behavior needs explicit evidence.',
  },
  {
    keywords: ['backup', 'restore', '备份', '恢复'],
    risk: 'Backup and restore paths need reproducible command or artifact evidence.',
  },
  {
    keywords: ['log', 'monitor', '日志', '监控'],
    risk: 'Logging and monitoring coverage must distinguish missing logs from no issue.',
  },
  {
    keywords: ['upload', 'attachment', 'file', '附件', '上传', '文件'],
    risk: 'File or attachment flows need format, size, and persistence checks.',
  },
  {
    keywords: ['search', 'retrieval', '检索', '搜索'],
    risk: 'Search quality needs representative examples and expected ranking or recall.',
  },
  {
    keywords: ['deploy', 'server', 'docker', 'env', '部署', '服务器', '环境'],
    risk: 'Deployment configuration needs separate static review and live validation.',
  },
  {
    keywords: ['data', 'database', 'sync', '数据', '数据库', '一致性'],
    risk: 'Data consistency needs write, read-back, and recovery checks.',
  },
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function collectRiskAreas(input: ContextBuildingInput): MarkdownString[] {
  const searchable = [
    input.targetSystemType,
    input.description,
    ...input.modules,
    ...input.knownConstraints,
  ]
    .map(normalizeText)
    .join(' ');

  return SMALL_SYSTEM_RISK_RULES.filter((rule) =>
    rule.keywords.some((keyword) => searchable.includes(keyword.toLowerCase()))
  ).map((rule) => rule.risk);
}

function riskHintsForModule(moduleName: string): MarkdownString[] {
  const normalized = normalizeText(moduleName);

  return SMALL_SYSTEM_RISK_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  ).map((rule) => rule.risk);
}

export function buildContext(
  input: ContextBuildingInput,
  context: SkillExecutionContext
): SkillResult<ContextBuildingOutput> {
  const issues: SkillIssue[] = [];
  const unknowns: MarkdownString[] = [];

  if (!input.description.trim()) {
    issues.push({
      code: 'CONTEXT_DESCRIPTION_MISSING',
      message: 'Target system description is missing.',
      severity: 'warning',
      field: 'description',
      recoverable: true,
    });
    unknowns.push('Target system behavior is unknown because description is missing.');
  }

  if (input.modules.length === 0) {
    issues.push({
      code: 'CONTEXT_MODULES_MISSING',
      message: 'No modules were provided for context building.',
      severity: 'warning',
      field: 'modules',
      recoverable: true,
    });
    unknowns.push('Module map is incomplete because no modules were provided.');
  }

  if (input.contextSources.length === 0) {
    unknowns.push('No context sources were supplied for traceability.');
  }

  const riskAreas = collectRiskAreas(input);
  const moduleMap = input.modules.map((moduleName) => ({
    name: moduleName,
    riskHints: riskHintsForModule(moduleName),
  }));

  if (riskAreas.length === 0) {
    unknowns.push('No deterministic risk keywords matched the provided context.');
  }

  return createSkillResult({
    skillName: 'context_building',
    output: {
      targetSystem: {
        name: input.targetSystemName,
        type: input.targetSystemType,
        description: input.description,
      },
      moduleMap,
      riskAreas,
      contextSources: input.contextSources,
      unknowns,
      recommendedNextSkills: [
        'acceptance_extraction',
        'test_case_generation',
        'ops_checklist',
      ],
    },
    issues,
    evidenceProduced: [],
    evidenceRequired: ['Source text or document references for system context.'],
    limitations: [
      ...context.limitations,
      'Context was built only from provided input; no files, logs, services, or runtime state were inspected.',
      'Risk areas are deterministic keyword matches and are not proof of system behavior.',
    ],
    trace: [
      {
        step: 'input_summary',
        summary: `Received ${input.modules.length} modules and ${input.contextSources.length} context sources.`,
      },
      {
        step: 'risk_mapping',
        summary: `Matched ${riskAreas.length} deterministic small-system risk areas.`,
      },
    ],
  });
}

export const contextBuildingSkill: DeterministicSkill<
  ContextBuildingInput,
  ContextBuildingOutput
> = {
  name: 'context_building',
  riskLevel: 'LOW',
  run: buildContext,
};

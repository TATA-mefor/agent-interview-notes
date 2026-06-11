import type {
  AgentRole,
  DefectFinding,
  MarkdownString,
  Severity,
  SeverityClassification,
  SystemTestCase,
  SystemTestEvidence,
  TestCaseId,
  TestPriority,
} from '../types';
import type {
  DefectAnalysisOutput,
} from '../defects';
import type {
  OpsChecklistItem,
} from '../ops';
import type {
  SeverityClassificationOutput,
} from '../severity';

export type RegressionScopeCategory =
  | 'authentication'
  | 'authorization'
  | 'permission'
  | 'data_integrity'
  | 'multi_user'
  | 'file_upload'
  | 'search'
  | 'backup_restore'
  | 'logging_monitoring'
  | 'deployment'
  | 'database'
  | 'ui_usability'
  | 'api_contract'
  | 'ops'
  | 'unknown';

export interface RegressionSuggestionInput {
  defect?: DefectFinding;
  defectAnalysis?: DefectAnalysisOutput;
  severityClassification?: SeverityClassification | SeverityClassificationOutput;
  testCase?: SystemTestCase;
  evidence?: SystemTestEvidence | SystemTestEvidence[];
  opsRisks?: OpsChecklistItem[];
  availableTestCases?: SystemTestCase[];
  affectedModule?: MarkdownString;
  fixSummary?: MarkdownString;
  notes?: MarkdownString;
}

export interface RegressionSuggestionItem {
  id: MarkdownString;
  title: MarkdownString;
  scopeCategory: RegressionScopeCategory;
  priority: TestPriority;
  reason: MarkdownString;
  relatedDefectId: MarkdownString;
  relatedTestCaseIds: TestCaseId[];
  suggestedSteps: MarkdownString[];
  requiredEvidence: MarkdownString[];
  ownerAgent: AgentRole;
  tags: string[];
  limitations: MarkdownString[];
}

export interface RegressionSuggestionOutput {
  items: RegressionSuggestionItem[];
  recommendedScope: RegressionScopeCategory[];
  requiredEvidence: MarkdownString[];
  unknowns: MarkdownString[];
  limitations: MarkdownString[];
}

interface RegressionRule {
  category: RegressionScopeCategory;
  keywords: string[];
  title: MarkdownString;
  reason: MarkdownString;
  suggestedSteps: MarkdownString[];
  requiredEvidence: MarkdownString[];
  tags: string[];
  forceHighPriority?: boolean;
}

function toEvidenceList(
  evidence: SystemTestEvidence | SystemTestEvidence[] | undefined
): SystemTestEvidence[] {
  if (!evidence) {
    return [];
  }

  return Array.isArray(evidence) ? evidence : [evidence];
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function getSeverity(
  input: RegressionSuggestionInput
): Severity {
  if (input.severityClassification) {
    if ('classification' in input.severityClassification) {
      return input.severityClassification.classification.severity;
    }

    return input.severityClassification.severity;
  }

  return input.defect?.severity ?? 'unknown';
}

function severityReason(input: RegressionSuggestionInput): MarkdownString | undefined {
  if (!input.severityClassification) {
    return undefined;
  }

  if ('classification' in input.severityClassification) {
    return input.severityClassification.reason;
  }

  return input.severityClassification.reason;
}

function buildCorpus(input: RegressionSuggestionInput, evidence: SystemTestEvidence[]): string {
  const parts: Array<MarkdownString | undefined> = [
    input.defect?.title,
    input.defect?.actualResult,
    input.defect?.expectedResult,
    input.defect?.affectedArea,
    input.defect?.recommendation,
    input.defectAnalysis?.possibleCause,
    input.defectAnalysis?.fixSuggestion,
    input.defectAnalysis?.regressionSuggestion,
    input.defectAnalysis?.causeCategory,
    input.defectAnalysis?.suspectedLayer,
    input.testCase?.title,
    input.testCase?.scope,
    input.testCase?.expectedResult,
    input.testCase?.tags.join(' '),
    input.affectedModule,
    input.fixSummary,
    input.notes,
    severityReason(input),
    ...(input.opsRisks ?? []).flatMap((item) => [
      item.title,
      item.category,
      item.relatedRisk,
      item.description,
      item.tags.join(' '),
    ]),
    ...evidence.flatMap((item) => [
      item.testScope,
      item.executionMethod,
      item.result,
      item.evidenceSummary,
      item.recommendation,
      item.limitations.join(' '),
    ]),
  ];

  return parts.filter((part): part is MarkdownString => Boolean(part)).join(' ').toLowerCase();
}

function matchesAny(corpus: string, keywords: string[]): boolean {
  return keywords.some((keyword) => corpus.includes(keyword.toLowerCase()));
}

const REGRESSION_RULES: RegressionRule[] = [
  {
    category: 'permission',
    keywords: [
      'permission',
      'authorization',
      'private',
      'shared',
      'unauthorized',
      'access denied',
      '越权',
      '权限',
      '私密',
      '共享',
    ],
    title: 'Permission and private-data regression coverage',
    reason: 'The defect context points to permission, authorization, private data, or shared-data boundaries.',
    suggestedSteps: [
      'Verify authenticated access control for protected pages.',
      'Verify regular users cannot access administrator functions.',
      'Verify users cannot access other users private data.',
      'Verify shared data is visible only to authorized users.',
      'Verify API permission checks reject unauthorized access.',
      'Verify search results are filtered by permission.',
    ],
    requiredEvidence: [
      'permission matrix',
      'browser screenshot',
      'API response',
      'user account setup',
      'before/after comparison',
    ],
    tags: ['permission', 'authorization', 'privacy'],
    forceHighPriority: true,
  },
  {
    category: 'authentication',
    keywords: [
      'login',
      'session',
      'token',
      'authentication',
      'auth',
      '未登录',
      '登录',
      '会话',
    ],
    title: 'Authentication flow regression coverage',
    reason: 'The defect context points to login state, session handling, token handling, or authentication guards.',
    suggestedSteps: [
      'Verify normal login succeeds with valid credentials.',
      'Verify failed login shows a safe and clear message.',
      'Verify unauthenticated users cannot access protected pages.',
      'Verify expired sessions require re-authentication.',
      'Verify abnormal token or session input is rejected safely.',
    ],
    requiredEvidence: [
      'browser screenshot',
      'API response',
      'session state record',
      'human observation',
    ],
    tags: ['auth', 'session'],
  },
  {
    category: 'data_integrity',
    keywords: [
      'data loss',
      'overwrite',
      'conflict',
      'concurrent',
      'multi-user',
      '数据丢失',
      '覆盖',
      '冲突',
      '并发',
    ],
    title: 'Data integrity and concurrent-use regression coverage',
    reason: 'The defect context points to possible data loss, overwrite behavior, conflicts, or multi-user concurrency.',
    suggestedSteps: [
      'Verify data creation persists correctly.',
      'Verify data edits persist correctly.',
      'Verify delete or restore behavior is traceable.',
      'Verify multiple users editing at the same time do not silently overwrite data.',
      'Verify conflict messages or resolution behavior are visible.',
      'Verify data consistency after the conflicting workflow.',
    ],
    requiredEvidence: [
      'database check',
      'API response',
      'browser screenshot',
      'before/after comparison',
      'human observation',
    ],
    tags: ['data-integrity', 'multi-user', 'concurrency'],
    forceHighPriority: true,
  },
  {
    category: 'file_upload',
    keywords: [
      'upload',
      'attachment',
      'file',
      'storage',
      '上传',
      '附件',
      '文件',
    ],
    title: 'File upload and attachment regression coverage',
    reason: 'The defect context points to upload handling, attachment access, file validation, or storage behavior.',
    suggestedSteps: [
      'Verify normal upload succeeds.',
      'Verify upload failure shows a safe and clear message.',
      'Verify file size boundaries.',
      'Verify file type boundaries.',
      'Verify attachment permissions.',
      'Verify storage-space error behavior is visible.',
    ],
    requiredEvidence: [
      'attachment artifact',
      'browser screenshot',
      'API response',
      'storage configuration summary',
    ],
    tags: ['file-upload', 'attachment', 'storage'],
  },
  {
    category: 'search',
    keywords: [
      'search',
      'index',
      'query',
      '搜索',
      '索引',
    ],
    title: 'Search behavior regression coverage',
    reason: 'The defect context points to search query behavior, index freshness, result accuracy, or permission-filtered search.',
    suggestedSteps: [
      'Verify exact search returns expected records.',
      'Verify fuzzy search returns reasonable records.',
      'Verify no-result state is clear.',
      'Verify newly added or modified data appears in search as expected.',
      'Verify search results are filtered by permission.',
    ],
    requiredEvidence: [
      'browser screenshot',
      'API response',
      'expected result set',
      'before/after comparison',
    ],
    tags: ['search', 'index'],
  },
  {
    category: 'backup_restore',
    keywords: [
      'backup',
      'restore',
      'recovery',
      '备份',
      '恢复',
    ],
    title: 'Backup and restore regression coverage',
    reason: 'The defect context points to backup generation, restore flow, recovery validation, or backup artifact usability.',
    suggestedSteps: [
      'Verify backup artifact generation.',
      'Verify backup artifact is usable and located in the expected place.',
      'Verify restore procedure can be followed.',
      'Verify restored data consistency.',
      'Verify restore failure is recorded.',
    ],
    requiredEvidence: [
      'backup artifact',
      'restore record',
      'database check',
      'log excerpt',
      'human observation',
    ],
    tags: ['backup', 'restore', 'data-safety'],
    forceHighPriority: true,
  },
  {
    category: 'logging_monitoring',
    keywords: [
      'log',
      'monitoring',
      'alert',
      '日志',
      '监控',
      '告警',
    ],
    title: 'Logging and monitoring regression coverage',
    reason: 'The defect context points to missing logs, monitoring gaps, alerting gaps, or sensitive information in diagnostics.',
    suggestedSteps: [
      'Verify failed login creates a safe log entry.',
      'Verify failed save creates a diagnostic log entry.',
      'Verify failed upload creates a diagnostic log entry.',
      'Verify permission denial creates a safe log entry.',
      'Verify service exceptions are observable.',
      'Verify sensitive information is redacted from logs.',
    ],
    requiredEvidence: [
      'log excerpt',
      'monitoring screenshot',
      'alert record',
      'human observation',
    ],
    tags: ['logging', 'monitoring'],
  },
  {
    category: 'deployment',
    keywords: [
      'deploy',
      'env',
      'environment',
      'proxy',
      'nginx',
      'port',
      'network',
      '部署',
      '环境变量',
      '反向代理',
      '端口',
      '网络',
    ],
    title: 'Deployment, environment, and network regression coverage',
    reason: 'The defect context points to deployment availability, environment variables, proxy routes, ports, or network access.',
    suggestedSteps: [
      'Verify service startup.',
      'Verify page access through the documented URL.',
      'Verify API access through the documented route.',
      'Verify required environment variables are present.',
      'Verify reverse proxy and port configuration.',
      'Verify service recovery after restart.',
    ],
    requiredEvidence: [
      'browser screenshot',
      'API response',
      'environment variable checklist',
      'reverse proxy config snippet',
      'command output',
    ],
    tags: ['deployment', 'environment', 'network'],
  },
  {
    category: 'ui_usability',
    keywords: [
      'ui',
      'usability',
      'layout',
      'copy',
      'prompt',
      '易用性',
      '布局',
      '文案',
      '提示',
    ],
    title: 'UI usability regression coverage',
    reason: 'The defect context points to user-facing workflow, layout, copy, prompt, or validation behavior.',
    suggestedSteps: [
      'Verify the key page workflow remains usable.',
      'Verify error prompts are clear.',
      'Verify delete or dangerous operations require confirmation.',
      'Verify form validation messages are visible.',
      'Verify mobile or small-screen layout when applicable.',
    ],
    requiredEvidence: [
      'browser screenshot',
      'human observation',
      'before/after comparison',
    ],
    tags: ['ui', 'usability'],
  },
];

function inferPriority(severity: Severity, rule: RegressionRule | undefined): TestPriority {
  if (rule?.forceHighPriority) {
    return 'high';
  }

  if (severity === 'P0' || severity === 'P1') {
    return 'high';
  }

  if (severity === 'P2' || severity === 'unknown') {
    return 'medium';
  }

  return 'low';
}

function testCaseMatchesRule(testCase: SystemTestCase, rule: RegressionRule): boolean {
  const corpus = [
    testCase.id,
    testCase.title,
    testCase.scope,
    testCase.sourceRequirement,
    testCase.expectedResult,
    testCase.tags.join(' '),
    testCase.requiredEvidence.join(' '),
  ].join(' ').toLowerCase();

  return (
    corpus.includes(rule.category.replace(/_/g, ' ')) ||
    rule.tags.some((tag) => corpus.includes(tag.toLowerCase())) ||
    matchesAny(corpus, rule.keywords)
  );
}

function relatedTestCaseIds(
  input: RegressionSuggestionInput,
  rule: RegressionRule
): TestCaseId[] {
  const directIds = [
    input.defect?.testCaseId,
    input.testCase?.id,
  ].filter((id): id is TestCaseId => Boolean(id));

  const matchedAvailable = (input.availableTestCases ?? [])
    .filter((testCase) => testCaseMatchesRule(testCase, rule))
    .map((testCase) => testCase.id);

  return uniqueList([...directIds, ...matchedAvailable]);
}

function buildUnknowns(input: RegressionSuggestionInput, evidence: SystemTestEvidence[]): MarkdownString[] {
  const unknowns: MarkdownString[] = [];

  if (!input.defect) {
    unknowns.push('Defect finding is missing.');
  }

  if (!input.defectAnalysis) {
    unknowns.push('Defect analysis is missing.');
  }

  if (!input.testCase) {
    unknowns.push('Original test case is missing.');
  }

  if (evidence.length === 0) {
    unknowns.push('Evidence is missing; regression scope is based on metadata only.');
  }

  if (!input.fixSummary) {
    unknowns.push('Fix summary is missing; adjacent regression impact may be incomplete.');
  }

  if (getSeverity(input) === 'unknown') {
    unknowns.push('Severity is unknown; priority uses conservative defaults.');
  }

  return unknowns;
}

export function suggestRegression(
  input: RegressionSuggestionInput
): RegressionSuggestionOutput {
  const evidence = toEvidenceList(input.evidence);
  const corpus = buildCorpus(input, evidence);
  const severity = getSeverity(input);
  const matchedRules = REGRESSION_RULES.filter((rule) => matchesAny(corpus, rule.keywords));
  const selectedRules = matchedRules.length > 0
    ? matchedRules
    : [
        {
          category: 'unknown',
          keywords: [],
          title: 'Clarify regression scope after additional evidence',
          reason: 'No deterministic regression scope matched the provided defect context.',
          suggestedSteps: [
            'Collect reproduction evidence for the failing workflow.',
            'Confirm the affected module and expected behavior.',
            'Define regression cases after the fix scope is known.',
          ],
          requiredEvidence: [
            'human observation',
            'browser screenshot',
            'API response',
            'before/after comparison',
          ],
          tags: ['unknown'],
        } satisfies RegressionRule,
      ];

  const unknowns = buildUnknowns(input, evidence);
  const items = selectedRules.map((rule, index): RegressionSuggestionItem => {
    const priority = inferPriority(severity, rule);
    const itemLimitations = [
      'Regression suggestion only describes recommended coverage; it does not execute regression tests.',
    ];

    if (severity === 'unknown') {
      itemLimitations.push('Severity is unknown, so priority is conservative.');
    }

    if (evidence.length === 0) {
      itemLimitations.push('No evidence was provided for this suggestion.');
    }

    return {
      id: `REG-${rule.category.toUpperCase().replace(/_/g, '-')}-${String(index + 1).padStart(3, '0')}`,
      title: rule.title,
      scopeCategory: rule.category,
      priority,
      reason: rule.reason,
      relatedDefectId: input.defect?.id ?? 'unknown',
      relatedTestCaseIds: relatedTestCaseIds(input, rule),
      suggestedSteps: rule.suggestedSteps,
      requiredEvidence: rule.requiredEvidence,
      ownerAgent: 'test_design',
      tags: uniqueList([
        rule.category,
        ...(input.affectedModule ? [input.affectedModule] : []),
        ...rule.tags,
      ]),
      limitations: uniqueList(itemLimitations),
    };
  });

  return {
    items,
    recommendedScope: uniqueList(items.map((item) => item.scopeCategory)),
    requiredEvidence: uniqueList(items.flatMap((item) => item.requiredEvidence)),
    unknowns,
    limitations: uniqueList([
      'Regression suggestions are planning artifacts only and do not prove that regression testing passed.',
      'The utility did not read files, run commands, access networks, connect to databases, call MCP, or call LLMs.',
      'Existing test cases and defects were not modified.',
      ...unknowns,
    ]),
  };
}

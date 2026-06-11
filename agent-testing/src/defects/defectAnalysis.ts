import type {
  ConfidenceScore,
  DefectFinding,
  MarkdownString,
  OpsRisk,
  SeverityClassification,
  SuspectedLayer,
  SystemTestCase,
  SystemTestEvidence,
} from '../types';
import type {
  SeverityClassificationOutput,
} from '../severity';
import type {
  OpsChecklistItem,
} from '../ops';

export type SuspectedCauseCategory =
  | 'frontend_behavior'
  | 'backend_logic'
  | 'database_state'
  | 'permission_policy'
  | 'authentication_flow'
  | 'deployment_configuration'
  | 'environment_variable'
  | 'network_or_proxy'
  | 'file_storage'
  | 'search_index'
  | 'backup_restore'
  | 'logging_monitoring'
  | 'test_process'
  | 'tooling'
  | 'unknown';

export interface DefectAnalysisInput {
  defect?: DefectFinding;
  testCase?: SystemTestCase;
  evidence?: SystemTestEvidence | SystemTestEvidence[];
  severityClassification?: SeverityClassification | SeverityClassificationOutput;
  opsRisks?: OpsChecklistItem[] | OpsRisk[] | MarkdownString[];
  affectedModule?: MarkdownString;
  notes?: MarkdownString;
}

export interface DefectAnalysisOutput {
  suspectedLayer: SuspectedLayer;
  causeCategory: SuspectedCauseCategory;
  possibleCause: MarkdownString;
  fixSuggestion: MarkdownString;
  regressionSuggestion: MarkdownString;
  uncertainty: MarkdownString;
  requiredAdditionalEvidence: MarkdownString[];
  relatedRisks: MarkdownString[];
  confidence: ConfidenceScore;
  limitations: MarkdownString[];
}

interface KeywordRule {
  keywords: string[];
  suspectedLayer: SuspectedLayer;
  causeCategory: SuspectedCauseCategory;
  possibleCause: MarkdownString;
  fixSuggestion: MarkdownString;
  regressionSuggestion: MarkdownString;
  requiredAdditionalEvidence: MarkdownString[];
  relatedRisks: MarkdownString[];
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
  severityClassification: DefectAnalysisInput['severityClassification']
): SeverityClassification | undefined {
  if (!severityClassification) {
    return undefined;
  }

  if ('classification' in severityClassification) {
    return severityClassification.classification;
  }

  return severityClassification;
}

function normalizeOpsRisk(risk: OpsChecklistItem | OpsRisk | MarkdownString): MarkdownString {
  if (typeof risk === 'string') {
    return risk;
  }

  if ('relatedRisk' in risk) {
    return `${risk.title}: ${risk.relatedRisk}`;
  }

  return `${risk.area}: ${risk.description} (${risk.severity})`;
}

function buildCorpus(input: DefectAnalysisInput, evidence: SystemTestEvidence[]): string {
  const severity = getSeverity(input.severityClassification);
  const parts: MarkdownString[] = [
    input.defect?.title,
    input.defect?.actualResult,
    input.defect?.expectedResult,
    input.defect?.affectedArea,
    input.defect?.recommendation,
    input.testCase?.title,
    input.testCase?.scope,
    input.testCase?.expectedResult,
    input.testCase?.tags.join(' '),
    input.affectedModule,
    input.notes,
    severity?.severity,
    severity?.reason,
    ...evidence.flatMap((item) => [
      item.testScope,
      item.executionMethod,
      item.executorType,
      item.result,
      item.evidenceSource,
      item.evidenceSummary,
      item.command,
      item.apiRequest,
      item.apiResponse,
      item.logs?.join(' '),
      item.recommendation,
      item.limitations.join(' '),
    ]),
    ...(input.opsRisks ?? []).map(normalizeOpsRisk),
  ].filter((part): part is MarkdownString => Boolean(part));

  return parts.join(' ').toLowerCase();
}

function matchesAny(corpus: string, keywords: string[]): boolean {
  return keywords.some((keyword) => corpus.includes(keyword.toLowerCase()));
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: [
      'permission',
      'authorization',
      'private',
      'shared',
      'access denied',
      'unauthorized',
      '越权',
      '权限',
      '私密',
      '共享',
    ],
    suspectedLayer: 'permission',
    causeCategory: 'permission_policy',
    possibleCause: 'The failure likely involves permission policy, role boundaries, or private/shared data access rules.',
    fixSuggestion: 'Review access-control rules, role checks, ownership filters, and shared-resource authorization behavior.',
    regressionSuggestion: 'Add regression coverage for regular user, owner, shared user, and admin access paths.',
    requiredAdditionalEvidence: [
      'role matrix',
      'API response',
      'browser screenshot',
      'user account setup',
      'access control rule',
    ],
    relatedRisks: [
      'permission bypass',
      'private data leak',
      'unauthorized access',
    ],
  },
  {
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
    suspectedLayer: 'auth',
    causeCategory: 'authentication_flow',
    possibleCause: 'The failure likely involves login state, session expiry, token handling, or authentication guard behavior.',
    fixSuggestion: 'Review authentication guards, session lifecycle, token validation, and unauthenticated error handling.',
    regressionSuggestion: 'Add regression coverage for unauthenticated access, failed login, session expiry, and abnormal login input.',
    requiredAdditionalEvidence: [
      'API response',
      'browser screenshot',
      'session state record',
      'user account setup',
    ],
    relatedRisks: [
      'authentication bypass',
      'session handling failure',
    ],
  },
  {
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
    suspectedLayer: 'database',
    causeCategory: 'database_state',
    possibleCause: 'The failure likely involves persistence state, write ordering, conflict handling, or concurrent update behavior.',
    fixSuggestion: 'Review data write path, transaction behavior, conflict detection, and last-write handling.',
    regressionSuggestion: 'Add regression coverage for concurrent create, edit, overwrite prevention, and recovery from conflicting updates.',
    requiredAdditionalEvidence: [
      'database check',
      'API response',
      'browser screenshot',
      'concurrency scenario',
    ],
    relatedRisks: [
      'data loss',
      'multi-user conflict',
      'silent overwrite',
    ],
  },
  {
    keywords: [
      'upload',
      'attachment',
      'file',
      'storage',
      '上传',
      '附件',
      '文件',
    ],
    suspectedLayer: 'backend',
    causeCategory: 'file_storage',
    possibleCause: 'The failure likely involves upload handling, file validation, storage configuration, or attachment permission mapping.',
    fixSuggestion: 'Review upload limits, storage path configuration, attachment metadata persistence, and authorization for file access.',
    regressionSuggestion: 'Add regression coverage for valid upload, invalid type, large file, missing storage, and attachment permission checks.',
    requiredAdditionalEvidence: [
      'attachment artifact',
      'API response',
      'browser screenshot',
      'storage configuration summary',
    ],
    relatedRisks: [
      'attachment failure',
      'storage exhaustion',
      'attachment permission leak',
    ],
  },
  {
    keywords: [
      'search',
      'index',
      'query',
      '搜索',
      '索引',
    ],
    suspectedLayer: 'backend',
    causeCategory: 'search_index',
    possibleCause: 'The failure likely involves query construction, indexing, ranking, stale search data, or permission filtering in search results.',
    fixSuggestion: 'Review search query generation, index update timing, result ranking, and authorization filters.',
    regressionSuggestion: 'Add regression coverage for known queries, no-result states, updated records, and permission-filtered search.',
    requiredAdditionalEvidence: [
      'search fixture',
      'API response',
      'browser screenshot',
      'expected result set',
    ],
    relatedRisks: [
      'search inaccuracy',
      'stale index',
      'search permission leak',
    ],
  },
  {
    keywords: [
      'backup',
      'restore',
      'recovery',
      '备份',
      '恢复',
    ],
    suspectedLayer: 'deployment',
    causeCategory: 'backup_restore',
    possibleCause: 'The failure likely involves backup coverage, restore procedure, recovery validation, or data consistency after restore.',
    fixSuggestion: 'Review backup scope, artifact storage, restore procedure, overwrite behavior, and recovery validation steps.',
    regressionSuggestion: 'Add regression coverage for backup artifact creation, restore drill, restored data consistency, and overwrite safety.',
    requiredAdditionalEvidence: [
      'backup artifact',
      'restore record',
      'database check',
      'deployment document',
    ],
    relatedRisks: [
      'backup failure',
      'restore failure',
      'data safety risk',
    ],
  },
  {
    keywords: [
      'log',
      'monitoring',
      'alert',
      '日志',
      '监控',
      '告警',
    ],
    suspectedLayer: 'deployment',
    causeCategory: 'logging_monitoring',
    possibleCause: 'The failure likely involves missing diagnostic logs, monitoring coverage, alert routing, or sensitive data in logs.',
    fixSuggestion: 'Review logging points, log levels, monitoring signals, alert ownership, and sensitive-data redaction.',
    regressionSuggestion: 'Add regression coverage for failure logging, permission-denial logging, service exception visibility, and alert discovery.',
    requiredAdditionalEvidence: [
      'log excerpt',
      'monitoring screenshot',
      'alert record',
      'failure reproduction note',
    ],
    relatedRisks: [
      'missing diagnosis path',
      'silent operational failure',
      'sensitive log exposure',
    ],
  },
  {
    keywords: [
      'proxy',
      'nginx',
      'port',
      'network',
      '反向代理',
      '端口',
      '网络',
    ],
    suspectedLayer: 'deployment',
    causeCategory: 'network_or_proxy',
    possibleCause: 'The failure likely involves network routing, reverse proxy rules, exposed ports, or access boundary configuration.',
    fixSuggestion: 'Review proxy routes, port mappings, public exposure rules, HTTPS or LAN boundaries, and service health checks.',
    regressionSuggestion: 'Add regression coverage for public URL access, internal port exposure, proxy route behavior, and admin entry protection.',
    requiredAdditionalEvidence: [
      'reverse proxy config snippet',
      'port mapping record',
      'API response',
      'browser screenshot',
    ],
    relatedRisks: [
      'network exposure',
      'admin route exposure',
      'deployment access failure',
    ],
  },
  {
    keywords: [
      'env',
      'environment',
      'environment variable',
      '环境变量',
    ],
    suspectedLayer: 'configuration',
    causeCategory: 'environment_variable',
    possibleCause: 'The failure likely involves missing, wrong, or environment-specific configuration values.',
    fixSuggestion: 'Review required environment variables, default values, secret scoping, and deployment-specific configuration.',
    regressionSuggestion: 'Add regression coverage for startup with required environment variables and controlled missing-variable behavior.',
    requiredAdditionalEvidence: [
      'environment variable checklist',
      'config snippet',
      'deployment document',
    ],
    relatedRisks: [
      'configuration drift',
      'startup failure',
    ],
  },
  {
    keywords: [
      'deploy',
      'deployment',
      '部署',
    ],
    suspectedLayer: 'deployment',
    causeCategory: 'deployment_configuration',
    possibleCause: 'The failure likely involves deployment configuration, version mismatch, restart behavior, or service availability.',
    fixSuggestion: 'Review deployment steps, version alignment, restart procedure, health checks, and environment-specific configuration.',
    regressionSuggestion: 'Add regression coverage for deployed service access, restart recovery, and frontend-backend version alignment.',
    requiredAdditionalEvidence: [
      'deployment document',
      'version output',
      'browser screenshot',
      'health check response',
    ],
    relatedRisks: [
      'deployment unavailable',
      'configuration mismatch',
    ],
  },
];

function detectTooling(input: DefectAnalysisInput, evidence: SystemTestEvidence[], corpus: string): boolean {
  const severity = getSeverity(input.severityClassification);

  return (
    evidence.some((item) => item.executorType === 'mcp_tool') &&
      evidence.some((item) => item.result === 'fail' || item.result === 'blocked')
  ) ||
    corpus.includes('tool failure') ||
    corpus.includes('mcp') ||
    severity?.limitations.some((limitation) =>
      limitation.toLowerCase().includes('tool')
    ) === true;
}

function detectSkillIssue(evidence: SystemTestEvidence[], corpus: string): boolean {
  return (
    evidence.some((item) => item.executorType === 'skill') &&
      evidence.some((item) => item.result === 'fail' || item.result === 'blocked' || item.result === 'inconclusive')
  ) ||
    corpus.includes('skill output') ||
    corpus.includes('skill incomplete') ||
    corpus.includes('incomplete skill');
}

function selectRule(corpus: string): KeywordRule | undefined {
  return KEYWORD_RULES.find((rule) => matchesAny(corpus, rule.keywords));
}

function inferConfidence(
  evidence: SystemTestEvidence[],
  severity: SeverityClassification | undefined,
  matchedRule: KeywordRule | undefined,
  limitations: MarkdownString[]
): ConfidenceScore {
  if (evidence.length === 0) {
    return 'low';
  }

  const onlyAgentReasoning = evidence.every((item) => item.executorType === 'agent_reasoning');
  const hasInconclusive = evidence.some((item) =>
    ['inconclusive', 'not_run'].includes(item.result)
  );
  const hasStrong = evidence.some((item) => item.strength === 'strong');
  const hasMedium = evidence.some((item) => item.strength === 'medium');
  const severityKnown = severity !== undefined && severity.severity !== 'unknown';

  if (onlyAgentReasoning || hasInconclusive || severity?.severity === 'unknown') {
    return 'low';
  }

  if (hasStrong && matchedRule && severityKnown && limitations.length === 0) {
    return 'high';
  }

  if ((hasStrong || hasMedium) && matchedRule) {
    return 'medium';
  }

  return 'low';
}

export function analyzeDefect(input: DefectAnalysisInput): DefectAnalysisOutput {
  const evidence = toEvidenceList(input.evidence);
  const severity = getSeverity(input.severityClassification);
  const corpus = buildCorpus(input, evidence);
  const relatedRisks = uniqueList((input.opsRisks ?? []).map(normalizeOpsRisk));
  const limitations: MarkdownString[] = [];

  if (evidence.length === 0) {
    limitations.push('No evidence was provided; analysis is limited to defect or test case metadata.');
  }

  if (evidence.every((item) => item.executorType === 'agent_reasoning') && evidence.length > 0) {
    limitations.push('Only agent reasoning evidence is present; root cause confidence is limited.');
  }

  if (evidence.some((item) => item.result === 'inconclusive' || item.result === 'not_run')) {
    limitations.push('Evidence includes inconclusive or not_run results; product behavior is not fully proven.');
  }

  if (severity?.severity === 'unknown') {
    limitations.push('Severity is unknown, so root-cause confidence is intentionally low.');
  }

  if (detectTooling(input, evidence, corpus)) {
    const toolingLimitations = uniqueList([
      ...limitations,
      'Tool failure is not direct proof of target-system failure.',
    ]);

    return {
      suspectedLayer: 'unknown',
      causeCategory: 'tooling',
      possibleCause: 'The observed failure may be caused by tool execution, MCP harness behavior, missing permissions, or environment setup before product behavior was observed.',
      fixSuggestion: 'Rerun the tool in a controlled environment, collect raw tool output, and verify the same workflow manually before treating this as a product defect.',
      regressionSuggestion: 'After product failure is confirmed, add regression coverage for the affected workflow and a separate harness check for the tool path.',
      uncertainty: 'High uncertainty because the failure source may be tooling rather than the target system.',
      requiredAdditionalEvidence: [
        'rerun tool',
        'collect raw tool output',
        'verify manually',
        'environment setup record',
      ],
      relatedRisks: uniqueList([
        ...relatedRisks,
        'tool failure may block observation',
      ]),
      confidence: 'low',
      limitations: toolingLimitations,
    };
  }

  if (detectSkillIssue(evidence, corpus)) {
    const skillLimitations = uniqueList([
      ...limitations,
      'Incomplete Skill output is a test-process issue until product behavior is independently observed.',
    ]);

    return {
      suspectedLayer: 'unknown',
      causeCategory: 'test_process',
      possibleCause: 'The issue may come from incomplete Skill input, ambiguous requirements, or insufficient evidence rather than product behavior.',
      fixSuggestion: 'Manually review the missing fields, supplement required evidence, and rerun the Skill with clearer input.',
      regressionSuggestion: 'Add fixture coverage for the incomplete Skill scenario and rerun product tests after evidence is complete.',
      uncertainty: 'High uncertainty because the input points to test-process quality rather than a confirmed product defect.',
      requiredAdditionalEvidence: [
        'manual review',
        'supplement missing evidence',
        'rerun skill with clearer input',
      ],
      relatedRisks: uniqueList([
        ...relatedRisks,
        'test-process evidence gap',
      ]),
      confidence: 'low',
      limitations: skillLimitations,
    };
  }

  const matchedRule = selectRule(corpus);

  if (!matchedRule) {
    const unknownLimitations = uniqueList([
      ...limitations,
      'No deterministic keyword rule matched the provided defect context.',
    ]);

    return {
      suspectedLayer: input.defect?.suspectedLayer ?? 'unknown',
      causeCategory: 'unknown',
      possibleCause: 'The provided evidence and metadata do not identify a deterministic suspected cause.',
      fixSuggestion: 'Collect focused evidence for the failing workflow before proposing a concrete fix.',
      regressionSuggestion: 'Create regression coverage after the affected layer and expected behavior are clarified.',
      uncertainty: 'High uncertainty because the input lacks a recognizable defect pattern.',
      requiredAdditionalEvidence: [
        'expected vs actual result',
        'reproduction steps',
        'API response or browser screenshot',
        'relevant log excerpt if available',
      ],
      relatedRisks,
      confidence: 'low',
      limitations: unknownLimitations,
    };
  }

  const confidence = inferConfidence(evidence, severity, matchedRule, limitations);
  const uncertainty =
    confidence === 'high'
      ? 'Moderate uncertainty; evidence and keywords point to a clear suspected area, but source code and environment were not inspected.'
      : 'Meaningful uncertainty remains because analysis is based only on provided evidence and structured metadata.';

  return {
    suspectedLayer: matchedRule.suspectedLayer,
    causeCategory: matchedRule.causeCategory,
    possibleCause: matchedRule.possibleCause,
    fixSuggestion: matchedRule.fixSuggestion,
    regressionSuggestion: matchedRule.regressionSuggestion,
    uncertainty,
    requiredAdditionalEvidence: matchedRule.requiredAdditionalEvidence,
    relatedRisks: uniqueList([
      ...matchedRule.relatedRisks,
      ...relatedRisks,
    ]),
    confidence,
    limitations: uniqueList([
      ...limitations,
      'Defect analysis did not read source code, logs, configuration, database state, or live environment.',
    ]),
  };
}

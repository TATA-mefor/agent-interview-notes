import type {
  AgentRole,
  DefectId,
  EvidenceId,
  IsoDateTimeString,
  MarkdownString,
  TestCaseId,
} from '../types';

export type AgentMemoryScope =
  | 'run'
  | 'project'
  | 'role'
  | 'scenario';

export type AgentMemoryKind =
  | 'short_term'
  | 'long_term'
  | 'role_policy'
  | 'scenario_context'
  | 'reflection_note';

export type AgentMemorySensitivity =
  | 'public_summary'
  | 'internal_summary'
  | 'sensitive_summary'
  | 'redacted';

export interface AgentMemoryItem {
  id: MarkdownString;
  scope: AgentMemoryScope;
  kind: AgentMemoryKind;
  ownerAgent: AgentRole;
  summary: MarkdownString;
  source: MarkdownString;
  evidenceIds: EvidenceId[];
  testCaseIds: TestCaseId[];
  defectIds: DefectId[];
  createdAt: IsoDateTimeString;
  expiresAt?: IsoDateTimeString;
  sensitivity: AgentMemorySensitivity;
  limitations: MarkdownString[];
}

export interface AgentMemoryState {
  runId: MarkdownString;
  items: AgentMemoryItem[];
  shortTermSummary: MarkdownString;
  longTermSummary: MarkdownString;
  rolePolicySummary: MarkdownString;
  limitations: MarkdownString[];
}

const SENSITIVE_PATTERNS = [
  'api key',
  'access token',
  'private key',
  'password',
  'secret',
  'credential',
  'authorization:',
  'bearer ',
  '密钥',
  '密码',
  '凭证',
  '令牌',
];

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function safeSummary(text: MarkdownString): MarkdownString {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const containsSecret = SENSITIVE_PATTERNS.some((pattern) =>
    normalized.toLowerCase().includes(pattern.toLowerCase())
  );
  const safeText = containsSecret ? '[redacted memory summary]' : normalized;

  return safeText.length > 180 ? `${safeText.slice(0, 177)}...` : safeText;
}

export function summarizeAgentMemory(items: AgentMemoryItem[]): MarkdownString {
  if (items.length === 0) {
    return 'No memory items were provided.';
  }

  const byKind = items.reduce<Record<AgentMemoryKind, number>>((counts, item) => {
    counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    return counts;
  }, {
    short_term: 0,
    long_term: 0,
    role_policy: 0,
    scenario_context: 0,
    reflection_note: 0,
  });
  const summaries = items
    .slice(0, 5)
    .map((item) => `${item.kind}:${safeSummary(item.summary)}`);

  return [
    `${items.length} memory item(s)`,
    `short_term=${byKind.short_term}`,
    `long_term=${byKind.long_term}`,
    `role_policy=${byKind.role_policy}`,
    `scenario_context=${byKind.scenario_context}`,
    `reflection_note=${byKind.reflection_note}`,
    summaries.join(' | '),
  ].filter(Boolean).join('; ');
}

export function filterMemoryForAgent(
  items: AgentMemoryItem[],
  role: AgentRole
): AgentMemoryItem[] {
  return items.filter((item) =>
    item.ownerAgent === role ||
    item.scope === 'project' ||
    item.scope === 'scenario' ||
    item.kind === 'role_policy'
  ).map((item) => ({
    ...item,
    summary: safeSummary(item.summary),
    limitations: uniqueList([
      ...item.limitations,
      'Filtered memory item is summary-only and should not be treated as execution evidence.',
    ]),
  }));
}

export function createRunMemoryState(
  runId: MarkdownString,
  items: AgentMemoryItem[] = []
): AgentMemoryState {
  const safeItems = items.map((item) => ({
    ...item,
    summary: safeSummary(item.summary),
  }));
  const shortTerm = safeItems.filter((item) => item.kind === 'short_term');
  const longTerm = safeItems.filter((item) => item.kind === 'long_term');
  const rolePolicy = safeItems.filter((item) => item.kind === 'role_policy');

  return {
    runId,
    items: safeItems,
    shortTermSummary: summarizeAgentMemory(shortTerm),
    longTermSummary: summarizeAgentMemory(longTerm),
    rolePolicySummary: summarizeAgentMemory(rolePolicy),
    limitations: [
      'Memory state is created in memory from provided items only; it is not persisted.',
      'Memory summaries are references for coordination and are not evidence of system behavior.',
      'Sensitive-looking summary text is redacted by deterministic pattern matching.',
    ],
  };
}

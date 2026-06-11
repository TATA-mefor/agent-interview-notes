import type {
  AcceptancePoint,
  AcceptancePriority,
  AmbiguityLevel,
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

export interface AcceptanceExtractionInput {
  requirementsText: MarkdownString;
  source: SourceReference;
  targetModules: string[];
  defaultPriority: AcceptancePriority;
}

export interface AcceptanceExtractionOutput {
  acceptancePoints: AcceptancePoint[];
  ambiguities: MarkdownString[];
  unknowns: MarkdownString[];
}

const REQUIREMENT_KEYWORDS = [
  '必须',
  '应该',
  '需要',
  '支持',
  '可以',
  '用户能够',
  '系统应',
  'shall',
  'should',
  'must',
  'can',
];

const ABSTRACT_WORDS = [
  'easy',
  'simple',
  'fast',
  'better',
  '友好',
  '简单',
  '快速',
  '优化',
  '完善',
];

function splitRequirementLines(text: MarkdownString): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .filter(Boolean);
}

function hasRequirementKeyword(line: string): boolean {
  const normalized = line.toLowerCase();

  return REQUIREMENT_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

function inferPriority(
  line: string,
  defaultPriority: AcceptancePriority
): AcceptancePriority {
  const normalized = line.toLowerCase();

  if (normalized.includes('必须') || normalized.includes('must') || normalized.includes('shall')) {
    return 'must';
  }

  if (normalized.includes('应该') || normalized.includes('should') || normalized.includes('需要')) {
    return 'should';
  }

  if (normalized.includes('可以') || normalized.includes('can')) {
    return 'could';
  }

  return defaultPriority;
}

function inferRelatedModule(line: string, targetModules: string[]): string {
  const normalized = line.toLowerCase();
  const matchedModule = targetModules.find((moduleName) =>
    normalized.includes(moduleName.toLowerCase())
  );

  return matchedModule ?? targetModules[0] ?? 'unknown';
}

function inferAmbiguity(line: string): AmbiguityLevel {
  const normalized = line.toLowerCase();
  const wordCount = line.split(/\s+/).filter(Boolean).length;
  const hasAbstractWord = ABSTRACT_WORDS.some((word) =>
    normalized.includes(word.toLowerCase())
  );
  const hasObject =
    /[a-zA-Z0-9\u4e00-\u9fff]{3,}/.test(line) && line.length >= 12;
  const hasCondition =
    normalized.includes(' when ') ||
    normalized.includes(' if ') ||
    normalized.includes(' after ') ||
    normalized.includes('当') ||
    normalized.includes('如果') ||
    normalized.includes('后');

  if (line.length < 12 || wordCount <= 2 || hasAbstractWord) {
    return 'high';
  }

  if (!hasObject || !hasCondition) {
    return 'medium';
  }

  return 'low';
}

function questionsForAmbiguity(
  ambiguityLevel: AmbiguityLevel,
  line: string
): MarkdownString[] {
  if (ambiguityLevel === 'low') {
    return [];
  }

  if (ambiguityLevel === 'medium') {
    return [`What concrete condition or observable result confirms this requirement: ${line}`];
  }

  return [
    `What specific user action, object, condition, and expected result are intended by this requirement: ${line}`,
  ];
}

export function extractAcceptancePoints(
  input: AcceptanceExtractionInput,
  context: SkillExecutionContext
): SkillResult<AcceptanceExtractionOutput> {
  const issues: SkillIssue[] = [];
  const unknowns: MarkdownString[] = [];

  if (!input.requirementsText.trim()) {
    issues.push({
      code: 'REQUIREMENTS_TEXT_MISSING',
      message: 'No requirements text was provided.',
      severity: 'error',
      field: 'requirementsText',
      recoverable: true,
    });
    unknowns.push('Acceptance points cannot be extracted without requirement text.');
  }

  if (!input.source.trim()) {
    issues.push({
      code: 'REQUIREMENTS_SOURCE_MISSING',
      message: 'Requirement source is missing.',
      severity: 'warning',
      field: 'source',
      recoverable: true,
    });
    unknowns.push('Acceptance traceability is incomplete because source is missing.');
  }

  const lines = splitRequirementLines(input.requirementsText);
  const candidateLines = lines.filter(hasRequirementKeyword);

  if (lines.length > 0 && candidateLines.length === 0) {
    issues.push({
      code: 'NO_REQUIREMENT_SENTENCES_MATCHED',
      message: 'No lines matched deterministic requirement keywords.',
      severity: 'warning',
      recoverable: true,
    });
    unknowns.push('No acceptance points were extracted by keyword rules.');
  }

  const acceptancePoints = candidateLines.map((line, index) => {
    const ambiguityLevel = inferAmbiguity(line);

    return {
      id: `AP-${String(index + 1).padStart(3, '0')}`,
      source: input.source || context.source,
      description: line,
      businessValue: 'Business value requires product owner confirmation.',
      relatedModule: inferRelatedModule(line, input.targetModules),
      ambiguityLevel,
      questions: questionsForAmbiguity(ambiguityLevel, line),
      priority: inferPriority(line, input.defaultPriority),
    };
  });

  return createSkillResult({
    skillName: 'acceptance_extraction',
    output: {
      acceptancePoints,
      ambiguities: acceptancePoints
        .filter((point) => point.ambiguityLevel !== 'low')
        .flatMap((point) => point.questions),
      unknowns,
    },
    issues,
    evidenceProduced: [],
    evidenceRequired: ['Requirement text with source references.'],
    limitations: [
      ...context.limitations,
      'Extraction used deterministic keyword rules only; no LLM or external context was used.',
      'Generated acceptance points are draft requirements and do not verify implementation.',
    ],
    trace: [
      {
        step: 'line_split',
        summary: `Parsed ${lines.length} non-empty requirement lines.`,
      },
      {
        step: 'keyword_filter',
        summary: `Matched ${candidateLines.length} requirement-like lines.`,
      },
    ],
  });
}

export const acceptanceExtractionSkill: DeterministicSkill<
  AcceptanceExtractionInput,
  AcceptanceExtractionOutput
> = {
  name: 'acceptance_extraction',
  riskLevel: 'LOW',
  run: extractAcceptancePoints,
};

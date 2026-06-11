import type {
  AcceptancePoint,
  MarkdownString,
  SystemTestCase,
  TestPriority,
} from '../types';
import {
  createSkillResult,
  type DeterministicSkill,
  type SkillExecutionContext,
  type SkillIssue,
  type SkillResult,
} from './skillTypes';

export interface TestCaseGenerationInput {
  acceptancePoints: AcceptancePoint[];
  targetSystemType: string;
  includeOpsChecks: boolean;
  includePermissionChecks: boolean;
  includeNegativeCases: boolean;
}

export interface TestCaseGenerationOutput {
  testCases: SystemTestCase[];
  coverageNotes: MarkdownString[];
  unknowns: MarkdownString[];
}

const PERMISSION_KEYWORDS = [
  'user',
  'share',
  'private',
  'permission',
  'login',
  '用户',
  '共享',
  '私密',
  '权限',
  '登录',
];

const OPS_KEYWORDS = [
  'deploy',
  'backup',
  'restore',
  'server',
  'multi-user',
  'log',
  '部署',
  '备份',
  '恢复',
  '服务器',
  '多人',
  '日志',
];

const HIGH_RISK_KEYWORDS = [
  'delete',
  'overwrite',
  'private',
  'permission',
  'backup',
  'restore',
  'data',
  '删除',
  '覆盖',
  '私密',
  '权限',
  '备份',
  '恢复',
  '数据',
];

function normalize(value: string): string {
  return value.toLowerCase();
}

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);

  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function priorityFromAcceptance(point: AcceptancePoint): TestPriority {
  if (point.priority === 'must') {
    return 'high';
  }

  if (point.priority === 'should') {
    return 'medium';
  }

  return 'low';
}

function slugScope(scope: string): string {
  const slug = scope
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'GENERAL';
}

function createBaseCase(
  point: AcceptancePoint,
  index: number
): SystemTestCase {
  const idPrefix = slugScope(point.relatedModule);

  return {
    id: `STC-${idPrefix}-${String(index).padStart(3, '0')}`,
    title: `Verify acceptance point ${point.id}: ${point.description}`,
    scope: point.relatedModule,
    sourceRequirement: `${point.source}#${point.id}`,
    preconditions: [
      'A declared local or test environment is available.',
      'Required test data is prepared before execution.',
    ],
    steps: [
      {
        order: 1,
        action: `Set up the scenario described by acceptance point ${point.id}.`,
        expectedResult: 'The test preconditions are satisfied.',
      },
      {
        order: 2,
        action: point.description,
        expectedResult: 'The observable behavior matches the acceptance point.',
        evidenceHint: 'Capture human observation, browser screenshot, and API response when applicable.',
      },
      {
        order: 3,
        action: 'Record limitations and any missing evidence.',
        expectedResult: 'Evidence gaps are explicit and the case is not marked pass without required evidence.',
      },
    ],
    expectedResult: point.description,
    priority: priorityFromAcceptance(point),
    requiredEvidence: [
      'human observation',
      'browser screenshot when UI is involved',
      'API response when an API is involved',
      'database check when persistent data is involved',
    ],
    ownerAgent: 'test_design',
    tags: [point.relatedModule, 'positive', point.priority],
  };
}

function createNegativeCase(
  point: AcceptancePoint,
  index: number
): SystemTestCase {
  const idPrefix = slugScope(point.relatedModule);

  return {
    id: `STC-${idPrefix}-NEG-${String(index).padStart(3, '0')}`,
    title: `Check boundary behavior for ${point.id}`,
    scope: point.relatedModule,
    sourceRequirement: `${point.source}#${point.id}`,
    preconditions: [
      'A declared local or test environment is available.',
      'Boundary, invalid, or conflicting input data is prepared.',
    ],
    steps: [
      {
        order: 1,
        action: 'Attempt the workflow with invalid, missing, duplicate, or boundary data.',
        expectedResult: 'The system rejects or handles the condition without data loss or privacy exposure.',
        evidenceHint: 'Capture error message, API response, and logs when available.',
      },
      {
        order: 2,
        action: 'Verify persisted data and user-visible state after the boundary attempt.',
        expectedResult: 'Existing data remains consistent and no unsupported success is shown.',
      },
    ],
    expectedResult: 'The boundary scenario is safely handled and limitations are recorded.',
    priority: 'high',
    requiredEvidence: [
      'human observation',
      'API response',
      'log excerpt when available',
      'database check when data may change',
    ],
    ownerAgent: 'test_design',
    tags: [point.relatedModule, 'negative', 'boundary'],
  };
}

function createPermissionCase(
  point: AcceptancePoint,
  index: number
): SystemTestCase {
  const idPrefix = slugScope(point.relatedModule);

  return {
    id: `STC-${idPrefix}-PERM-${String(index).padStart(3, '0')}`,
    title: `Verify permission behavior for ${point.id}`,
    scope: point.relatedModule,
    sourceRequirement: `${point.source}#${point.id}`,
    preconditions: [
      'At least two test users or roles are available in a local or test environment.',
      'Private or permission-scoped test data is prepared.',
    ],
    steps: [
      {
        order: 1,
        action: 'Perform the workflow as an authorized user.',
        expectedResult: 'Authorized access behaves as expected.',
      },
      {
        order: 2,
        action: 'Attempt the same protected workflow as an unauthorized user.',
        expectedResult: 'Unauthorized access is denied without exposing private data.',
        evidenceHint: 'Capture browser screenshot, API status, and access-control notes.',
      },
    ],
    expectedResult: 'Permission boundaries match the acceptance point.',
    priority: 'high',
    requiredEvidence: [
      'human observation',
      'browser screenshot',
      'API response',
      'permission matrix or role notes',
    ],
    ownerAgent: 'test_design',
    tags: [point.relatedModule, 'permission', 'privacy'],
  };
}

function createOpsCase(
  point: AcceptancePoint,
  index: number
): SystemTestCase {
  const idPrefix = slugScope(point.relatedModule);

  return {
    id: `STC-${idPrefix}-OPS-${String(index).padStart(3, '0')}`,
    title: `Review operational readiness for ${point.id}`,
    scope: point.relatedModule,
    sourceRequirement: `${point.source}#${point.id}`,
    preconditions: [
      'Deployment, backup, logging, or environment expectations are declared.',
      'Only local or test-environment evidence is used.',
    ],
    steps: [
      {
        order: 1,
        action: 'Review the operational path related to this acceptance point.',
        expectedResult: 'Required operational evidence is identified.',
      },
      {
        order: 2,
        action: 'Collect or request non-production evidence for deployment, backup, restore, logs, or multi-user operation.',
        expectedResult: 'Missing live evidence is recorded as unknown rather than pass.',
        evidenceHint: 'Use command output, log excerpt, backup artifact, or configuration reference in later phases.',
      },
    ],
    expectedResult: 'Operational risk is explicit and not treated as verified without evidence.',
    priority: 'high',
    requiredEvidence: [
      'command output',
      'log excerpt',
      'backup artifact when backup or restore is involved',
      'configuration reference',
    ],
    ownerAgent: 'ops_check',
    tags: [point.relatedModule, 'ops', 'readiness'],
  };
}

export function generateSystemTestCases(
  input: TestCaseGenerationInput,
  context: SkillExecutionContext
): SkillResult<TestCaseGenerationOutput> {
  const issues: SkillIssue[] = [];
  const unknowns: MarkdownString[] = [];
  const coverageNotes: MarkdownString[] = [];

  if (input.acceptancePoints.length === 0) {
    issues.push({
      code: 'ACCEPTANCE_POINTS_MISSING',
      message: 'No acceptance points were provided for test case generation.',
      severity: 'error',
      field: 'acceptancePoints',
      recoverable: true,
    });
    unknowns.push('No test cases can be generated without acceptance points.');
  }

  const testCases: SystemTestCase[] = [];
  let sequence = 1;

  for (const point of input.acceptancePoints) {
    testCases.push(createBaseCase(point, sequence));
    coverageNotes.push(`Generated positive coverage for ${point.id}.`);

    const highRisk = includesAnyKeyword(point.description, HIGH_RISK_KEYWORDS);
    const permissionRisk = includesAnyKeyword(point.description, PERMISSION_KEYWORDS);
    const opsRisk = includesAnyKeyword(point.description, OPS_KEYWORDS);

    if (input.includeNegativeCases && highRisk) {
      testCases.push(createNegativeCase(point, sequence));
      coverageNotes.push(`Generated negative or boundary coverage for high-risk point ${point.id}.`);
    }

    if (input.includePermissionChecks && permissionRisk) {
      testCases.push(createPermissionCase(point, sequence));
      coverageNotes.push(`Generated permission coverage for ${point.id}.`);
    }

    if (input.includeOpsChecks && opsRisk) {
      testCases.push(createOpsCase(point, sequence));
      coverageNotes.push(`Generated operational readiness coverage for ${point.id}.`);
    }

    if (point.ambiguityLevel !== 'low') {
      unknowns.push(`Acceptance point ${point.id} has ${point.ambiguityLevel} ambiguity; generated cases need product confirmation.`);
    }

    sequence += 1;
  }

  return createSkillResult({
    skillName: 'test_case_generation',
    output: {
      testCases,
      coverageNotes,
      unknowns,
    },
    issues,
    evidenceProduced: [],
    evidenceRequired: ['Acceptance points with traceable sources.'],
    limitations: [
      ...context.limitations,
      `Generated cases are plans for a ${input.targetSystemType || 'target'} system and were not executed.`,
      'No pass, fail, or release conclusion is produced by this skill.',
      'Required evidence lists describe future evidence needs, not evidence already collected.',
    ],
    trace: [
      {
        step: 'case_generation',
        summary: `Generated ${testCases.length} planned system test cases from ${input.acceptancePoints.length} acceptance points.`,
      },
      {
        step: 'option_flags',
        summary: `Options: negative=${input.includeNegativeCases}, permission=${input.includePermissionChecks}, ops=${input.includeOpsChecks}.`,
      },
    ],
  });
}

export const testCaseGenerationSkill: DeterministicSkill<
  TestCaseGenerationInput,
  TestCaseGenerationOutput
> = {
  name: 'test_case_generation',
  riskLevel: 'LOW',
  run: generateSystemTestCases,
};

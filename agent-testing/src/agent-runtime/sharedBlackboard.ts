import type {
  AgentTaskType,
  SharedBlackboard,
  SharedBlackboardKey,
} from './agentRuntimeTypes';
import type {
  BlackboardEvidenceSummary,
} from './evidenceCollector';
import {
  AGENT_TASK_BLACKBOARD_CONTRACTS,
} from './agentRuntimeTypes';

export interface BlackboardWriteInput {
  taskType: AgentTaskType;
  key: SharedBlackboardKey;
  value: unknown;
}

export interface BlackboardWriteResult {
  blackboard: SharedBlackboard;
  warnings: string[];
  limitations: string[];
}

export function createSharedBlackboard(
  sessionId: string,
  limitations: string[] = []
): SharedBlackboard {
  return {
    sessionId,
    unknowns: [],
    limitations: [...limitations],
  };
}

export function readBlackboardValue(
  blackboard: SharedBlackboard,
  key: SharedBlackboardKey
): SharedBlackboard[SharedBlackboardKey] {
  return blackboard[key];
}

export function validateBlackboardWrite(
  taskType: AgentTaskType,
  key: SharedBlackboardKey
): {
  valid: boolean;
  issues: string[];
} {
  const contract = AGENT_TASK_BLACKBOARD_CONTRACTS.find(
    (item) => item.taskType === taskType
  );

  if (!contract) {
    return {
      valid: false,
      issues: [`No blackboard contract is registered for task type: ${taskType}.`],
    };
  }

  if (!contract.writes.includes(key)) {
    return {
      valid: true,
      issues: [
        `M1 warning: task type ${taskType} does not declare blackboard write access for ${key}; write is recorded but not blocked until M2/M3 policy is stricter.`,
      ],
    };
  }

  return {
    valid: true,
    issues: [],
  };
}

export function writeBlackboardValue(
  blackboard: SharedBlackboard,
  input: BlackboardWriteInput
): BlackboardWriteResult {
  const validation = validateBlackboardWrite(input.taskType, input.key);

  return {
    blackboard: {
      ...blackboard,
      [input.key]: input.value,
    },
    warnings: validation.issues,
    limitations: validation.valid ? [] : validation.issues,
  };
}

export function appendBlackboardArrayValue(
  blackboard: SharedBlackboard,
  input: BlackboardWriteInput
): BlackboardWriteResult {
  const validation = validateBlackboardWrite(input.taskType, input.key);
  const currentValue = blackboard[input.key];

  if (currentValue !== undefined && !Array.isArray(currentValue)) {
    const warning = `Cannot append to blackboard key ${input.key} because the current value is not an array.`;

    return {
      blackboard,
      warnings: [...validation.issues, warning],
      limitations: [warning],
    };
  }

  return {
    blackboard: {
      ...blackboard,
      [input.key]: [
        ...(Array.isArray(currentValue) ? currentValue : []),
        input.value,
      ],
    },
    warnings: validation.issues,
    limitations: validation.valid ? [] : validation.issues,
  };
}

function normalizeStringList(items: readonly string[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function appendUniqueStrings(
  currentValue: unknown,
  items: readonly string[]
): string[] {
  const currentItems = Array.isArray(currentValue)
    ? currentValue.filter((item): item is string => typeof item === 'string')
    : [];

  return normalizeStringList([...currentItems, ...items]);
}

export function appendBlackboardUnknowns(
  blackboard: SharedBlackboard,
  notes: readonly string[]
): SharedBlackboard {
  return {
    ...blackboard,
    unknowns: appendUniqueStrings(blackboard.unknowns, notes),
  };
}

export function appendBlackboardLimitations(
  blackboard: SharedBlackboard,
  limitations: readonly string[]
): SharedBlackboard {
  return {
    ...blackboard,
    limitations: appendUniqueStrings(blackboard.limitations, limitations),
  };
}

export function mergeBlackboardEvidenceSummary(
  blackboard: SharedBlackboard,
  summary: BlackboardEvidenceSummary
): SharedBlackboard {
  const gapNotes = [
    summary.gaps.length > 0
      ? `Evidence gaps detected: ${summary.gaps.length} total, ${summary.gaps.filter((gap) => gap.status === 'open').length} open.`
      : undefined,
    ...summary.warnings,
    ...summary.gaps.slice(0, 50).map((gap) => gap.summary),
  ].filter((item): item is string => Boolean(item));

  return appendBlackboardLimitations(
    appendBlackboardUnknowns(blackboard, gapNotes),
    summary.limitations
  );
}

export function appendBlackboardMcpRequestDrafts(
  blackboard: SharedBlackboard,
  requests: readonly unknown[]
): SharedBlackboard {
  const current = Array.isArray(blackboard.mcpRequests) ? blackboard.mcpRequests : [];

  return {
    ...blackboard,
    mcpRequests: [...current, ...requests],
  };
}

export function appendBlackboardMcpResultDrafts(
  blackboard: SharedBlackboard,
  results: readonly unknown[]
): SharedBlackboard {
  const current = Array.isArray(blackboard.mcpResults) ? blackboard.mcpResults : [];

  return {
    ...blackboard,
    mcpResults: [...current, ...results],
  };
}

export function appendBlackboardControlledExecutionDrafts(
  blackboard: SharedBlackboard,
  requests?: readonly unknown[],
  results?: readonly unknown[]
): SharedBlackboard {
  const currentRequests = Array.isArray(blackboard.controlledExecutionRequests)
    ? blackboard.controlledExecutionRequests
    : [];
  const currentResults = Array.isArray(blackboard.controlledExecutionResults)
    ? blackboard.controlledExecutionResults
    : [];

  return {
    ...blackboard,
    controlledExecutionRequests: [...currentRequests, ...(requests ?? [])],
    controlledExecutionResults: [...currentResults, ...(results ?? [])],
  };
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function summarizeSharedBlackboard(blackboard: SharedBlackboard): {
  sessionId: string;
  acceptancePointCount: number;
  testCaseCount: number;
  rawEvidenceCount: number;
  normalizedEvidenceCount: number;
  severityCount: number;
  defectCount: number;
  regressionCount: number;
  opsChecklistCount: number;
  approvalRequestCount: number;
  auditEventCount: number;
  unknownCount: number;
  limitationCount: number;
} {
  return {
    sessionId: blackboard.sessionId,
    acceptancePointCount: countArray(blackboard.acceptancePoints),
    testCaseCount: countArray(blackboard.testCases),
    rawEvidenceCount: countArray(blackboard.rawEvidence),
    normalizedEvidenceCount: countArray(blackboard.normalizedEvidence),
    severityCount: countArray(blackboard.severityClassifications),
    defectCount: countArray(blackboard.defects) + countArray(blackboard.defectAnalyses),
    regressionCount: countArray(blackboard.regressionSuggestions),
    opsChecklistCount: countArray(blackboard.opsChecklist),
    approvalRequestCount: countArray(blackboard.approvalRequests),
    auditEventCount: countArray(blackboard.auditEvents),
    unknownCount: countArray(blackboard.unknowns),
    limitationCount: countArray(blackboard.limitations),
  };
}

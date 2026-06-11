import type {
  AgentRuntimeRole,
  AgentTask,
  AgentTaskPriority,
  AgentTaskType,
  BlackboardRef,
} from './agentRuntimeTypes';
import {
  AGENT_TASK_BLACKBOARD_CONTRACTS,
} from './agentRuntimeTypes';

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

const PRIORITY_RANK: Record<AgentTaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export interface CreateAgentTaskInput {
  id?: string;
  sessionId: string;
  traceId?: string;
  assignedTo: AgentRuntimeRole;
  createdBy: AgentRuntimeRole;
  taskType: AgentTaskType;
  goal: string;
  inputRefs?: BlackboardRef[];
  expectedOutput: string;
  priority?: AgentTaskPriority;
  requiresApproval?: boolean;
  relatedEvidenceIds?: string[];
  relatedTestCaseIds?: string[];
  now?: string;
  limitations?: string[];
}

export function createAgentTask(input: CreateAgentTaskInput): AgentTask {
  const now = input.now ?? DEFAULT_NOW;
  const id = input.id ?? `agent-task-${input.taskType}-${now.replace(/[^0-9A-Za-z]+/g, '-')}`;

  return {
    id,
    sessionId: input.sessionId,
    traceId: input.traceId ?? `trace-${id}`,
    assignedTo: input.assignedTo,
    createdBy: input.createdBy,
    taskType: input.taskType,
    goal: input.goal,
    inputRefs: [...(input.inputRefs ?? [])],
    expectedOutput: input.expectedOutput,
    status: 'pending',
    priority: input.priority ?? 'normal',
    requiresApproval: input.requiresApproval ?? false,
    relatedEvidenceIds: [...(input.relatedEvidenceIds ?? [])],
    relatedTestCaseIds: [...(input.relatedTestCaseIds ?? [])],
    createdAt: now,
    updatedAt: now,
    limitations: [...(input.limitations ?? [])],
  };
}

export function sortAgentTasksByPriority(
  tasks: readonly AgentTask[]
): AgentTask[] {
  return [...tasks].sort((left, right) => {
    const priorityDelta = PRIORITY_RANK[right.priority] - PRIORITY_RANK[left.priority];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function pickNextAgentTask(
  tasks: readonly AgentTask[],
  role: AgentRuntimeRole
): AgentTask | undefined {
  return sortAgentTasksByPriority(
    tasks.filter(
      (task) =>
        task.assignedTo === role &&
        (task.status === 'pending' || task.status === 'assigned')
    )
  )[0];
}

export function assignAgentTask(
  task: AgentTask,
  now: string = DEFAULT_NOW
): AgentTask {
  return {
    ...task,
    status: 'assigned',
    updatedAt: now,
  };
}

export function completeAgentTask(
  task: AgentTask,
  now: string = DEFAULT_NOW
): AgentTask {
  return {
    ...task,
    status: 'completed',
    updatedAt: now,
    completedAt: now,
  };
}

export function failAgentTask(
  task: AgentTask,
  reason: string,
  now: string = DEFAULT_NOW
): AgentTask {
  return {
    ...task,
    status: 'failed',
    updatedAt: now,
    limitations: [...task.limitations, `Failure: ${reason}`],
  };
}

export function blockAgentTask(
  task: AgentTask,
  reason: string,
  now: string = DEFAULT_NOW
): AgentTask {
  return {
    ...task,
    status: 'blocked',
    updatedAt: now,
    limitations: [...task.limitations, `Blocked: ${reason}`],
  };
}

export function refuseAgentTask(
  task: AgentTask,
  reason: string,
  now: string = DEFAULT_NOW
): AgentTask {
  return {
    ...task,
    status: 'refused',
    updatedAt: now,
    limitations: [...task.limitations, `Refusal: ${reason}`],
  };
}

export function listTasksForAgent(
  tasks: readonly AgentTask[],
  role: AgentRuntimeRole
): AgentTask[] {
  return tasks.filter((task) => task.assignedTo === role);
}

export function validateTaskBlackboardContract(task: AgentTask): {
  valid: boolean;
  issues: string[];
} {
  const contract = AGENT_TASK_BLACKBOARD_CONTRACTS.find(
    (item) => item.taskType === task.taskType
  );

  if (!contract) {
    return {
      valid: false,
      issues: [`No blackboard contract exists for task type: ${task.taskType}.`],
    };
  }

  const issues = task.inputRefs
    .filter((ref) => !contract.reads.includes(ref.key))
    .map((ref) => `Task ${task.id} inputRef ${ref.key} is not declared in reads for ${task.taskType}.`);

  return {
    valid: issues.length === 0,
    issues,
  };
}

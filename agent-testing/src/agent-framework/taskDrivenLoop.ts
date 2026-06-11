import type {
  AgentRole,
  MarkdownString,
} from '../types';

export type AgentTaskStatus =
  | 'pending'
  | 'ready'
  | 'blocked'
  | 'completed'
  | 'cancelled';

export interface AgentTask {
  id: MarkdownString;
  runId: MarkdownString;
  assignedTo: AgentRole;
  goal: MarkdownString;
  inputRefs: MarkdownString[];
  expectedOutput: MarkdownString;
  status: AgentTaskStatus;
  priority: 'high' | 'medium' | 'low';
  requiresApproval: boolean;
  limitations: MarkdownString[];
}

export interface AgentTaskLoopDraft {
  runId: MarkdownString;
  tasks: AgentTask[];
  readyTasks: AgentTask[];
  blockedTasks: AgentTask[];
  completedTasks: AgentTask[];
  limitations: MarkdownString[];
}

export function createTaskLoopDraft(
  runId: MarkdownString,
  tasks: AgentTask[]
): AgentTaskLoopDraft {
  const scopedTasks = tasks.filter((task) => task.runId === runId);

  return {
    runId,
    tasks: scopedTasks,
    readyTasks: scopedTasks.filter((task) => task.status === 'ready' && !task.requiresApproval),
    blockedTasks: scopedTasks.filter((task) => task.status === 'blocked' || task.requiresApproval),
    completedTasks: scopedTasks.filter((task) => task.status === 'completed'),
    limitations: [
      'Task loop is a draft view over provided tasks only.',
      'No scheduler, concurrency, runtime Agent loop, MCP call, LLM call, or task execution is implemented.',
      'Tasks requiring approval are treated as blocked until a future approval runtime supplies a decision.',
    ],
  };
}

import { describe, it, expect } from 'vitest';
import {
  createAgentTask,
  sortAgentTasksByPriority,
  pickNextAgentTask,
  completeAgentTask,
  failAgentTask,
  refuseAgentTask,
  blockAgentTask,
  validateTaskBlackboardContract,
} from '../src/agent-runtime/agentTaskQueue';
import type { AgentTask } from '../src/agent-runtime/agentRuntimeTypes';

function makeTask(overrides: Partial<AgentTask> = {}): AgentTask {
  return createAgentTask({
    sessionId: 'test-session',
    assignedTo: 'test_lead',
    createdBy: 'test_lead',
    taskType: 'build_context',
    goal: 'Test goal',
    expectedOutput: 'Test output',
    ...overrides,
  });
}

describe('AgentTaskQueue', () => {
  it('createAgentTask default status is pending', () => {
    const task = makeTask();
    expect(task.status).toBe('pending');
  });

  it('createAgentTask auto-generates id', () => {
    const task = makeTask();
    expect(task.id).toBeTruthy();
    expect(task.id.length).toBeGreaterThan(0);
  });

  it('sortAgentTasksByPriority: critical > high > normal > low', () => {
    const tasks = [
      makeTask({ id: 't1', priority: 'low' }),
      makeTask({ id: 't2', priority: 'critical' }),
      makeTask({ id: 't3', priority: 'normal' }),
      makeTask({ id: 't4', priority: 'high' }),
    ];
    const sorted = sortAgentTasksByPriority(tasks);
    expect(sorted[0].priority).toBe('critical');
    expect(sorted[1].priority).toBe('high');
    expect(sorted[2].priority).toBe('normal');
    expect(sorted[3].priority).toBe('low');
  });

  it('pickNextAgentTask selects task assigned to matching role', () => {
    const tasks = [
      makeTask({ id: 't1', assignedTo: 'ops_check', priority: 'critical' }),
      makeTask({ id: 't2', assignedTo: 'test_lead', priority: 'normal' }),
    ];
    const picked = pickNextAgentTask(tasks, 'test_lead');
    expect(picked).toBeDefined();
    expect(picked!.id).toBe('t2');
  });

  it('pickNextAgentTask returns undefined when no matching role', () => {
    const tasks = [makeTask({ id: 't1', assignedTo: 'ops_check' })];
    expect(pickNextAgentTask(tasks, 'test_lead')).toBeUndefined();
  });

  it('completed task is not picked', () => {
    const completed = completeAgentTask(makeTask({ id: 't1' }));
    const tasks = [completed];
    expect(pickNextAgentTask(tasks, 'test_lead')).toBeUndefined();
  });

  it('refused task is not picked', () => {
    const refused = refuseAgentTask(makeTask({ id: 't1' }), 'not allowed');
    const tasks = [refused];
    expect(pickNextAgentTask(tasks, 'test_lead')).toBeUndefined();
  });

  it('failed task is not picked', () => {
    const failed = failAgentTask(makeTask({ id: 't1' }), 'error');
    const tasks = [failed];
    expect(pickNextAgentTask(tasks, 'test_lead')).toBeUndefined();
  });

  it('refuseAgentTask writes reason to limitations', () => {
    const refused = refuseAgentTask(makeTask(), 'permission denied');
    expect(refused.status).toBe('refused');
    expect(refused.limitations.some((l) => l.includes('permission denied'))).toBe(true);
  });

  it('failAgentTask writes reason to limitations', () => {
    const failed = failAgentTask(makeTask(), 'runtime error');
    expect(failed.status).toBe('failed');
    expect(failed.limitations.some((l) => l.includes('runtime error'))).toBe(true);
  });

  it('blockAgentTask sets status to blocked', () => {
    const blocked = blockAgentTask(makeTask(), 'missing data');
    expect(blocked.status).toBe('blocked');
  });

  it('validateTaskBlackboardContract detects illegal inputRef key', () => {
    const task = makeTask({
      taskType: 'build_context',
      inputRefs: [{ key: 'nonexistent_key' as any, summary: 'bad' }],
    });
    const validation = validateTaskBlackboardContract(task);
    expect(validation.valid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it('validateTaskBlackboardContract passes for legal inputRefs', () => {
    const task = makeTask({
      taskType: 'build_context',
      inputRefs: [{ key: 'requirements' }],
    });
    const validation = validateTaskBlackboardContract(task);
    expect(validation.valid).toBe(true);
  });
});

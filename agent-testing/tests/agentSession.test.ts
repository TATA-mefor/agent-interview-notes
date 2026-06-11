import { describe, it, expect } from 'vitest';
import {
  createAgentSession,
  canTransitionAgentSessionStatus,
  transitionAgentSessionStatus,
  summarizeAgentSession,
} from '../src/agent-runtime/agentSession';

describe('AgentSession', () => {
  it('createAgentSession default status is draft', () => {
    const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });
    expect(session.status).toBe('draft');
  });

  it('createAgentSession defaults to 6 agents', () => {
    const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });
    expect(session.agents).toHaveLength(6);
  });

  it('createAgentSession accepts custom agents list', () => {
    const session = createAgentSession({
      runId: 'test-run',
      targetSystemName: 'Test',
      agents: ['test_lead', 'ops_check'],
    });
    expect(session.agents).toHaveLength(2);
  });

  it('draft → running is valid', () => {
    expect(canTransitionAgentSessionStatus('draft', 'running')).toBe(true);
  });

  it('running → completed is valid', () => {
    expect(canTransitionAgentSessionStatus('running', 'completed')).toBe(true);
  });

  it('running → blocked is valid', () => {
    expect(canTransitionAgentSessionStatus('running', 'blocked')).toBe(true);
  });

  it('completed → running is invalid', () => {
    expect(canTransitionAgentSessionStatus('completed', 'running')).toBe(false);
  });

  it('invalid transition throws', () => {
    const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });
    const running = transitionAgentSessionStatus(session, 'running');
    const completed = transitionAgentSessionStatus(running, 'completed');
    expect(() => transitionAgentSessionStatus(completed, 'draft')).toThrow();
  });

  it('valid transition returns new session with updated status', () => {
    const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });
    const running = transitionAgentSessionStatus(session, 'running');
    expect(running.status).toBe('running');
    expect(session.status).toBe('draft'); // original not mutated
  });

  it('summarizeAgentSession returns summary without leaking blackboard', () => {
    const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });
    const summary = summarizeAgentSession(session);
    expect(summary.id).toBe(session.id);
    expect(summary.runId).toBe('test-run');
    expect(summary.status).toBe('draft');
    expect(summary.agentCount).toBe(6);
    expect(summary.taskCount).toBe(0);
    expect(summary.messageCount).toBe(0);
    // summary must not contain blackboard
    expect((summary as any).blackboard).toBeUndefined();
  });
});

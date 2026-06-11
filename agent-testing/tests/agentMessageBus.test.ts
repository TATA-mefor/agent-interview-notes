import { describe, it, expect } from 'vitest';
import {
  createAgentMessage,
  sendAgentMessage,
  listMessagesForAgent,
  listMessagesByType,
  summarizeAgentMessages,
} from '../src/agent-runtime/agentMessageBus';
import { createAgentSession } from '../src/agent-runtime/agentSession';

describe('AgentMessageBus', () => {
  const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });

  it('createAgentMessage auto-generates id and traceId', () => {
    const msg = createAgentMessage({
      sessionId: 'test-session',
      fromAgent: 'test_lead',
      toAgent: 'product_acceptance',
      messageType: 'task_assignment',
      summary: 'Test message',
    });
    expect(msg.id).toBeTruthy();
    expect(msg.traceId).toBeTruthy();
    expect(msg.createdAt).toBeTruthy();
  });

  it('sendAgentMessage does not mutate original session', () => {
    const msg = createAgentMessage({
      sessionId: session.id,
      fromAgent: 'test_lead',
      toAgent: 'broadcast',
      messageType: 'task_result',
      summary: 'Done',
    });
    const updated = sendAgentMessage(session, msg);
    expect(session.messages).toHaveLength(0);
    expect(updated.messages).toHaveLength(1);
  });

  it('listMessagesForAgent returns direct messages', () => {
    const msg = createAgentMessage({
      sessionId: session.id,
      fromAgent: 'test_lead',
      toAgent: 'product_acceptance',
      messageType: 'task_assignment',
      summary: 'Direct',
    });
    const s = sendAgentMessage(session, msg);
    const msgs = listMessagesForAgent(s.messages, 'product_acceptance');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].toAgent).toBe('product_acceptance');
  });

  it('listMessagesForAgent returns broadcast messages', () => {
    const msg = createAgentMessage({
      sessionId: session.id,
      fromAgent: 'test_lead',
      toAgent: 'broadcast',
      messageType: 'report_update',
      summary: 'Broadcast',
    });
    const s = sendAgentMessage(session, msg);
    const msgs = listMessagesForAgent(s.messages, 'ops_check');
    expect(msgs.some((m) => m.toAgent === 'broadcast')).toBe(true);
  });

  it('listMessagesByType filters correctly', () => {
    const msg1 = createAgentMessage({
      sessionId: session.id, fromAgent: 'test_lead', toAgent: 'broadcast',
      messageType: 'task_result', summary: 'Result',
    });
    const msg2 = createAgentMessage({
      sessionId: session.id, fromAgent: 'developer_analysis', toAgent: 'test_lead',
      messageType: 'risk_warning', summary: 'Warning',
    });
    let s = sendAgentMessage(session, msg1);
    s = sendAgentMessage(s, msg2);
    expect(listMessagesByType(s.messages, 'risk_warning')).toHaveLength(1);
    expect(listMessagesByType(s.messages, 'task_result')).toHaveLength(1);
  });

  it('summarizeAgentMessages returns direct and broadcast counts', () => {
    const msg1 = createAgentMessage({
      sessionId: session.id, fromAgent: 'test_lead', toAgent: 'broadcast',
      messageType: 'task_result', summary: 'B',
    });
    const msg2 = createAgentMessage({
      sessionId: session.id, fromAgent: 'developer_analysis', toAgent: 'test_lead',
      messageType: 'task_result', summary: 'D',
    });
    let s = sendAgentMessage(session, msg1);
    s = sendAgentMessage(s, msg2);
    const summary = summarizeAgentMessages(s.messages);
    expect(summary.total).toBe(2);
    expect(summary.broadcastCount).toBe(1);
    expect(summary.directCount).toBe(1);
  });
});

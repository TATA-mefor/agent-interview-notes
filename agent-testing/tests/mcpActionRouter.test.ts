import { describe, it, expect } from 'vitest';
import {
  createAgentMcpActionRequest,
  routeAgentMcpAction,
  summarizeAgentMcpActionResult,
} from '../src/agent-runtime/mcpActionRouter';
import { OPS_CHECK_AGENT_PROFILE, USER_REPRESENTATIVE_AGENT_PROFILE } from '../src/agent-runtime/agentProfileTypes';
import { createSharedBlackboard } from '../src/agent-runtime/sharedBlackboard';

describe('McpActionRouter', () => {
  const bb = createSharedBlackboard('test-session');

  it('agent without MCP permission gets blocked', () => {
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'user_representative',
      taskId: 'task-1',
      taskType: 'request_mcp_read',
      actionType: 'read_only_mcp',
      purpose: 'Read file',
      inputSummary: 'test',
      expectedOutput: 'content',
      blackboard: bb,
    });
    const result = routeAgentMcpAction(request, USER_REPRESENTATIVE_AGENT_PROFILE);
    expect(result.status).toBe('blocked');
  });

  it('forced forbidden request is rejected', () => {
    // Ops Check can request MCP but we test a destructive scenario
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'ops_check',
      taskId: 'task-1',
      taskType: 'request_controlled_execution',
      actionType: 'controlled_execution',
      purpose: 'Destructive',
      inputSummary: 'rm -rf /',
      expectedOutput: 'destroyed',
      blackboard: bb,
      environment: 'production',
    });
    const result = routeAgentMcpAction(request, OPS_CHECK_AGENT_PROFILE);
    // Production destructive should be forbidden
    expect(result.status).not.toBe('executed_fake');
    const allText = JSON.stringify(result).toLowerCase();
    expect(allText).toMatch(/forbidden|blocked|pending/i);
  });

  it('read-only MCP fake execution returns safety limitation', () => {
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'ops_check',
      taskId: 'task-1',
      taskType: 'request_mcp_read',
      actionType: 'read_only_mcp',
      purpose: 'Read config',
      inputSummary: 'read file',
      expectedOutput: 'file content',
      blackboard: bb,
    });
    const result = routeAgentMcpAction(request, OPS_CHECK_AGENT_PROFILE);
    // Must contain fake/simulated/not-real limitation
    const allText = [...result.limitations, result.outputSummary].join(' ').toLowerCase();
    expect(allText).toMatch(/fake|simulated|not.?real|M5|pilot/i);
  });

  it('controlled execution only dry-run/simulated', () => {
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'ops_check',
      taskId: 'task-1',
      taskType: 'request_controlled_execution',
      actionType: 'controlled_execution',
      purpose: 'Typecheck',
      inputSummary: 'tsc --noEmit',
      expectedOutput: 'type errors',
      blackboard: bb,
    });
    const result = routeAgentMcpAction(request, OPS_CHECK_AGENT_PROFILE);
    // Must not execute real command
    const allText = [...result.limitations, result.outputSummary].join(' ').toLowerCase();
    expect(allText).toMatch(/simulat|dry.?run|fake|approval/i);
    // result must explicitly state no real command
    expect(result.status).not.toBe('executed_fake');
  });

  it('MCP result does not become real pass evidence', () => {
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'ops_check',
      taskId: 'task-1',
      taskType: 'request_mcp_read',
      actionType: 'read_only_mcp',
      purpose: 'Read',
      inputSummary: 'test',
      expectedOutput: 'data',
      blackboard: bb,
    });
    const result = routeAgentMcpAction(request, OPS_CHECK_AGENT_PROFILE);
    // writes must not include pass evidence claims
    const writesStr = JSON.stringify(result.writes).toLowerCase();
    expect(writesStr).not.toMatch(/"result":\s*"pass"/);
    // limitations must mention fake/not-real
    expect(result.limitations.some((l) => /fake|not.?real|simulat/i.test(l))).toBe(true);
  });

  it('unsupported action type returns unsupported', () => {
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'ops_check',
      taskId: 'task-1',
      taskType: 'request_mcp_read',
      actionType: 'unsupported',
      purpose: 'test',
      inputSummary: 'test',
      expectedOutput: 'test',
      blackboard: bb,
    });
    const result = routeAgentMcpAction(request, OPS_CHECK_AGENT_PROFILE);
    expect(result.status).toBe('unsupported');
  });

  it('summarizeAgentMcpActionResult returns structured summary', () => {
    const request = createAgentMcpActionRequest({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentRole: 'ops_check',
      taskId: 'task-1',
      taskType: 'request_mcp_read',
      actionType: 'read_only_mcp',
      purpose: 'test',
      inputSummary: 'test',
      expectedOutput: 'test',
      blackboard: bb,
    });
    const result = routeAgentMcpAction(request, OPS_CHECK_AGENT_PROFILE);
    const summary = summarizeAgentMcpActionResult(result);
    expect(summary.id).toBeTruthy();
    expect(summary.actionType).toBe('read_only_mcp');
    expect(typeof summary.forbidden).toBe('boolean');
  });
});

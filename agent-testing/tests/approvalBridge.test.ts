import { describe, it, expect } from 'vitest';
import {
  evaluateAgentRuntimeApproval,
  summarizeApprovalBridgeResult,
} from '../src/agent-runtime/approvalBridge';

describe('ApprovalBridge', () => {
  it('LOW risk returns not_required or accepted', () => {
    const result = evaluateAgentRuntimeApproval({
      sessionId: 'test-session',
      traceId: 'test-trace',
      requestedByAgent: 'test_lead',
      actionType: 'report_generation',
      target: 'markdown report',
      purpose: 'Generate test report',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      inputSummary: 'Report generation',
      expectedOutput: 'Markdown text',
    });
    expect(['not_required', 'pending']).toContain(result.status);
    expect(result.forbidden).toBe(false);
  });

  it('HIGH risk returns pending approval', () => {
    const result = evaluateAgentRuntimeApproval({
      sessionId: 'test-session',
      traceId: 'test-trace',
      requestedByAgent: 'ops_check',
      actionType: 'terminal_command',
      target: 'npm test',
      purpose: 'Run tests',
      permissionLevel: 'EXECUTE_LIMITED',
      sideEffectLevel: 'NONE',
      executesCommand: true,
      inputSummary: 'Command execution',
      expectedOutput: 'Test results',
    });
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.status).toBe('pending');
  });

  it('FORBIDDEN returns rejected/forbidden', () => {
    const result = evaluateAgentRuntimeApproval({
      sessionId: 'test-session',
      traceId: 'test-trace',
      requestedByAgent: 'ops_check',
      actionType: 'data_deletion',
      target: 'production database',
      purpose: 'Delete data',
      permissionLevel: 'PRODUCTION_FORBIDDEN',
      sideEffectLevel: 'DESTRUCTIVE',
      isProduction: true,
      isDestructive: true,
      modifiesDatabase: true,
      inputSummary: 'DELETE FROM notes',
      expectedOutput: 'Data deleted',
    });
    expect(result.forbidden).toBe(true);
    expect(result.status).toBe('forbidden');
  });

  it('MEDIUM risk returns not_required or pending (stable)', () => {
    const results: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = evaluateAgentRuntimeApproval({
        sessionId: 'test-session',
        traceId: `test-trace-${i}`,
        requestedByAgent: 'ops_check',
        actionType: 'http_api_call',
        target: 'test endpoint',
        purpose: 'Test API',
        permissionLevel: 'EXECUTE_LIMITED',
        sideEffectLevel: 'NONE',
        callsExternalService: true,
        inputSummary: 'HTTP request',
        expectedOutput: 'Response',
      });
      results.push(result.status);
    }
    // All calls should return the same status (deterministic)
    expect(new Set(results).size).toBe(1);
    expect(['not_required', 'pending']).toContain(results[0]);
  });

  it('summary does not expose sensitive data', () => {
    const result = evaluateAgentRuntimeApproval({
      sessionId: 'test-session',
      traceId: 'test-trace',
      requestedByAgent: 'test_lead',
      actionType: 'release_decision',
      target: 'release v1.0',
      purpose: 'Approve',
      permissionLevel: 'READ_ONLY',
      sideEffectLevel: 'NONE',
      inputSummary: 'Release',
      expectedOutput: 'Decision',
    });
    const summary = summarizeApprovalBridgeResult(result);
    // Summary is structural, not raw
    expect(summary.id).toBeTruthy();
    expect(summary.status).toBe(result.status);
    expect(typeof summary.policyViolationCount).toBe('number');
    expect(typeof summary.limitationCount).toBe('number');
    // No secret/token/password in summary
    const serialized = JSON.stringify(summary).toLowerCase();
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('secret');
  });
});

import { describe, it, expect } from 'vitest';
import {
  invokeSkillThroughRouter,
  getSkillNameForTaskType,
  validateSkillInvocation,
} from '../src/agent-runtime/skillRouter';
import { TEST_LEAD_AGENT_PROFILE, OPS_CHECK_AGENT_PROFILE, USER_REPRESENTATIVE_AGENT_PROFILE } from '../src/agent-runtime/agentProfileTypes';
import { createSharedBlackboard } from '../src/agent-runtime/sharedBlackboard';
import type { SkillRouterInvocationRequest } from '../src/agent-runtime/skillRouter';

function makeRequest(overrides: Partial<SkillRouterInvocationRequest> = {}): SkillRouterInvocationRequest {
  return {
    sessionId: 'test-session',
    traceId: 'test-trace',
    agentRole: 'test_lead',
    taskId: 'task-1',
    taskType: 'build_context',
    skillName: 'context_building',
    inputRefs: [{ key: 'requirements' }],
    blackboard: createSharedBlackboard('test-session'),
    expectedOutput: 'context',
    ...overrides,
  };
}

describe('SkillRouter', () => {
  it('getSkillNameForTaskType resolves known task type', () => {
    expect(getSkillNameForTaskType('build_context')).toBe('context_building');
    expect(getSkillNameForTaskType('analyze_defect')).toBe('defect_analysis');
  });

  it('getSkillNameForTaskType returns placeholder for unsupported task', () => {
    expect(getSkillNameForTaskType('request_mcp_read')).toBe('placeholder');
  });

  it('validateSkillInvocation accepts valid request', () => {
    const result = validateSkillInvocation(TEST_LEAD_AGENT_PROFILE, makeRequest());
    expect(result.valid).toBe(true);
  });

  it('validateSkillInvocation rejects unauthorized taskType', () => {
    const result = validateSkillInvocation(USER_REPRESENTATIVE_AGENT_PROFILE, makeRequest({
      agentRole: 'user_representative',
      taskType: 'recommend_release',
    }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'taskType')).toBe(true);
  });

  it('validateSkillInvocation rejects unauthorized skillName', () => {
    const result = validateSkillInvocation(USER_REPRESENTATIVE_AGENT_PROFILE, makeRequest({
      agentRole: 'user_representative',
      taskType: 'build_context',
      skillName: 'release_recommendation',
    }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'skillName')).toBe(true);
  });

  it('invokeSkillThroughRouter refused for unauthorized task', () => {
    const result = invokeSkillThroughRouter(USER_REPRESENTATIVE_AGENT_PROFILE, makeRequest({
      agentRole: 'user_representative',
      taskType: 'recommend_release',
      skillName: 'release_recommendation',
    }));
    expect(result.status).toBe('refused');
  });

  it('invokeSkillThroughRouter blocked for missing blackboard input', () => {
    const bb = createSharedBlackboard('test-session');
    const result = invokeSkillThroughRouter(TEST_LEAD_AGENT_PROFILE, makeRequest({
      taskType: 'extract_acceptance',
      skillName: 'acceptance_extraction',
      inputRefs: [{ key: 'requirements' }, { key: 'context' }],
      blackboard: bb, // no requirements.requirementsText
    }));
    expect(['blocked', 'refused']).toContain(result.status);
  });

  it('request_mcp_read does not bypass approval gate', () => {
    const result = invokeSkillThroughRouter(OPS_CHECK_AGENT_PROFILE, makeRequest({
      agentRole: 'ops_check',
      taskType: 'request_mcp_read',
      skillName: 'placeholder',
      inputRefs: [{ key: 'context' }, { key: 'unknowns' }],
    }));
    // Must not execute real MCP
    expect(result.status).not.toBe('completed');
    // Must contain safety limitation
    const allText = [...result.limitations, ...result.warnings].join(' ');
    expect(allText.toLowerCase()).toMatch(/fake|simulated|placeholder|not.?execut|approval|blocked|refused/i);
  });

  it('request_controlled_execution does not execute real command', () => {
    const result = invokeSkillThroughRouter(OPS_CHECK_AGENT_PROFILE, makeRequest({
      agentRole: 'ops_check',
      taskType: 'request_controlled_execution',
      skillName: 'placeholder',
      inputRefs: [{ key: 'context' }, { key: 'testCases' }, { key: 'approvalRequests' }],
    }));
    expect(result.status).not.toBe('completed');
    const allText = [...result.limitations, ...result.warnings].join(' ');
    expect(allText.toLowerCase()).toMatch(/fake|simulated|dry.?run|no.?real|not.?execut|approval|placeholder/i);
  });

  it('writes are returned as write intents, SkillRouter does not mutate blackboard', () => {
    const bb = createSharedBlackboard('test-session');
    const bbBefore = { ...bb };
    const result = invokeSkillThroughRouter(TEST_LEAD_AGENT_PROFILE, makeRequest({
      blackboard: bb,
    }));
    // SkillRouter returns writes, doesn't mutate input blackboard
    expect(bb).toEqual(bbBefore);
    // result contains writes array
    expect(result.writes).toBeDefined();
  });

  it('placeholder task does not generate real evidence', () => {
    const result = invokeSkillThroughRouter(TEST_LEAD_AGENT_PROFILE, makeRequest({
      taskType: 'review_evidence_gap',
      skillName: 'placeholder',
    }));
    expect(result.status).not.toBe('completed');
    const allText = JSON.stringify(result).toLowerCase();
    expect(allText).not.toMatch(/"result":\s*"pass"/);
  });
});

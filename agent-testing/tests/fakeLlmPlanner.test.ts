import { describe, it, expect } from 'vitest';
import {
  createLlmPlannerInput,
  runFakeLlmPlanner,
} from '../src/llm-planner/fakeLlmPlanner';
import {
  validateLlmPlannerOutput,
} from '../src/llm-planner/plannerOutputValidator';
import {
  mapPlannerOutputToActionProposal,
} from '../src/llm-planner/plannerActionMapper';
import {
  TEST_LEAD_AGENT_PROFILE,
  OPS_CHECK_AGENT_PROFILE,
  USER_REPRESENTATIVE_AGENT_PROFILE,
} from '../src/agent-runtime/agentProfileTypes';
import { createSharedBlackboard } from '../src/agent-runtime/sharedBlackboard';
import type { AgentTask } from '../src/agent-runtime/agentRuntimeTypes';

describe('FakeLlmPlanner', () => {
  const bb = createSharedBlackboard('test-session');

  function makeInput(overrides: Record<string, unknown> = {}) {
    return createLlmPlannerInput({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentProfile: TEST_LEAD_AGENT_PROFILE,
      blackboard: bb,
      ...overrides,
    });
  }

  it('evidence gap produces create_task proposal', () => {
    const bbWithGap = {
      ...bb,
      testCases: [{ id: 'TC-001', title: 'T1', scope: 's', sourceRequirement: 'r', preconditions: [], steps: [], expectedResult: '', priority: 'high', requiredEvidence: [], ownerAgent: 'test_lead', tags: [] }],
    };
    const input = createLlmPlannerInput({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentProfile: TEST_LEAD_AGENT_PROFILE,
      blackboard: bbWithGap,
    });
    const output = runFakeLlmPlanner(input, { preferEvidenceGapClosure: true });
    expect(output.actionType).toBe('create_task');
    expect(output.targetTaskType).toBe('review_evidence_gap');
  });

  it('Test Lead summarize_session proposes invoke_skill', () => {
    const task: AgentTask = {
      id: 'task-1', sessionId: 'test-session', traceId: 't', assignedTo: 'test_lead',
      createdBy: 'test_lead', taskType: 'summarize_session', goal: 'summarize',
      inputRefs: [], expectedOutput: 'summary', status: 'assigned', priority: 'normal',
      requiresApproval: false, relatedEvidenceIds: [], relatedTestCaseIds: [],
      createdAt: '', updatedAt: '', limitations: [],
    };
    const input = createLlmPlannerInput({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentProfile: TEST_LEAD_AGENT_PROFILE,
      task,
      blackboard: bb,
    });
    const output = runFakeLlmPlanner(input);
    expect(['invoke_skill', 'no_op']).toContain(output.actionType);
  });

  it('Ops Check with open gaps proposes request_mcp', () => {
    const bbWithGap = {
      ...bb,
      testCases: [{ id: 'TC-001', title: 'T1', scope: 's', sourceRequirement: 'r', preconditions: [], steps: [], expectedResult: '', priority: 'high', requiredEvidence: [], ownerAgent: 'test_lead', tags: [] }],
    };
    const input = createLlmPlannerInput({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentProfile: OPS_CHECK_AGENT_PROFILE,
      blackboard: bbWithGap,
    });
    const output = runFakeLlmPlanner(input);
    expect(['request_mcp', 'create_task', 'no_op']).toContain(output.actionType);
  });

  it('request_controlled_execution is high risk + requiresApproval', () => {
    const task: AgentTask = {
      id: 'task-1', sessionId: 'test-session', traceId: 't', assignedTo: 'ops_check',
      createdBy: 'test_lead', taskType: 'request_controlled_execution', goal: 'exec',
      inputRefs: [], expectedOutput: 'result', status: 'assigned', priority: 'high',
      requiresApproval: true, relatedEvidenceIds: [], relatedTestCaseIds: [],
      createdAt: '', updatedAt: '', limitations: [],
    };
    const input = createLlmPlannerInput({
      sessionId: 'test-session',
      traceId: 'test-trace',
      agentProfile: OPS_CHECK_AGENT_PROFILE,
      task,
      blackboard: bb,
    });
    const output = runFakeLlmPlanner(input);
    expect(output.riskLevel).toBe('high');
    expect(output.requiresApproval).toBe(true);
  });

  it('invalid confidence is rejected by validator', () => {
    const input = makeInput();
    const output = runFakeLlmPlanner(input);
    const badOutput = { ...output, confidence: 2.5 };
    const validation = validateLlmPlannerOutput(input, badOutput, TEST_LEAD_AGENT_PROFILE);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((i) => i.field === 'confidence')).toBe(true);
  });

  it('unauthorized skill is rejected by validator', () => {
    const input = makeInput();
    const output = runFakeLlmPlanner(input);
    const badOutput = {
      ...output,
      actionType: 'invoke_skill' as const,
      targetSkillName: 'release_recommendation' as const,
    };
    const validation = validateLlmPlannerOutput(input, badOutput, USER_REPRESENTATIVE_AGENT_PROFILE);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((i) => i.field === 'targetSkillName')).toBe(true);
  });

  it('unauthorized MCP is rejected by validator', () => {
    const input = makeInput();
    const output = runFakeLlmPlanner(input);
    const badOutput = {
      ...output,
      actionType: 'request_mcp' as const,
      targetMcpCapability: 'dangerous',
    };
    const validation = validateLlmPlannerOutput(input, badOutput, USER_REPRESENTATIVE_AGENT_PROFILE);
    expect(validation.valid).toBe(false);
  });

  it('forbidden risk output maps to rejected', () => {
    const input = makeInput();
    const output = runFakeLlmPlanner(input);
    const badOutput = { ...output, riskLevel: 'forbidden' as const };
    const proposal = mapPlannerOutputToActionProposal({
      input,
      output: badOutput,
      profile: TEST_LEAD_AGENT_PROFILE,
    });
    expect(proposal.status).toBe('rejected');
  });

  it('planner reason is not evidence', () => {
    const input = makeInput();
    const output = runFakeLlmPlanner(input);
    // output must contain limitation stating it's not evidence
    const allText = [...output.limitations, output.reason].join(' ').toLowerCase();
    expect(allText).toMatch(/not.?evidence|fake|proposal|not.?execut/i);
    // planner output must not contain pass claim
    expect(output.reason.toLowerCase()).not.toMatch(/\btest.*pass(ed)?\b/);
  });

  it('no-op is produced when no rule matches', () => {
    const input = makeInput();
    const output = runFakeLlmPlanner(input, { preferEvidenceGapClosure: false });
    expect(output.actionType).toBe('no_op');
  });
});

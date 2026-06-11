import { describe, it, expect } from 'vitest';
import {
  collectEvidenceFromBlackboard,
  detectEvidenceGaps,
  enforceNoEvidenceNoPass,
  summarizeEvidenceGaps,
} from '../src/agent-runtime/evidenceCollector';
import { createSharedBlackboard } from '../src/agent-runtime/sharedBlackboard';
import type { SharedBlackboard } from '../src/agent-runtime/agentRuntimeTypes';

function bbWith(overrides: Partial<SharedBlackboard> = {}): SharedBlackboard {
  return { ...createSharedBlackboard('test-session'), ...overrides };
}

const MOCK_TEST_CASE = { id: 'TC-001', title: 'Test', scope: 'test', sourceRequirement: 'req', preconditions: [], steps: [], expectedResult: '', priority: 'high', requiredEvidence: [], ownerAgent: 'test_lead', tags: [] };

describe('EvidenceCollector', () => {
  it('detects missing_evidence gap', () => {
    const bb = bbWith({ testCases: [MOCK_TEST_CASE] });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'missing_evidence')).toBe(true);
  });

  it('detects weak_evidence gap', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [{
        id: 'EV-001', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'manual',
        executorType: 'human', result: 'pass', evidenceSource: 'src', evidenceSummary: 'ok',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'none', confidence: 'low', limitations: [], strength: 'weak',
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'weak_evidence')).toBe(true);
  });

  it('detects inconclusive_evidence gap', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [{
        id: 'EV-001', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'manual',
        executorType: 'human', result: 'inconclusive', evidenceSource: 'src', evidenceSummary: '?',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'unknown', confidence: 'low', limitations: [], strength: 'weak',
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'inconclusive_evidence')).toBe(true);
  });

  it('detects agent_reasoning_only gap', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [{
        id: 'EV-001', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'agent analysis',
        executorType: 'agent_reasoning', result: 'pass', evidenceSource: 'agent', evidenceSummary: 'looks good',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'none', confidence: 'low', limitations: ['agent reasoning'], strength: 'weak',
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'agent_reasoning_only')).toBe(true);
  });

  it('detects simulated_or_placeholder_only gap', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [{
        id: 'EV-001', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'simulated',
        executorType: 'mcp_tool', result: 'pass', evidenceSource: 'sim', evidenceSummary: 'simulated output placeholder',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'none', confidence: 'low', limitations: ['draft'], strength: 'weak',
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'simulated_or_placeholder_only')).toBe(true);
  });

  it('detects conflicting_evidence when pass and fail coexist', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [
        { id: 'EV-001', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'api',
          executorType: 'api', result: 'pass', evidenceSource: 'api', evidenceSummary: 'ok',
          observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
          severity: 'none', confidence: 'high', limitations: [], strength: 'medium' },
        { id: 'EV-002', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'human',
          executorType: 'human', result: 'fail', evidenceSource: 'human', evidenceSummary: 'broken',
          observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
          severity: 'P0', confidence: 'high', limitations: [], strength: 'medium' },
      ],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'conflicting_evidence')).toBe(true);
  });

  it('detects missing_test_case_link gap', () => {
    const bb = bbWith({
      normalizedEvidence: [{
        id: 'EV-001', testScope: 'test', executionMethod: 'api',
        executorType: 'api', result: 'pass', evidenceSource: 'api', evidenceSummary: 'ok',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'none', confidence: 'high', limitations: [], strength: 'medium',
        // no testCaseId
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'missing_test_case_link')).toBe(true);
  });

  it('collectEvidenceFromBlackboard returns coverage and gaps', () => {
    const bb = bbWith({ testCases: [MOCK_TEST_CASE] });
    const summary = collectEvidenceFromBlackboard(bb);
    expect(summary.testCaseCount).toBe(1);
    expect(summary.noEvidenceTestCaseCount).toBe(1);
    expect(summary.gaps.length).toBeGreaterThan(0);
  });

  it('enforceNoEvidenceNoPass detects false pass claim in report', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      report: 'Test case TC-001 passed all checks',
    });
    const result = enforceNoEvidenceNoPass(bb);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('enforceNoEvidenceNoPass valid when no pass claims on no-evidence cases', () => {
    const bb = bbWith({ testCases: [MOCK_TEST_CASE] });
    // No report text claiming pass
    const result = enforceNoEvidenceNoPass(bb);
    expect(result.valid).toBe(true);
  });

  it('simulated evidence is not treated as pass evidence', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [{
        id: 'EV-SIM', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'simulated',
        executorType: 'mcp_tool', result: 'pass', evidenceSource: 'fake', evidenceSummary: 'simulated draft',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'none', confidence: 'low', limitations: ['simulated'], strength: 'weak',
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'simulated_or_placeholder_only')).toBe(true);
    expect(gaps.some((g) => g.reason === 'weak_evidence')).toBe(true);
  });

  it('agent_reasoning cannot support pass', () => {
    const bb = bbWith({
      testCases: [MOCK_TEST_CASE],
      normalizedEvidence: [{
        id: 'EV-AG', testCaseId: 'TC-001', testScope: 'test', executionMethod: 'agent',
        executorType: 'agent_reasoning', result: 'pass', evidenceSource: 'agent', evidenceSummary: 'good',
        observedAt: '2026-01-01T00:00:00Z', environment: { name: 'test' },
        severity: 'none', confidence: 'low', limitations: [], strength: 'weak',
      }],
    });
    const gaps = detectEvidenceGaps(bb);
    expect(gaps.some((g) => g.reason === 'agent_reasoning_only')).toBe(true);
  });

  it('summarizeEvidenceGaps returns counts by reason', () => {
    const bb = bbWith({ testCases: [MOCK_TEST_CASE] });
    const gaps = detectEvidenceGaps(bb);
    const summary = summarizeEvidenceGaps(gaps);
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.open).toBeGreaterThan(0);
    expect(Object.keys(summary.byReason).length).toBeGreaterThan(0);
  });
});

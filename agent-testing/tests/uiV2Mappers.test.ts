import { describe, it, expect } from 'vitest';
import {
  mapAgentSessionToViewModel,
  mapAgentProfilesToCards,
  mapAgentTasksToRows,
  mapAgentMessagesToTimeline,
  mapSharedBlackboardToSummary,
  mapEvidenceGapsToRows,
  mapApprovalDraftsToRows,
  buildMultiAgentSessionViewModel,
} from '../src/ui-v2/multiAgentSessionMappers';
import { DEFAULT_AGENT_PROFILES } from '../src/agent-runtime/agentProfileTypes';
import { createAgentSession, transitionAgentSessionStatus } from '../src/agent-runtime/agentSession';
import { createAgentTask, completeAgentTask } from '../src/agent-runtime/agentTaskQueue';
import { createAgentMessage } from '../src/agent-runtime/agentMessageBus';
import type { EvidenceGap } from '../src/agent-runtime/evidenceCollector';
import type { AgentRuntimeApprovalBridgeResult } from '../src/agent-runtime/approvalBridge';

describe('UI V2 Mappers', () => {
  const session = createAgentSession({ runId: 'test-run', targetSystemName: 'Test' });

  it('mapAgentSessionToViewModel produces overview', () => {
    const vm = mapAgentSessionToViewModel(session);
    expect(vm.sessionId).toBe(session.id);
    expect(vm.runId).toBe('test-run');
    expect(vm.targetSystemName).toBe('Test');
    expect(vm.status).toBe('draft');
    expect(vm.statusBadge).toBeDefined();
    expect(vm.agentCount).toBe(6);
  });

  it('mapAgentProfilesToCards produces 6 cards', () => {
    const cards = mapAgentProfilesToCards(DEFAULT_AGENT_PROFILES, []);
    expect(cards).toHaveLength(6);
    expect(cards[0].role).toBeTruthy();
    expect(cards[0].displayName).toBeTruthy();
    expect(cards[0].allowedSkills.length).toBeGreaterThan(0);
  });

  it('mapAgentTasksToRows shows status and priority badges', () => {
    const task = createAgentTask({
      sessionId: session.id,
      assignedTo: 'test_lead',
      createdBy: 'test_lead',
      taskType: 'build_context',
      goal: 'Test',
      expectedOutput: 'Output',
      priority: 'critical',
    });
    const rows = mapAgentTasksToRows([task]);
    expect(rows).toHaveLength(1);
    expect(rows[0].statusBadge.label).toBe('Pending');
    expect(rows[0].priorityBadge.label).toBe('Critical');
    expect(rows[0].priorityBadge.tone).toBe('danger');
  });

  it('completed task shows success badge', () => {
    const task = completeAgentTask(createAgentTask({
      sessionId: session.id,
      assignedTo: 'test_lead',
      createdBy: 'test_lead',
      taskType: 'build_context',
      goal: 'Test',
      expectedOutput: 'Output',
    }));
    const rows = mapAgentTasksToRows([task]);
    expect(rows[0].statusBadge.tone).toBe('success');
    // Task completed ≠ system passed (verified by limitations in view model, not badge)
  });

  it('mapAgentMessagesToTimeline shows from/to/type', () => {
    const msg = createAgentMessage({
      sessionId: session.id,
      fromAgent: 'test_lead',
      toAgent: 'product_acceptance',
      messageType: 'task_assignment',
      summary: 'Do this',
    });
    const items = mapAgentMessagesToTimeline([msg]);
    expect(items).toHaveLength(1);
    expect(items[0].fromAgent).toBe('test_lead');
    expect(items[0].toAgent).toBe('product_acceptance');
    expect(items[0].messageType).toBe('task_assignment');
  });

  it('mapSharedBlackboardToSummary produces stats', () => {
    const summary = mapSharedBlackboardToSummary(session);
    expect(summary.sessionId).toBe(session.id);
    expect(typeof summary.testCaseCount).toBe('number');
    expect(typeof summary.normalizedEvidenceCount).toBe('number');
  });

  it('mapEvidenceGapsToRows open status maps to danger', () => {
    const gap: EvidenceGap = {
      id: 'EG-1',
      sessionId: session.id,
      reason: 'missing_evidence',
      status: 'open',
      summary: 'No evidence',
      recommendedAction: 'Collect evidence',
      relatedEvidenceIds: [],
      limitations: [],
    };
    const rows = mapEvidenceGapsToRows([gap]);
    expect(rows).toHaveLength(1);
    expect(rows[0].statusBadge.tone).toBe('danger');
  });

  it('mapEvidenceGapsToRows partially_covered maps to warning', () => {
    const gap: EvidenceGap = {
      id: 'EG-2',
      sessionId: session.id,
      reason: 'weak_evidence',
      status: 'partially_covered',
      summary: 'Weak',
      recommendedAction: 'Get stronger evidence',
      relatedEvidenceIds: [],
      limitations: [],
    };
    const rows = mapEvidenceGapsToRows([gap]);
    expect(rows[0].statusBadge.tone).toBe('warning');
  });

  it('mapApprovalDraftsToRows pending maps to warning', () => {
    const approval: AgentRuntimeApprovalBridgeResult = {
      id: 'approval-1',
      sessionId: session.id,
      traceId: 'trace-1',
      requestedByAgent: 'ops_check',
      status: 'pending',
      riskLevel: 'HIGH',
      requiresHumanApproval: true,
      forbidden: false,
      reason: 'Needs approval',
      requiredEvidenceBeforeApproval: [],
      policyViolations: [],
      limitations: [],
    };
    const rows = mapApprovalDraftsToRows([approval]);
    expect(rows).toHaveLength(1);
    expect(rows[0].statusBadge.tone).toBe('warning');
    expect(rows[0].requiresHumanApproval).toBe(true);
  });

  it('mapApprovalDraftsToRows forbidden maps to danger', () => {
    const approval: AgentRuntimeApprovalBridgeResult = {
      id: 'approval-2',
      sessionId: session.id,
      traceId: 'trace-2',
      requestedByAgent: 'ops_check',
      status: 'forbidden',
      riskLevel: 'FORBIDDEN',
      requiresHumanApproval: false,
      forbidden: true,
      reason: 'Not allowed',
      requiredEvidenceBeforeApproval: [],
      policyViolations: ['Production forbidden'],
      limitations: [],
    };
    const rows = mapApprovalDraftsToRows([approval]);
    expect(rows[0].statusBadge.tone).toBe('danger');
  });

  it('buildMultiAgentSessionViewModel composes all mappers', () => {
    const vm = buildMultiAgentSessionViewModel({
      session,
      profiles: DEFAULT_AGENT_PROFILES,
    });
    expect(vm.overview).toBeDefined();
    expect(vm.agentProfiles).toHaveLength(6);
    expect(vm.taskQueue).toBeDefined();
    expect(vm.messageTimeline).toBeDefined();
    expect(vm.blackboardSummary).toBeDefined();
    expect(vm.evidenceGaps).toBeDefined();
    expect(vm.approvals).toBeDefined();
    expect(vm.warnings).toBeDefined();
    expect(vm.limitations).toBeDefined();
  });

  it('no evidence does not show as pass', () => {
    const vm = buildMultiAgentSessionViewModel({
      session,
      profiles: DEFAULT_AGENT_PROFILES,
    });
    // With empty session, blackboard should show 0 evidence
    expect(vm.blackboardSummary.normalizedEvidenceCount).toBe(0);
    // limitations must mention that no evidence ≠ pass
    const allLimits = vm.limitations.join(' ').toLowerCase();
    expect(allLimits).toMatch(/not.*pass|no.*evidence|evidence.*gap/i);
  });

  it('task completed does not claim system test passed', () => {
    const task = completeAgentTask(createAgentTask({
      sessionId: session.id,
      assignedTo: 'test_lead',
      createdBy: 'test_lead',
      taskType: 'build_context',
      goal: 'Test',
      expectedOutput: 'Output',
    }));
    const rows = mapAgentTasksToRows([task]);
    // completed badge is 'success' tone but only for task status — not system pass
    expect(rows[0].statusBadge.label).toBe('Completed');
    // The distinction is enforced by the view model's limitations, not the badge
  });
});

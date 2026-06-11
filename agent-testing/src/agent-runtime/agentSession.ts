import type {
  AgentRuntimeRole,
  AgentSession,
  AgentSessionStatus,
} from './agentRuntimeTypes';
import {
  AGENT_SESSION_ALLOWED_TRANSITIONS,
} from './agentRuntimeTypes';
import {
  createSharedBlackboard,
} from './sharedBlackboard';

const DEFAULT_AGENT_ROLES: AgentRuntimeRole[] = [
  'test_lead',
  'product_acceptance',
  'test_design',
  'developer_analysis',
  'ops_check',
  'user_representative',
];

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

export interface CreateAgentSessionInput {
  id?: string;
  runId: string;
  targetSystemName: string;
  agents?: AgentRuntimeRole[];
  now?: string;
  limitations?: string[];
}

export function createAgentSession(input: CreateAgentSessionInput): AgentSession {
  const now = input.now ?? DEFAULT_NOW;
  const id = input.id ?? `agent-session-${input.runId}`;
  const limitations = input.limitations ?? [];

  return {
    id,
    runId: input.runId,
    targetSystemName: input.targetSystemName,
    status: 'draft',
    agents: [...(input.agents ?? DEFAULT_AGENT_ROLES)],
    tasks: [],
    messages: [],
    blackboard: createSharedBlackboard(id, limitations),
    auditEventIds: [],
    createdAt: now,
    updatedAt: now,
    limitations: [...limitations],
  };
}

export function canTransitionAgentSessionStatus(
  from: AgentSessionStatus,
  to: AgentSessionStatus
): boolean {
  return AGENT_SESSION_ALLOWED_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to
  );
}

export function transitionAgentSessionStatus(
  session: AgentSession,
  to: AgentSessionStatus,
  now: string = DEFAULT_NOW
): AgentSession {
  if (!canTransitionAgentSessionStatus(session.status, to)) {
    throw new Error(`Invalid Agent session status transition: ${session.status} -> ${to}`);
  }

  return {
    ...session,
    status: to,
    updatedAt: now,
  };
}

export function summarizeAgentSession(session: AgentSession): {
  id: string;
  runId: string;
  targetSystemName: string;
  status: AgentSessionStatus;
  agentCount: number;
  taskCount: number;
  messageCount: number;
  auditEventCount: number;
  limitations: string[];
} {
  return {
    id: session.id,
    runId: session.runId,
    targetSystemName: session.targetSystemName,
    status: session.status,
    agentCount: session.agents.length,
    taskCount: session.tasks.length,
    messageCount: session.messages.length,
    auditEventCount: session.auditEventIds.length,
    limitations: [...session.limitations],
  };
}

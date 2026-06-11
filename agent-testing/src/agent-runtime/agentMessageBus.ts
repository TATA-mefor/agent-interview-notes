import type {
  AgentMessage,
  AgentMessageType,
  AgentRuntimeRole,
  AgentSession,
  BlackboardRef,
  AgentArtifactRef,
} from './agentRuntimeTypes';

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

export interface CreateAgentMessageInput {
  id?: string;
  sessionId: string;
  traceId?: string;
  fromAgent: AgentRuntimeRole;
  toAgent: AgentRuntimeRole | 'broadcast';
  messageType: AgentMessageType;
  summary: string;
  payloadRef?: BlackboardRef;
  artifacts?: AgentArtifactRef[];
  relatedTaskId?: string;
  relatedEvidenceIds?: string[];
  relatedTestCaseIds?: string[];
  now?: string;
  limitations?: string[];
}

export function createAgentMessage(input: CreateAgentMessageInput): AgentMessage {
  const now = input.now ?? DEFAULT_NOW;
  const id = input.id ?? `agent-message-${input.messageType}-${now.replace(/[^0-9A-Za-z]+/g, '-')}`;

  return {
    id,
    sessionId: input.sessionId,
    traceId: input.traceId ?? `trace-${id}`,
    fromAgent: input.fromAgent,
    toAgent: input.toAgent,
    messageType: input.messageType,
    summary: input.summary,
    payloadRef: input.payloadRef,
    artifacts: input.artifacts ? [...input.artifacts] : undefined,
    relatedTaskId: input.relatedTaskId,
    relatedEvidenceIds: input.relatedEvidenceIds ? [...input.relatedEvidenceIds] : undefined,
    relatedTestCaseIds: input.relatedTestCaseIds ? [...input.relatedTestCaseIds] : undefined,
    createdAt: now,
    limitations: [...(input.limitations ?? [])],
  };
}

export function sendAgentMessage(
  session: AgentSession,
  message: AgentMessage
): AgentSession {
  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: message.createdAt,
  };
}

export function listMessagesForAgent(
  messages: readonly AgentMessage[],
  role: AgentRuntimeRole,
  includeSent: boolean = false
): AgentMessage[] {
  return messages.filter(
    (message) =>
      message.toAgent === role ||
      message.toAgent === 'broadcast' ||
      (includeSent && message.fromAgent === role)
  );
}

export function listMessagesByType(
  messages: readonly AgentMessage[],
  messageType: AgentMessageType
): AgentMessage[] {
  return messages.filter((message) => message.messageType === messageType);
}

function uniqueList<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function summarizeAgentMessages(messages: readonly AgentMessage[]): {
  total: number;
  byType: Partial<Record<AgentMessageType, number>>;
  broadcastCount: number;
  directCount: number;
  limitations: string[];
} {
  const byType: Partial<Record<AgentMessageType, number>> = {};

  for (const message of messages) {
    byType[message.messageType] = (byType[message.messageType] ?? 0) + 1;
  }

  return {
    total: messages.length,
    byType,
    broadcastCount: messages.filter((message) => message.toAgent === 'broadcast').length,
    directCount: messages.filter((message) => message.toAgent !== 'broadcast').length,
    limitations: uniqueList(messages.flatMap((message) => message.limitations)),
  };
}

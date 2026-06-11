import type {
  MarkdownString,
} from '../types';
import {
  summarizeForPersistence,
} from '../persistence';
import type {
  AgentTestingApiRequestContext,
  AgentTestingApiResponse,
  AgentTestingApiStatus,
} from './apiTypes';

export type AgentTestingApiErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'MISSING_EVIDENCE'
  | 'APPROVAL_REQUIRED'
  | 'PERSISTENCE_NOT_AVAILABLE'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN';

export interface AgentTestingApiError {
  code: AgentTestingApiErrorCode;
  message: MarkdownString;
  details?: MarkdownString[];
  retryable: boolean;
}

export function createApiError(params: {
  code: AgentTestingApiErrorCode;
  message: MarkdownString;
  details?: MarkdownString[];
  retryable?: boolean;
}): AgentTestingApiError {
  return {
    code: params.code,
    message: summarizeForPersistence(params.message),
    details: params.details?.map((item) => summarizeForPersistence(item)),
    retryable: params.retryable ?? false,
  };
}

export function createApiResponse<T>(params: {
  context: AgentTestingApiRequestContext;
  status: AgentTestingApiStatus;
  data?: T;
  error?: AgentTestingApiError;
  warnings?: MarkdownString[];
  auditEventIds?: MarkdownString[];
  limitations?: MarkdownString[];
}): AgentTestingApiResponse<T> {
  return {
    status: params.status,
    ok: !params.error && ['ok', 'created', 'accepted'].includes(params.status),
    data: params.data,
    error: params.error,
    warnings: (params.warnings ?? []).map((item) => summarizeForPersistence(item)),
    traceId: params.context.traceId,
    auditEventIds: params.auditEventIds ?? [],
    limitations: [
      ...params.context.limitations,
      ...(params.limitations ?? []),
      'Agent Testing API response is an in-memory boundary object only.',
    ],
  };
}

export function createApiSuccessResponse<T>(params: {
  context: AgentTestingApiRequestContext;
  status?: Extract<AgentTestingApiStatus, 'ok' | 'created' | 'accepted'>;
  data: T;
  warnings?: MarkdownString[];
  auditEventIds?: MarkdownString[];
  limitations?: MarkdownString[];
}): AgentTestingApiResponse<T> {
  return createApiResponse({
    context: params.context,
    status: params.status ?? 'ok',
    data: params.data,
    warnings: params.warnings,
    auditEventIds: params.auditEventIds,
    limitations: params.limitations,
  });
}

export function createApiErrorResponse<T = never>(params: {
  context: AgentTestingApiRequestContext;
  status: Exclude<AgentTestingApiStatus, 'ok' | 'created' | 'accepted'>;
  error: AgentTestingApiError;
  warnings?: MarkdownString[];
  auditEventIds?: MarkdownString[];
  limitations?: MarkdownString[];
}): AgentTestingApiResponse<T> {
  return createApiResponse<T>({
    context: params.context,
    status: params.status,
    error: params.error,
    warnings: params.warnings,
    auditEventIds: params.auditEventIds,
    limitations: params.limitations,
  });
}

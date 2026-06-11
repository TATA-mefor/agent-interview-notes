import type {
  AgentRole,
  IsoDateTimeString,
  MarkdownString,
} from '../types';

export type AgentTestingApiMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

export type AgentTestingApiStatus =
  | 'ok'
  | 'created'
  | 'accepted'
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'forbidden'
  | 'validation_error'
  | 'internal_error';

export interface AgentTestingApiRequestContext {
  requestId: MarkdownString;
  actor: MarkdownString;
  actorRole?: AgentRole;
  method: AgentTestingApiMethod;
  path: MarkdownString;
  createdAt: IsoDateTimeString;
  traceId: MarkdownString;
  limitations: MarkdownString[];
}

export interface AgentTestingApiResponse<T> {
  status: AgentTestingApiStatus;
  ok: boolean;
  data?: T;
  error?: import('./apiErrors').AgentTestingApiError;
  warnings: MarkdownString[];
  traceId: MarkdownString;
  auditEventIds: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingApiListResponse<T> {
  items: T[];
  total: number;
  nextCursor?: MarkdownString;
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

export interface AgentTestingApiPagination {
  limit?: number;
  cursor?: MarkdownString;
}

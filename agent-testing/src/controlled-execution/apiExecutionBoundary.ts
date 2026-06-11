import type {
  MarkdownString,
} from '../types';
import {
  createControlledExecutionRequest,
  type ControlledExecutionRequest,
  type CreateControlledExecutionRequestInput,
} from './controlledExecutionTypes';

export type ControlledApiMethod =
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

export interface ControlledApiRequest {
  method: ControlledApiMethod;
  urlSummary: MarkdownString;
  headersSummary: MarkdownString;
  bodySummary: MarkdownString;
  expectedStatus: number;
  expectedOutput: MarkdownString;
  targetEnvironment: MarkdownString;
  riskNotes: MarkdownString[];
}

export interface BuildControlledApiExecutionRequestInput
  extends Omit<CreateControlledExecutionRequestInput, 'kind' | 'target' | 'inputSummary' | 'expectedOutput'> {
  apiRequest: ControlledApiRequest;
}

function redactSensitiveSummary(summary: MarkdownString): MarkdownString {
  return summary.replace(/(token|password|secret|api[_ -]?key|authorization)\s*[:=]\s*[^,\s]+/gi, '$1: [redacted]');
}

function isWriteMethod(method: ControlledApiMethod): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export function buildControlledApiExecutionRequest(
  input: BuildControlledApiExecutionRequestInput
): ControlledExecutionRequest {
  const writeMethod = isWriteMethod(input.apiRequest.method);
  const forbiddenDelete = input.apiRequest.method === 'DELETE' &&
    (input.isProduction === true || input.touchesSensitiveData === true);
  const redactedHeaders = redactSensitiveSummary(input.apiRequest.headersSummary);
  const redactedBody = redactSensitiveSummary(input.apiRequest.bodySummary);

  return createControlledExecutionRequest({
    ...input,
    kind: 'http_api',
    target: `${input.apiRequest.method} ${input.apiRequest.urlSummary}`,
    inputSummary: [
      `Method: ${input.apiRequest.method}.`,
      `Headers summary: ${redactedHeaders}.`,
      `Body summary: ${redactedBody}.`,
      `Target environment: ${input.apiRequest.targetEnvironment}.`,
      `Expected status: ${input.apiRequest.expectedStatus}.`,
      ...input.apiRequest.riskNotes,
    ].join(' '),
    expectedOutput: input.apiRequest.expectedOutput,
    permissionLevel: forbiddenDelete
      ? 'PRODUCTION_FORBIDDEN'
      : writeMethod
        ? 'EXECUTE_LIMITED'
        : input.permissionLevel ?? 'READ_ONLY',
    sideEffectLevel: forbiddenDelete
      ? 'DESTRUCTIVE'
      : writeMethod
        ? 'EXTERNAL_CALL'
        : input.sideEffectLevel ?? 'NONE',
    callsExternalService: true,
    requiresNetwork: true,
    isDestructive: input.isDestructive ?? input.apiRequest.method === 'DELETE',
    touchesSensitiveData: input.touchesSensitiveData ?? /token|password|secret|api[_ -]?key|authorization/i.test([
      input.apiRequest.headersSummary,
      input.apiRequest.bodySummary,
    ].join(' ')),
    evidenceToProduce: input.evidenceToProduce ?? ['dry-run API execution plan', 'simulated API result draft'],
    limitations: [
      ...(input.limitations ?? []),
      'API boundary only builds a controlled execution request; no HTTP request was sent.',
      'Sensitive header/body summaries are redacted when obvious secret markers are present.',
      ...(forbiddenDelete ? ['DELETE against production or sensitive data is forbidden.'] : []),
      ...(writeMethod && !forbiddenDelete ? ['Write methods are high risk and must remain approval-gated.'] : []),
    ],
  });
}

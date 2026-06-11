import type {
  MarkdownString,
} from '../types';
import {
  createControlledExecutionRequest,
  type ControlledExecutionRequest,
  type CreateControlledExecutionRequestInput,
} from './controlledExecutionTypes';

export type ControlledBrowserAction =
  | 'navigate'
  | 'inspect_text'
  | 'click'
  | 'type'
  | 'submit'
  | 'upload_file'
  | 'download_file'
  | 'screenshot'
  | 'unknown';

export interface ControlledBrowserRequest {
  actions: ControlledBrowserAction[];
  targetUrlSummary: MarkdownString;
  accountContextSummary: MarkdownString;
  expectedOutput: MarkdownString;
  targetEnvironment: MarkdownString;
  riskNotes: MarkdownString[];
}

export interface BuildControlledBrowserExecutionRequestInput
  extends Omit<CreateControlledExecutionRequestInput, 'kind' | 'target' | 'inputSummary' | 'expectedOutput'> {
  browserRequest: ControlledBrowserRequest;
}

const HIGH_RISK_BROWSER_ACTIONS: ControlledBrowserAction[] = [
  'click',
  'type',
  'submit',
  'upload_file',
  'download_file',
];

const READ_ONLY_BROWSER_ACTIONS: ControlledBrowserAction[] = [
  'navigate',
  'inspect_text',
  'screenshot',
];

export function buildControlledBrowserExecutionRequest(
  input: BuildControlledBrowserExecutionRequestInput
): ControlledExecutionRequest {
  const hasHighRiskAction = input.browserRequest.actions.some((action) =>
    HIGH_RISK_BROWSER_ACTIONS.includes(action)
  );
  const allReadOnly = input.browserRequest.actions.every((action) =>
    READ_ONLY_BROWSER_ACTIONS.includes(action)
  );
  const productionSubmit = input.isProduction === true &&
    input.browserRequest.actions.some((action) => action === 'submit');

  return createControlledExecutionRequest({
    ...input,
    kind: 'browser',
    target: input.browserRequest.targetUrlSummary,
    inputSummary: [
      `Browser actions: ${input.browserRequest.actions.join(', ')}.`,
      `Account context: ${input.browserRequest.accountContextSummary}.`,
      `Target environment: ${input.browserRequest.targetEnvironment}.`,
      ...input.browserRequest.riskNotes,
    ].join(' '),
    expectedOutput: input.browserRequest.expectedOutput,
    permissionLevel: productionSubmit
      ? 'PRODUCTION_FORBIDDEN'
      : hasHighRiskAction
        ? 'EXECUTE_LIMITED'
        : input.permissionLevel ?? 'READ_ONLY',
    sideEffectLevel: productionSubmit
      ? 'DESTRUCTIVE'
      : hasHighRiskAction
        ? 'EXTERNAL_CALL'
        : input.sideEffectLevel ?? 'NONE',
    callsExternalService: true,
    requiresNetwork: true,
    isDestructive: input.isDestructive ?? productionSubmit,
    touchesSensitiveData: input.touchesSensitiveData ??
      /password|token|private|sensitive|credential/i.test(input.browserRequest.accountContextSummary),
    writesToFilesystem: input.writesToFilesystem ??
      (input.browserRequest.actions.includes('download_file') ||
        input.browserRequest.actions.includes('screenshot')),
    evidenceToProduce: input.evidenceToProduce ?? ['dry-run browser execution plan', 'simulated browser result draft'],
    limitations: [
      ...(input.limitations ?? []),
      'Browser boundary only builds a controlled execution request; no browser was started.',
      ...(allReadOnly ? ['Browser actions are read-only style but still not executed in this phase.'] : []),
      ...(hasHighRiskAction ? ['Interactive browser actions are high risk and must remain approval-gated.'] : []),
      ...(productionSubmit ? ['Production form submission is forbidden in this phase.'] : []),
    ],
  });
}

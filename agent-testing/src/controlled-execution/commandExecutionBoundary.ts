import type {
  MarkdownString,
} from '../types';
import {
  createControlledExecutionRequest,
  type ControlledExecutionRequest,
  type CreateControlledExecutionRequestInput,
} from './controlledExecutionTypes';

export type CommandAllowlistedCategory =
  | 'typecheck'
  | 'unit_test'
  | 'lint'
  | 'build'
  | 'readonly_info'
  | 'unknown';

export interface ControlledCommandRequest {
  command: MarkdownString;
  args: MarkdownString[];
  workingDirectorySummary: MarkdownString;
  environmentSummary: MarkdownString;
  timeoutMs: number;
  allowlistedCategory: CommandAllowlistedCategory;
  expectedOutput: MarkdownString;
  riskNotes: MarkdownString[];
}

export interface BuildControlledCommandExecutionRequestInput
  extends Omit<CreateControlledExecutionRequestInput, 'kind' | 'target' | 'inputSummary' | 'expectedOutput'> {
  commandRequest: ControlledCommandRequest;
}

const FORBIDDEN_COMMAND_PATTERNS = [
  'rm -rf',
  'del /s',
  'format',
  'drop database',
  'truncate',
  'delete from',
  'shutdown',
  'reboot',
  'curl | sh',
  'wget | sh',
];

const HIGH_COMMAND_PATTERNS = [
  'npm install',
  'pnpm install',
  'yarn add',
  'migration',
  'migrate',
  'deploy',
  'git push',
  'git reset --hard',
  'docker compose down',
  'kubectl apply',
  'kubectl delete',
];

function commandText(commandRequest: ControlledCommandRequest): MarkdownString {
  return [commandRequest.command, ...commandRequest.args].join(' ').toLowerCase();
}

function containsAny(text: MarkdownString, patterns: MarkdownString[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

export function buildControlledCommandExecutionRequest(
  input: BuildControlledCommandExecutionRequestInput
): ControlledExecutionRequest {
  const command = commandText(input.commandRequest);
  const forbidden = containsAny(command, FORBIDDEN_COMMAND_PATTERNS) ||
    (input.isProduction === true && command.includes('deploy')) ||
    (input.isDestructive === true && input.purpose.trim().length === 0);
  const highRisk = forbidden || containsAny(command, HIGH_COMMAND_PATTERNS);

  return createControlledExecutionRequest({
    ...input,
    kind: 'command',
    target: `${input.commandRequest.command} ${input.commandRequest.args.join(' ')}`.trim(),
    inputSummary: [
      `Command category: ${input.commandRequest.allowlistedCategory}.`,
      `Working directory summary: ${input.commandRequest.workingDirectorySummary}.`,
      `Environment summary: ${input.commandRequest.environmentSummary}.`,
      `Timeout: ${input.commandRequest.timeoutMs}ms.`,
      ...input.commandRequest.riskNotes,
    ].join(' '),
    expectedOutput: input.commandRequest.expectedOutput,
    permissionLevel: forbidden
      ? 'WRITE_DANGEROUS'
      : highRisk
        ? 'EXECUTE_LIMITED'
        : input.permissionLevel ?? 'EXECUTE_LIMITED',
    sideEffectLevel: forbidden
      ? 'DESTRUCTIVE'
      : highRisk
        ? input.sideEffectLevel ?? 'LOCAL_WRITE'
        : input.sideEffectLevel ?? 'NONE',
    isDestructive: input.isDestructive ?? forbidden,
    executesCommand: true,
    modifiesDeployment: input.modifiesDeployment ?? (command.includes('deploy') || command.includes('kubectl')),
    modifiesDatabase: input.modifiesDatabase ?? (command.includes('migrate') || command.includes('database')),
    writesToFilesystem: input.writesToFilesystem ?? !['readonly_info'].includes(input.commandRequest.allowlistedCategory),
    evidenceToProduce: input.evidenceToProduce ?? ['dry-run command execution plan', 'simulated command result draft'],
    limitations: [
      ...(input.limitations ?? []),
      'Command boundary only builds a controlled execution request; no shell command was executed.',
      ...(forbidden ? ['Command matched a forbidden command pattern.'] : []),
      ...(highRisk && !forbidden ? ['Command matched a high-risk command pattern and must remain approval-gated.'] : []),
    ],
  });
}

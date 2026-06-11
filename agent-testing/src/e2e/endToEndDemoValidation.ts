import type {
  MarkdownString,
} from '../types';
import type {
  EndToEndDemoResult,
  EndToEndDemoStageName,
} from './endToEndDemoTypes';

export interface EndToEndDemoValidationCheck {
  name: MarkdownString;
  passed: boolean;
  expected: MarkdownString;
  actual: MarkdownString;
  message: MarkdownString;
}

export interface EndToEndDemoValidationResult {
  success: boolean;
  checks: EndToEndDemoValidationCheck[];
  warnings: MarkdownString[];
  limitations: MarkdownString[];
}

const REQUIRED_STAGES: EndToEndDemoStageName[] = [
  'fixture_loaded',
  'offline_scenario_validated',
  'api_demo_created',
  'ui_view_model_built',
  'read_only_mcp_pilot_run',
  'controlled_execution_boundary_checked',
  'approval_policy_evaluated',
  'audit_trail_built',
  'observability_metrics_built',
  'persistence_snapshot_built',
  'persistence_snapshot_validated',
  'report_preview_built',
  'summary_built',
];

function check(params: EndToEndDemoValidationCheck): EndToEndDemoValidationCheck {
  return params;
}

function includesBoundaryText(items: MarkdownString[]): boolean {
  const text = items.join(' ').toLowerCase();

  return [
    'offline',
    'in-memory',
    'not a real system test',
    'not real evidence',
    'not human approval',
    'no real',
    'dry-run',
    'simulated',
  ].some((keyword) => text.includes(keyword));
}

function noEvidencePassSynthesized(result: EndToEndDemoResult): boolean {
  const rawPassCount = (result.fixture.input.rawEvidence ?? []).filter((item) => {
    const raw = String(item.rawResult).toLowerCase();
    return ['true', 'pass', 'passed', 'success', 'ok'].includes(raw);
  }).length;
  const rawAgentReasoningPassCount = (result.fixture.input.rawEvidence ?? []).filter((item) => {
    const raw = String(item.rawResult).toLowerCase();
    return item.executorType === 'agent_reasoning' && ['true', 'pass', 'passed', 'success', 'ok'].includes(raw);
  }).length;
  const allowedPassCount = rawPassCount - rawAgentReasoningPassCount;
  const normalizedPassCount = result.offlineScenarioValidation.orchestration.normalizedEvidence.filter((item) =>
    item.result === 'pass'
  ).length;
  const agentReasoningPassCount = result.offlineScenarioValidation.orchestration.normalizedEvidence.filter((item) =>
    item.executorType === 'agent_reasoning' && item.result === 'pass'
  ).length;

  return normalizedPassCount <= allowedPassCount && agentReasoningPassCount === 0;
}

export function validateEndToEndDemoResult(
  result: EndToEndDemoResult
): EndToEndDemoValidationResult {
  if (!result) {
    throw new Error('End-to-end demo result is required.');
  }

  const stageSet = new Set(result.stages.map((item) => item.stage));
  const missingStages = REQUIRED_STAGES.filter((stageName) => !stageSet.has(stageName));
  const controlledKinds = new Set(result.controlledExecutionPreview.map((item) => item.kind));
  const approvalLabels = new Set(result.approvalPreview.map((item) => item.label));
  const forbiddenSimulatedCompleted = result.controlledExecutionPreview.some((item) =>
    item.safety.forbidden && item.result?.status === 'simulated_completed'
  );
  const simulatedMarkedAsRealEvidence = result.controlledExecutionPreview.some((item) =>
    item.result?.normalizedEvidencePreview?.result === 'pass' ||
    item.result?.producedEvidenceIds.length
  );
  const checks: EndToEndDemoValidationCheck[] = [
    check({
      name: 'status exists',
      passed: Boolean(result.status),
      expected: 'completed/completed_with_warnings/failed/inconclusive',
      actual: result.status ?? 'missing',
      message: result.status ? 'Demo status is present.' : 'Demo status is missing.',
    }),
    check({
      name: 'required stages covered',
      passed: missingStages.length === 0,
      expected: REQUIRED_STAGES.join(', '),
      actual: result.stages.map((item) => item.stage).join(', '),
      message: missingStages.length === 0
        ? 'All required stages are present.'
        : `Missing stage(s): ${missingStages.join(', ')}.`,
    }),
    check({
      name: 'offline scenario validation exists',
      passed: Boolean(result.offlineScenarioValidation?.orchestration),
      expected: 'offline scenario validation with orchestration',
      actual: result.offlineScenarioValidation ? 'present' : 'missing',
      message: 'Offline validation is required for the E2E demo.',
    }),
    check({
      name: 'api demo exists',
      passed: Boolean(result.apiDemo?.createRun && result.apiDemo?.getRun),
      expected: 'in-memory API demo create/get responses',
      actual: result.apiDemo ? result.apiDemo.summary : 'missing',
      message: 'API demo result should be present.',
    }),
    check({
      name: 'ui view model exists',
      passed: Boolean(result.uiViewModel?.overview),
      expected: 'props-only UI view model',
      actual: result.uiViewModel?.overview?.runId ?? 'missing',
      message: 'UI view model should be present.',
    }),
    check({
      name: 'read-only pilot exists',
      passed: Boolean(result.readOnlyMcpPilot?.summary?.totalRequests),
      expected: 'read-only MCP pilot snapshot result',
      actual: String(result.readOnlyMcpPilot?.summary?.totalRequests ?? 0),
      message: 'Read-only MCP pilot result should be present.',
    }),
    check({
      name: 'controlled preview coverage',
      passed: controlledKinds.has('safe_command_dry_run') &&
        controlledKinds.has('api_get_simulated') &&
        controlledKinds.has('forbidden_destructive'),
      expected: 'safe_command_dry_run, api_get_simulated, forbidden_destructive',
      actual: Array.from(controlledKinds).join(', '),
      message: 'Controlled execution previews must cover safe dry-run, simulated API, and forbidden action.',
    }),
    check({
      name: 'approval preview coverage',
      passed: approvalLabels.has('LOW') && approvalLabels.has('HIGH') && approvalLabels.has('FORBIDDEN'),
      expected: 'LOW, HIGH, FORBIDDEN',
      actual: Array.from(approvalLabels).join(', '),
      message: 'Approval preview must cover all key policy categories.',
    }),
    check({
      name: 'persistence validation exists',
      passed: Boolean(result.persistenceValidation),
      expected: 'persistence validation result',
      actual: result.persistenceValidation ? `${result.persistenceValidation.issues.length} issue(s)` : 'missing',
      message: 'Persistence validation should be present.',
    }),
    check({
      name: 'report preview exists or limitation explains missing',
      passed: Boolean(result.reportPreview) ||
        result.limitations.some((item) => item.toLowerCase().includes('report preview is missing')),
      expected: 'report preview or explicit limitation',
      actual: result.reportPreview ? 'present' : 'missing',
      message: 'Report preview should be present or explicitly limited.',
    }),
    check({
      name: 'no evidence pass synthesis',
      passed: noEvidencePassSynthesized(result),
      expected: 'pass evidence count does not exceed provided non-agent pass inputs',
      actual: `${result.offlineScenarioValidation.orchestration.normalizedEvidence.filter((item) => item.result === 'pass').length} normalized pass evidence item(s)`,
      message: 'No-evidence test cases and agent reasoning are not converted to pass evidence.',
    }),
    check({
      name: 'simulated result not real evidence',
      passed: !simulatedMarkedAsRealEvidence,
      expected: 'simulated results produce no pass evidence and no real produced evidence ids',
      actual: simulatedMarkedAsRealEvidence ? 'violation found' : 'no violation',
      message: 'Simulated controlled results must not be treated as real evidence.',
    }),
    check({
      name: 'forbidden action not simulated completed',
      passed: !forbiddenSimulatedCompleted,
      expected: 'forbidden preview has no simulated_completed result',
      actual: forbiddenSimulatedCompleted ? 'violation found' : 'no violation',
      message: 'Forbidden action must stop before simulated completion.',
    }),
    check({
      name: 'demo-only boundaries documented',
      passed: includesBoundaryText([...result.warnings, ...result.limitations]),
      expected: 'warnings/limitations mention offline demo-only boundaries',
      actual: includesBoundaryText([...result.warnings, ...result.limitations]) ? 'present' : 'missing',
      message: 'Result should clearly state demo-only boundaries.',
    }),
  ];
  const failed = checks.filter((item) => !item.passed);

  return {
    success: failed.length === 0,
    checks,
    warnings: failed.map((item) => item.message),
    limitations: [
      'End-to-end demo validation is a pure in-memory validation utility.',
      'Validation does not execute commands, call APIs, start browsers, call MCP, call LLMs, read files, write files, or connect to storage.',
    ],
  };
}

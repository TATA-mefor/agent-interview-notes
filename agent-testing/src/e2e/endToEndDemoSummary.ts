import type {
  EndToEndDemoResult,
} from './endToEndDemoTypes';

export function summarizeEndToEndDemo(result: EndToEndDemoResult): string {
  const release = result.offlineScenarioValidation.orchestration.releaseRecommendation?.recommendation ?? 'missing';
  const simulatedCount = result.controlledExecutionPreview.filter((item) => item.simulated).length;
  const forbiddenCount = result.controlledExecutionPreview.filter((item) => item.safety.forbidden).length;

  return [
    `# ${result.fixture.name} Phase 22 Offline E2E Demo`,
    '',
    `Status: ${result.status}`,
    '',
    `This is an offline, deterministic, in-memory demo for run \`${result.artifactRefs.runId}\`. It is not a real system test execution and must not be used as a production release report.`,
    '',
    '## Pipeline',
    '',
    `- Fixture validation: ${result.offlineScenarioValidation.summary}`,
    `- In-memory API service: ${result.apiDemo.summary}`,
    `- UI layer: props-only view model sections (${result.artifactRefs.uiSections.join(', ')}), not a production page.`,
    `- Read-only MCP pilot: fake snapshot requests=${result.readOnlyMcpPilot.summary.totalRequests}, fake reads=${result.readOnlyMcpPilot.summary.executedFakeReads}, forbidden=${result.readOnlyMcpPilot.summary.forbiddenRequests}.`,
    `- Controlled execution: previews=${result.controlledExecutionPreview.length}, simulated=${simulatedCount}, forbidden=${forbiddenCount}; no command, HTTP request, or browser action was executed.`,
    `- Approval: LOW/HIGH/FORBIDDEN policy evaluations only; no human approval was requested.`,
    `- Audit and observability: ${result.auditPreview.eventCount} in-memory audit event(s), ${result.observabilityPreview.eventCount} aggregated metric event(s).`,
    `- Persistence: ${result.persistenceSnapshot.records.length} in-memory record(s), validation valid=${result.persistenceValidation.valid}; no database or disk persistence.`,
    `- Report preview: ${result.reportPreview ? 'available in memory' : 'missing; see limitations'}.`,
    `- Release recommendation from fixture-driven orchestration: ${release}.`,
    '',
    '## Evidence Boundary',
    '',
    'Evidence comes from the fixture, draft read-only pilot outputs, and deterministic normalization. Simulated or dry-run controlled execution results are boundary previews only and are not pass evidence. Missing evidence remains missing, and no-evidence test cases are not converted to pass.',
    '',
    '## Limitations',
    '',
    ...result.limitations.map((item) => `- ${item}`),
  ].join('\n');
}

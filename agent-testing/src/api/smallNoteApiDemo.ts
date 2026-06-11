import {
  smallNoteSystemOrchestrationInput,
} from '../examples';
import {
  createAgentTestingApiService,
} from './agentTestingApiService';
import type {
  AgentTestingApiRequestContext,
} from './apiTypes';
import type {
  SmallNoteApiDemoResult,
} from './apiModels';

function demoContext(path: string, requestId: string): AgentTestingApiRequestContext {
  return {
    requestId,
    actor: 'offline-small-note-api-demo',
    actorRole: 'test_lead',
    method: 'POST',
    path,
    createdAt: '',
    traceId: `trace-${requestId}`,
    limitations: [
      'Small note API demo is deterministic and uses in-memory service only.',
    ],
  };
}

export function runSmallNoteApiDemo(): SmallNoteApiDemoResult {
  const service = createAgentTestingApiService();
  const runId = smallNoteSystemOrchestrationInput.runId ?? 'offline-small-note-system';
  const createRun = service.createRun(demoContext('/agent-testing/runs', 'small-note-create'), {
    ...smallNoteSystemOrchestrationInput,
    runId,
  });
  const getRun = service.getRun(demoContext(`/agent-testing/runs/${runId}`, 'small-note-get'), runId);
  const observability = service.getObservabilityMetrics(
    demoContext(`/agent-testing/runs/${runId}/observability`, 'small-note-observability'),
    runId
  );
  const snapshot = service.getPersistenceSnapshot(
    demoContext(`/agent-testing/runs/${runId}/snapshot`, 'small-note-snapshot'),
    runId
  );
  const validation = service.validatePersistenceSnapshot(
    demoContext(`/agent-testing/runs/${runId}/snapshot/validate`, 'small-note-validation'),
    runId
  );
  const report = service.generateReport(
    demoContext(`/agent-testing/runs/${runId}/report`, 'small-note-report'),
    runId,
    { includeMarkdown: false }
  );
  const successCount = [
    createRun.ok,
    getRun.ok,
    observability.ok,
    snapshot.ok,
    validation.ok,
    report.ok,
  ].filter(Boolean).length;

  return {
    createRun: createRun.data,
    getRun: getRun.data,
    observability: observability.data,
    snapshot: snapshot.data,
    validation: validation.data,
    report: report.data,
    summary: `Small note API demo completed ${successCount} of 6 in-memory boundary calls successfully.`,
    limitations: [
      'Demo does not call a real API route, start a server, execute tests, call MCP, call LLM, write files, or connect to a database.',
      'All results are in-memory DTOs over the static small note fixture.',
    ],
  };
}

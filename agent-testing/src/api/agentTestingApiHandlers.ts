import type {
  AgentTestingApiPagination,
  AgentTestingApiRequestContext,
} from './apiTypes';
import type {
  CreateAgentTestingRunRequest,
  EvaluateApprovalRequest,
  GenerateReportRequest,
  SubmitEvidenceRequest,
} from './apiModels';
import type {
  AgentTestingApiService,
} from './agentTestingApiService';

export function handleCreateAgentTestingRun(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  request: CreateAgentTestingRunRequest
) {
  return service.createRun(context, request);
}

export function handleGetAgentTestingRun(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.getRun(context, runId);
}

export function handleListAgentTestingRuns(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  pagination?: AgentTestingApiPagination
) {
  return service.listRuns(context, pagination);
}

export function handleSubmitEvidence(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string,
  request: SubmitEvidenceRequest
) {
  return service.submitEvidence(context, runId, request);
}

export function handleListEvidence(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.listEvidence(context, runId);
}

export function handleEvaluateApproval(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  request: EvaluateApprovalRequest
) {
  return service.evaluateApproval(context, request);
}

export function handleListApprovalRequests(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.listApprovalRequests(context, runId);
}

export function handleGetAuditTrail(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.getAuditTrail(context, runId);
}

export function handleGetObservabilityMetrics(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.getObservabilityMetrics(context, runId);
}

export function handleGenerateReport(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string,
  request?: GenerateReportRequest
) {
  return service.generateReport(context, runId, request);
}

export function handleGetReport(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.getReport(context, runId);
}

export function handleGetPersistenceSnapshot(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.getPersistenceSnapshot(context, runId);
}

export function handleValidatePersistenceSnapshot(
  service: AgentTestingApiService,
  context: AgentTestingApiRequestContext,
  runId: string
) {
  return service.validatePersistenceSnapshot(context, runId);
}

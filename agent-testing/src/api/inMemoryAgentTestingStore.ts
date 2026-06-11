import type {
  ApprovalPolicyOutput,
} from '../approval';
import type {
  AuditTrailOutput,
  ObservabilityMetrics,
} from '../audit';
import type {
  SystemTestEvidence,
} from '../types';
import type {
  TestLeadOrchestrationOutput,
} from '../orchestration';
import type {
  AgentTestingPersistenceSnapshot,
  PersistenceValidationResult,
} from '../persistence';
import type {
  MarkdownReportOutput,
} from '../report';
import type {
  AgentTestingRunDto,
} from './apiModels';

export interface InMemoryAgentTestingStoreState {
  runs: Map<string, AgentTestingRunDto>;
  orchestrationOutputs: Map<string, TestLeadOrchestrationOutput>;
  evidence: Map<string, SystemTestEvidence[]>;
  approvals: Map<string, ApprovalPolicyOutput[]>;
  auditTrails: Map<string, AuditTrailOutput>;
  observabilityMetrics: Map<string, ObservabilityMetrics>;
  reports: Map<string, MarkdownReportOutput>;
  persistenceSnapshots: Map<string, AgentTestingPersistenceSnapshot>;
  validationResults: Map<string, PersistenceValidationResult>;
}

export interface InMemoryAgentTestingStore {
  state: InMemoryAgentTestingStoreState;
  getState(): InMemoryAgentTestingStoreState;
  clear(): void;
  reset(): void;
}

function createState(): InMemoryAgentTestingStoreState {
  return {
    runs: new Map(),
    orchestrationOutputs: new Map(),
    evidence: new Map(),
    approvals: new Map(),
    auditTrails: new Map(),
    observabilityMetrics: new Map(),
    reports: new Map(),
    persistenceSnapshots: new Map(),
    validationResults: new Map(),
  };
}

export function createInMemoryAgentTestingStore(): InMemoryAgentTestingStore {
  let state = createState();

  return {
    get state() {
      return state;
    },
    getState() {
      return state;
    },
    clear() {
      state.runs.clear();
      state.orchestrationOutputs.clear();
      state.evidence.clear();
      state.approvals.clear();
      state.auditTrails.clear();
      state.observabilityMetrics.clear();
      state.reports.clear();
      state.persistenceSnapshots.clear();
      state.validationResults.clear();
    },
    reset() {
      state = createState();
    },
  };
}

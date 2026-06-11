import {
  AgentTestingApprovalPanel,
} from './AgentTestingApprovalPanel';
import {
  AgentTestingAuditTimeline,
} from './AgentTestingAuditTimeline';
import {
  AgentTestingEvidenceTable,
} from './AgentTestingEvidenceTable';
import {
  AgentTestingObservabilityPanel,
} from './AgentTestingObservabilityPanel';
import {
  AgentTestingPersistencePanel,
} from './AgentTestingPersistencePanel';
import {
  AgentTestingReleasePanel,
} from './AgentTestingReleasePanel';
import {
  AgentTestingReportPreview,
} from './AgentTestingReportPreview';
import {
  AgentTestingRunOverview,
} from './AgentTestingRunOverview';
import type {
  AgentTestingDemoShellViewModel,
} from './uiTypes';

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function AgentTestingDemoShell({
  viewModel,
}: {
  viewModel: AgentTestingDemoShellViewModel;
}) {
  return (
    <main className="agent-testing-demo-shell">
      <AgentTestingRunOverview viewModel={viewModel.overview} />
      <TextList title="Demo Warnings" items={viewModel.warnings} />
      <AgentTestingEvidenceTable rows={viewModel.evidenceRows} />
      <AgentTestingReleasePanel
        badge={viewModel.release.badge}
        reason={viewModel.release.reason}
        blockingFactors={viewModel.release.blockingFactors}
        evidenceGaps={viewModel.release.evidenceGaps}
        limitations={viewModel.release.limitations}
      />
      <AgentTestingApprovalPanel rows={viewModel.approvalRows} />
      <AgentTestingAuditTimeline items={viewModel.auditTimeline} />
      <AgentTestingObservabilityPanel viewModel={viewModel.observability} />
      <AgentTestingPersistencePanel viewModel={viewModel.persistence} />
      <AgentTestingReportPreview viewModel={viewModel.report} />
      <TextList title="Demo Limitations" items={viewModel.limitations} />
    </main>
  );
}

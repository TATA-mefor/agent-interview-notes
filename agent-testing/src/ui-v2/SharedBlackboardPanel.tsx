import type { SharedBlackboardSummaryViewModel } from './multiAgentSessionTypes';

interface StatRowProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function StatRow({ label, value, highlight }: StatRowProps) {
  return (
    <div className={`agent-stat-row ${highlight ? 'agent-stat-row--highlight' : ''}`}>
      <span className="agent-stat-row__label">{label}</span>
      <span className="agent-stat-row__value">{value}</span>
    </div>
  );
}

export function SharedBlackboardPanel({
  viewModel,
}: {
  viewModel: SharedBlackboardSummaryViewModel;
}) {
  return (
    <section className="agent-section">
      <h3>Shared Blackboard Summary</h3>
      <p className="agent-section__id">Session: {viewModel.sessionId}</p>

      <div className="agent-stat-grid">
        <StatRow label="Acceptance Points" value={viewModel.acceptancePointCount} />
        <StatRow label="Test Cases" value={viewModel.testCaseCount} highlight />
        <StatRow label="Raw Evidence" value={viewModel.rawEvidenceCount} />
        <StatRow
          label="Normalized Evidence"
          value={viewModel.normalizedEvidenceCount}
          highlight
        />
        <StatRow label="Severity Classifications" value={viewModel.severityCount} />
        <StatRow label="Defects" value={viewModel.defectCount} />
        <StatRow label="Regression Suggestions" value={viewModel.regressionCount} />
        <StatRow label="Ops Checklist Items" value={viewModel.opsChecklistCount} />
        <StatRow label="Approval Requests" value={viewModel.approvalRequestCount} />
        <StatRow label="Audit Events" value={viewModel.auditEventCount} />
        <StatRow label="Unknowns" value={viewModel.unknownCount} />
        <StatRow label="Limitations" value={viewModel.limitationCount} />
      </div>
    </section>
  );
}

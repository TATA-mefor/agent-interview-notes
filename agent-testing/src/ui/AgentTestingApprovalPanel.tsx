import type {
  AgentTestingApprovalRow,
  AgentTestingUiBadge,
} from './uiTypes';

function Badge({ badge }: { badge: AgentTestingUiBadge }) {
  return (
    <span className={`agent-testing-badge agent-testing-badge--${badge.tone}`} title={badge.title}>
      {badge.label}
    </span>
  );
}

export function AgentTestingApprovalPanel({
  rows,
}: {
  rows: AgentTestingApprovalRow[];
}) {
  return (
    <section className="agent-testing-approval-panel" aria-label="Agent testing approval panel">
      <h3>Approvals</h3>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Risk</th>
            <th>Status</th>
            <th>Requires Approval</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>No approval rows were provided by this UI view model.</td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.id}>
              <td>{row.actionType}</td>
              <td>{row.riskLevel}</td>
              <td><Badge badge={row.badge} /></td>
              <td>{row.requiresApproval ? 'yes' : 'no'}</td>
              <td>{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

import type { AgentApprovalRow } from './multiAgentSessionTypes';

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`agent-badge agent-badge--${tone}`}>{label}</span>
  );
}

export function AgentApprovalPanel({ rows }: { rows: AgentApprovalRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="agent-section">
        <h3>Approvals</h3>
        <p className="agent-section__empty">No approval requests have been recorded.</p>
      </section>
    );
  }

  return (
    <section className="agent-section">
      <h3>Approvals ({rows.length})</h3>
      <table className="agent-table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Agent</th>
            <th>Action</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="agent-table__id">{row.id}</td>
              <td>{row.agentRole}</td>
              <td>{row.actionType}</td>
              <td><Badge label={row.statusBadge.label} tone={row.statusBadge.tone} /></td>
              <td>{row.riskLevel}</td>
              <td className="agent-table__reason">{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

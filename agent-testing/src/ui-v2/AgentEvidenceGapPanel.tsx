import type { AgentEvidenceGapRow } from './multiAgentSessionTypes';

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`agent-badge agent-badge--${tone}`}>{label}</span>
  );
}

export function AgentEvidenceGapPanel({ rows }: { rows: AgentEvidenceGapRow[] }) {
  const openCount = rows.filter((r) => r.status === 'open').length;
  const partialCount = rows.filter((r) => r.status === 'partially_covered').length;

  return (
    <section className="agent-section">
      <h3>Evidence Gaps</h3>
      {rows.length === 0 ? (
        <p className="agent-section__empty">No evidence gaps detected — or no blackboard data available for analysis.</p>
      ) : (
        <>
          <div className="agent-section__summary">
            <span><Badge label={`${openCount} Open`} tone="danger" /></span>
            <span><Badge label={`${partialCount} Partial`} tone="warning" /></span>
            <span><Badge label={`${rows.length} Total`} tone="info" /></span>
          </div>
          <table className="agent-table">
            <thead>
              <tr>
                <th>Gap</th>
                <th>Test Case</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="agent-table__id">{row.id}</td>
                  <td>{row.testCaseId ?? '—'}</td>
                  <td>{row.reason}</td>
                  <td><Badge label={row.statusBadge.label} tone={row.statusBadge.tone} /></td>
                  <td className="agent-table__reason">{row.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

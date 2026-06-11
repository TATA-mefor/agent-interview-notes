import type { AgentTaskQueueRow } from './multiAgentSessionTypes';

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`agent-badge agent-badge--${tone}`}>{label}</span>
  );
}

export function AgentTaskQueuePanel({ rows }: { rows: AgentTaskQueueRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="agent-section">
        <h3>Task Queue</h3>
        <p className="agent-section__empty">No tasks have been created for this session.</p>
      </section>
    );
  }

  return (
    <section className="agent-section">
      <h3>Task Queue ({rows.length})</h3>
      <table className="agent-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Agent</th>
            <th>Type</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Goal</th>
            <th>Input</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="agent-table__id">{row.id}</td>
              <td>{row.assignedTo}</td>
              <td>{row.taskType}</td>
              <td><Badge label={row.statusBadge.label} tone={row.statusBadge.tone} /></td>
              <td><Badge label={row.priorityBadge.label} tone={row.priorityBadge.tone} /></td>
              <td>{row.goal}</td>
              <td className="agent-table__muted">{row.inputSummary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

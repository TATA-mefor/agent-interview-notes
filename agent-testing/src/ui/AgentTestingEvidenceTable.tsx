import type {
  AgentTestingEvidenceRow,
  AgentTestingUiBadge,
} from './uiTypes';

function Badge({ badge }: { badge: AgentTestingUiBadge }) {
  return (
    <span className={`agent-testing-badge agent-testing-badge--${badge.tone}`} title={badge.title}>
      {badge.label}
    </span>
  );
}

export function AgentTestingEvidenceTable({
  rows,
}: {
  rows: AgentTestingEvidenceRow[];
}) {
  return (
    <section className="agent-testing-evidence-table" aria-label="Agent testing evidence table">
      <h3>Evidence</h3>
      <table>
        <thead>
          <tr>
            <th>Evidence</th>
            <th>Test Case</th>
            <th>Source</th>
            <th>Executor</th>
            <th>Result</th>
            <th>Strength</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>No evidence rows were provided. This is not a pass result.</td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.id} className={`agent-testing-evidence-row agent-testing-evidence-row--${row.badge.tone}`}>
              <td>{row.id}</td>
              <td>{row.testCaseId}</td>
              <td>{row.source}</td>
              <td>{row.executor}</td>
              <td><Badge badge={row.badge} /></td>
              <td>{row.strength}</td>
              <td>{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

import type {
  AgentTestingAuditTimelineItem,
  AgentTestingUiBadge,
} from './uiTypes';

function Badge({ badge }: { badge: AgentTestingUiBadge }) {
  return (
    <span className={`agent-testing-badge agent-testing-badge--${badge.tone}`} title={badge.title}>
      {badge.label}
    </span>
  );
}

export function AgentTestingAuditTimeline({
  items,
}: {
  items: AgentTestingAuditTimelineItem[];
}) {
  return (
    <section className="agent-testing-audit-timeline" aria-label="Agent testing audit timeline">
      <h3>Audit Timeline</h3>
      {items.length === 0 ? (
        <p>No audit timeline items were provided by this UI view model.</p>
      ) : (
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.eventType}</strong> <Badge badge={item.badge} />
              </div>
              <p>{item.summary}</p>
              <dl>
                <dt>Actor</dt>
                <dd>{item.actor}</dd>
                <dt>Timestamp</dt>
                <dd>{item.timestamp}</dd>
                <dt>Outcome</dt>
                <dd>{item.outcome}</dd>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

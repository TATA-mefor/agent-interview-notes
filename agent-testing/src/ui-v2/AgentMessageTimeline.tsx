import type { AgentMessageTimelineItem } from './multiAgentSessionTypes';

export function AgentMessageTimeline({ items }: { items: AgentMessageTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <section className="agent-section">
        <h3>Message Timeline</h3>
        <p className="agent-section__empty">No messages have been exchanged in this session.</p>
      </section>
    );
  }

  return (
    <section className="agent-section">
      <h3>Message Timeline ({items.length})</h3>
      <div className="agent-timeline">
        {items.map((item) => (
          <div key={item.id} className="agent-timeline__item">
            <div className="agent-timeline__header">
              <strong>{item.fromAgent}</strong>
              {' → '}
              <strong>{item.toAgent}</strong>
              <span className="agent-timeline__type">{item.messageType}</span>
            </div>
            <p className="agent-timeline__summary">{item.summary}</p>
            <div className="agent-timeline__meta">
              {item.relatedTaskId && <span>Task: {item.relatedTaskId}</span>}
              <span className="agent-timeline__time">{item.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

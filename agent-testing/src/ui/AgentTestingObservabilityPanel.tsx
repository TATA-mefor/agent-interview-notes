import type {
  AgentTestingObservabilityViewModel,
  AgentTestingSummaryCard,
} from './uiTypes';

function SummaryCard({ card }: { card: AgentTestingSummaryCard }) {
  return (
    <div className={`agent-testing-summary-card agent-testing-summary-card--${card.tone}`}>
      <div className="agent-testing-summary-card__label">{card.label}</div>
      <div className="agent-testing-summary-card__value">{card.value}</div>
      <div className="agent-testing-summary-card__description">{card.description}</div>
    </div>
  );
}

function CountList({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts);

  return (
    <section>
      <h4>{title}</h4>
      {entries.length === 0 ? (
        <p>No counts were provided.</p>
      ) : (
        <dl>
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function AgentTestingObservabilityPanel({
  viewModel,
}: {
  viewModel: AgentTestingObservabilityViewModel;
}) {
  return (
    <section className="agent-testing-observability-panel" aria-label="Agent testing observability metrics">
      <h3>Observability</h3>
      <div className="agent-testing-summary-grid">
        {viewModel.summaryCards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </div>
      <CountList title="Event Counts" counts={viewModel.eventCounts} />
      <CountList title="Severity Distribution" counts={viewModel.severityDistribution} />
      <CountList title="Approval Counts" counts={viewModel.approvalCounts} />
      <CountList title="MCP Counts" counts={viewModel.mcpCounts} />
      <TextList title="Warnings" items={viewModel.warnings} />
      <TextList title="Limitations" items={viewModel.limitations} />
    </section>
  );
}

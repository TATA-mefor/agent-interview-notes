import type {
  AgentTestingRunOverviewViewModel,
  AgentTestingSummaryCard,
  AgentTestingUiBadge,
} from './uiTypes';

function Badge({ badge }: { badge: AgentTestingUiBadge }) {
  return (
    <span className={`agent-testing-badge agent-testing-badge--${badge.tone}`} title={badge.title}>
      {badge.label}
    </span>
  );
}

function SummaryCard({ card }: { card: AgentTestingSummaryCard }) {
  return (
    <div className={`agent-testing-summary-card agent-testing-summary-card--${card.tone}`}>
      <div className="agent-testing-summary-card__label">{card.label}</div>
      <div className="agent-testing-summary-card__value">{card.value}</div>
      <div className="agent-testing-summary-card__description">{card.description}</div>
    </div>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="agent-testing-text-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function AgentTestingRunOverview({
  viewModel,
}: {
  viewModel: AgentTestingRunOverviewViewModel;
}) {
  return (
    <section className="agent-testing-run-overview" aria-label="Agent testing run overview">
      <header className="agent-testing-run-overview__header">
        <div>
          <h2>{viewModel.targetSystemName}</h2>
          <p>{viewModel.targetSystemType}</p>
          <p>Run ID: {viewModel.runId}</p>
        </div>
        <div className="agent-testing-run-overview__badges">
          <Badge badge={viewModel.statusBadge} />
          <Badge badge={viewModel.releaseBadge} />
        </div>
      </header>
      <div className="agent-testing-summary-grid">
        {viewModel.summaryCards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </div>
      <TextList title="Warnings" items={viewModel.warnings} />
      <TextList title="Limitations" items={viewModel.limitations} />
    </section>
  );
}

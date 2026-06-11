import type {
  AgentTestingPersistenceViewModel,
} from './uiTypes';

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

export function AgentTestingPersistencePanel({
  viewModel,
}: {
  viewModel: AgentTestingPersistenceViewModel;
}) {
  return (
    <section className="agent-testing-persistence-panel" aria-label="Agent testing persistence snapshot">
      <h3>Persistence Snapshot</h3>
      <dl>
        <div>
          <dt>Records</dt>
          <dd>{viewModel.recordCount}</dd>
        </div>
        <div>
          <dt>Relationships</dt>
          <dd>{viewModel.relationshipCount}</dd>
        </div>
        <div>
          <dt>Validation</dt>
          <dd>{viewModel.validationPassed ? 'passed' : 'not passed'}</dd>
        </div>
      </dl>
      <TextList title="Validation Issues" items={viewModel.issues} />
      <TextList title="Warnings" items={viewModel.warnings} />
      <TextList title="Limitations" items={viewModel.limitations} />
    </section>
  );
}

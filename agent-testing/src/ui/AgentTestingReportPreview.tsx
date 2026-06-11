import type {
  AgentTestingReportViewModel,
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

export function AgentTestingReportPreview({
  viewModel,
}: {
  viewModel: AgentTestingReportViewModel;
}) {
  return (
    <section className="agent-testing-report-preview" aria-label="Agent testing report preview">
      <h3>{viewModel.title}</h3>
      {viewModel.sections.length > 0 ? (
        <ul>
          {viewModel.sections.map((section) => (
            <li key={section.name}>
              {section.name}: {section.itemCount}{section.hasWarnings ? ' (warning)' : ''}
            </li>
          ))}
        </ul>
      ) : null}
      <TextList title="Warnings" items={viewModel.warnings} />
      <TextList title="Limitations" items={viewModel.limitations} />
      <pre className="agent-testing-report-preview__markdown">{viewModel.markdown}</pre>
    </section>
  );
}

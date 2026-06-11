import type {
  AgentTestingUiBadge,
} from './uiTypes';

function Badge({ badge }: { badge: AgentTestingUiBadge }) {
  return (
    <span className={`agent-testing-badge agent-testing-badge--${badge.tone}`} title={badge.title}>
      {badge.label}
    </span>
  );
}

function TextList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) {
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

export function AgentTestingReleasePanel({
  badge,
  reason,
  blockingFactors = [],
  evidenceGaps = [],
  limitations = [],
}: {
  badge: AgentTestingUiBadge;
  reason?: string;
  blockingFactors?: string[];
  evidenceGaps?: string[];
  limitations?: string[];
}) {
  return (
    <section className="agent-testing-release-panel" aria-label="Agent testing release recommendation">
      <h3>Release Recommendation</h3>
      <Badge badge={badge} />
      {reason ? <p>{reason}</p> : <p>Reason was not provided.</p>}
      <TextList title="Blocking Factors" items={blockingFactors} />
      <TextList title="Evidence Gaps" items={evidenceGaps} />
      <TextList title="Limitations" items={limitations} />
    </section>
  );
}

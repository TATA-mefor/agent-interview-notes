import { MultiAgentSessionPanel } from './MultiAgentSessionPanel';
import { AgentTaskQueuePanel } from './AgentTaskQueuePanel';
import { AgentMessageTimeline } from './AgentMessageTimeline';
import { SharedBlackboardPanel } from './SharedBlackboardPanel';
import { AgentApprovalPanel } from './AgentApprovalPanel';
import { AgentEvidenceGapPanel } from './AgentEvidenceGapPanel';
import type { MultiAgentSessionViewModel } from './multiAgentSessionTypes';

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section className="agent-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function MultiAgentRuntimeDemoShell({
  viewModel,
}: {
  viewModel: MultiAgentSessionViewModel;
}) {
  return (
    <main className="multi-agent-runtime-demo-shell">
      <h1>Agent Testing V2 — Multi-Agent Runtime Demo</h1>

      <MultiAgentSessionPanel
        overview={viewModel.overview}
        agentProfiles={viewModel.agentProfiles}
      />

      <AgentTaskQueuePanel rows={viewModel.taskQueue} />

      <AgentMessageTimeline items={viewModel.messageTimeline} />

      <SharedBlackboardPanel viewModel={viewModel.blackboardSummary} />

      <AgentEvidenceGapPanel rows={viewModel.evidenceGaps} />

      <AgentApprovalPanel rows={viewModel.approvals} />

      <TextList title="Warnings" items={viewModel.warnings} />

      <TextList title="Limitations" items={viewModel.limitations} />
    </main>
  );
}

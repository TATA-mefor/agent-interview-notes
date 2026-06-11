import type {
  AgentRuntimeOverviewViewModel,
  AgentProfileCardViewModel,
} from './multiAgentSessionTypes';

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`agent-badge agent-badge--${tone}`}>{label}</span>
  );
}

function ProfileCard({ profile }: { profile: AgentProfileCardViewModel }) {
  return (
    <div className="agent-profile-card">
      <h4>{profile.displayName}</h4>
      <p className="agent-profile-card__role">Role: {profile.role}</p>
      <p className="agent-profile-card__capabilities">{profile.capabilitySummary}</p>
      <div className="agent-profile-card__meta">
        <span>Tasks: {profile.taskCount}</span>
        <span>Completed: {profile.completedTaskCount}</span>
        <span>MCP: {profile.canRequestMcp ? 'Yes' : 'No'}</span>
        <span>Controlled Exec: {profile.canRequestControlledExecution ? 'Yes' : 'No'}</span>
      </div>
      {profile.limitations.length > 0 && (
        <ul className="agent-profile-card__limitations">
          {profile.limitations.map((lim, i) => (
            <li key={i}>{lim}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

export function MultiAgentSessionPanel({
  overview,
  agentProfiles,
}: {
  overview: AgentRuntimeOverviewViewModel;
  agentProfiles: AgentProfileCardViewModel[];
}) {
  return (
    <section className="agent-session-panel">
      <h2>Multi-Agent Session</h2>

      <div className="agent-session-panel__overview">
        <div><strong>Session:</strong> {overview.sessionId}</div>
        <div><strong>Run:</strong> {overview.runId}</div>
        <div><strong>System:</strong> {overview.targetSystemName}</div>
        <div>
          <strong>Status:</strong>{' '}
          <Badge label={overview.statusBadge.label} tone={overview.statusBadge.tone} />
        </div>
        <div className="agent-session-panel__counts">
          <span>Agents: {overview.agentCount}</span>
          <span>Tasks: {overview.taskCount}</span>
          <span>Messages: {overview.messageCount}</span>
          <span>Audit Events: {overview.auditEventCount}</span>
        </div>
      </div>

      <h3>Agent Profiles</h3>
      <div className="agent-profile-grid">
        {agentProfiles.map((profile) => (
          <ProfileCard key={profile.role} profile={profile} />
        ))}
      </div>

      <TextList title="Session Limitations" items={overview.limitations} />
    </section>
  );
}

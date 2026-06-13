'use client';

// ============================================================
// Track A: Agent Testing Session Detail Page
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SessionInfo { authenticated: boolean; role: 'admin' | 'viewer' | null; agentTestingEnabled: boolean; }

export default function AgentTestingSessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [bbSummary, setBbSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundRunning, setRoundRunning] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState('');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-testing/sessions/${sessionId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setBbSummary(json.blackboardSummary ?? null);
      } else setError(json.error ?? 'Failed to load');
    } catch { setError('Network error'); }
  }, [sessionId]);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => setSessionInfo(d.data ?? { authenticated: false, role: null, agentTestingEnabled: false }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (sessionInfo?.authenticated) fetchSession(); }, [sessionInfo, fetchSession]);

  async function runRound() {
    setRoundRunning(true);
    try {
      const res = await fetch(`/api/agent-testing/sessions/${sessionId}/round`, { method: 'POST' });
      if (res.ok) fetchSession();
      else setError((await res.json()).error ?? 'Round failed');
    } catch { setError('Network error'); }
    finally { setRoundRunning(false); }
  }

  async function doTransition() {
    if (!transitionStatus) return;
    try {
      const res = await fetch(`/api/agent-testing/sessions/${sessionId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: transitionStatus }),
      });
      if (res.ok) { fetchSession(); setTransitionStatus(''); }
      else setError((await res.json()).error ?? 'Transition failed');
    } catch { setError('Network error'); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!sessionInfo?.authenticated) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Redirecting to login...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-5xl mx-auto"><Link href="/admin/agent-testing" className="text-blue-600 hover:underline text-sm">&larr; Back</Link><div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div></div></div>;
  if (!data) return <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-5xl mx-auto"><Link href="/admin/agent-testing" className="text-blue-600 hover:underline text-sm">&larr; Back</Link><p className="mt-4 text-gray-500">Session not found.</p></div></div>;

  const isAdmin = sessionInfo.role === 'admin';
  const session = data as Record<string, unknown>;
  const tasks = (session.tasks as unknown[]) ?? [];
  const messages = (session.messages as unknown[]) ?? [];
  const limitations = (session.limitations as string[]) ?? [];

  const STATUSES = ['running', 'waiting_for_evidence', 'waiting_for_approval', 'blocked', 'completed', 'cancelled', 'failed'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin/agent-testing" className="text-blue-600 hover:underline text-sm">&larr; Back to Sessions</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{session.targetSystemName as string}</h1>
            <p className="text-xs text-gray-500 font-mono">{session.id as string} &middot; {session.runId as string}</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${session.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{session.status as string}</span>
        </div>

        {/* Actions row — admin only */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-wrap gap-3 items-end">
            <button onClick={runRound} disabled={roundRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
              {roundRunning ? 'Running...' : 'Run One Round'}
            </button>
            <select value={transitionStatus} onChange={(e) => setTransitionStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Transition to...</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={doTransition} disabled={!transitionStatus}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm">Go</button>
          </div>
        )}

        {/* Tasks */}
        <Section title={`Tasks (${tasks.length})`}>
          {tasks.length === 0 ? <Empty text="No tasks." /> :
            tasks.map((t: unknown, i: number) => {
              const task = t as Record<string, unknown>;
              return <div key={i} className="py-2 border-b border-gray-100 last:border-0 flex justify-between">
                <div><span className="font-medium text-sm">{task.taskType as string}</span><p className="text-xs text-gray-500">{task.goal as string}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{task.status as string}</span>
              </div>;
            })}
        </Section>

        {/* Messages */}
        <Section title={`Messages (${messages.length})`}>
          {messages.length === 0 ? <Empty text="No messages." /> :
            messages.slice(-20).map((m: unknown, i: number) => {
              const msg = m as Record<string, unknown>;
              return <div key={i} className="py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-xs text-gray-400">{msg.fromAgent as string} &rarr; {msg.toAgent as string} &middot; {msg.messageType as string}</span>
                <p className="text-gray-700">{msg.summary as string}</p>
              </div>;
            })}
        </Section>

        {/* Blackboard summary (safe — server-computed, no raw evidence/MCP payloads) */}
        <Section title="Blackboard Summary">
          {bbSummary ? (
            <pre className="text-xs text-gray-600 overflow-auto max-h-48 bg-gray-50 p-3 rounded">{JSON.stringify(bbSummary, null, 2)}</pre>
          ) : (
            <Empty text="No blackboard summary available." />
          )}
        </Section>

        {/* Limitations */}
        {limitations.length > 0 && (
          <Section title="Limitations">
            <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">{limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-700">{title}</h2></div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-4">{text}</p>;
}

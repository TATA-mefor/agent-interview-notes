'use client';

// ============================================================
// Track A: Agent Testing Admin Dashboard
// ============================================================
// Session list + create form. Links to detail and approvals.

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import Link from 'next/link';

interface SessionInfo {
  authenticated: boolean;
  role: 'admin' | 'viewer' | null;
  agentTestingEnabled: boolean;
}

interface SessionSummary {
  id: string;
  runId: string;
  targetSystemName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  limitations: string[];
}

export default function AgentTestingAdminPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetName, setTargetName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-testing/sessions');
      const json = await res.json();
      if (res.ok) setSessions(json.data ?? []);
      else setError(json.error ?? 'Failed to load sessions');
    } catch {
      setError('Network error');
    }
  }, []);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => setSession(d.data ?? { authenticated: false, role: null, agentTestingEnabled: false }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session?.authenticated) fetchSessions();
  }, [session, fetchSessions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!targetName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-testing/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSystemName: targetName.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setTargetName('');
        fetchSessions();
      } else {
        setError(json.error ?? 'Failed to create session');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  if (!session?.agentTestingEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Agent Testing</h1>
          <div className="mt-6 p-8 bg-gray-100 border border-gray-300 rounded-lg text-center">
            <p className="text-lg font-medium text-gray-700">Agent Testing is currently disabled.</p>
            <p className="text-sm text-gray-500 mt-2">Set <code className="bg-gray-200 px-1 rounded">AGENT_TESTING_ENABLED=true</code> to enable.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Redirecting to login...</p></div>;
  }

  const isAdmin = session.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Testing</h1>
            <p className="text-sm text-gray-500 mt-1">Logged in as: <span className="font-medium">{session.role}</span></p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/agent-testing/approvals" className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">Approvals</Link>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">Sign out</button>
            </form>
          </div>
        </div>

        {/* Create form — admin only */}
        {isAdmin && (
          <form onSubmit={handleCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="targetName" className="block text-sm font-medium text-gray-700 mb-1">Create Session</label>
              <input id="targetName" type="text" value={targetName} onChange={(e) => setTargetName(e.target.value)}
                placeholder="Target system name" required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={creating || !targetName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
        )}

        {/* Error */}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

        {/* Session list */}
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link key={s.id} href={`/admin/agent-testing/${s.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{s.targetSystemName}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{s.id}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                    s.status === 'completed' ? 'bg-green-100 text-green-700' :
                    s.status === 'failed' ? 'bg-red-100 text-red-700' :
                    s.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                  <p className="text-xs text-gray-400 mt-1">{s.updatedAt?.slice(0, 10)}</p>
                </div>
              </div>
            </Link>
          ))}
          {sessions.length === 0 && !error && (
            <p className="text-center text-gray-400 py-12">No sessions. Create one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

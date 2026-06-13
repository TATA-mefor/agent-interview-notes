'use client';

// ============================================================
// Track C: Agent Testing Approvals Page (Shell)
// ============================================================
// Shows approval status. Admin can decide; viewer is read-only.
// Track C: static shell with no DB-backed session list.
// Full hydration pending Track B1 (persistence) + Track A (routes).

import { useState, useEffect } from 'react';

interface SessionInfo {
  authenticated: boolean;
  role: 'admin' | 'viewer' | null;
  agentTestingEnabled: boolean;
}

const MOCK_APPROVALS = [
  {
    id: 'example-approval-1',
    actionType: 'mcp_tool_call',
    riskLevel: 'HIGH',
    status: 'pending',
    requestedBy: 'ops_check',
    target: 'read_system_metrics',
    reason: 'Example: requires human approval before MCP execution.',
  },
];

export default function AgentTestingApprovalsPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionResult, setDecisionResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) =>
        setSession(
          d.data ?? { authenticated: false, role: null, agentTestingEnabled: false },
        ),
      )
      .catch(() =>
        setSession({ authenticated: false, role: null, agentTestingEnabled: false }),
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // ── Feature disabled ──

  if (session && !session.agentTestingEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Agent Testing — Approvals
            </h1>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
          <div className="p-8 bg-gray-100 border border-gray-300 rounded-lg text-center">
            <p className="text-lg font-medium text-gray-700">
              Agent Testing is currently disabled.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Set <code className="bg-gray-200 px-1 rounded">AGENT_TESTING_ENABLED=true</code> to
              enable agent testing features. Approval decisions and MCP actions are not available
              while the feature is disabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not authenticated (shouldn't reach here — middleware redirects) ──

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  const isAdmin = session.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Agent Testing — Approvals
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Logged in as: <span className="font-medium">{session.role}</span>
            </p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Limitation notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            ⚠️ Approval persistence full hydration pending Track B1
          </p>
          <p className="text-xs text-amber-600 mt-1">
            This page shows a static shell. Full session list, task view, and DB-backed
            approvals will be implemented in Track A (Route Integration) and Track B1
            (DB Repositories + Persistence Service).
          </p>
        </div>

        {/* Approval list */}
        <div className="space-y-4">
          {MOCK_APPROVALS.map((approval) => (
            <div
              key={approval.id}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {approval.actionType}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {approval.id}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Requested by:</span>{' '}
                    {approval.requestedBy}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Target:</span>{' '}
                    {approval.target}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{approval.reason}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      approval.riskLevel === 'HIGH'
                        ? 'bg-red-100 text-red-700'
                        : approval.riskLevel === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {approval.riskLevel}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    Status: {approval.status}
                  </p>
                </div>
              </div>

              {/* Action buttons — admin only */}
              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() =>
                      handleDecide(approval.id, 'approved', setDecisionResult)
                    }
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      handleDecide(approval.id, 'rejected', setDecisionResult)
                    }
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      handleDecide(
                        approval.id,
                        'request_more_evidence',
                        setDecisionResult,
                      )
                    }
                    className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  >
                    Request More Evidence
                  </button>
                </div>
              )}
            </div>
          ))}

          {MOCK_APPROVALS.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              No pending approvals.
            </p>
          )}

          {/* Decision result display */}
          {decisionResult && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 text-sm">
                Decision Result (draft)
              </h4>
              <pre className="mt-2 text-xs text-blue-700 overflow-auto max-h-64">
                {JSON.stringify(decisionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function handleDecide(
  approvalId: string,
  decision: string,
  setResult: (v: Record<string, unknown> | null) => void,
) {
  try {
    const res = await fetch(
      `/api/agent-testing/approvals/${approvalId}/decide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: `Human decision via admin UI: ${decision}`,
        }),
      },
    );

    const json = await res.json();
    setResult(json.data ?? json);
  } catch {
    setResult({ error: 'Network error' });
  }
}

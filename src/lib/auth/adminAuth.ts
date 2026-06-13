// ============================================================
// Track C: Admin Auth Helpers
// ============================================================
// Combined auth helpers used by middleware, API routes, and pages.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getAdminSession,
  createSessionCookie,
  setSessionCookie,
  removeSessionCookie,
} from './adminSession';
import {
  canReadAgentTesting,
  canWriteAgentTesting,
  canApproveAgentTesting,
  isValidAdminRole,
  normalizeAdminRole,
  type AdminRole,
} from './adminRole';
import { verifyAdminPassword, isAdminPasswordConfigured } from './adminPassword';
import { isAgentTestingEnabled } from '@/lib/config/agentTestingFeatureFlags';

// ── Re-export for convenience ──

export {
  canReadAgentTesting,
  canWriteAgentTesting,
  canApproveAgentTesting,
  isValidAdminRole,
  normalizeAdminRole,
  verifyAdminPassword,
  isAdminPasswordConfigured,
  getAdminSession,
  createSessionCookie,
  setSessionCookie,
  removeSessionCookie,
};
export type { AdminRole };

// ── Login ──

export interface LoginResult {
  success: boolean;
  role?: AdminRole;
  error?: string;
}

export function handleLogin(
  password: string,
  requestedRole: unknown,
): LoginResult {
  if (!isAdminPasswordConfigured()) {
    return { success: false, error: 'Admin password not configured.' };
  }

  if (!verifyAdminPassword(password)) {
    return { success: false, error: 'Invalid credentials.' };
  }

  const role = normalizeAdminRole(requestedRole);

  return { success: true, role };
}

// ── Logout ──

export function handleLogout(): void {
  const cookieStore = cookies();
  removeSessionCookie(cookieStore);
}

// ── Require helpers (for API routes) ──

export interface AuthContext {
  authenticated: boolean;
  role: AdminRole | null;
  session: ReturnType<typeof getAdminSession>;
}

export function getAuthContext(): AuthContext {
  const session = getAdminSession();
  return {
    authenticated: !!session,
    role: session?.role ?? null,
    session,
  };
}

export function requireAdminSession(): { role: AdminRole } | { error: Response } {
  const ctx = getAuthContext();
  if (!ctx.authenticated || !ctx.role) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    };
  }
  return { role: ctx.role };
}

export function requireAgentTestingRole(
  role: AdminRole | null,
): { allowed: true } | { error: Response } {
  if (!isAgentTestingEnabled()) {
    return {
      error: NextResponse.json(
        { error: 'Agent Testing is disabled.' },
        { status: 503 },
      ),
    };
  }
  if (!canReadAgentTesting(role)) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    };
  }
  return { allowed: true };
}

export function requireWriteRole(
  role: AdminRole | null,
): { allowed: true } | { error: Response } {
  if (!canWriteAgentTesting(role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: write access requires admin role.' },
        { status: 403 },
      ),
    };
  }
  return { allowed: true };
}

export function requireApprovalRole(
  role: AdminRole | null,
): { allowed: true } | { error: Response } {
  if (!canApproveAgentTesting(role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: approval requires admin role.' },
        { status: 403 },
      ),
    };
  }
  return { allowed: true };
}

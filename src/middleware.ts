// ============================================================
// Track C: Admin Auth Middleware
// ============================================================
// Protects /admin/* and /api/agent-testing/* routes.
//
// Excluded from protection:
//   /admin/login
//   /api/admin/login
//   /api/admin/logout
//   /api/admin/session
//
// Unauthenticated → /admin/* redirects to /admin/login
// Unauthenticated → /api/agent-testing/* returns 401
// Viewer + non-GET on /api/agent-testing/* → 403
// Feature disabled → /api/agent-testing/* returns 503
//
// Cookie verification uses Web Crypto HMAC-SHA256 (Edge-compatible).
// No plaintext-parsed cookies are trusted without signature verification.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  canReadAgentTesting,
  canWriteAgentTesting,
  isValidAdminRole,
  type AdminRole,
} from '@/lib/auth/adminRole';
import { isAgentTestingEnabled } from '@/lib/config/agentTestingFeatureFlags';

// ── Secret derivation (mirrors adminSession.ts for Edge compatibility) ──

function getSessionSecret(): string | null {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.AGENT_TESTING_ADMIN_SESSION_SECRET ??
    process.env.ADMIN_PASSWORD_HASH ??
    process.env.AGENT_TESTING_ADMIN_PASSWORD_HASH ??
    process.env.ADMIN_PASSWORD ??
    process.env.AGENT_TESTING_ADMIN_PASSWORD ??
    null
  );
}

// ── Edge-compatible base64url ──

function base64urlEncode(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── HMAC-SHA256 via Web Crypto (Edge + Node.js 18+) ──

async function hmacSign(payload: string): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64urlEncode(new Uint8Array(sig));
}

// ── Constant-time comparison (length-safe) ──

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Session verification ──

interface VerifiedSession {
  role: AdminRole;
  iat: number;
  exp: number;
}

async function verifySessionCookie(
  cookieValue: string,
): Promise<VerifiedSession | null> {
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex <= 0) return null;

  const payload = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);

  // HMAC-SHA256 verify (Edge-compatible, real crypto)
  const expectedSig = await hmacSign(payload);
  if (!expectedSig) return null; // no secret configured → reject all
  if (!constantTimeEqual(signature, expectedSig)) return null;

  // Decode payload
  let session: unknown;
  try {
    const bytes = base64urlDecode(payload);
    session = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }

  if (
    !session ||
    typeof session !== 'object' ||
    !('role' in session) ||
    !isValidAdminRole((session as Record<string, unknown>).role) ||
    !('exp' in session) ||
    typeof (session as Record<string, unknown>).exp !== 'number'
  ) {
    return null;
  }

  const s = session as { role: AdminRole; iat: number; exp: number };

  // Check expiry
  if (Date.now() > s.exp) return null;

  return { role: s.role, iat: s.iat, exp: s.exp };
}

// ── Extract session from request (async — awaits HMAC verify) ──

async function getSessionFromRequest(
  request: NextRequest,
): Promise<{ role: AdminRole } | null> {
  const cookieValue = request.cookies.get('agent_testing_admin_session')?.value;
  if (!cookieValue) return null;

  const session = await verifySessionCookie(cookieValue);
  if (!session) return null;

  return { role: session.role };
}

// ── Protected path prefixes ──

const ADMIN_PATH = '/admin';
const ADMIN_LOGIN_PATH = '/admin/login';
const API_AGENT_TESTING_PATH = '/api/agent-testing';

// Auth API paths (unprotected)
const AUTH_API_PATHS = [
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/session',
];

// ── Matcher config ──

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/agent-testing/:path*',
  ],
};

// ── Middleware ──

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin pages ──

  if (pathname.startsWith(ADMIN_PATH)) {
    return handleAdminRoute(request, pathname);
  }

  // ── Agent Testing API ──

  if (pathname.startsWith(API_AGENT_TESTING_PATH)) {
    return handleAgentTestingApiRoute(request);
  }

  return NextResponse.next();
}

// ── Admin route handler ──

async function handleAdminRoute(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  // Allow unauthenticated access to login page
  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(ADMIN_LOGIN_PATH)) {
    return NextResponse.next();
  }

  // Allow auth API endpoints (they handle their own auth)
  if (AUTH_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verify session with HMAC
  const session = await getSessionFromRequest(request);
  if (!session) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Feature flag for agent-testing admin pages
  if (pathname.startsWith('/admin/agent-testing') && !isAgentTestingEnabled()) {
    // Rewrite to a disabled notice (keep URL so user knows where they are)
    return NextResponse.next();
  }

  return NextResponse.next();
}

// ── Agent Testing API handler ──

async function handleAgentTestingApiRoute(
  request: NextRequest,
): Promise<NextResponse> {
  // Feature flag
  if (!isAgentTestingEnabled()) {
    return NextResponse.json(
      { error: 'Agent Testing is disabled.' },
      { status: 503 },
    );
  }

  // Auth check with HMAC verification
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Role check for write operations
  const method = request.method.toUpperCase();
  if (method !== 'GET' && !canWriteAgentTesting(session.role)) {
    return NextResponse.json(
      { error: 'Forbidden: write access requires admin role.' },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

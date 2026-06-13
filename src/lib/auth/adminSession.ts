// ============================================================
// Track C: Cookie-based Admin Session
// ============================================================
// Simple httpOnly cookie session. No JWT, no DB.
// Session payload: { role, iat, exp }
// Encoded as base64url JSON with a signature.

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import type { AdminRole } from './adminRole';
import { isValidAdminRole } from './adminRole';

// ── Configuration ──

const COOKIE_NAME = 'agent_testing_admin_session';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string | null {
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

// ── Sign / verify ──

function sign(payload: string): string {
  const secret = getSecret();
  if (!secret) throw new Error('Cannot sign session: no secret configured.');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function toBase64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fromBase64url<T>(str: string): T | null {
  try {
    return JSON.parse(Buffer.from(str, 'base64url').toString('utf-8')) as T;
  } catch {
    return null;
  }
}

// ── Session type ──

export interface AdminSession {
  role: AdminRole;
  iat: number;
  exp: number;
}

// ── Create session cookie ──

export function createSessionCookie(role: AdminRole, ttlMs = DEFAULT_TTL_MS): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    maxAge: number;
  };
} {
  const now = Date.now();
  const session: AdminSession = {
    role,
    iat: now,
    exp: now + ttlMs,
  };

  const payload = toBase64url(session);
  const signature = sign(payload);
  const value = `${payload}.${signature}`;

  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.floor(ttlMs / 1000),
    },
  };
}

// ── Clear session cookie ──

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    },
  };
}

// ── Read session from cookie ──

export function getAdminSession(
  cookieStore?: ReturnType<typeof cookies>,
): AdminSession | null {
  const store = cookieStore ?? cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dotIndex = raw.lastIndexOf('.');
  if (dotIndex <= 0) return null;

  const payload = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);

  // No secret configured → cannot verify any session
  const secret = getSecret();
  if (!secret) return null;

  // Verify signature (length-safe — prevents timingSafeEqual throw on mismatch)
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  const session = fromBase64url<AdminSession>(payload);
  if (!session) return null;

  // Validate role
  if (!isValidAdminRole(session.role)) return null;

  // Check expiry
  if (Date.now() > session.exp) return null;

  return session;
}

// ── Set cookie on response ──

export function setSessionCookie(
  cookieStore: ReturnType<typeof cookies>,
  session: ReturnType<typeof createSessionCookie>,
): void {
  cookieStore.set(session.name, session.value, session.options);
}

export function removeSessionCookie(
  cookieStore: ReturnType<typeof cookies>,
): void {
  const clear = clearSessionCookie();
  cookieStore.set(clear.name, clear.value, clear.options);
}

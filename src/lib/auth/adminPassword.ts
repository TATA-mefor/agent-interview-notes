// ============================================================
// Track C: Admin Password Verification
// ============================================================
// Password source priority:
//   1. ADMIN_PASSWORD_HASH  — pre-hashed (sha256 hex)
//   2. ADMIN_PASSWORD       — plaintext (dev fallback only)
//   3. AGENT_TESTING_ADMIN_PASSWORD_HASH
//   4. AGENT_TESTING_ADMIN_PASSWORD
//
// Production must use a hashed variant.
// No passwords stored in code, DB, or git-tracked files.

import { createHash } from 'crypto';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Returns true if the given password matches the configured admin password.
 * Compares against a pre-hashed value (env *_HASH) if available,
 * otherwise falls back to plaintext comparison (dev only).
 */
export function verifyAdminPassword(candidate: string): boolean {
  const hash = readEnv(
    'ADMIN_PASSWORD_HASH',
    'AGENT_TESTING_ADMIN_PASSWORD_HASH',
  );

  if (hash) {
    return sha256(candidate) === hash;
  }

  // Development fallback: plaintext compare
  const plain = readEnv(
    'ADMIN_PASSWORD',
    'AGENT_TESTING_ADMIN_PASSWORD',
  );

  if (!plain) {
    // No password configured — deny all
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[admin-auth] WARNING: ADMIN_PASSWORD (plaintext) used in production. ' +
      'Set ADMIN_PASSWORD_HASH instead.',
    );
  }

  return candidate === plain;
}

/**
 * Returns true if any admin password is configured.
 */
export function isAdminPasswordConfigured(): boolean {
  return (
    !!readEnv('ADMIN_PASSWORD_HASH', 'AGENT_TESTING_ADMIN_PASSWORD_HASH') ||
    !!readEnv('ADMIN_PASSWORD', 'AGENT_TESTING_ADMIN_PASSWORD')
  );
}

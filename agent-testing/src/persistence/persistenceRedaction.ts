import type {
  MarkdownString,
} from '../types';
import type {
  PersistenceSensitivityLevel,
} from './persistenceTypes';

const SECRET_ASSIGNMENT_PATTERNS: RegExp[] = [
  /\b(api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret|password|passwd|pwd|credential|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s,;]+["']?/gi,
  /\b(authorization)\b\s*[:=]\s*["']?bearer\s+[^"'\s,;]+["']?/gi,
  /\b(bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /(密钥|密码|凭证|令牌)\s*[:：=]\s*[^,\s;，。]+/gi,
];

const SECRET_KEYWORDS = [
  'api key',
  'apikey',
  'access token',
  'auth token',
  'refresh token',
  'private key',
  'password',
  'passwd',
  'secret',
  'credential',
  'authorization:',
  'bearer ',
  '密钥',
  '密码',
  '凭证',
  '令牌',
];

function normalizeWhitespace(value: MarkdownString): MarkdownString {
  return value.replace(/\s+/g, ' ').trim();
}

function containsSecretKeyword(value: MarkdownString): boolean {
  const lower = value.toLowerCase();

  return SECRET_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function redactPersistenceText(value: MarkdownString): MarkdownString {
  const normalized = normalizeWhitespace(value);
  let redacted = normalized;

  for (const pattern of SECRET_ASSIGNMENT_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      const separator = match.includes('：') ? '：' : match.includes('=') ? '=' : ':';
      const key = match.split(separator)[0]?.trim() || 'secret';

      return `${key}${separator} [REDACTED]`;
    });
  }

  return containsSecretKeyword(redacted) && redacted === normalized
    ? '[REDACTED sensitive persistence text]'
    : redacted;
}

export function summarizeForPersistence(
  value: MarkdownString,
  maxLength = 240
): MarkdownString {
  const redacted = redactPersistenceText(value);
  const normalized = normalizeWhitespace(redacted);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function classifyPersistenceSensitivity(
  value: MarkdownString
): PersistenceSensitivityLevel {
  if (!value.trim()) {
    return 'internal';
  }

  const redacted = redactPersistenceText(value);
  if (redacted !== normalizeWhitespace(value) || redacted.includes('[REDACTED')) {
    return 'secret_redacted';
  }

  if (containsSecretKeyword(value)) {
    return 'sensitive_summary';
  }

  if (value.length > 1000) {
    return 'sensitive_summary';
  }

  return 'internal';
}

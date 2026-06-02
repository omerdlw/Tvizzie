import { resolvePrimaryProvider } from '@/core/auth/capabilities';
import { normalizeOAuthProvider } from '@/core/auth/oauth-providers';

export const LOCAL_PURGE_SIGN_OUT_REASONS = new Set([
  'delete-account',
  'email-change',
  'password-change',
  'password-reset',
  'password-set',
]);

const IGNORABLE_SIGN_OUT_ERROR_PATTERNS = [
  'authentication token has been revoked',
  'failed to fetch',
  'fetch failed',
  'invalid jwt',
  'invalid number of segments',
  'invalid or expired authentication token',
  'jwt expired',
  'network request failed',
  'request timed out',
  'timeout',
  'timed out',
  'token is malformed',
];

export function resolveAuthProvider(payload = {}, session = null) {
  const provider = normalizeOAuthProvider(payload?.provider || payload?.strategy || payload?.authProvider || null);

  if (provider) {
    return provider;
  }

  const providerIds = Array.isArray(session?.metadata?.providerIds) ? session.metadata.providerIds : [];
  const sessionProvider = String(session?.provider || '')
    .trim()
    .toLowerCase();

  return (
    normalizeOAuthProvider(sessionProvider) || sessionProvider || resolvePrimaryProvider(providerIds) || 'password'
  );
}

export function resolveSignInIdentifier(payload = {}) {
  return payload?.email || payload?.identifier || payload?.username || payload?.userId || null;
}

export function isPendingSignInResult(value) {
  return Boolean(value?.requiresVerification || value?.requiresRedirect);
}

export function isIgnorableSignOutError(error) {
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();

  return Boolean(message) && IGNORABLE_SIGN_OUT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

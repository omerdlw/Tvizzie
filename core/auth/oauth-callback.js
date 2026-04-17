import { normalizeOAuthProvider } from '@/core/auth/oauth-providers';

const REDIRECT_BASE_ORIGIN = 'https://tvizzie.local';
const LEGACY_AUTH_CALLBACK_PATH = '/auth/callback';
const LEGACY_AUTH_OAUTH_CALLBACK_PATH = '/auth/oauth-callback';

export const AUTH_OAUTH_CALLBACK_PATH = '/callback';
export const AUTH_DEFAULT_POST_LOGIN_PATH = '/account';

const BLOCKED_NEXT_PATHS = new Set([
  '/sign-in',
  '/sign-up',
  AUTH_OAUTH_CALLBACK_PATH,
  LEGACY_AUTH_CALLBACK_PATH,
  LEGACY_AUTH_OAUTH_CALLBACK_PATH,
]);

export const OAUTH_INTENTS = new Set(['link', 'sign-in', 'sign-up']);

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeOrigin(origin) {
  const normalizedOrigin = normalizeValue(origin);

  if (!normalizedOrigin) {
    return '';
  }

  try {
    return new URL(normalizedOrigin).origin;
  } catch {
    return '';
  }
}

export function sanitizeAuthNextPath(nextPath, fallback = AUTH_DEFAULT_POST_LOGIN_PATH) {
  const rawValue = normalizeValue(nextPath);

  if (!rawValue) {
    return fallback;
  }

  if (!rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(rawValue, REDIRECT_BASE_ORIGIN);
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (parsed.origin !== REDIRECT_BASE_ORIGIN || BLOCKED_NEXT_PATHS.has(parsed.pathname)) {
      return fallback;
    }

    return normalizedPath;
  } catch {
    return fallback;
  }
}

export function normalizeOAuthIntent(value, fallback = 'sign-in') {
  const normalizedIntent = normalizeValue(value).toLowerCase();

  if (OAUTH_INTENTS.has(normalizedIntent)) {
    return normalizedIntent;
  }

  return fallback;
}

export function resolveOAuthIntent(payload = {}, provider = null, fallback = 'sign-in') {
  const normalizedProvider = normalizeOAuthProvider(provider);

  return normalizeOAuthIntent(
    payload?.oauthIntent ||
      (normalizedProvider ? payload?.[`${normalizedProvider}AuthIntent`] : null) ||
      payload?.googleAuthIntent,
    fallback
  );
}

export function buildOAuthCallbackUrl({
  intent = 'sign-in',
  nextPath = AUTH_DEFAULT_POST_LOGIN_PATH,
  origin,
  provider,
} = {}) {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedProvider = normalizeOAuthProvider(provider);

  if (!normalizedOrigin || !normalizedProvider) {
    return '';
  }

  const url = new URL(AUTH_OAUTH_CALLBACK_PATH, normalizedOrigin);
  const normalizedIntent = normalizeOAuthIntent(intent);

  url.searchParams.set('next', sanitizeAuthNextPath(nextPath, AUTH_DEFAULT_POST_LOGIN_PATH));
  url.searchParams.set('intent', normalizedIntent);
  url.searchParams.set('provider', normalizedProvider);

  return url.toString();
}

export function normalizeGoogleAuthIntent(value, fallback = 'sign-in') {
  return normalizeOAuthIntent(value, fallback);
}

export function buildGoogleOAuthCallbackUrl({
  intent = 'sign-in',
  nextPath = AUTH_DEFAULT_POST_LOGIN_PATH,
  origin,
} = {}) {
  return buildOAuthCallbackUrl({
    intent,
    nextPath,
    origin,
    provider: 'google',
  });
}

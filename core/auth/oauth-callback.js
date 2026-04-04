const REDIRECT_BASE_ORIGIN = 'https://tvizzie.local';
const LEGACY_AUTH_OAUTH_CALLBACK_PATH = '/auth/callback';

export const AUTH_OAUTH_CALLBACK_PATH = '/auth/oauth-callback';
export const AUTH_DEFAULT_POST_LOGIN_PATH = '/account';

const BLOCKED_NEXT_PATHS = new Set(['/sign-in', '/sign-up', AUTH_OAUTH_CALLBACK_PATH, LEGACY_AUTH_OAUTH_CALLBACK_PATH]);

const GOOGLE_AUTH_INTENTS = new Set(['link', 'sign-in', 'sign-up']);

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

export function normalizeGoogleAuthIntent(value, fallback = 'sign-in') {
  const normalizedIntent = normalizeValue(value).toLowerCase();

  if (GOOGLE_AUTH_INTENTS.has(normalizedIntent)) {
    return normalizedIntent;
  }

  return fallback;
}

export function buildGoogleOAuthCallbackUrl({
  intent = 'sign-in',
  nextPath = AUTH_DEFAULT_POST_LOGIN_PATH,
  origin,
} = {}) {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return '';
  }

  const url = new URL(AUTH_OAUTH_CALLBACK_PATH, normalizedOrigin);
  const normalizedIntent = normalizeGoogleAuthIntent(intent);

  url.searchParams.set('next', sanitizeAuthNextPath(nextPath, AUTH_DEFAULT_POST_LOGIN_PATH));
  url.searchParams.set('intent', normalizedIntent);
  url.searchParams.set('provider', 'google');

  return url.toString();
}

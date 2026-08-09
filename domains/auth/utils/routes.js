import { normalizeLowerValue } from '@/shared/utils';
import {
  AUTH_DEFAULT_POST_LOGIN_PATH,
  getOAuthProviderLabel,
  sanitizeAuthNextPath,
} from '@/domains/auth/utils/oauth';
import { EMAIL_DOMAIN_PATTERNS } from './constants';

// ============================================================
// Auth Routing, Notice Cookies & Href Helpers
// ============================================================

export const AUTH_ROUTES = Object.freeze({
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
});

export const AUTH_ROUTE_NOTICE = Object.freeze({
  GOOGLE_AUTH_FAILED: 'google-auth-failed',
  OAUTH_ACCOUNT_ALREADY_REGISTERED: 'oauth-account-already-registered',
  GOOGLE_PASSWORD_LOGIN_REQUIRED: 'google-password-login-required',
  GOOGLE_PROVIDER_COLLISION: 'google-provider-collision',
  GOOGLE_SIGNUP_REQUIRED: 'google-signup-required',
  OAUTH_AUTH_FAILED: 'oauth-auth-failed',
});

export const AUTH_ROUTE_NOTICE_COOKIE_NAME = 'tvz_auth_notice';

export function normalizeAuthRouteNotice(value) {
  const normalized = normalizeLowerValue(value);
  if (Object.values(AUTH_ROUTE_NOTICE).includes(normalized)) {
    return normalized;
  }
  return '';
}

function expireNoticeCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function consumeAuthRouteNoticeCookie() {
  if (typeof document === 'undefined') return '';

  const prefix = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=`;
  const cookieEntry = String(document.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookieEntry) return '';
  expireNoticeCookie();

  return normalizeAuthRouteNotice(decodeURIComponent(cookieEntry.slice(prefix.length)));
}

export function resolveSignInNoticeToast(notice, provider = null) {
  switch (notice) {
    case AUTH_ROUTE_NOTICE.OAUTH_ACCOUNT_ALREADY_REGISTERED:
      return {
        type: 'warning',
        message: `This email is already registered with ${getOAuthProviderLabel(provider, 'a social provider')}. Continue with it, then set a password from Account Settings.`,
      };
    case AUTH_ROUTE_NOTICE.GOOGLE_PASSWORD_LOGIN_REQUIRED:
      return {
        type: 'warning',
        message:
          'This email is already used by another account. Sign in with your password once to link Google.',
      };
    case AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED:
      return {
        type: 'error',
        message: 'Google sign-in could not be completed. Please try again.',
      };
    case AUTH_ROUTE_NOTICE.OAUTH_AUTH_FAILED:
      return {
        type: 'error',
        message: 'Social sign-in could not be completed. Please try again.',
      };
    case AUTH_ROUTE_NOTICE.GOOGLE_PROVIDER_COLLISION:
      return {
        type: 'error',
        message: 'This Google account is already linked to another account',
      };
    default:
      return null;
  }
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isEmailIdentifier(value) {
  return String(value || '').includes('@');
}

export function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value);
  const parts = email.split('@');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Enter a valid email address');
  }

  const [, domain] = parts;
  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, protonmail, icloud',
    );
  }

  return email;
}

export function formatVerificationExpiry(expiresAt) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function resolveVerificationTimestamp(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsedNumber = Number(value);
  if (Number.isFinite(parsedNumber) && parsedNumber > 0) return parsedNumber;

  const parsedDate = new Date(value).getTime();
  return Number.isFinite(parsedDate) && parsedDate > 0 ? parsedDate : 0;
}

export function sanitizeNextPath(next, fallback = AUTH_DEFAULT_POST_LOGIN_PATH) {
  return sanitizeAuthNextPath(next, fallback);
}

export function resolvePostAuthRedirect(next) {
  return sanitizeNextPath(next, AUTH_DEFAULT_POST_LOGIN_PATH);
}

export function getCurrentPathWithSearch(pathname, searchParams) {
  const normalizedPath = typeof pathname === 'string' && pathname.startsWith('/') ? pathname : '/';
  const query = searchParams?.toString?.();

  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

export function buildAuthHref(pathname, { next, email, identifier, notice, provider } = {}) {
  const params = new URLSearchParams();
  const safeNext = sanitizeNextPath(next, '');

  if (safeNext) params.set('next', safeNext);

  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedNotice = String(notice || '').trim();
  const normalizedProvider = String(provider || '').trim();

  if (normalizedIdentifier) params.set('identifier', normalizedIdentifier);
  if (normalizedEmail) params.set('email', normalizedEmail);
  if (normalizedNotice) params.set('notice', normalizedNotice);
  if (normalizedProvider) params.set('provider', normalizedProvider);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

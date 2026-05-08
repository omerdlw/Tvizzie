import { AUTH_ROUTE_NOTICE, AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizeAuthRouteNotice } from '@/core/auth/route-notice';

export const INITIAL_RESET_FLOW = Object.freeze({
  active: false,
  email: '',
  passwordResetProof: '',
  newPassword: '',
  confirmPassword: '',
  isSubmitting: false,
});

function expireNoticeCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function consumeAuthRouteNoticeCookie() {
  if (typeof document === 'undefined') {
    return '';
  }

  const prefix = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=`;
  const cookieEntry = String(document.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookieEntry) {
    return '';
  }

  expireNoticeCookie();

  return normalizeAuthRouteNotice(decodeURIComponent(cookieEntry.slice(prefix.length)));
}

export function resolveSignInNoticeToast(notice) {
  switch (notice) {
    case AUTH_ROUTE_NOTICE.GOOGLE_PASSWORD_LOGIN_REQUIRED:
      return {
        type: 'warning',
        message: 'This email is already used by another account. Sign in with your password once to link Google.',
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

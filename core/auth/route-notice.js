export const AUTH_ROUTE_NOTICE = Object.freeze({
  GOOGLE_AUTH_FAILED: 'google-auth-failed',
  GOOGLE_PASSWORD_LOGIN_REQUIRED: 'google-password-login-required',
  GOOGLE_PROVIDER_COLLISION: 'google-provider-collision',
  GOOGLE_SIGNUP_REQUIRED: 'google-signup-required',
  OAUTH_AUTH_FAILED: 'oauth-auth-failed',
});

export const AUTH_ROUTE_NOTICE_COOKIE_NAME = 'tvz_auth_notice';

export function normalizeAuthRouteNotice(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (Object.values(AUTH_ROUTE_NOTICE).includes(normalized)) {
    return normalized;
  }

  return '';
}

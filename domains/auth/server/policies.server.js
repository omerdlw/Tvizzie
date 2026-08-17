import { normalizeValue } from '@/domains/shell/shared/utils';
import {
  AUTH_ROUTE_NOTICE_COOKIE_NAME,
  normalizeAuthRouteNotice,
} from '@/domains/auth/utils/routes';
import {
  assertSessionNotRevoked,
  AUTH_COOKIE_PATH,
  isSecureCookieEnvironment,
  requireSessionRequest,
} from './session.server';
import { ACCOUNT_LIFECYCLE_STATES, assertAccountLifecycleAllowed } from './account.server';

const AUTH_ROUTE_NOTICE_MAX_AGE_SECONDS = 60;

export function setAuthRouteNoticeCookie(response, notice) {
  const normalizedNotice = normalizeAuthRouteNotice(notice);
  if (!normalizedNotice) return;

  response.cookies.set(AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizedNotice, {
    httpOnly: false,
    maxAge: AUTH_ROUTE_NOTICE_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearAuthRouteNoticeCookie(response) {
  response.cookies.set(AUTH_ROUTE_NOTICE_COOKIE_NAME, '', {
    httpOnly: false,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

const AUTH_ROUTE_POLICIES = Object.freeze({
  ACCOUNT_CHANGE_EMAIL: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_CHANGE_PASSWORD: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_DELETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE,
      ACCOUNT_LIFECYCLE_STATES.DELETED,
    ]),
    requireCsrf: true,
    requireRecentReauth: false,
    requireSession: true,
    requireStepUp: 'account-delete',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_PASSWORD_STATUS: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_REAUTHENTICATE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  ACCOUNT_SET_PASSWORD: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE]),
    requireSession: true,
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  EMAIL_CHANGE_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE,
    ]),
    requireCsrf: true,
    requireRecentReauth: true,
    requireSession: true,
    requireStepUp: 'email-change',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  PASSWORD_CHANGE_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE,
    ]),
    requireCsrf: true,
    requireRecentReauth: true,
    requireSession: true,
    requireStepUp: 'password-change',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  PASSWORD_SET_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([
      ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE,
    ]),
    requireCsrf: true,
    requireRecentReauth: false,
    requireSession: true,
    requireStepUp: 'password-set',
    route: '/api/auth/account',
    session: { requireRecentAuthMs: 0 },
  }),
  PASSWORD_RESET_COMPLETE: Object.freeze({
    requireCsrf: false,
    requireRecentReauth: false,
    requireSession: false,
    requireStepUp: null,
    route: '/api/auth/password-reset/complete',
  }),
  SIGN_UP_COMPLETE: Object.freeze({
    requireCsrf: false,
    requireRecentReauth: false,
    requireSession: false,
    requireStepUp: null,
    route: '/api/auth/sign-up/complete',
  }),
});

function resolvePolicy(policyKey) {
  const normalizedKey = normalizeValue(policyKey).toUpperCase();
  const policy = AUTH_ROUTE_POLICIES[normalizedKey];
  if (!policy) throw new Error(`Unknown auth route policy: ${policyKey}`);
  return policy;
}

import { extractUuid } from './admin.server.js';

export async function requirePolicySession(request, policyKey) {
  const resolvedPolicyKey =
    policyKey && typeof policyKey === 'object' ? policyKey.policyKey : policyKey;
  const policy = resolvePolicy(resolvedPolicyKey);
  if (!policy.requireSession) return null;

  const sessionContext = await requireSessionRequest(request, {
    allowBearerFallback: policy.allowBearerFallback !== false,
    requireRecentAuthMs: Number(policy?.session?.requireRecentAuthMs || 0),
  });

  const uuid = extractUuid(sessionContext);
  if (sessionContext && uuid) {
    sessionContext.userId = uuid;
  }

  await assertSessionNotRevoked(sessionContext);

  if (Array.isArray(policy.allowedLifecycleStates) && policy.allowedLifecycleStates.length > 0) {
    await assertAccountLifecycleAllowed({
      allowedStates: policy.allowedLifecycleStates,
      userId: sessionContext.userId,
    });
  }

  return sessionContext;
}

export function getAuthRoutePolicy(policyKey) {
  return resolvePolicy(policyKey);
}

export const AUTH_ROUTE_POLICY_KEYS = Object.freeze(
  Object.keys(AUTH_ROUTE_POLICIES).reduce((accumulator, key) => {
    accumulator[key] = key;
    return accumulator;
  }, {}),
);

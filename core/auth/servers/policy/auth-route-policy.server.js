import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import {
  ACCOUNT_LIFECYCLE_STATES,
  assertAccountLifecycleAllowed,
} from '@/core/auth/servers/account/account-lifecycle.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

const AUTH_ROUTE_POLICIES = Object.freeze({
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
    route: '/api/auth/account/delete',
    session: {
      requireRecentAuthMs: 0,
    },
  }),
  EMAIL_CHANGE_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE, ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE]),
    requireCsrf: true,
    requireRecentReauth: true,
    requireSession: true,
    requireStepUp: 'email-change',
    route: '/api/auth/account/change-email',
    session: {
      requireRecentAuthMs: 0,
    },
  }),
  PASSWORD_CHANGE_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE, ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE]),
    requireCsrf: true,
    requireRecentReauth: true,
    requireSession: true,
    requireStepUp: 'password-change',
    route: '/api/auth/account/change-password',
    session: {
      requireRecentAuthMs: 0,
    },
  }),
  PASSWORD_SET_COMPLETE: Object.freeze({
    allowBearerFallback: true,
    allowedLifecycleStates: Object.freeze([ACCOUNT_LIFECYCLE_STATES.ACTIVE, ACCOUNT_LIFECYCLE_STATES.PENDING_CHANGE]),
    requireCsrf: true,
    requireRecentReauth: false,
    requireSession: true,
    requireStepUp: 'password-set',
    route: '/api/auth/account/set-password',
    session: {
      requireRecentAuthMs: 0,
    },
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

  if (!policy) {
    throw new Error(`Unknown auth route policy: ${policyKey}`);
  }

  return policy;
}

export async function requirePolicySession(request, policyKey) {
  const policy = resolvePolicy(policyKey);

  if (!policy.requireSession) {
    return null;
  }

  const sessionContext = await requireSessionRequest(request, {
    allowBearerFallback: policy.allowBearerFallback !== false,
    requireRecentAuthMs: Number(policy?.session?.requireRecentAuthMs || 0),
  });

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
  }, {})
);

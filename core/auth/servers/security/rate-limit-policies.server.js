import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

const AUTH_RATE_LIMIT_POLICIES = Object.freeze({
  ACCOUNT_DELETE: Object.freeze({
    dimensions: Object.freeze({
      device: 6,
      ip: 10,
      user: 4,
    }),
    dimensionMessages: Object.freeze({
      default: 'Too many account deletion attempts from this network',
      device: 'Too many account deletion attempts from this device',
      user: 'Too many account deletion attempts for this account',
    }),
    message: 'Too many account deletion attempts',
    namespace: 'auth:account-delete',
    windowMs: 15 * 60 * 1000,
  }),
  EMAIL_CHANGE_COMPLETE: Object.freeze({
    dimensions: Object.freeze({
      device: 12,
      ip: 20,
      user: 8,
    }),
    dimensionMessages: Object.freeze({
      default: 'Too many email change attempts from this network',
      device: 'Too many email change attempts from this device',
      user: 'Too many email change attempts for this account',
    }),
    message: 'Too many email change attempts',
    namespace: 'auth:email-change:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_CHANGE_COMPLETE: Object.freeze({
    dimensions: Object.freeze({
      device: 12,
      ip: 20,
      user: 8,
    }),
    dimensionMessages: Object.freeze({
      default: 'Too many password change attempts from this network',
      device: 'Too many password change attempts from this device',
      user: 'Too many password change attempts for this account',
    }),
    message: 'Too many password change attempts',
    namespace: 'auth:password-change:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_RESET_COMPLETE: Object.freeze({
    dimensions: Object.freeze({
      device: 12,
      email: 6,
      ip: 24,
    }),
    dimensionMessages: Object.freeze({
      default: 'Too many password reset attempts from this network',
      device: 'Too many password reset attempts from this device',
      email: 'Too many password reset attempts for this email',
    }),
    message: 'Too many password reset attempts',
    namespace: 'auth:password-reset:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_SET_COMPLETE: Object.freeze({
    dimensions: Object.freeze({
      device: 12,
      ip: 20,
      user: 8,
    }),
    dimensionMessages: Object.freeze({
      default: 'Too many password setup attempts from this network',
      device: 'Too many password setup attempts from this device',
      user: 'Too many password setup attempts for this account',
    }),
    message: 'Too many password setup attempts',
    namespace: 'auth:password-set:complete',
    windowMs: 15 * 60 * 1000,
  }),
  SIGN_UP_COMPLETE: Object.freeze({
    dimensions: Object.freeze({
      device: 12,
      email: 6,
      ip: 24,
    }),
    dimensionMessages: Object.freeze({
      default: 'Too many sign-up attempts from this network',
      device: 'Too many sign-up attempts from this device',
      email: 'Too many sign-up attempts for this email',
    }),
    message: 'Too many sign-up attempts',
    namespace: 'auth:sign-up:complete',
    windowMs: 15 * 60 * 1000,
  }),
});

function resolvePolicy(policyKey) {
  const key = normalizeValue(policyKey).toUpperCase();
  const policy = AUTH_RATE_LIMIT_POLICIES[key];

  if (!policy) {
    throw new Error(`Unknown auth rate-limit policy: ${policyKey}`);
  }

  return policy;
}

function toDimensions(policy, dimensionValues = {}) {
  return Object.entries(policy.dimensions || {}).map(([id, limit]) => ({
    id,
    limit,
    value: dimensionValues?.[id],
  }));
}

function resolveDimensionMessage(policy, dimensionId = '') {
  const normalizedDimensionId = normalizeValue(dimensionId).toLowerCase();

  if (normalizedDimensionId && policy.dimensionMessages?.[normalizedDimensionId]) {
    return policy.dimensionMessages[normalizedDimensionId];
  }

  return policy.dimensionMessages?.default || policy.message || 'Too many requests';
}

export async function enforceAuthRateLimit(policyKey, { dimensionValues = {} } = {}) {
  const policy = resolvePolicy(policyKey);

  try {
    await enforceSlidingWindowRateLimit({
      dimensions: toDimensions(policy, dimensionValues),
      message: policy.message,
      namespace: policy.namespace,
      windowMs: policy.windowMs,
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    throw new Error(resolveDimensionMessage(policy, error.dimension));
  }
}

export const AUTH_RATE_LIMIT_POLICY_KEYS = Object.freeze(
  Object.keys(AUTH_RATE_LIMIT_POLICIES).reduce((accumulator, key) => {
    accumulator[key] = key;
    return accumulator;
  }, {})
);

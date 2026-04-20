'use client';

import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';

const PASSWORD_STATUS_CACHE_TTL_MS = 4000;
const passwordStatusCache = new Map();
const passwordStatusInFlight = new Map();

async function postAuthJson(pathname, body, { cache, credentials, includeCsrf = false, message } = {}) {
  const response = await fetch(pathname, {
    method: 'POST',
    ...(cache ? { cache } : {}),
    ...(credentials ? { credentials } : {}),
    headers: {
      ...(includeCsrf ? createCsrfHeaders() : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ error: message }));

  if (response.ok) {
    return payload;
  }

  const error = new Error(payload?.error || message);
  error.code = payload?.code || null;
  error.status = response.status;
  throw error;
}

function normalizeValue(value) {
  return String(value || '').trim();
}

function createPasswordStatusCacheKey({ email, identifier, intent }) {
  return JSON.stringify({
    email: normalizeValue(email).toLowerCase(),
    identifier: normalizeValue(identifier).toLowerCase(),
    intent: normalizeValue(intent).toLowerCase() || 'sign-in',
  });
}

function readPasswordStatusCache(cacheKey) {
  const entry = passwordStatusCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    passwordStatusCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function resolvePasswordAccountStatus({ email, identifier, intent }) {
  const cacheKey = createPasswordStatusCacheKey({ email, identifier, intent });
  const cachedValue = readPasswordStatusCache(cacheKey);

  if (cachedValue) {
    return Promise.resolve(cachedValue);
  }

  if (passwordStatusInFlight.has(cacheKey)) {
    return passwordStatusInFlight.get(cacheKey);
  }

  const requestPromise = postAuthJson(
    '/api/auth/account/password-status',
    {
      email,
      identifier,
      intent,
    },
    {
      credentials: 'include',
      message: 'Account status could not be resolved',
    }
  )
    .then((payload) => {
      passwordStatusCache.set(cacheKey, {
        expiresAt: Date.now() + PASSWORD_STATUS_CACHE_TTL_MS,
        value: payload,
      });
      passwordStatusInFlight.delete(cacheKey);
      return payload;
    })
    .catch((error) => {
      passwordStatusInFlight.delete(cacheKey);
      throw error;
    });

  passwordStatusInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

export function assertPasswordAccountStatus({ email, identifier, intent = 'sign-in' }) {
  return resolvePasswordAccountStatus({ email, identifier, intent });
}

export function assertSignUpEmailAvailable({ email }) {
  return resolvePasswordAccountStatus({ email, intent: 'sign-up' });
}

export function requestVerificationCode({ email, identifier, forceNew = false, purpose }) {
  return postAuthJson(
    '/api/auth/verification/send-code',
    {
      email,
      identifier,
      forceNew,
      purpose,
    },
    {
      credentials: 'include',
      includeCsrf: true,
      message: 'Could not send verification code',
    }
  );
}

export function verifyCodeRequest({ challengeToken, code, email, rememberDevice = false, purpose }) {
  return postAuthJson(
    '/api/auth/verification/verify-code',
    {
      challengeToken,
      code,
      email,
      rememberDevice,
      purpose,
    },
    {
      credentials: 'include',
      includeCsrf: true,
      message: 'Verification failed',
    }
  );
}

export function completeVerifiedSignUp({ displayName, email, password, signUpProof, username }) {
  return postAuthJson(
    '/api/auth/sign-up/complete',
    {
      displayName,
      email,
      password,
      signUpProof,
      username,
    },
    {
      credentials: 'include',
      message: 'Sign-up could not be completed',
    }
  );
}

export function completePasswordReset({ email, newPassword, passwordResetProof }) {
  return postAuthJson(
    '/api/auth/password-reset/complete',
    {
      email,
      newPassword,
      passwordResetProof,
    },
    {
      message: 'Password reset failed',
    }
  );
}

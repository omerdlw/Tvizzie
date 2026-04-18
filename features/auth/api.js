'use client';

import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';

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

function resolvePasswordAccountStatus(email, intent) {
  return postAuthJson(
    '/api/auth/account/password-status',
    {
      email,
      intent,
    },
    {
      cache: 'no-store',
      credentials: 'include',
      message: 'Account status could not be resolved',
    }
  );
}

export function assertPasswordAccountStatus({ email, intent = 'sign-in' }) {
  return resolvePasswordAccountStatus(email, intent);
}

export function assertSignUpEmailAvailable({ email }) {
  return resolvePasswordAccountStatus(email, 'sign-up');
}

export function requestVerificationCode({ email, forceNew = false, purpose }) {
  return postAuthJson(
    '/api/auth/verification/send-code',
    {
      email,
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

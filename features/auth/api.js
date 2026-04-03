'use client'

import { createCsrfHeaders } from '@/core/auth/clients/csrf.client'

export async function assertPasswordAccountStatus({
  email,
  intent = 'sign-in',
}) {
  const response = await fetch('/api/auth/account/password-status', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      intent,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Account status could not be resolved' }))

  if (!response.ok) {
    const error = new Error(payload?.error || 'Account status could not be resolved')
    error.code = payload?.code || null
    error.status = response.status
    throw error
  }

  return payload
}

export async function assertSignUpEmailAvailable({ email }) {
  const response = await fetch('/api/auth/account/password-status', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      intent: 'sign-up',
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Account status could not be resolved' }))

  if (!response.ok) {
    const error = new Error(payload?.error || 'Account status could not be resolved')
    error.code = payload?.code || null
    error.status = response.status
    throw error
  }

  return payload
}

export async function requestVerificationCode({
  email,
  forceNew = false,
  purpose,
}) {
  const response = await fetch('/api/auth/verification/send-code', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      forceNew,
      purpose,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Could not send verification code' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Could not send verification code')
  }

  return payload
}

export async function verifyCodeRequest({
  challengeToken,
  code,
  email,
  rememberDevice = false,
  purpose,
}) {
  const response = await fetch('/api/auth/verification/verify-code', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      challengeToken,
      code,
      email,
      rememberDevice,
      purpose,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Verification failed' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Verification failed')
  }

  return payload
}

export async function completeVerifiedSignUp({
  displayName,
  email,
  password,
  signUpProof,
  username,
}) {
  const response = await fetch('/api/auth/sign-up/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      email,
      password,
      signUpProof,
      username,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Sign-up could not be completed' }))

  if (!response.ok) {
    const error = new Error(payload?.error || 'Sign-up could not be completed')
    error.code = payload?.code || null
    error.status = response.status
    throw error
  }

  return payload
}

export async function completePasswordReset({
  email,
  newPassword,
  passwordResetProof,
}) {
  const response = await fetch('/api/auth/password-reset/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      newPassword,
      passwordResetProof,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Password reset failed' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Password reset failed')
  }

  return payload
}

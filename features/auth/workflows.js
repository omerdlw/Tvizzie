'use client'

import { ACCOUNT_CLIENT } from '@/config/account.config'
import { completeVerifiedSignUp } from './api'

import {
  createError,
  isEmailIdentifier,
  normalizeEmail,
  validateAllowedEmailDomain,
  validatePassword,
} from './utils'

export async function resolveSignInEmail(identifier) {
  const normalizedIdentifier = String(identifier || '').trim()

  if (!normalizedIdentifier) {
    throw createError('SIGNIN_IDENTIFIER_REQUIRED')
  }

  if (isEmailIdentifier(normalizedIdentifier)) {
    return {
      email: normalizeEmail(normalizedIdentifier),
      username: null,
    }
  }

  const username = ACCOUNT_CLIENT.validateUsername(normalizedIdentifier)
  const userId = await ACCOUNT_CLIENT.getAccountIdByUsername(username)

  if (!userId) {
    throw createError('auth/user-not-found')
  }

  const profile = await ACCOUNT_CLIENT.getAccount(userId)

  if (!profile?.email) {
    throw createError('PROFILE_EMAIL_MISSING')
  }

  return {
    email: normalizeEmail(profile.email),
    username,
  }
}

export async function createPendingSignUpPayload(form = {}) {
  const username = ACCOUNT_CLIENT.validateUsername(form.username)
  const displayName = String(form.displayName || '').trim() || username
  const email = validateAllowedEmailDomain(form.email)
  const password = validatePassword(form.password)

  if (password !== String(form.confirmPassword || '')) {
    throw new Error('Password confirmation does not match')
  }

  const existingUserId = await ACCOUNT_CLIENT.getAccountIdByUsername(username)
  if (existingUserId) {
    throw createError('USERNAME_TAKEN')
  }

  return {
    displayName,
    email,
    password,
    username,
  }
}

export async function finalizeSignUp({
  auth,
  displayName,
  email,
  password,
  signUpProof,
  username,
}) {
  const completion = await completeVerifiedSignUp({
    displayName,
    email,
    password,
    signUpProof,
    username,
  })

  const session = await auth.signIn({
    email,
    password,
  })

  if (!session?.user?.id) {
    throw new Error(
      'Sign-up completed but no authenticated session was returned'
    )
  }

  await ACCOUNT_CLIENT.ensureAccount(session.user, {
    displayName: displayName || username,
    username,
  }).catch(() => null)

  return {
    ...session,
    recovered: completion?.recovered === true,
  }
}

export async function finalizeGoogleSignUp({ auth, nextPath = '/account' }) {
  const session = await auth.signUp({
    googleAuthIntent: 'sign-up',
    next: nextPath,
    provider: 'google',
  })

  if (session?.requiresRedirect) {
    return session
  }

  if (!session?.user?.id) {
    throw new Error(
      'Google sign-up completed but no authenticated session was returned'
    )
  }

  await ACCOUNT_CLIENT.ensureAccount(session.user)

  return session
}

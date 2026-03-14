'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/modules/auth'
import Container from '@/modules/modal/container'
import { useModal } from '@/modules/modal/context'
import { useToast } from '@/modules/notification/hooks'
import {
  ensureUserProfile,
  getUserIdByUsername,
  getUserProfile,
  validateUsername,
} from '@/services/profile.service'
import { Button, Input } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_FIELD } from './constants'

const AUTH_MODE = {
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
}

const AUTH_PURPOSE = {
  PASSWORD_RESET: 'password-reset',
  SIGN_UP: 'sign-up',
}

const EMAIL_DOMAIN_PATTERNS = [
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^tempmail\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
]

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'This email address is already in use',
  'auth/invalid-credential': 'The username/email or password is incorrect',
  'auth/invalid-email': 'Enter a valid email address',
  'auth/missing-credentials': 'Sign-in credentials are missing',
  'auth/network-request-failed': 'A network error occurred. Please try again',
  'auth/operation-not-allowed': 'This sign-in method is not available',
  'auth/too-many-requests':
    'Too many attempts were made. Please try again later',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found': 'No account was found with these credentials',
  'auth/weak-password':
    'Password is too weak. Use at least 8 characters, 1 uppercase letter, 1 number, and 1 symbol',
  'auth/wrong-password': 'The password is incorrect',
  SIGNIN_IDENTIFIER_REQUIRED: 'Username or email is required',
  PROFILE_EMAIL_MISSING:
    'No sign-in email was found for this username. Please contact support',
  USERNAME_TAKEN: 'This username is already taken',
  LINK_WITH_PASSWORD_REQUIRED:
    'This Google account matches an existing email/password account. Sign in once with your password to link Google',
  GOOGLE_LINK_REQUIRED:
    'Google sign-in is available only for accounts linked from profile settings',
  GOOGLE_EMAIL_MISMATCH:
    'Google account email must match your current account email',
  GOOGLE_GMAIL_REQUIRED:
    'Google sign-in is available only for gmail.com accounts',
  GOOGLE_EXPECTED_EMAIL_REQUIRED:
    'Google sign-in could not be validated. Please try again from the same account email.',
  GOOGLE_PREFLIGHT_NOT_FOUND: 'No account found. Please sign up first',
  GOOGLE_PREFLIGHT_GOOGLE_NOT_LINKED: 'Link Google from profile settings first',
  GOOGLE_PREFLIGHT_PASSWORD_NOT_LINKED:
    'This account does not have email/password sign-in enabled',
  GOOGLE_PREFLIGHT_PROFILE_MISMATCH:
    'Account integrity check failed. Please contact support',
  GOOGLE_PREFLIGHT_GMAIL_REQUIRED:
    'Google sign-in is available only for gmail.com accounts',
}

const AUTH_ERROR_MESSAGE_PATTERNS = [
  [
    'auth/email-already-in-use',
    AUTH_ERROR_MESSAGES['auth/email-already-in-use'],
  ],
  ['auth/invalid-credential', AUTH_ERROR_MESSAGES['auth/invalid-credential']],
  ['auth/invalid-email', AUTH_ERROR_MESSAGES['auth/invalid-email']],
  ['auth/user-not-found', AUTH_ERROR_MESSAGES['auth/user-not-found']],
  ['auth/wrong-password', AUTH_ERROR_MESSAGES['auth/wrong-password']],
  ['auth/weak-password', AUTH_ERROR_MESSAGES['auth/weak-password']],
  ['auth/too-many-requests', AUTH_ERROR_MESSAGES['auth/too-many-requests']],
  [
    'auth/network-request-failed',
    AUTH_ERROR_MESSAGES['auth/network-request-failed'],
  ],
]

function resolveMode(value) {
  return value === AUTH_MODE.SIGN_UP ? AUTH_MODE.SIGN_UP : AUTH_MODE.SIGN_IN
}

function createError(code, message = null) {
  const error = new Error(message || code)
  error.code = code
  return error
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function isEmailIdentifier(value) {
  return String(value || '').includes('@')
}

function isGmailEmail(value) {
  return normalizeEmail(value).endsWith('@gmail.com')
}

function resolveAuthErrorMessage(error, fallbackMessage) {
  const code = String(error?.code || '').trim()

  if (AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code]
  }

  const message = String(error?.message || '').trim()

  if (AUTH_ERROR_MESSAGES[message]) {
    return AUTH_ERROR_MESSAGES[message]
  }

  for (const [pattern, readableMessage] of AUTH_ERROR_MESSAGE_PATTERNS) {
    if (message.includes(pattern)) {
      return readableMessage
    }
  }

  const firebaseCodeMatch = message.match(/\((auth\/[^)]+)\)/)
  if (firebaseCodeMatch?.[1] && AUTH_ERROR_MESSAGES[firebaseCodeMatch[1]]) {
    return AUTH_ERROR_MESSAGES[firebaseCodeMatch[1]]
  }

  if (message && !message.includes('Firebase: Error')) {
    return message
  }

  return fallbackMessage || 'Request could not be completed. Please try again'
}

function validatePassword(value) {
  const password = String(value || '')

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least 1 uppercase letter')
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least 1 symbol')
  }

  return password
}

function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value)
  const parts = email.split('@')

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Enter a valid email address')
  }

  const domain = parts[1]
  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(domain)
  )

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, tempmail, protonmail, icloud'
    )
  }

  return email
}

async function preflightGoogleSignIn(email) {
  const response = await fetch('/api/auth/provider/google/preflight', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Google sign-in check failed' }))

  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || 'Google sign-in check failed'
    )
  }

  if (payload?.allowed) {
    return payload
  }

  const reason = String(payload?.reason || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  const error = new Error(payload?.message || 'Google sign-in is not allowed')
  error.code = reason
    ? `GOOGLE_PREFLIGHT_${reason}`
    : 'GOOGLE_PREFLIGHT_BLOCKED'

  throw error
}

async function requestVerificationCode({ email, purpose }) {
  const response = await fetch('/api/auth/verification/send-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
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

export default function AuthModal({ close, data, header }) {
  const auth = useAuth()
  const toast = useToast()
  const { openModal } = useModal()
  const [mode, setMode] = useState(resolveMode(data?.mode))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    identifier: data?.email || '',
    displayName: '',
    username: '',
    email: data?.email || '',
    password: '',
    confirmPassword: '',
  })
  const [isGoogleSignInEligible, setIsGoogleSignInEligible] = useState(false)

  const isSignUp = mode === AUTH_MODE.SIGN_UP

  useEffect(() => {
    let ignore = false

    async function resolveGoogleEligibility() {
      if (isSignUp) {
        setIsGoogleSignInEligible(false)
        return
      }

      const identifier = String(form.identifier || '').trim()
      if (!identifier) {
        setIsGoogleSignInEligible(false)
        return
      }

      if (isEmailIdentifier(identifier)) {
        setIsGoogleSignInEligible(isGmailEmail(identifier))
        return
      }

      try {
        const username = validateUsername(identifier)
        const userId = await getUserIdByUsername(username)

        if (!userId) {
          if (!ignore) setIsGoogleSignInEligible(false)
          return
        }

        const profile = await getUserProfile(userId)
        if (!ignore) {
          setIsGoogleSignInEligible(isGmailEmail(profile?.email))
        }
      } catch {
        if (!ignore) setIsGoogleSignInEligible(false)
      }
    }

    resolveGoogleEligibility()

    return () => {
      ignore = true
    }
  }, [form.identifier, isSignUp])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resolveSignInEmail = async (identifier) => {
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

    const username = validateUsername(normalizedIdentifier)
    const userId = await getUserIdByUsername(username)

    if (!userId) {
      throw createError('auth/user-not-found')
    }

    const profile = await getUserProfile(userId)

    if (!profile?.email) {
      throw createError('PROFILE_EMAIL_MISSING')
    }

    return {
      email: normalizeEmail(profile.email),
      username,
    }
  }

  const createPendingSignUpPayload = async () => {
    const username = validateUsername(form.username)
    const displayName = String(form.displayName || '').trim() || username
    const email = validateAllowedEmailDomain(form.email)
    const password = validatePassword(form.password)

    if (password !== form.confirmPassword) {
      throw new Error('Password confirmation does not match')
    }

    const existingUserId = await getUserIdByUsername(username)
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

  const handleSignIn = async () => {
    const password = String(form.password || '')

    if (!password) {
      throw new Error('Password is required')
    }

    const { email } = await resolveSignInEmail(form.identifier)
    const session = await auth.signIn({ email, password })

    toast.success('Signed in successfully')
    if (typeof data?.onSuccess === 'function') {
      data.onSuccess(session)
    }
    close({
      success: true,
      session,
      method: 'email-sign-in',
    })
  }

  const handleLinkedGoogleSignIn = async () => {
    if (isSubmitting || isSignUp) return

    setIsSubmitting(true)
    try {
      const { email } = await resolveSignInEmail(form.identifier)
      if (!isGmailEmail(email)) {
        throw createError('GOOGLE_GMAIL_REQUIRED')
      }

      await preflightGoogleSignIn(email)

      const session = await auth.signIn({
        provider: 'google',
        requireLinkedPassword: true,
        expectedEmail: email,
      })

      toast.success('Signed in successfully')
      if (typeof data?.onSuccess === 'function') {
        data.onSuccess(session)
      }
      close({ success: true, session, method: 'google' })
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Google sign-in failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignUp = async () => {
    const pendingPayload = await createPendingSignUpPayload()

    const verification = await openModal('AUTH_VERIFICATION_MODAL', 'bottom', {
      header: {
        title: 'Verify your email',
        description: 'Complete account creation',
      },
      data: {
        purpose: AUTH_PURPOSE.SIGN_UP,
        email: pendingPayload.email,
      },
    })

    if (!verification?.success) {
      return
    }

    const session = await auth.signUp({
      displayName: pendingPayload.displayName,
      email: pendingPayload.email,
      password: pendingPayload.password,
    })

    await ensureUserProfile(session.user, {
      displayName: pendingPayload.displayName || pendingPayload.username,
      username: pendingPayload.username,
    })

    toast.success('Your account was created successfully')
    if (typeof data?.onSuccess === 'function') {
      data.onSuccess(session)
    }
    close({
      success: true,
      session,
      method: 'email-sign-up',
    })
  }

  const handleRequestPasswordReset = async () => {
    if (isSubmitting || isSignUp) return

    setIsSubmitting(true)
    try {
      const { email } = await resolveSignInEmail(form.identifier)
      const challenge = await requestVerificationCode({
        email,
        purpose: AUTH_PURPOSE.PASSWORD_RESET,
      })

      const verification = await openModal(
        'AUTH_VERIFICATION_MODAL',
        'bottom',
        {
          header: {
            title: 'Reset your password',
            description: 'Email verification',
            label: 'Security',
          },
          data: {
            autoSendOnOpen: false,
            initialChallenge: challenge,
            purpose: AUTH_PURPOSE.PASSWORD_RESET,
            email,
          },
        }
      )

      if (!verification?.success) {
        return
      }

      setForm((prev) => ({
        ...prev,
        identifier: email,
        password: '',
        confirmPassword: '',
      }))
    } catch (error) {
      toast.error(
        resolveAuthErrorMessage(error, 'Password reset request failed')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isSignUp) {
        await handleSignUp()
      } else {
        await handleSignIn()
      }
    } catch (error) {
      toast.error(
        resolveAuthErrorMessage(
          error,
          isSignUp ? 'Sign-up failed' : 'Sign-in failed'
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    if (isSubmitting) return

    setMode((prev) =>
      prev === AUTH_MODE.SIGN_UP ? AUTH_MODE.SIGN_IN : AUTH_MODE.SIGN_UP
    )
    setForm((prev) => ({
      ...prev,
      password: '',
      confirmPassword: '',
    }))
  }

  return (
    <Container
      header={{
        ...header,
      }}
      className="w-full sm:w-[460px]"
      close={close}
    >
      <div className="flex w-full flex-col p-2.5">
        <div className="space-y-4 mt-2">
          <div className="flex w-full items-center justify-between gap-3 px-4">
            <button
              type="button"
              onClick={toggleMode}
              disabled={isSubmitting}
              className="cursor-pointer text-[10px] font-semibold tracking-[0.12em] text-white/50 uppercase transition hover:text-white disabled:opacity-50"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
            {!isSignUp ? (
              <button
                className="cursor-pointer text-[10px] font-semibold tracking-[0.12em] text-white/50 uppercase transition hover:text-white disabled:opacity-50"
                disabled={isSubmitting}
                onClick={handleRequestPasswordReset}
                type="button"
              >
                Forgot Password?
              </button>
            ) : null}
          </div>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="flex flex-col rounded-[20px] border border-white/5 bg-white/5 mx-2">
              {isSignUp ? (
                <>
                  <Input
                    value={form.username}
                    onChange={(event) =>
                      updateField('username', event.target.value)
                    }
                    placeholder="Username"
                    autoComplete="username"
                    className={{
                      input:
                        'w-full border-b border-white/5 bg-transparent p-3',
                    }}
                  />
                  <Input
                    value={form.displayName}
                    onChange={(event) =>
                      updateField('displayName', event.target.value)
                    }
                    placeholder="Display name (optional)"
                    autoComplete="name"
                    className={{
                      input:
                        'w-full border-b border-white/5 bg-transparent p-3',
                    }}
                  />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                    placeholder="Email address"
                    autoComplete="email"
                    className={{
                      input:
                        'w-full border-b border-white/5 bg-transparent p-3',
                    }}
                  />
                </>
              ) : (
                <Input
                  value={form.identifier}
                  onChange={(event) =>
                    updateField('identifier', event.target.value)
                  }
                  placeholder="Username or email"
                  autoComplete="username"
                  className={{
                    input: 'w-full border-b border-white/5 bg-transparent p-3',
                  }}
                />
              )}

              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  updateField('password', event.target.value)
                }
                placeholder="Password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className={{
                  input: `w-full ${isSignUp && 'border-b border-white/5'} bg-transparent p-3`,
                }}
              />

              {isSignUp ? (
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField('confirmPassword', event.target.value)
                  }
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={{
                    input: 'w-full bg-transparent p-3',
                  }}
                />
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={MODAL_BUTTON.primary}
            >
              {isSubmitting
                ? isSignUp
                  ? 'Continuing'
                  : 'Signing in'
                : isSignUp
                  ? 'Continue'
                  : 'Sign In'}
            </Button>
          </form>
          {!isSignUp && isGoogleSignInEligible ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLinkedGoogleSignIn}
                disabled={isSubmitting}
                className="text-[11px] font-semibold tracking-[0.12em] text-white/45 uppercase transition hover:text-white disabled:opacity-50"
              >
                Sign In with Linked Google
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </Container>
  )
}

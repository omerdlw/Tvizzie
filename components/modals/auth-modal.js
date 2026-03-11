'use client'

import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/modules/auth'
import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import {
  ensureUserProfile,
  getUserIdByUsername,
  getUserProfile,
  updateUserProfile,
  validateUsername,
} from '@/services/profile.service'
import { Button, Input } from '@/ui/elements'
import Icon from '@/ui/icon'

const AUTH_MODE = {
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
}

const AUTH_STEP = {
  CREDENTIALS: 'credentials',
  VERIFY_EMAIL_CODE: 'verify-email-code',
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
  'auth/email-already-in-use': 'This email address is already in use.',
  'auth/invalid-credential': 'The username/email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-credentials': 'Sign-in credentials are missing.',
  'auth/network-request-failed': 'A network error occurred. Please try again.',
  'auth/operation-not-allowed': 'This sign-in method is not available.',
  'auth/too-many-requests':
    'Too many attempts were made. Please try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account was found with these credentials.',
  'auth/weak-password':
    'Password is too weak. Use at least 8 characters, 1 uppercase letter, 1 number, and 1 symbol.',
  'auth/wrong-password': 'The password is incorrect.',
  SIGNIN_IDENTIFIER_REQUIRED: 'Username or email is required.',
  PROFILE_EMAIL_MISSING:
    'No sign-in email was found for this username. Please contact support.',
  USERNAME_TAKEN: 'This username is already taken.',
  CODE_INVALID: 'The verification code is invalid.',
  CODE_EXPIRED: 'The verification code has expired.',
  CODE_ATTEMPTS_EXHAUSTED:
    'Too many invalid code attempts. Request a new code.',
  CODE_REQUIRED: 'Verification code must be 6 digits.',
  CODE_ALREADY_USED:
    'This verification code has already been used. Request a new code.',
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
  ['Verification code is invalid', AUTH_ERROR_MESSAGES.CODE_INVALID],
  ['Verification code has expired', AUTH_ERROR_MESSAGES.CODE_EXPIRED],
  [
    'Verification code attempts are exhausted',
    AUTH_ERROR_MESSAGES.CODE_ATTEMPTS_EXHAUSTED,
  ],
  ['Verification code must be 6 digits', AUTH_ERROR_MESSAGES.CODE_REQUIRED],
  [
    'Verification code has already been used',
    AUTH_ERROR_MESSAGES.CODE_ALREADY_USED,
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

  return fallbackMessage || 'Request could not be completed. Please try again.'
}

function validatePassword(value) {
  const password = String(value || '')

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.')
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least 1 uppercase letter.')
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number.')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least 1 symbol.')
  }

  return password
}

function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value)
  const parts = email.split('@')

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Enter a valid email address.')
  }

  const domain = parts[1]
  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(domain)
  )

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, tempmail, protonmail, icloud.'
    )
  }

  return email
}

function isEmailIdentifier(value) {
  return String(value || '').includes('@')
}

function formatVerificationExpiry(expiresAt) {
  if (!expiresAt) {
    return null
  }

  const date = new Date(expiresAt)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

async function sendVerificationCodeRequest(email) {
  const response = await fetch('/api/auth/verification/send-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      purpose: 'sign-up',
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Could not send verification code.' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Could not send verification code.')
  }

  return payload
}

async function verifyCodeRequest({ challengeToken, code, email }) {
  const response = await fetch('/api/auth/verification/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      challengeToken,
      code,
      email,
      purpose: 'sign-up',
    }),
  })

  const payload = await response
    .json()
    .catch(() => ({ error: 'Verification failed.' }))

  if (!response.ok) {
    throw new Error(payload?.error || 'Verification failed.')
  }

  return payload
}

export default function AuthModal({ close, data, header }) {
  const auth = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState(resolveMode(data?.mode))
  const [step, setStep] = useState(AUTH_STEP.CREDENTIALS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verificationPayload, setVerificationPayload] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [form, setForm] = useState({
    identifier: data?.email || '',
    displayName: '',
    username: '',
    email: data?.email || '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
  })

  const isSignUp = mode === AUTH_MODE.SIGN_UP
  const isVerificationStep = step === AUTH_STEP.VERIFY_EMAIL_CODE
  const resendRemainingMs = Math.max(
    0,
    Number(verificationPayload?.resendAvailableAt || 0) - now
  )
  const resendRemainingSeconds = Math.ceil(resendRemainingMs / 1000)
  const canResendCode = resendRemainingMs <= 0
  const codeExpiryLabel = formatVerificationExpiry(
    verificationPayload?.expiresAt || null
  )

  useEffect(() => {
    if (!isVerificationStep || !verificationPayload?.resendAvailableAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isVerificationStep, verificationPayload?.resendAvailableAt])

  const modalTitle = useMemo(() => {
    if (isVerificationStep) {
      return 'Verify Email'
    }

    if (header?.title) {
      return header.title
    }

    return isSignUp ? 'Create Account' : 'Sign In'
  }, [header?.title, isSignUp, isVerificationStep])

  const modalDescription = useMemo(() => {
    if (isVerificationStep) {
      return 'Enter the 6-digit code sent to your email.'
    }

    if (header?.description) {
      return header.description
    }

    return isSignUp
      ? 'Continue with Google or create an account with email.'
      : 'Continue with Google or sign in with username/email.'
  }, [header?.description, isSignUp, isVerificationStep])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const setVerificationStep = (payload) => {
    setNow(Date.now())
    setVerificationPayload(payload)
    setStep(AUTH_STEP.VERIFY_EMAIL_CODE)
    setForm((prev) => ({
      ...prev,
      verificationCode: '',
    }))
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
      throw new Error('Password confirmation does not match.')
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

  const handleGoogleSignIn = async () => {
    if (isSubmitting || isResending) return

    setIsSubmitting(true)
    try {
      const session = await auth.signIn({ provider: 'google' })
      toast.success('Signed in successfully.')
      if (typeof data?.onSuccess === 'function') {
        data.onSuccess(session)
      }
      close({ success: true, session, method: 'google' })
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Google sign-in failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignIn = async () => {
    const password = String(form.password || '')

    if (!password) {
      throw new Error('Password is required.')
    }

    const { email } = await resolveSignInEmail(form.identifier)
    const session = await auth.signIn({ email, password })

    toast.success('Signed in successfully.')
    if (typeof data?.onSuccess === 'function') {
      data.onSuccess(session)
    }
    close({
      success: true,
      session,
      method: 'email-sign-in',
    })
  }

  const handleSignUp = async () => {
    const pendingPayload = await createPendingSignUpPayload()
    const challenge = await sendVerificationCodeRequest(pendingPayload.email)

    setVerificationStep({
      ...pendingPayload,
      challengeToken: challenge.challengeToken,
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    })

    toast.success('Verification code sent to your email.')
  }

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || isResending) return

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
          isSignUp ? 'Sign-up failed.' : 'Sign-in failed.'
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (event) => {
    event.preventDefault()
    if (isSubmitting || isResending) return

    const code = String(form.verificationCode || '').trim()

    if (!verificationPayload?.email || !verificationPayload?.challengeToken) {
      toast.error('Verification session was not found. Start again.')
      setStep(AUTH_STEP.CREDENTIALS)
      return
    }

    if (!/^\d{6}$/.test(code)) {
      toast.error(AUTH_ERROR_MESSAGES.CODE_REQUIRED)
      return
    }

    setIsSubmitting(true)
    try {
      await verifyCodeRequest({
        challengeToken: verificationPayload.challengeToken,
        code,
        email: verificationPayload.email,
      })

      const session = await auth.signUp({
        displayName: verificationPayload.displayName,
        email: verificationPayload.email,
        password: verificationPayload.password,
      })

      await ensureUserProfile(session.user)
      await updateUserProfile({
        userId: session.user.id,
        updates: {
          displayName:
            verificationPayload.displayName || verificationPayload.username,
          username: verificationPayload.username,
        },
      })

      toast.success('Your account was created successfully.')
      if (typeof data?.onSuccess === 'function') {
        data.onSuccess(session)
      }
      close({
        success: true,
        session,
        method: 'email-sign-up',
      })
    } catch (error) {
      toast.error(
        resolveAuthErrorMessage(error, 'Verification failed. Please try again.')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerificationCode = async () => {
    if (isSubmitting || isResending) return

    if (!verificationPayload?.email) {
      toast.error('Verification session was not found. Start again.')
      setStep(AUTH_STEP.CREDENTIALS)
      return
    }

    if (!canResendCode) {
      toast.error(
        `Please wait ${resendRemainingSeconds} second${resendRemainingSeconds === 1 ? '' : 's'} before requesting a new code.`
      )
      return
    }

    setIsResending(true)
    try {
      const challenge = await sendVerificationCodeRequest(
        verificationPayload.email
      )

      setVerificationPayload((prev) =>
        prev
          ? {
              ...prev,
              challengeToken: challenge.challengeToken,
              expiresAt: challenge.expiresAt,
              resendAvailableAt: challenge.resendAvailableAt,
            }
          : prev
      )
      setNow(Date.now())

      toast.success('A new verification code has been sent.')
    } catch (error) {
      toast.error(
        resolveAuthErrorMessage(error, 'Verification code could not be resent.')
      )
    } finally {
      setIsResending(false)
    }
  }

  const backToCredentials = () => {
    if (isSubmitting || isResending) return

    setStep(AUTH_STEP.CREDENTIALS)
    setVerificationPayload(null)
    setForm((prev) => ({
      ...prev,
      verificationCode: '',
      password: '',
      confirmPassword: '',
    }))
  }

  const toggleMode = () => {
    if (isSubmitting || isResending) return

    setMode((prev) =>
      prev === AUTH_MODE.SIGN_UP ? AUTH_MODE.SIGN_IN : AUTH_MODE.SIGN_UP
    )
    setStep(AUTH_STEP.CREDENTIALS)
    setVerificationPayload(null)
    setForm((prev) => ({
      ...prev,
      password: '',
      confirmPassword: '',
      verificationCode: '',
    }))
  }

  return (
    <Container
      header={{
        ...header,
        title: modalTitle,
        description: modalDescription,
      }}
      close={close}
    >
      <div className="flex w-full flex-col gap-5 p-2.5">
        {isVerificationStep ? (
          <form onSubmit={handleVerifyCode} className="space-y-4 px-2 pb-3">
            <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
              <p className="text-[11px] font-semibold tracking-[0.15em] text-white/45 uppercase">
                Verification Email
              </p>
              <p className="mt-1 break-all">
                {verificationPayload?.email || 'Unknown email'}
              </p>
              {codeExpiryLabel ? (
                <p className="mt-2 text-xs text-white/55">
                  Code expires at {codeExpiryLabel}
                </p>
              ) : null}
            </div>

            <Input
              value={form.verificationCode}
              onChange={(event) =>
                updateField(
                  'verificationCode',
                  event.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                )
              }
              placeholder="6-digit verification code"
              autoComplete="one-time-code"
              inputMode="numeric"
              className={{
                input:
                  'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
              }}
            />

            <Button
              type="submit"
              disabled={isSubmitting || isResending}
              className="flex h-11 w-full items-center justify-center rounded-[20px] bg-white px-4 text-[11px] font-bold tracking-[0.18em] text-black uppercase transition hover:bg-white/90 active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleResendVerificationCode}
                disabled={isSubmitting || isResending || !canResendCode}
                className="flex h-11 w-full items-center justify-center rounded-[20px] border border-white/10 bg-white/5 px-4 text-[11px] font-bold tracking-[0.18em] text-white uppercase transition hover:bg-white/10 active:scale-95 disabled:opacity-60"
              >
                {isResending
                  ? 'Sending...'
                  : canResendCode
                    ? 'Resend Code'
                    : `Resend Code (${resendRemainingSeconds}s)`}
              </Button>
              <Button
                type="button"
                onClick={backToCredentials}
                disabled={isSubmitting || isResending}
                className="flex h-11 w-full items-center justify-center rounded-[20px] border border-white/10 bg-transparent px-4 text-[11px] font-bold tracking-[0.18em] text-white/70 uppercase transition hover:bg-white/5 hover:text-white active:scale-95 disabled:opacity-60"
              >
                Go Back
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-3 p-2">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isResending}
                className="flex h-11 w-full items-center gap-2 rounded-[20px] border border-white/10 bg-white px-4 text-[11px] font-bold tracking-[0.18em] text-black uppercase transition hover:bg-white/90 active:scale-95 disabled:opacity-60"
              >
                <Icon icon="logos:google-icon" size={16} />
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 px-2">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">
                  or
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4 px-2">
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
                        'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
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
                        'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
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
                        'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
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
                    input:
                      'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
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
                  input:
                    'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
                }}
              />

              {isSignUp && (
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField('confirmPassword', event.target.value)
                  }
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={{
                    input:
                      'w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8',
                  }}
                />
              )}

              <Button
                type="submit"
                disabled={isSubmitting || isResending}
                className="flex h-11 w-full items-center justify-center rounded-[20px] bg-white px-4 text-[11px] font-bold tracking-[0.18em] text-black uppercase transition hover:bg-white/90 active:scale-95 disabled:opacity-60"
              >
                {isSubmitting
                  ? isSignUp
                    ? 'Sending code...'
                    : 'Signing in...'
                  : isSignUp
                    ? 'Continue'
                    : 'Sign In'}
              </Button>
            </form>

            <div className="flex justify-center px-2 pb-3">
              <button
                type="button"
                onClick={toggleMode}
                disabled={isSubmitting || isResending}
                className="text-[11px] font-semibold tracking-[0.12em] text-white/55 uppercase transition hover:text-white disabled:opacity-50"
              >
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"}
              </button>
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

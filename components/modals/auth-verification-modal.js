'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import { Button, Input } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_FIELD } from './constants'

const PURPOSES = {
  SIGN_UP: 'sign-up',
  PASSWORD_RESET: 'password-reset',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
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

function formatVerificationExpiry(expiresAt) {
  if (!expiresAt) return null
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

function resolvePurposeHeader(purpose) {
  if (purpose === PURPOSES.PASSWORD_RESET) {
    return {
      title: 'Password Reset Verification',
      description: 'Code verification',
      label: 'Security',
    }
  }

  if (purpose === PURPOSES.EMAIL_CHANGE) {
    return {
      title: 'Email Verification',
      description: 'Change email',
      label: 'Security',
    }
  }

  if (purpose === PURPOSES.PASSWORD_CHANGE) {
    return {
      title: 'Password Verification',
      description: 'Change password',
      label: 'Security',
    }
  }

  return {
    title: 'Email Verification',
    description: 'Account verification',
    label: 'Security',
  }
}

function resolveVerificationErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || '').trim()

  if (message.includes('Verification code is invalid')) {
    return 'Verification code is invalid'
  }

  if (message.includes('Verification code has expired')) {
    return 'Verification code has expired. Request a new code'
  }

  if (message.includes('Verification code has already been used')) {
    return 'Verification code already used. Request a new code'
  }

  if (message.includes('Verification code attempts are exhausted')) {
    return 'Too many invalid code attempts. Request a new code'
  }

  if (
    message.includes('Current password is incorrect') ||
    message.includes('INVALID_LOGIN_CREDENTIALS')
  ) {
    return 'Current password is incorrect'
  }

  if (message && !message.includes('Firebase: Error')) {
    return message
  }

  return fallbackMessage
}

async function sendVerificationCodeRequest({ accessToken, email, purpose }) {
  const response = await fetch('/api/auth/verification/send-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

async function verifyCodeRequest({
  accessToken,
  challengeToken,
  code,
  email,
  purpose,
}) {
  const response = await fetch('/api/auth/verification/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      challengeToken,
      code,
      email,
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

async function completePasswordResetWithCode({
  challengeToken,
  code,
  email,
  newPassword,
}) {
  const response = await fetch('/api/auth/password-reset/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      challengeToken,
      code,
      email,
      newPassword,
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

export default function AuthVerificationModal({ close, data, header }) {
  const toast = useToast()
  const autoSentRef = useRef(false)

  const purpose = String(data?.purpose || '')
    .trim()
    .toLowerCase()
  const email = normalizeEmail(data?.email)
  const accessToken = String(data?.accessToken || '').trim()
  const autoSendOnOpen = data?.autoSendOnOpen !== false
  const initialChallenge =
    data?.initialChallenge && typeof data.initialChallenge === 'object'
      ? data.initialChallenge
      : null
  const initialChallengeToken = String(initialChallenge?.challengeToken || '').trim()
  const requiresAuthToken =
    purpose === PURPOSES.EMAIL_CHANGE || purpose === PURPOSES.PASSWORD_CHANGE
  const isPasswordReset = purpose === PURPOSES.PASSWORD_RESET

  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken)
  const [expiresAt, setExpiresAt] = useState(initialChallenge?.expiresAt || null)
  const [resendAvailableAt, setResendAvailableAt] = useState(
    initialChallenge?.resendAvailableAt || null
  )
  const [now, setNow] = useState(Date.now())
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const resendRemainingMs = Math.max(0, Number(resendAvailableAt || 0) - now)
  const resendRemainingSeconds = Math.max(
    0,
    Math.ceil(resendRemainingMs / 1000)
  )
  const canResendCode = resendRemainingMs <= 0
  const codeExpiryLabel = formatVerificationExpiry(expiresAt)

  const resolvedHeader = useMemo(() => {
    const fallbackHeader = resolvePurposeHeader(purpose)

    return {
      title: header?.title || fallbackHeader.title,
      description: header?.description || fallbackHeader.description,
      label: header?.label || fallbackHeader.label,
    }
  }, [header?.description, header?.label, header?.title, purpose])

  const sendCode = useCallback(
    async ({ isInitial = false } = {}) => {
      if (isSending || isSubmitting) return

      if (
        purpose !== PURPOSES.PASSWORD_CHANGE &&
        (!email || !email.includes('@'))
      ) {
        toast.error('A valid email address is required')
        return
      }

      if (requiresAuthToken && !accessToken) {
        toast.error('Authentication token could not be resolved')
        return
      }

      if (!isInitial && !canResendCode) {
        toast.error(`Please wait ${resendRemainingSeconds}s before resending`)
        return
      }

      setIsSending(true)
      try {
        const challenge = await sendVerificationCodeRequest({
          accessToken: requiresAuthToken ? accessToken : '',
          email,
          purpose,
        })

        setChallengeToken(challenge.challengeToken)
        setExpiresAt(challenge.expiresAt)
        setResendAvailableAt(challenge.resendAvailableAt)
        setNow(Date.now())

        if (!isInitial) {
          toast.success('A new verification code has been sent')
        }
      } catch (error) {
        toast.error(
          resolveVerificationErrorMessage(
            error,
            'Verification code could not be sent'
          )
        )
      } finally {
        setIsSending(false)
      }
    },
    [
      accessToken,
      canResendCode,
      email,
      isSending,
      isSubmitting,
      purpose,
      requiresAuthToken,
      resendRemainingSeconds,
      toast,
    ]
  )

  useEffect(() => {
    if (!resendAvailableAt) return undefined

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [resendAvailableAt])

  useEffect(() => {
    if (autoSentRef.current) return
    autoSentRef.current = true

    if (!autoSendOnOpen || initialChallengeToken) {
      return
    }

    sendCode({ isInitial: true })
  }, [autoSendOnOpen, initialChallengeToken, sendCode])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || isSending) return

    if (!challengeToken) {
      toast.error('Verification session was not found. Request a new code')
      return
    }

    if (!/^\d{6}$/.test(String(code || '').trim())) {
      toast.error('Verification code must be 6 digits')
      return
    }

    setIsSubmitting(true)
    try {
      if (isPasswordReset) {
        const normalizedPassword = validatePassword(newPassword)

        if (normalizedPassword !== confirmPassword) {
          throw new Error('Password confirmation does not match')
        }

        await completePasswordResetWithCode({
          challengeToken,
          code,
          email,
          newPassword: normalizedPassword,
        })

        toast.success('Password reset completed successfully')
        close({
          success: true,
          purpose,
          email,
        })
        return
      }

      await verifyCodeRequest({
        accessToken: requiresAuthToken ? accessToken : '',
        challengeToken,
        code,
        email,
        purpose,
      })

      toast.success('Verification completed successfully')
      close({
        success: true,
        purpose,
        email,
      })
    } catch (error) {
      toast.error(
        resolveVerificationErrorMessage(error, 'Verification could not be completed')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="w-full sm:w-[460px]" header={resolvedHeader} close={close}>
      <form onSubmit={handleSubmit} className="space-y-4 p-2.5">
        <div className={MODAL_FIELD.infoBox}>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-white/50 uppercase">
            Verification Email
          </p>
          <p className="mt-1 break-all">{email || 'Unknown email'}</p>
          {codeExpiryLabel ? (
            <p className="mt-1 text-xs text-white/50">Code expires at {codeExpiryLabel}</p>
          ) : null}
        </div>

        <Input
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))
          }
          placeholder="Verification code"
          autoComplete="one-time-code"
          inputMode="numeric"
          className={{
            input: `${MODAL_FIELD.input} py-2 text-center font-semibold`,
          }}
        />

        {isPasswordReset ? (
          <>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className={{
                input: MODAL_FIELD.input,
              }}
            />
          </>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting || isSending}
          className={MODAL_BUTTON.primary}
        >
          {isSubmitting
            ? isPasswordReset
              ? 'Resetting password'
              : 'Verifying'
            : isPasswordReset
              ? 'Verify and reset password'
              : 'Verify code'}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => close({ success: false, cancelled: true, purpose, email })}
            disabled={isSubmitting || isSending}
            className={MODAL_BUTTON.secondary}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => sendCode({ isInitial: false })}
            disabled={isSubmitting || isSending || !canResendCode}
            className={MODAL_BUTTON.secondary}
          >
            {isSending
              ? 'Sending verification code'
              : canResendCode
                ? 'Resend verification code'
                : `Resend in ${resendRemainingSeconds}s`}
          </Button>
        </div>
      </form>
    </Container>
  )
}

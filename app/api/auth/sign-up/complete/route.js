import { NextResponse } from 'next/server'

import { isReservedAccountSegment } from '@/features/account/route-segments'
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server'
import { ensurePasswordAccountProfile } from '@/core/auth/servers/account/account-bootstrap.server'
import {
  EMAIL_ACCOUNT_STATES,
  resolveEmailAccountState,
} from '@/core/auth/servers/account/account-state.server'
import { validateStrongPassword } from '@/core/auth/servers/security/password-security.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server'
import { getRequestContext } from '@/core/auth/servers/session/request-context.server'
import { verifySignUpProofToken } from '@/core/auth/servers/verification/signup-proof.server'
import { createAdminAuthFacade } from '@/core/auth/servers/session/supabase-admin-auth.server'
import { createAdminClient } from '@/core/clients/supabase/admin'

const AUTH_CHALLENGE_TABLE = process.env.AUTH_CHALLENGE_TABLE || 'auth_challenges'
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 24
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/
const SIGNUP_CHALLENGE_SELECT = [
  'jti',
  'purpose',
  'signup_completed_at',
  'status',
  'used_at',
].join(',')

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function validateUsername(value) {
  const username = normalizeValue(value).toLowerCase()

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`
    )
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'Username can only contain lowercase letters, numbers, and hyphens'
    )
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved')
  }

  return username
}

function isUserAlreadyExistsError(error) {
  const message = normalizeValue(error?.message).toLowerCase()

  return (
    message.includes('already been registered') ||
    message.includes('user already registered') ||
    message.includes('duplicate') ||
    message.includes('already exists')
  )
}

function createConflictError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

function createStatusPayload({
  messageCode = 'SIGNUP_COMPLETED',
  recovered = false,
  userId = null,
}) {
  return {
    messageCode,
    ok: true,
    recovered,
    userId,
  }
}

async function enforceSignUpCompleteRateLimit({ email, requestContext }) {
  try {
    await enforceSlidingWindowRateLimit({
      namespace: 'auth:sign-up:complete',
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'email', value: email, limit: 6 },
        { id: 'ip', value: requestContext.ipAddress, limit: 24 },
        { id: 'device', value: requestContext.deviceId, limit: 12 },
      ],
      message: 'Too many sign-up attempts',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    if (error.dimension === 'email') {
      throw new Error('Too many sign-up attempts for this email')
    }

    if (error.dimension === 'device') {
      throw new Error('Too many sign-up attempts from this device')
    }

    throw new Error('Too many sign-up attempts from this network')
  }
}

async function assertSignUpChallenge({ challengeJti, challengeKey }) {
  const challengeResult = await createAdminClient()
    .from(AUTH_CHALLENGE_TABLE)
    .select(SIGNUP_CHALLENGE_SELECT)
    .eq('challenge_key', challengeKey)
    .maybeSingle()

  if (challengeResult.error) {
    throw new Error(challengeResult.error.message || 'Sign-up verification has expired')
  }

  const challenge = challengeResult.data || null

  if (!challenge) {
    throw new Error('Sign-up verification has expired')
  }

  if (
    normalizeValue(challenge?.purpose) !== 'sign-up' ||
    normalizeValue(challenge?.status) !== 'used' ||
    normalizeValue(challenge?.jti) !== normalizeValue(challengeJti) ||
    !challenge?.used_at
  ) {
    throw new Error('Sign-up verification is invalid')
  }

  if (challenge?.signup_completed_at) {
    throw new Error('Sign-up verification has already been used')
  }
}

async function markSignUpCompleted(challengeKey) {
  const now = new Date().toISOString()
  const updateResult = await createAdminClient()
    .from(AUTH_CHALLENGE_TABLE)
    .update({
      signup_completed_at: now,
      updated_at: now,
    })
    .eq('challenge_key', challengeKey)
    .is('signup_completed_at', null)

  if (updateResult.error) {
    if (
      normalizeValue(updateResult.error.message).includes('signup_completed_at')
    ) {
      return
    }

    throw new Error(updateResult.error.message || 'Sign-up challenge could not be updated')
  }
}

async function createOrRecoverPasswordUser({
  email,
  password,
  username,
  displayName,
}) {
  const adminAuth = createAdminAuthFacade()
  let accountState = await resolveEmailAccountState(email)
  const resolvedDisplayName = normalizeValue(displayName) || username
  const baseAppMetadata = {
    tvz_password_enabled: true,
  }
  const baseUserMetadata = {
    display_name: resolvedDisplayName,
    full_name: resolvedDisplayName,
    username,
  }

  if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_GOOGLE_ONLY) {
    throw createConflictError(
      'This email is already used by a Google-linked Tvizzie account. Continue with Google to sign in.',
      'SIGNUP_GOOGLE_ACCOUNT_EXISTS'
    )
  }

  if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT) {
    throw createConflictError(
      'This email address is already in use. Sign in instead.',
      'SIGNUP_EMAIL_IN_USE'
    )
  }

  let recovered = false
  let userRecord = null

  if (accountState.state === EMAIL_ACCOUNT_STATES.AVAILABLE) {
    try {
      userRecord = await adminAuth.createUser({
        appMetadata: baseAppMetadata,
        email,
        emailVerified: true,
        password,
        userMetadata: baseUserMetadata,
      })
    } catch (error) {
      if (!isUserAlreadyExistsError(error)) {
        throw error
      }

      accountState = await resolveEmailAccountState(email)
    }
  }

  if (!userRecord) {
    if (
      accountState.state !== EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN ||
      !accountState.userId
    ) {
      if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_GOOGLE_ONLY) {
        throw createConflictError(
          'This email is already used by a Google-linked Tvizzie account. Continue with Google to sign in.',
          'SIGNUP_GOOGLE_ACCOUNT_EXISTS'
        )
      }

      throw createConflictError(
        'This email address is already in use. Sign in instead.',
        'SIGNUP_EMAIL_IN_USE'
      )
    }

    recovered = true
    const existingUser = await adminAuth.getUser(accountState.userId)
    userRecord = await adminAuth.updateUser(accountState.userId, {
      appMetadata: {
        ...(existingUser?.app_metadata || {}),
        ...baseAppMetadata,
      },
      email,
      emailVerified: true,
      password,
      userMetadata: {
        ...(existingUser?.user_metadata || {}),
        ...baseUserMetadata,
      },
    })

    await adminAuth.revokeRefreshTokens(accountState.userId)
  }

  return {
    recovered,
    userId: userRecord?.uid || accountState.userId || null,
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let email = null
  let userId = null
  let recovered = false

  try {
    const body = await request.json().catch(() => ({}))
    const signUpProof = normalizeValue(body?.signUpProof)
    email = normalizeEmail(body?.email)
    const password = validateStrongPassword(body?.password)
    const username = validateUsername(body?.username)
    const displayName = normalizeValue(body?.displayName) || username

    if (!signUpProof || !email || !username) {
      return NextResponse.json(
        { error: 'signUpProof, email, password, and username are required' },
        { status: 400 }
      )
    }

    await enforceSignUpCompleteRateLimit({
      email,
      requestContext,
    })

    const proof = verifySignUpProofToken(signUpProof, { email })
    await assertSignUpChallenge({
      challengeJti: proof.challengeJti,
      challengeKey: proof.challengeKey,
    })

    const creationResult = await createOrRecoverPasswordUser({
      displayName,
      email,
      password,
      username,
    })

    userId = creationResult.userId
    recovered = creationResult.recovered

    await ensurePasswordAccountProfile({
      displayName,
      email,
      userId,
      username,
    })

    await markSignUpCompleted(proof.challengeKey)

    await writeAuthAuditLog({
      request,
      eventType: 'sign-up',
      status: 'success',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'sign-up-complete',
        challengeKey: proof.challengeKey,
        challengeJti: proof.challengeJti,
        recovered,
        source: 'api/auth/sign-up/complete',
        username,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] sign-up success log failed:', auditError)
    })

    return NextResponse.json(
      createStatusPayload({
        messageCode: recovered ? 'SIGNUP_RECOVERED' : 'SIGNUP_COMPLETED',
        recovered,
        userId,
      })
    )
  } catch (error) {
    const message = String(error?.message || 'Sign-up could not be completed')
    const status = message.includes('Too many')
      ? 429
      : message.includes('expired') ||
          message.includes('already been used') ||
          message.includes('verification is invalid') ||
          message.includes('required') ||
          message.includes('must contain') ||
          message.includes('at least') ||
          message.includes('characters long') ||
          message.includes('lowercase letters')
        ? 400
        : message.includes('already in use') ||
            message.includes('Continue with Google') ||
            message.includes('Sign in instead') ||
            message.includes('USERNAME_TAKEN')
          ? 409
          : 500

    await writeAuthAuditLog({
      request,
      eventType: 'sign-up',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'sign-up-complete',
        message,
        recovered,
        source: 'api/auth/sign-up/complete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] sign-up failure log failed:', auditError)
    })

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'sign-up-complete',
        message,
        recovered,
        source: 'api/auth/sign-up/complete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt sign-up log failed:', auditError)
    })

    return NextResponse.json(
      {
        code: error?.code || null,
        error: message.includes('USERNAME_TAKEN')
          ? 'This username is already taken'
          : message,
      },
      { status }
    )
  }
}

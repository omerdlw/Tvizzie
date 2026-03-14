import { NextResponse } from 'next/server'

import { writeAuthAuditLog } from '@/lib/auth/audit-log.server'
import { verifyEmailVerificationChallenge } from '@/lib/auth/email-verification.server'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from '@/lib/auth/firebase-admin.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/rate-limit.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

const USERS_COLLECTION = 'users'

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

async function assertPasswordResetTargetIntegrity({ adminDb, userRecord, email }) {
  const userId = String(userRecord?.uid || '').trim()

  if (!userId) {
    throw new Error('No account found with this email address')
  }

  const profileSnapshot = await adminDb.collection(USERS_COLLECTION).doc(userId).get()

  if (!profileSnapshot.exists) {
    throw new Error('No account found with this email address')
  }

  const profileData = profileSnapshot.data() || {}
  const profileEmail = normalizeEmail(profileData?.email)
  const profileId = String(profileData?.id || '').trim()

  if (
    profileEmail !== email ||
    (profileId && profileId !== userId)
  ) {
    throw new Error('No account found with this email address')
  }
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

function enforcePasswordResetCompleteRateLimit({ email, requestContext }) {
  try {
    enforceSlidingWindowRateLimit({
      namespace: 'auth:password-reset:complete',
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'email', value: email, limit: 6 },
        { id: 'ip', value: requestContext.ipAddress, limit: 24 },
        { id: 'device', value: requestContext.deviceId, limit: 12 },
      ],
      message: 'Too many password reset attempts',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    if (error.dimension === 'email') {
      throw new Error('Too many password reset attempts for this email')
    }

    if (error.dimension === 'device') {
      throw new Error('Too many password reset attempts from this device')
    }

    throw new Error('Too many password reset attempts from this network')
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let email = null
  let userId = null

  try {
    const body = await request.json()
    const challengeToken = String(body?.challengeToken || '').trim()
    const code = String(body?.code || '').trim()
    email = normalizeEmail(body?.email)
    const newPassword = validatePassword(body?.newPassword)

    if (!challengeToken || !code || !email) {
      return NextResponse.json(
        { error: 'challengeToken, code, email, and newPassword are required' },
        { status: 400 }
      )
    }

    enforcePasswordResetCompleteRateLimit({
      email,
      requestContext,
    })

    verifyEmailVerificationChallenge({
      challengeToken,
      code,
      email,
      purpose: 'password-reset',
    })

    const adminAuth = getFirebaseAdminAuth()
    const adminDb = getFirebaseAdminFirestore()
    const userRecord = await adminAuth.getUserByEmail(email)
    const providerIds = (userRecord?.providerData || [])
      .map((provider) => String(provider?.providerId || '').trim())
      .filter(Boolean)

    if (!providerIds.includes('password')) {
      throw new Error('No account found with this email address')
    }

    await assertPasswordResetTargetIntegrity({
      adminDb,
      userRecord,
      email,
    })

    userId = userRecord.uid

    await adminAuth.updateUser(userRecord.uid, {
      password: newPassword,
    })

    await adminAuth.revokeRefreshTokens(userRecord.uid)

    await writeAuthAuditLog({
      request,
      eventType: 'password-reset',
      status: 'success',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'password-reset-complete',
        source: 'api/auth/password-reset/complete',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-reset success log failed:', auditError)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = String(error?.message || 'Password reset could not be completed')
    const status =
      message.includes('Too many')
        ? 429
      : message.includes('required') ||
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('must be') ||
          message.includes('Unsupported verification purpose') ||
          message.includes('challenge')
        ? 400
      : message.includes('auth/user-not-found')
        ? 404
      : 500

    await writeAuthAuditLog({
      request,
      eventType: 'password-reset',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'password-reset-complete',
        message,
        source: 'api/auth/password-reset/complete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-reset failure log failed:', auditError)
    })

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'password-reset-complete',
        message,
        source: 'api/auth/password-reset/complete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt log failed:', auditError)
    })

    return NextResponse.json({ error: message }, { status })
  }
}

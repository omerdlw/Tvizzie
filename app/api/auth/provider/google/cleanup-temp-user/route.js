import { NextResponse } from 'next/server'

import { requireAuthenticatedRequest } from '@/lib/auth/authenticated-request.server'
import { writeAuthAuditLog } from '@/lib/auth/audit-log.server'
import { getFirebaseAdminFirestore } from '@/lib/auth/firebase-admin.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/rate-limit.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

const USERS_COLLECTION = 'users'
const GOOGLE_PROVIDER_ID = 'google.com'
const TEMP_USER_MAX_AGE_MS = 120 * 1000
const ALLOWED_REASONS = new Set([
  'google-email-mismatch',
  'google-email-unavailable',
  'google-gmail-required',
  'google-link-required',
  'missing-expected-email',
])

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function getProviderIds(userRecord) {
  return (userRecord?.providerData || [])
    .map((provider) => normalizeValue(provider?.providerId).toLowerCase())
    .filter(Boolean)
}

function isRecentUser(userRecord) {
  const createdAtMs = Date.parse(userRecord?.metadata?.creationTime || '')

  if (Number.isNaN(createdAtMs) || createdAtMs <= 0) {
    return false
  }

  return Date.now() - createdAtMs <= TEMP_USER_MAX_AGE_MS
}

async function hasProfileDocument(userId) {
  if (!userId) return false

  const db = getFirebaseAdminFirestore()
  const snapshot = await db.collection(USERS_COLLECTION).doc(userId).get()

  return snapshot.exists
}

function isReasonConsistent({ reason, expectedEmail, authEmail }) {
  if (!expectedEmail) {
    return false
  }

  if (reason === 'google-email-mismatch') {
    return expectedEmail !== authEmail
  }

  if (reason === 'google-link-required') {
    return expectedEmail === authEmail
  }

  if (reason === 'google-gmail-required') {
    return expectedEmail.endsWith('@gmail.com')
  }

  if (
    reason === 'google-email-unavailable' ||
    reason === 'missing-expected-email'
  ) {
    return true
  }

  return false
}

function enforceCleanupRateLimit({ userId, requestContext }) {
  try {
    enforceSlidingWindowRateLimit({
      namespace: 'auth:google-cleanup-temp-user',
      windowMs: 10 * 60 * 1000,
      dimensions: [
        { id: 'user', value: userId, limit: 8 },
        { id: 'ip', value: requestContext.ipAddress, limit: 20 },
        { id: 'device', value: requestContext.deviceId, limit: 12 },
      ],
      message: 'Too many Google cleanup attempts',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    throw new Error('Too many Google cleanup attempts. Please try again later')
  }
}

function skipPayload(reason) {
  return {
    deleted: false,
    reason,
    skipped: true,
    success: true,
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let reason = null
  let expectedEmail = null
  let userId = null
  let authEmail = null

  try {
    const body = await request.json().catch(() => ({}))
    reason = normalizeValue(body?.reason).toLowerCase()
    expectedEmail = normalizeEmail(body?.expectedEmail)

    if (!ALLOWED_REASONS.has(reason)) {
      return NextResponse.json(
        {
          error: 'Unsupported cleanup reason',
        },
        { status: 400 }
      )
    }

    const authContext = await requireAuthenticatedRequest(request)
    userId = authContext.userId
    authEmail = normalizeEmail(authContext.email)

    enforceCleanupRateLimit({
      userId,
      requestContext,
    })

    if (!isReasonConsistent({ reason, expectedEmail, authEmail })) {
      const payload = skipPayload('reason-not-consistent')

      await writeAuthAuditLog({
        request,
        eventType: 'cleanup-temp-user',
        status: 'success',
        userId,
        email: authEmail,
        provider: 'google',
        metadata: {
          action: 'google-cleanup-temp-user',
          expectedEmail,
          reason,
          result: payload.reason,
          source: 'api/auth/provider/google/cleanup-temp-user',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    const providerIds = getProviderIds(authContext.userRecord)
    if (providerIds.length !== 1 || providerIds[0] !== GOOGLE_PROVIDER_ID) {
      const payload = skipPayload('not-google-only-user')

      await writeAuthAuditLog({
        request,
        eventType: 'cleanup-temp-user',
        status: 'success',
        userId,
        email: authEmail,
        provider: 'google',
        metadata: {
          action: 'google-cleanup-temp-user',
          expectedEmail,
          reason,
          result: payload.reason,
          source: 'api/auth/provider/google/cleanup-temp-user',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    if (!isRecentUser(authContext.userRecord)) {
      const payload = skipPayload('user-too-old')

      await writeAuthAuditLog({
        request,
        eventType: 'cleanup-temp-user',
        status: 'success',
        userId,
        email: authEmail,
        provider: 'google',
        metadata: {
          action: 'google-cleanup-temp-user',
          expectedEmail,
          reason,
          result: payload.reason,
          source: 'api/auth/provider/google/cleanup-temp-user',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    if (await hasProfileDocument(userId)) {
      const payload = skipPayload('profile-exists')

      await writeAuthAuditLog({
        request,
        eventType: 'cleanup-temp-user',
        status: 'success',
        userId,
        email: authEmail,
        provider: 'google',
        metadata: {
          action: 'google-cleanup-temp-user',
          expectedEmail,
          reason,
          result: payload.reason,
          source: 'api/auth/provider/google/cleanup-temp-user',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    await authContext.adminAuth.deleteUser(userId)

    await writeAuthAuditLog({
      request,
      eventType: 'cleanup-temp-user',
      status: 'success',
      userId,
      email: authEmail,
      provider: 'google',
      metadata: {
        action: 'google-cleanup-temp-user',
        expectedEmail,
        reason,
        result: 'deleted',
        source: 'api/auth/provider/google/cleanup-temp-user',
      },
    }).catch(() => null)

    return NextResponse.json({
      deleted: true,
      success: true,
    })
  } catch (error) {
    const message = normalizeValue(error?.message) || 'Google cleanup failed'
    const status = message.includes('Authorization token is required') ||
      message.includes('Invalid or expired authentication token') ||
      message.includes('Authentication token has been revoked')
      ? 401
      : message.includes('Too many')
        ? 429
        : 500

    await writeAuthAuditLog({
      request,
      eventType: 'cleanup-temp-user',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: authEmail || expectedEmail,
      provider: 'google',
      metadata: {
        action: 'google-cleanup-temp-user',
        expectedEmail,
        message,
        reason,
        source: 'api/auth/provider/google/cleanup-temp-user',
      },
    }).catch(() => null)

    return NextResponse.json({ error: message }, { status })
  }
}

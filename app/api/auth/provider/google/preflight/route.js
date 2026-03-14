import { NextResponse } from 'next/server'

import { writeAuthAuditLog } from '@/lib/auth/audit-log.server'
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/auth/firebase-admin.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/rate-limit.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

const USERS_COLLECTION = 'users'
const GOOGLE_PROVIDER_ID = 'google.com'
const PASSWORD_PROVIDER_ID = 'password'

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function isGmailEmail(value) {
  return normalizeEmail(value).endsWith('@gmail.com')
}

function getProviderIds(userRecord) {
  return (userRecord?.providerData || [])
    .map((provider) => String(provider?.providerId || '').trim().toLowerCase())
    .filter(Boolean)
}

function enforcePreflightRateLimit({ requestContext, email }) {
  try {
    enforceSlidingWindowRateLimit({
      namespace: 'auth:google-preflight',
      windowMs: 10 * 60 * 1000,
      dimensions: [
        { id: 'ip', value: requestContext.ipAddress, limit: 60 },
        { id: 'device', value: requestContext.deviceId, limit: 40 },
        { id: 'email', value: email, limit: 25 },
      ],
      message: 'Too many Google sign-in checks',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    throw new Error('Too many Google sign-in checks. Please try again later')
  }
}

function toBlockedPayload({ email, reason, message }) {
  return {
    allowed: false,
    email,
    message,
    reason,
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let email = null
  let userId = null

  try {
    const body = await request.json().catch(() => ({}))
    email = normalizeEmail(body?.email)

    if (!isGmailEmail(email)) {
      const payload = toBlockedPayload({
        email,
        reason: 'gmail-required',
        message: 'Google sign-in is available only for gmail.com accounts',
      })

      await writeAuthAuditLog({
        request,
        eventType: 'google-preflight',
        status: 'blocked',
        email,
        provider: 'google',
        metadata: {
          action: 'google-preflight',
          reason: payload.reason,
          source: 'api/auth/provider/google/preflight',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    enforcePreflightRateLimit({
      requestContext,
      email,
    })

    const adminAuth = getFirebaseAdminAuth()
    const adminDb = getFirebaseAdminFirestore()

    let userRecord = null
    try {
      userRecord = await adminAuth.getUserByEmail(email)
    } catch (error) {
      if (String(error?.code || '').trim() === 'auth/user-not-found') {
        const payload = toBlockedPayload({
          email,
          reason: 'not-found',
          message: 'No account found. Please sign up first',
        })

        await writeAuthAuditLog({
          request,
          eventType: 'google-preflight',
          status: 'blocked',
          email,
          provider: 'google',
          metadata: {
            action: 'google-preflight',
            reason: payload.reason,
            source: 'api/auth/provider/google/preflight',
          },
        }).catch(() => null)

        return NextResponse.json(payload)
      }

      throw error
    }

    userId = String(userRecord?.uid || '').trim()
    const providerIds = getProviderIds(userRecord)

    if (!providerIds.includes(GOOGLE_PROVIDER_ID)) {
      const payload = toBlockedPayload({
        email,
        reason: 'google-not-linked',
        message: 'Link Google from profile settings first',
      })

      await writeAuthAuditLog({
        request,
        eventType: 'google-preflight',
        status: 'blocked',
        userId,
        email,
        provider: 'google',
        metadata: {
          action: 'google-preflight',
          reason: payload.reason,
          source: 'api/auth/provider/google/preflight',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    if (!providerIds.includes(PASSWORD_PROVIDER_ID)) {
      const payload = toBlockedPayload({
        email,
        reason: 'password-not-linked',
        message: 'This account does not have email/password sign-in enabled',
      })

      await writeAuthAuditLog({
        request,
        eventType: 'google-preflight',
        status: 'blocked',
        userId,
        email,
        provider: 'google',
        metadata: {
          action: 'google-preflight',
          reason: payload.reason,
          source: 'api/auth/provider/google/preflight',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    const profileSnapshot = await adminDb.collection(USERS_COLLECTION).doc(userId).get()
    const profileData = profileSnapshot.exists ? profileSnapshot.data() || {} : null
    const profileEmail = normalizeEmail(profileData?.email)
    const profileUserId = String(profileData?.id || '').trim()

    if (
      !profileSnapshot.exists ||
      profileEmail !== email ||
      (profileUserId && profileUserId !== userId)
    ) {
      const payload = toBlockedPayload({
        email,
        reason: 'profile-mismatch',
        message: 'Account integrity check failed. Please contact support',
      })

      await writeAuthAuditLog({
        request,
        eventType: 'google-preflight',
        status: 'blocked',
        userId,
        email,
        provider: 'google',
        metadata: {
          action: 'google-preflight',
          reason: payload.reason,
          source: 'api/auth/provider/google/preflight',
        },
      }).catch(() => null)

      return NextResponse.json(payload)
    }

    await writeAuthAuditLog({
      request,
      eventType: 'google-preflight',
      status: 'success',
      userId,
      email,
      provider: 'google',
      metadata: {
        action: 'google-preflight',
        source: 'api/auth/provider/google/preflight',
      },
    }).catch(() => null)

    return NextResponse.json({
      allowed: true,
      email,
      uid: userId,
    })
  } catch (error) {
    const message = String(error?.message || 'Google sign-in check failed')
    const status = message.includes('Too many') ? 429 : 500

    await writeAuthAuditLog({
      request,
      eventType: 'google-preflight',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'google',
      metadata: {
        action: 'google-preflight',
        message,
        source: 'api/auth/provider/google/preflight',
      },
    }).catch(() => null)

    return NextResponse.json(
      {
        allowed: false,
        email,
        error: message,
        message,
        reason: 'internal-error',
      },
      { status }
    )
  }
}

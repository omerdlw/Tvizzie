import { NextResponse } from 'next/server'

import { requireAuthenticatedRequest } from '@/lib/auth/authenticated-request.server'
import { writeAuthAuditLog } from '@/lib/auth/audit-log.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/rate-limit.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

const FRESH_AUTH_WINDOW_MS = 5 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function isGmailEmail(value) {
  return normalizeEmail(value).endsWith('@gmail.com')
}

function enforceEmailChangeRateLimit({ userId, requestContext }) {
  try {
    enforceSlidingWindowRateLimit({
      namespace: 'auth:email-change:complete',
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'user', value: userId, limit: 8 },
        { id: 'ip', value: requestContext.ipAddress, limit: 20 },
        { id: 'device', value: requestContext.deviceId, limit: 12 },
      ],
      message: 'Too many email change attempts',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    if (error.dimension === 'user') {
      throw new Error('Too many email change attempts for this account')
    }

    if (error.dimension === 'device') {
      throw new Error('Too many email change attempts from this device')
    }

    throw new Error('Too many email change attempts from this network')
  }
}

async function assertEmailAvailable(adminAuth, email) {
  try {
    const existingUser = await adminAuth.getUserByEmail(email)

    if (existingUser?.uid) {
      throw new Error('This email address is already in use')
    }
  } catch (error) {
    if (String(error?.code || '').trim() === 'auth/user-not-found') {
      return
    }

    throw error
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let userId = null
  let previousEmail = null
  let nextEmail = null

  try {
    const body = await request.json().catch(() => ({}))
    nextEmail = normalizeEmail(body?.newEmail)

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      return NextResponse.json(
        { error: 'newEmail must be a valid email address' },
        { status: 400 }
      )
    }

    const authContext = await requireAuthenticatedRequest(request, {
      requireRecentAuthMs: FRESH_AUTH_WINDOW_MS,
    })

    userId = authContext.userId
    previousEmail = normalizeEmail(authContext.email)

    if (nextEmail === previousEmail) {
      return NextResponse.json(
        { error: 'New email must be different from current email' },
        { status: 400 }
      )
    }

    enforceEmailChangeRateLimit({
      userId,
      requestContext,
    })

    await assertEmailAvailable(authContext.adminAuth, nextEmail)

    const existingUserRecord = await authContext.adminAuth.getUser(userId)
    const hasGoogleProvider = (existingUserRecord?.providerData || []).some(
      (provider) => provider?.providerId === 'google.com'
    )

    const updatePayload = {
      email: nextEmail,
      emailVerified: true,
    }

    if (!isGmailEmail(nextEmail) && hasGoogleProvider) {
      updatePayload.providersToUnlink = ['google.com']
    }

    await authContext.adminAuth.updateUser(userId, updatePayload)

    await writeAuthAuditLog({
      request,
      eventType: 'email-change',
      status: 'success',
      userId,
      email: nextEmail,
      provider: 'password',
      metadata: {
        action: 'email-change-complete',
        previousEmail,
        source: 'api/auth/account/change-email',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] email-change success log failed:', auditError)
    })

    return NextResponse.json({
      success: true,
      email: nextEmail,
    })
  } catch (error) {
    const message = String(error?.message || 'Email could not be changed')
    const status = message.includes('Too many')
      ? 429
      : message.includes('Authorization token is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked') ||
          message.includes('Recent authentication is required')
        ? 401
      : message.includes('already in use')
        ? 409
      : message.includes('required') ||
          message.includes('valid email') ||
          message.includes('different from current')
        ? 400
      : 500

    await writeAuthAuditLog({
      request,
      eventType: 'email-change',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: nextEmail || previousEmail,
      provider: 'password',
      metadata: {
        action: 'email-change-complete',
        message,
        source: 'api/auth/account/change-email',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] email-change failure log failed:', auditError)
    })

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: nextEmail || previousEmail,
      provider: 'password',
      metadata: {
        action: 'email-change-complete',
        message,
        source: 'api/auth/account/change-email',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt email-change log failed:', auditError)
    })

    return NextResponse.json({ error: message }, { status })
  }
}

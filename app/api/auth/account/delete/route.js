import { NextResponse } from 'next/server'

import {
  assertPasswordProviderLinked,
  purgeAccountData,
} from '@/lib/auth/account-deletion.server'
import { requireAuthenticatedRequest } from '@/lib/auth/authenticated-request.server'
import { writeAuthAuditLog } from '@/lib/auth/audit-log.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/rate-limit.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

const FRESH_AUTH_WINDOW_MS = 5 * 60 * 1000

function resolveFirebaseApiKey() {
  return (
    String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim() ||
    String(process.env.FIREBASE_API_KEY || '').trim()
  )
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizePassword(value) {
  return String(value || '')
}

function resolveDeleteErrorMessage(error) {
  const rawMessage = String(error?.message || '').trim()
  const errorCode = String(error?.code || '').trim()

  if (
    rawMessage.includes('FAILED_PRECONDITION') ||
    errorCode === '9' ||
    errorCode === 'failed-precondition'
  ) {
    return 'Account deletion is temporarily unavailable. Please try again'
  }

  return rawMessage || 'Account could not be deleted'
}

function enforceDeleteRateLimit({ userId, requestContext }) {
  try {
    enforceSlidingWindowRateLimit({
      namespace: 'auth:account-delete',
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'user', value: userId, limit: 4 },
        { id: 'ip', value: requestContext.ipAddress, limit: 10 },
        { id: 'device', value: requestContext.deviceId, limit: 6 },
      ],
      message: 'Too many account deletion attempts',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    if (error.dimension === 'user') {
      throw new Error('Too many account deletion attempts for this account')
    }

    if (error.dimension === 'device') {
      throw new Error('Too many account deletion attempts from this device')
    }

    throw new Error('Too many account deletion attempts from this network')
  }
}

async function verifyCurrentPassword({ email, password }) {
  const apiKey = resolveFirebaseApiKey()

  if (!apiKey) {
    throw new Error('Firebase API key is missing on the server')
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: false,
      }),
    }
  )

  if (response.ok) {
    return
  }

  const payload = await response.json().catch(() => null)
  const firebaseMessage = String(payload?.error?.message || '').trim()

  if (
    firebaseMessage.includes('INVALID_PASSWORD') ||
    firebaseMessage.includes('MISSING_PASSWORD')
  ) {
    throw new Error('Current password is incorrect')
  }

  if (firebaseMessage.includes('USER_DISABLED')) {
    throw new Error('This account has been disabled')
  }

  throw new Error('Current password could not be verified')
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let userId = null
  let email = null

  try {
    const body = await request.json().catch(() => ({}))
    const currentPassword = normalizePassword(body?.currentPassword)

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'currentPassword is required' },
        { status: 400 }
      )
    }

    const authContext = await requireAuthenticatedRequest(request, {
      requireRecentAuthMs: FRESH_AUTH_WINDOW_MS,
    })

    userId = authContext.userId
    email = normalizeEmail(authContext.email)

    enforceDeleteRateLimit({
      userId,
      requestContext,
    })

    assertPasswordProviderLinked(authContext.userRecord)

    await verifyCurrentPassword({
      email,
      password: currentPassword,
    })

    await purgeAccountData({
      userId,
    })

    await authContext.adminAuth.deleteUser(userId)

    await writeAuthAuditLog({
      request,
      eventType: 'delete-account',
      status: 'success',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'account-delete',
        source: 'api/auth/account/delete',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] account-delete success log failed:', auditError)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = resolveDeleteErrorMessage(error)
    const status = message.includes('Too many')
      ? 429
      : message.includes('Authorization token is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked') ||
          message.includes('Recent authentication is required')
        ? 401
      : message.includes('required') ||
          message.includes('incorrect') ||
          message.includes('disabled') ||
          message.includes('email/password sign-in enabled')
        ? 400
      : 500

    await writeAuthAuditLog({
      request,
      eventType: 'delete-account',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'account-delete',
        message,
        source: 'api/auth/account/delete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] account-delete failure log failed:', auditError)
    })

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'account-delete',
        message,
        source: 'api/auth/account/delete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt account-delete log failed:', auditError)
    })

    return NextResponse.json({ error: message }, { status })
  }
}

import { NextResponse } from 'next/server'

import {
  assertPasswordProviderLinked,
  hasPasswordProvider,
  purgeAccountData,
} from '@/lib/auth/servers/account/account-deletion.server'
import { writeAuthAuditLog } from '@/lib/auth/servers/audit/audit-log.server'
import { requireSessionRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { assertCsrfRequest } from '@/lib/auth/servers/security/csrf.server'
import { verifyPasswordWithIdentityToolkit } from '@/lib/auth/servers/security/password-security.server'
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/servers/security/rate-limit.server'
import { getRequestContext } from '@/lib/auth/servers/session/request-context.server'
import { clearAuthCookies } from '@/lib/auth/servers/session/session.server'
import { assertStepUp, clearStepUpCookie } from '@/lib/auth/servers/security/step-up.server'

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

async function enforceDeleteRateLimit({ userId, requestContext }) {
  try {
    await enforceSlidingWindowRateLimit({
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

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let userId = null
  let email = null
  let challengeJti = null
  let sessionJti = null
  let auditProvider = 'password'

  try {
    const body = await request.json().catch(() => ({}))
    const currentPassword = normalizePassword(body?.currentPassword)

    assertCsrfRequest(request)

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    })

    userId = authContext.userId
    sessionJti = authContext.sessionJti || null
    email = normalizeEmail(authContext.email)
    const passwordLinked = hasPasswordProvider(authContext.userRecord)
    auditProvider = passwordLinked ? 'password' : 'google'
    const stepUp = assertStepUp(request, {
      purpose: 'account-delete',
      userId,
    })
    challengeJti = stepUp?.challengeJti || null

    await enforceDeleteRateLimit({
      userId,
      requestContext,
    })

    if (passwordLinked) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'currentPassword is required' },
          { status: 400 }
        )
      }

      assertPasswordProviderLinked(authContext.userRecord)

      await verifyPasswordWithIdentityToolkit({
        email,
        password: currentPassword,
      })
    }

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
      provider: auditProvider,
      metadata: {
        action: 'account-delete',
        challengeJti,
        sessionJti,
        source: 'api/auth/account/delete',
      },
    }).catch((auditError) => {
      console.error(
        '[AuthAudit] account-delete success log failed:',
        auditError
      )
    })

    const response = NextResponse.json({
      ok: true,
      nextAction: 'signed_out',
      messageCode: 'ACCOUNT_DELETED',
    })
    clearAuthCookies(response, request)
    clearStepUpCookie(response)
    return response
  } catch (error) {
    const message = resolveDeleteErrorMessage(error)
    const status = message.includes('Too many')
      ? 429
      : message.includes('Invalid CSRF token')
        ? 403
        : message.includes('Authentication session is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked') ||
          message.includes('Recent authentication is required')
        ? 401
        : message.includes('required') ||
            message.includes('invalid') ||
            message.includes('incorrect') ||
            message.includes('verification') ||
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
      provider: auditProvider,
      metadata: {
        action: 'account-delete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: 'api/auth/account/delete',
        status,
        stepUpPurpose: 'account-delete',
      },
    }).catch((auditError) => {
      console.error(
        '[AuthAudit] account-delete failure log failed:',
        auditError
      )
    })

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: auditProvider,
      metadata: {
        action: 'account-delete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: 'api/auth/account/delete',
        status,
        stepUpPurpose: 'account-delete',
      },
    }).catch((auditError) => {
      console.error(
        '[AuthAudit] failed-attempt account-delete log failed:',
        auditError
      )
    })

    return NextResponse.json({ error: message }, { status })
  }
}

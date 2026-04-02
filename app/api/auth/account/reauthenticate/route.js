import { NextResponse } from 'next/server'

import { assertPasswordProviderLinked } from '@/lib/auth/servers/account/account-deletion.server'
import { requireSessionRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { assertCsrfRequest } from '@/lib/auth/servers/security/csrf.server'
import { verifyPasswordWithIdentityToolkit } from '@/lib/auth/servers/security/password-security.server'
import {
  createRecentReauthToken,
  setRecentReauthCookie,
} from '@/lib/auth/servers/security/recent-reauth.server'

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizePassword(value) {
  return String(value || '')
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const currentPassword = normalizePassword(body?.currentPassword)

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'currentPassword is required' },
        { status: 400 }
      )
    }

    assertCsrfRequest(request)

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    })

    assertPasswordProviderLinked(authContext.userRecord)

    await verifyPasswordWithIdentityToolkit({
      email: normalizeEmail(authContext.email),
      password: currentPassword,
    })

    const response = NextResponse.json({
      ok: true,
      verifiedAt: new Date().toISOString(),
    })

    setRecentReauthCookie(
      response,
      createRecentReauthToken({
        email: authContext.email,
        sessionJti: authContext.sessionJti,
        userId: authContext.userId,
      })
    )

    return response
  } catch (error) {
    const message = String(error?.message || 'Reauthentication failed')
    const status = message.includes('Invalid CSRF token')
      ? 403
      : message.includes('Authentication session is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked')
        ? 401
        : message.includes('required') ||
            message.includes('incorrect') ||
            message.includes('disabled') ||
            message.includes('email/password sign-in enabled')
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}

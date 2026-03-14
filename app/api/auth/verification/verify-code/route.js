import { NextResponse } from 'next/server'

import { requireAuthenticatedRequest } from '@/lib/auth/authenticated-request.server'
import { verifyEmailVerificationChallenge } from '@/lib/auth/email-verification.server'

const PURPOSES = {
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
}

export async function POST(request) {
  try {
    const body = await request.json()
    const challengeToken = String(body?.challengeToken || '').trim()
    const code = String(body?.code || '').trim()
    const email = String(body?.email || '')
      .trim()
      .toLowerCase()
    const purpose = String(body?.purpose || 'sign-up')
      .trim()
      .toLowerCase()
    let userId = null
    let verificationEmail = email

    const emailRequired = purpose !== PURPOSES.PASSWORD_CHANGE

    if (!challengeToken || !code || (emailRequired && !email)) {
      return NextResponse.json(
        { error: 'challengeToken, email, and code are required' },
        { status: 400 }
      )
    }

    if (
      purpose === PURPOSES.PASSWORD_CHANGE ||
      purpose === PURPOSES.EMAIL_CHANGE
    ) {
      const authContext = await requireAuthenticatedRequest(request)
      userId = authContext.userId

      if (purpose === PURPOSES.PASSWORD_CHANGE) {
        verificationEmail = authContext.email
      }
    }

    const result = verifyEmailVerificationChallenge({
      challengeToken,
      code,
      email: verificationEmail,
      purpose,
      userId,
    })

    return NextResponse.json({
      success: true,
      verifiedAt: result.verifiedAt,
    })
  } catch (error) {
    const message = String(error?.message || 'Verification failed')
    const status = message.includes('Too many')
      ? 429
      : message.includes('Authorization token is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked')
        ? 401
      : message.includes('required') ||
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('not found') ||
          message.includes('Unsupported verification purpose') ||
          message.includes('exhausted') ||
          message.includes('match') ||
          message.includes('already been used')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}

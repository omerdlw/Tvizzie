import { NextResponse } from 'next/server'

import { verifyEmailVerificationChallenge } from '@/lib/auth/email-verification.server'

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

    if (!challengeToken || !code || !email) {
      return NextResponse.json(
        { error: 'challengeToken, email, and code are required' },
        { status: 400 }
      )
    }

    const result = verifyEmailVerificationChallenge({
      challengeToken,
      code,
      email,
      purpose,
    })

    return NextResponse.json({
      success: true,
      verifiedAt: result.verifiedAt,
    })
  } catch (error) {
    const message = String(error?.message || 'Verification failed')
    const status = message.includes('Too many')
      ? 429
      : message.includes('required') ||
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('not found') ||
          message.includes('exhausted') ||
          message.includes('match') ||
          message.includes('already been used')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}

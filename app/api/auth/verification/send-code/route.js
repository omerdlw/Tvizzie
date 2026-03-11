import { NextResponse } from 'next/server'

import { sendSignUpVerificationCode } from '@/lib/auth/email-sender.server'
import { createEmailVerificationChallenge } from '@/lib/auth/email-verification.server'

const EMAIL_DOMAIN_PATTERNS = [
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^tempmail\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
]

function getIpAddress(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') || ''
}

function validateAllowedEmailDomain(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  const [localPart, domain] = email.split('@')

  if (!localPart || !domain) {
    throw new Error('Enter a valid email address.')
  }

  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(domain)
  )

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, tempmail, protonmail, icloud.'
    )
  }

  return email
}

export async function POST(request) {
  try {
    const body = await request.json()
    const email = validateAllowedEmailDomain(body?.email)
    const purpose = String(body?.purpose || 'sign-up')
      .trim()
      .toLowerCase()

    const challenge = createEmailVerificationChallenge({
      email,
      purpose,
      ipAddress: getIpAddress(request),
    })

    await sendSignUpVerificationCode({
      email,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
    })

    return NextResponse.json({
      challengeToken: challenge.challengeToken,
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    })
  } catch (error) {
    const message = String(error?.message || 'Could not send verification code')
    const rateLimitError =
      message.includes('Too many') || message.includes('Please wait')
    const status = rateLimitError
      ? 429
      : message.includes('required') ||
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('supported email domains') ||
          message.includes('Enter a valid email address')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}

import { NextResponse } from 'next/server'

import { requireAuthenticatedRequest } from '@/lib/auth/authenticated-request.server'
import { sendVerificationCodeEmail } from '@/lib/auth/email-sender.server'
import { writeAuthAuditLog } from '@/lib/auth/audit-log.server'
import { createEmailVerificationChallenge } from '@/lib/auth/email-verification.server'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from '@/lib/auth/firebase-admin.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

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
const PURPOSES = {
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_RESET: 'password-reset',
  SIGN_UP: 'sign-up',
}
const FRESH_AUTH_WINDOW_MS = 5 * 60 * 1000
const USERS_COLLECTION = 'users'

function validateAllowedEmailDomain(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  const [localPart, domain] = email.split('@')

  if (!localPart || !domain) {
    throw new Error('Enter a valid email address')
  }

  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(domain)
  )

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, tempmail, protonmail, icloud'
    )
  }

  return email
}

async function assertPasswordResetEligibility(email) {
  try {
    const adminAuth = getFirebaseAdminAuth()
    const adminDb = getFirebaseAdminFirestore()
    const userRecord = await adminAuth.getUserByEmail(email)
    const providerIds = (userRecord?.providerData || [])
      .map((provider) => String(provider?.providerId || '').trim())
      .filter(Boolean)

    if (!providerIds.includes('password')) {
      throw new Error('This account does not have email/password sign-in enabled')
    }

    const userId = String(userRecord?.uid || '').trim()

    if (!userId) {
      throw new Error('No account found with this email address')
    }

    const profileSnapshot = await adminDb.collection(USERS_COLLECTION).doc(userId).get()

    if (!profileSnapshot.exists) {
      throw new Error('No account found with this email address')
    }

    const profileData = profileSnapshot.data() || {}
    const profileEmail = String(profileData?.email || '')
      .trim()
      .toLowerCase()
    const profileId = String(profileData?.id || '').trim()

    if (
      profileEmail !== email ||
      (profileId && profileId !== userId)
    ) {
      throw new Error('No account found with this email address')
    }
  } catch (error) {
    if (String(error?.code || '').trim() === 'auth/user-not-found') {
      throw new Error('No account found with this email address')
    }

    throw error
  }
}

async function assertSignUpEligibility(email) {
  try {
    const adminAuth = getFirebaseAdminAuth()
    await adminAuth.getUserByEmail(email)
    throw new Error('This email address is already in use')
  } catch (error) {
    if (String(error?.code || '').trim() === 'auth/user-not-found') {
      return
    }

    throw error
  }
}

function hasPasswordProvider(userRecord) {
  const providerIds = (userRecord?.providerData || [])
    .map((provider) => String(provider?.providerId || '').trim())
    .filter(Boolean)

  return providerIds.includes('password')
}

export async function POST(request) {
  const requestContext = getRequestContext(request)
  let email = null
  let purpose = 'sign-up'
  let userId = null

  try {
    const body = await request.json()
    purpose = String(body?.purpose || 'sign-up')
      .trim()
      .toLowerCase()

    if (
      purpose === PURPOSES.PASSWORD_CHANGE ||
      purpose === PURPOSES.EMAIL_CHANGE
    ) {
      const authContext = await requireAuthenticatedRequest(request, {
        requireRecentAuthMs: FRESH_AUTH_WINDOW_MS,
      })

      userId = authContext.userId

      if (!hasPasswordProvider(authContext.userRecord)) {
        throw new Error(
          'This account does not have email/password sign-in enabled'
        )
      }

      if (purpose === PURPOSES.PASSWORD_CHANGE) {
        email = authContext.email
      } else {
        email = validateAllowedEmailDomain(body?.email)

        if (email === authContext.email) {
          throw new Error('New email must be different from current email')
        }

        await assertSignUpEligibility(email)
      }
    } else {
      email = validateAllowedEmailDomain(body?.email)

      if (purpose === PURPOSES.PASSWORD_RESET) {
        await assertPasswordResetEligibility(email)
      }

      if (purpose === PURPOSES.SIGN_UP) {
        await assertSignUpEligibility(email)
      }
    }

    const challenge = createEmailVerificationChallenge({
      email,
      purpose,
      userId,
      ipAddress: requestContext.ipAddress,
      deviceId: requestContext.deviceId,
    })

    await sendVerificationCodeEmail({
      email,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      purpose,
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
    const providerConfigError =
      message.includes('SMTP configuration is incomplete') ||
      message.includes('Brevo SMTP configuration is incomplete')
    const providerAuthError = message.includes(
      'Email provider authentication failed'
    )
    const status = rateLimitError
      ? 429
      : providerConfigError || providerAuthError
        ? 502
      : message.includes('already in use')
        ? 409
      : message.includes('Authorization token is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked') ||
          message.includes('Recent authentication is required')
        ? 401
      : message.includes('required') ||
          message.includes('invalid') ||
          message.includes('not found') ||
          message.includes('expired') ||
          message.includes('must be') ||
          message.includes('Unsupported verification purpose') ||
          message.includes('email/password sign-in enabled') ||
          message.includes('supported email domains') ||
          message.includes('Enter a valid email address')
        ? 400
        : 500

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      email,
      provider: 'password',
      metadata: {
        action: 'verification-send-code',
        message,
        purpose,
        status,
        source: 'api/auth/verification/send-code',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] send-code failed-attempt log failed:', auditError)
    })

    return NextResponse.json({ error: message }, { status })
  }
}

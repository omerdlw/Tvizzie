import { createHmac, timingSafeEqual } from 'crypto'

import {
  AUTH_COOKIE_PATH,
  getCookieValue,
  isSecureCookieEnvironment,
} from '@/core/auth/servers/session/session.server'

export const RECENT_REAUTH_COOKIE_NAME = 'tvz_recent_reauth'
export const RECENT_REAUTH_MAX_AGE_MS = 5 * 60 * 1000
const RECENT_REAUTH_MAX_AGE_SECONDS = RECENT_REAUTH_MAX_AGE_MS / 1000

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function getSecret() {
  const secret =
    normalizeValue(process.env.RECENT_REAUTH_SECRET) ||
    normalizeValue(process.env.STEP_UP_SECRET) ||
    normalizeValue(process.env.EMAIL_VERIFICATION_SECRET)

  if (!secret) {
    throw new Error(
      'RECENT_REAUTH_SECRET is missing on the server and no fallback secret is available'
    )
  }

  return secret
}

function signPayload(encodedPayload) {
  return createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
}

export function createRecentReauthToken({
  email = null,
  expiresAt = Date.now() + RECENT_REAUTH_MAX_AGE_MS,
  sessionJti = null,
  userId,
}) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('Recent reauthentication requires a userId')
  }

  const payload = {
    email: normalizeEmail(email) || null,
    exp: Math.floor(Number(expiresAt) / 1000),
    sessionJti: normalizeValue(sessionJti) || null,
    userId: normalizedUserId,
  }

  const encodedPayload = encodePayload(payload)
  return `${encodedPayload}.${signPayload(encodedPayload)}`
}

export function verifyRecentReauthToken(token) {
  const normalizedToken = normalizeValue(token)
  const [encodedPayload, signature] = normalizedToken.split('.')

  if (!encodedPayload || !signature) {
    throw new Error('Recent authentication is required')
  }

  const expectedSignature = signPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(signature)

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error('Recent authentication is required')
  }

  let payload = null

  try {
    payload = decodePayload(encodedPayload)
  } catch {
    throw new Error('Recent authentication is required')
  }

  const expiresAtMs = Number(payload?.exp) * 1000

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Recent authentication is required')
  }

  return {
    email: normalizeEmail(payload?.email) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
    sessionJti: normalizeValue(payload?.sessionJti) || null,
    userId: normalizeValue(payload?.userId) || null,
  }
}

export function readRecentReauthFromRequest(request) {
  const token = getCookieValue(request, RECENT_REAUTH_COOKIE_NAME)

  if (!token) {
    return null
  }

  return verifyRecentReauthToken(token)
}

export function assertRecentReauth(
  request,
  { email = null, sessionJti = null, userId }
) {
  const reauth = readRecentReauthFromRequest(request)
  const expectedUserId = normalizeValue(userId)
  const expectedSessionJti = normalizeValue(sessionJti)
  const expectedEmail = normalizeEmail(email)

  if (!reauth) {
    throw new Error('Recent authentication is required')
  }

  if (!expectedUserId || reauth.userId !== expectedUserId) {
    throw new Error('Recent authentication is required')
  }

  if (expectedSessionJti && reauth.sessionJti !== expectedSessionJti) {
    throw new Error('Recent authentication is required')
  }

  if (expectedEmail && reauth.email && reauth.email !== expectedEmail) {
    throw new Error('Recent authentication is required')
  }

  return reauth
}

export function setRecentReauthCookie(response, token) {
  response.cookies.set(RECENT_REAUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: RECENT_REAUTH_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  })
}

export function clearRecentReauthCookie(response) {
  response.cookies.set(RECENT_REAUTH_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  })
}

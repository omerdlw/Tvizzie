import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function warnFallbackSecret() {
  const key = '__tvizzie_signup_proof_secret_fallback_warned__'

  if (globalThis[key]) {
    return
  }

  globalThis[key] = true
  console.warn(
    '[Auth] SIGN_UP_PROOF_SECRET is missing. Falling back to EMAIL_VERIFICATION_SECRET. Configure SIGN_UP_PROOF_SECRET explicitly.'
  )
}

function getSecret() {
  const secret = normalizeValue(process.env.SIGN_UP_PROOF_SECRET)

  if (secret) {
    return secret
  }

  const fallbackSecret = normalizeValue(process.env.EMAIL_VERIFICATION_SECRET)

  if (!fallbackSecret) {
    throw new Error(
      'SIGN_UP_PROOF_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable'
    )
  }

  warnFallbackSecret()
  return fallbackSecret
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

export function createSignUpProofToken({
  challengeJti,
  challengeKey,
  email,
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  const normalizedChallengeJti = normalizeValue(challengeJti)
  const normalizedChallengeKey = normalizeValue(challengeKey)
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedChallengeJti || !normalizedChallengeKey || !normalizedEmail) {
    throw new Error('Sign-up proof requires challenge, key, and email')
  }

  const payload = {
    challengeJti: normalizedChallengeJti,
    challengeKey: normalizedChallengeKey,
    email: normalizedEmail,
    exp: Math.floor(Number(expiresAt) / 1000),
    jti: randomBytes(12).toString('hex'),
  }

  const encodedPayload = encodePayload(payload)
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifySignUpProofToken(token, { email } = {}) {
  const normalizedToken = normalizeValue(token)
  const [encodedPayload, signature] = normalizedToken.split('.')

  if (!encodedPayload || !signature) {
    throw new Error('Sign-up verification is invalid')
  }

  const expectedSignature = signPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(signature)

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error('Sign-up verification is invalid')
  }

  let payload = null

  try {
    payload = decodePayload(encodedPayload)
  } catch {
    throw new Error('Sign-up verification is invalid')
  }

  const expiresAtMs = Number(payload?.exp) * 1000

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Sign-up verification has expired')
  }

  const expectedEmail = normalizeEmail(email)
  const payloadEmail = normalizeEmail(payload?.email)

  if (expectedEmail && payloadEmail !== expectedEmail) {
    throw new Error('Sign-up verification is invalid')
  }

  const challengeJti = normalizeValue(payload?.challengeJti)
  const challengeKey = normalizeValue(payload?.challengeKey)

  if (!challengeJti || !challengeKey || !payloadEmail) {
    throw new Error('Sign-up verification is invalid')
  }

  return {
    challengeJti,
    challengeKey,
    email: payloadEmail,
    expiresAt: new Date(expiresAtMs).toISOString(),
  }
}

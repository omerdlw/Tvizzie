import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'crypto'

import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/lib/auth/rate-limit.server'

const OTP_CODE_LENGTH = 6
const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5
const TOKEN_VERSION = 2

const PURPOSES = {
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  SIGN_UP: 'sign-up',
  PASSWORD_RESET: 'password-reset',
}
const SECURE_PURPOSES = new Set([
  PURPOSES.EMAIL_CHANGE,
  PURPOSES.PASSWORD_CHANGE,
])

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizeUserId(value) {
  return String(value || '').trim()
}

function getSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || ''
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function parseBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payload) {
  const secret = getSecret()

  if (!secret) {
    throw new Error(
      'EMAIL_VERIFICATION_SECRET is missing on the server. Configure email verification settings'
    )
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url')

  return `${encodedPayload}.${signature}`
}

function verifyToken(token) {
  const normalizedToken = String(token || '').trim()
  const [encodedPayload, signature] = normalizedToken.split('.')

  if (!encodedPayload || !signature) {
    throw new Error('Invalid verification token')
  }

  const secret = getSecret()

  if (!secret) {
    throw new Error(
      'EMAIL_VERIFICATION_SECRET is missing on the server. Configure email verification settings'
    )
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url')

  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(signature)
  const isSignatureValid =
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)

  if (!isSignatureValid) {
    throw new Error('Invalid verification token')
  }

  try {
    return JSON.parse(parseBase64Url(encodedPayload))
  } catch {
    throw new Error('Invalid verification token')
  }
}

function hashVerificationCode(email, code, salt) {
  return createHash('sha256')
    .update(
      `${normalizeEmail(email)}:${String(code || '')}:${String(salt || '')}`
    )
    .digest('hex')
}

function createOtpCode() {
  return String(randomInt(0, 10 ** OTP_CODE_LENGTH)).padStart(
    OTP_CODE_LENGTH,
    '0'
  )
}

function getCooldownStore() {
  const key = '__tvizzie_email_verification_resend_cooldowns__'

  if (!globalThis[key]) {
    globalThis[key] = new Map()
  }

  return globalThis[key]
}

function getAttemptStore() {
  const key = '__tvizzie_email_verification_attempts__'

  if (!globalThis[key]) {
    globalThis[key] = new Map()
  }

  return globalThis[key]
}

function enforceSendCodeRateLimit({ email, ipAddress, deviceId, purpose }) {
  try {
    enforceSlidingWindowRateLimit({
      namespace: `auth:verification:send-code:${purpose}`,
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'email', value: email, limit: 4 },
        { id: 'ip', value: ipAddress || 'unknown', limit: 14 },
        { id: 'device', value: deviceId || 'unknown', limit: 8 },
      ],
      message: 'Too many verification code requests',
    })
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error
    }

    if (error.dimension === 'email') {
      throw new Error('Too many verification requests for this email address')
    }

    if (error.dimension === 'device') {
      throw new Error('Too many verification requests from this device')
    }

    throw new Error('Too many verification requests from this network')
  }
}

function getChallengeStoreKey(challengeToken) {
  return createHash('sha256')
    .update(String(challengeToken || ''))
    .digest('hex')
}

function cleanupAttemptStore(store, now = Date.now()) {
  for (const [key, state] of store.entries()) {
    if (!state?.exp || now > state.exp) {
      store.delete(key)
    }
  }
}

function enforceResendCooldown(email) {
  const cooldownStore = getCooldownStore()
  const availableAt = cooldownStore.get(email) || 0
  const now = Date.now()

  if (availableAt > now) {
    const waitSeconds = Math.max(1, Math.ceil((availableAt - now) / 1000))
    throw new Error(
      `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code`
    )
  }
}

function trackResendCooldown(email) {
  const cooldownStore = getCooldownStore()
  cooldownStore.set(email, Date.now() + RESEND_COOLDOWN_MS)
}

function getChallengeState({ challengeToken, exp }) {
  const attemptStore = getAttemptStore()
  cleanupAttemptStore(attemptStore)

  const key = getChallengeStoreKey(challengeToken)
  const currentState = attemptStore.get(key)

  if (currentState) {
    return {
      key,
      state: currentState,
      store: attemptStore,
    }
  }

  const nextState = {
    attempts: 0,
    exp,
    used: false,
  }

  attemptStore.set(key, nextState)

  return {
    key,
    state: nextState,
    store: attemptStore,
  }
}

export function assertVerificationPurpose(value) {
  const normalizedPurpose = String(value || '')
    .trim()
    .toLowerCase()

  if (
    normalizedPurpose !== PURPOSES.EMAIL_CHANGE &&
    normalizedPurpose !== PURPOSES.PASSWORD_CHANGE &&
    normalizedPurpose !== PURPOSES.SIGN_UP &&
    normalizedPurpose !== PURPOSES.PASSWORD_RESET
  ) {
    throw new Error('Unsupported verification purpose')
  }

  return normalizedPurpose
}

export function createEmailVerificationChallenge({
  email,
  purpose = PURPOSES.SIGN_UP,
  userId = null,
  ipAddress = '',
  deviceId = '',
}) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPurpose = assertVerificationPurpose(purpose)
  const normalizedUserId = normalizeUserId(userId)

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required')
  }

  if (SECURE_PURPOSES.has(normalizedPurpose) && !normalizedUserId) {
    throw new Error('Authenticated user is required for this verification flow')
  }

  enforceResendCooldown(normalizedEmail)
  enforceSendCodeRateLimit({
    purpose: normalizedPurpose,
    email: normalizedEmail,
    ipAddress,
    deviceId,
  })

  const now = Date.now()
  const salt = randomBytes(16).toString('hex')
  const code = createOtpCode()
  const expiresAt = now + OTP_TTL_MS
  const challengeToken = signPayload({
    codeHash: hashVerificationCode(normalizedEmail, code, salt),
    email: normalizedEmail,
    exp: expiresAt,
    iat: now,
    jti: randomBytes(12).toString('hex'),
    purpose: normalizedPurpose,
    salt,
    userId: normalizedUserId || null,
    v: TOKEN_VERSION,
  })

  getChallengeState({
    challengeToken,
    exp: expiresAt,
  })
  trackResendCooldown(normalizedEmail)

  return {
    challengeToken,
    code,
    expiresAt,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
  }
}

export function verifyEmailVerificationChallenge({
  challengeToken,
  code,
  email,
  purpose = PURPOSES.SIGN_UP,
  userId = null,
}) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedCode = String(code || '').trim()
  const normalizedPurpose = assertVerificationPurpose(purpose)
  const normalizedUserId = normalizeUserId(userId)

  if (!new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(normalizedCode)) {
    throw new Error('Verification code must be 6 digits')
  }

  const payload = verifyToken(challengeToken)

  if (
    payload?.v !== TOKEN_VERSION ||
    !payload?.exp ||
    !payload?.codeHash ||
    !payload?.jti
  ) {
    throw new Error('Invalid verification token')
  }

  if (
    payload.purpose !== normalizedPurpose ||
    payload.email !== normalizedEmail
  ) {
    throw new Error('Verification challenge does not match this email')
  }

  if (SECURE_PURPOSES.has(normalizedPurpose)) {
    if (!normalizedUserId) {
      throw new Error('Authenticated user is required for this verification flow')
    }

    if (normalizeUserId(payload?.userId) !== normalizedUserId) {
      throw new Error('Verification challenge does not match this user')
    }
  }

  if (Date.now() > payload.exp) {
    throw new Error('Verification code has expired')
  }

  const challengeState = getChallengeState({
    challengeToken,
    exp: payload.exp,
  })

  if (challengeState.state.used) {
    throw new Error('Verification code has already been used')
  }

  if (challengeState.state.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error('Verification code attempts are exhausted')
  }

  const expectedCodeHash = hashVerificationCode(
    normalizedEmail,
    normalizedCode,
    payload.salt
  )

  if (expectedCodeHash !== payload.codeHash) {
    challengeState.state.attempts += 1
    challengeState.store.set(challengeState.key, challengeState.state)

    if (challengeState.state.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new Error('Verification code attempts are exhausted')
    }

    throw new Error('Verification code is invalid')
  }

  challengeState.state.used = true
  challengeState.store.set(challengeState.key, challengeState.state)

  return {
    email: normalizedEmail,
    userId: normalizeUserId(payload?.userId) || null,
    verifiedAt: Date.now(),
  }
}

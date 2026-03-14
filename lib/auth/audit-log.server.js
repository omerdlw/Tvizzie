import { createHash } from 'crypto'

import { getFirebaseAdminFirestore } from '@/lib/auth/firebase-admin.server'
import { getRequestContext } from '@/lib/auth/request-context.server'

const AUTH_AUDIT_COLLECTION =
  process.env.AUTH_AUDIT_COLLECTION || 'auth_audit_logs'

const ALLOWED_EVENT_TYPES = new Set([
  'cleanup-temp-user',
  'delete-account',
  'email-change',
  'failed-attempt',
  'google-preflight',
  'link-provider',
  'password-change',
  'password-reset',
  'sign-in',
  'unlink-provider',
])

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /code/i,
]

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEventType(value) {
  return normalizeValue(value).toLowerCase()
}

function hashValue(value) {
  const normalized = normalizeValue(value)

  if (!normalized) {
    return null
  }

  return createHash('sha256').update(normalized.toLowerCase()).digest('hex')
}

function maskEmail(email) {
  const normalizedEmail = normalizeValue(email).toLowerCase()
  const [localPart, domain] = normalizedEmail.split('@')

  if (!localPart || !domain) {
    return null
  }

  const visiblePrefix = localPart.slice(0, 2)
  return `${visiblePrefix}***@${domain}`
}

function sanitizeMetadata(value, depth = 0) {
  if (depth > 3) {
    return '[depth-limited]'
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeMetadata(item, depth + 1))
  }

  if (value && typeof value === 'object') {
    const nextObject = {}

    for (const [key, currentValue] of Object.entries(value)) {
      const isSensitive = SENSITIVE_FIELD_PATTERNS.some((pattern) =>
        pattern.test(key)
      )

      nextObject[key] = isSensitive
        ? '[redacted]'
        : sanitizeMetadata(currentValue, depth + 1)
    }

    return nextObject
  }

  if (typeof value === 'string') {
    return value.slice(0, 400)
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value
  }

  return String(value || '')
}

export async function writeAuthAuditLog({
  request,
  eventType,
  status = 'success',
  userId = null,
  email = null,
  provider = null,
  metadata = null,
}) {
  const normalizedEventType = normalizeEventType(eventType)

  if (!ALLOWED_EVENT_TYPES.has(normalizedEventType)) {
    throw new Error('Unsupported auth audit event type')
  }

  const normalizedStatus = normalizeValue(status).toLowerCase() || 'success'
  const normalizedUserId = normalizeValue(userId) || null
  const normalizedEmail = normalizeValue(email).toLowerCase() || null
  const normalizedProvider = normalizeValue(provider).toLowerCase() || null
  const requestContext = request ? getRequestContext(request) : null
  const now = Date.now()

  const db = getFirebaseAdminFirestore()

  await db.collection(AUTH_AUDIT_COLLECTION).add({
    createdAt: new Date(now).toISOString(),
    emailHash: hashValue(normalizedEmail),
    emailMasked: maskEmail(normalizedEmail),
    eventType: normalizedEventType,
    ipHash: requestContext?.ipHash || null,
    metadata: sanitizeMetadata(metadata),
    provider: normalizedProvider,
    requestContext: requestContext
      ? {
          deviceHash: requestContext.deviceHash,
          ipHash: requestContext.ipHash,
          userAgentHash: requestContext.userAgentHash,
        }
      : null,
    status: normalizedStatus,
    userId: normalizedUserId,
    userIdHash: hashValue(normalizedUserId),
  })
}

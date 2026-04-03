import { createHash } from 'crypto'

import { getRequestContext } from '@/core/auth/servers/session/request-context.server'
import { createAdminClient } from '@/core/clients/supabase/admin'

const AUTH_AUDIT_TABLE = process.env.AUTH_AUDIT_TABLE || 'auth_audit_logs'

const ALLOWED_EVENT_TYPES = new Set([
  'cleanup-temp-user',
  'delete-account',
  'email-change',
  'failed-attempt',
  'google-preflight',
  'link-provider',
  'password-change',
  'password-set',
  'password-reset',
  'sign-in',
  'sign-up',
  'unlink-provider',
])

const SENSITIVE_FIELD_PATTERNS = [/password/i, /token/i, /secret/i, /code/i]

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

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value
  }

  return String(value || '')
}

function isUserIdForeignKeyViolation(error) {
  const message = normalizeValue(error?.message).toLowerCase()
  const details = normalizeValue(error?.details).toLowerCase()

  return (
    message.includes('auth_audit_logs_user_id_fkey') ||
    (message.includes('foreign key constraint') && message.includes('user_id')) ||
    details.includes('(user_id)')
  )
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
  const sanitizedMetadata = sanitizeMetadata(metadata)
  const insertPayload = {
    created_at: new Date(now).toISOString(),
    email_hash: hashValue(normalizedEmail),
    email_masked: maskEmail(normalizedEmail),
    event_type: normalizedEventType,
    ip_hash: requestContext?.ipHash || null,
    metadata: sanitizedMetadata,
    provider: normalizedProvider,
    request_context: requestContext
      ? {
          device_hash: requestContext.deviceHash,
          ip_hash: requestContext.ipHash,
          user_agent_hash: requestContext.userAgentHash,
        }
      : null,
    status: normalizedStatus,
    user_id: normalizedUserId,
    user_id_hash: hashValue(normalizedUserId),
  }

  const admin = createAdminClient()
  let insertResult = await admin.from(AUTH_AUDIT_TABLE).insert(insertPayload)

  if (
    insertResult.error &&
    normalizedUserId &&
    isUserIdForeignKeyViolation(insertResult.error)
  ) {
    insertResult = await admin.from(AUTH_AUDIT_TABLE).insert({
      ...insertPayload,
      user_id: null,
    })
  }

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Auth audit log could not be persisted')
  }
}

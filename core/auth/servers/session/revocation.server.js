import 'server-only'

import { createAdminClient } from '@/core/clients/supabase/admin'
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/core/clients/supabase/constants'

const SESSION_CONTROL_FUNCTION = 'session-control'

function normalizeValue(value) {
  return String(value || '').trim()
}

function toLowercase(value) {
  return normalizeValue(value).toLowerCase()
}

function resolveTokenIssuedAtIso(decodedToken = {}) {
  const issuedAtSeconds = Number(decodedToken?.iat || 0)

  if (!Number.isFinite(issuedAtSeconds) || issuedAtSeconds <= 0) {
    return null
  }

  return new Date(issuedAtSeconds * 1000).toISOString()
}

function parseRpcBoolean(data) {
  if (typeof data === 'boolean') {
    return data
  }

  if (Array.isArray(data) && data.length > 0) {
    return parseRpcBoolean(data[0])
  }

  if (data && typeof data === 'object') {
    if (typeof data.auth_is_session_revoked === 'boolean') {
      return data.auth_is_session_revoked
    }

    const values = Object.values(data)

    for (const value of values) {
      if (typeof value === 'boolean') {
        return value
      }
    }
  }

  return false
}

export async function isSessionRevoked({
  decodedToken = {},
  sessionJti = null,
  userId,
}) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    return false
  }

  const admin = createAdminClient()
  const rpcPayload = {
    p_iat: resolveTokenIssuedAtIso(decodedToken),
    p_session_jti: normalizeValue(sessionJti) || null,
    p_user_id: normalizedUserId,
  }
  const result = await admin.rpc('auth_is_session_revoked', rpcPayload)

  if (result.error) {
    throw new Error(result.error.message || 'Session revocation check failed')
  }

  return parseRpcBoolean(result.data)
}

export async function assertSessionNotRevoked(authContext = null) {
  if (!authContext?.userId) {
    return authContext
  }

  const revoked = await isSessionRevoked({
    decodedToken: authContext.decodedToken,
    sessionJti: authContext.sessionJti,
    userId: authContext.userId,
  })

  if (!revoked) {
    return authContext
  }

  const error = new Error('Authentication token has been revoked')
  error.code = 'AUTH_TOKEN_REVOKED'
  throw error
}

async function invokeSessionControlFunction({
  functionName,
  internalToken,
  normalizedUserId,
  currentSessionJti,
  reason,
}) {
  return fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-infra-internal-token': internalToken,
      },
      body: JSON.stringify({
        currentSessionJti: normalizeValue(currentSessionJti) || null,
        reason: normalizeValue(reason) || null,
        userId: normalizedUserId,
      }),
      cache: 'no-store',
    }
  )
}

export async function invokeSessionControl({
  currentSessionJti = null,
  reason = null,
  userId,
}) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('User ID is required')
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server admin environment is not configured')
  }

  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN)

  if (!internalToken) {
    throw new Error('INFRA_INTERNAL_TOKEN is required for session control')
  }

  let response = await invokeSessionControlFunction({
    functionName: SESSION_CONTROL_FUNCTION,
    internalToken,
    normalizedUserId,
    currentSessionJti,
    reason,
  })
  let payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      normalizeValue(payload?.error) ||
        `Session control function failed with status ${response.status}`
    )
  }

  if (toLowercase(payload?.ok) === 'false') {
    throw new Error('Session control function did not confirm success')
  }

  return payload
}

import 'server-only'

import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/core/clients/supabase/constants'

function normalizeValue(value) {
  return String(value || '').trim()
}

function assertEdgeInvocationEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server admin environment is not configured')
  }

  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN)

  if (!internalToken) {
    throw new Error('INFRA_INTERNAL_TOKEN is required for internal edge function calls')
  }

  return {
    internalToken,
  }
}

export async function invokeInternalEdgeFunction(
  functionName,
  {
    method = 'POST',
    body = {},
    timeoutMs = 15000,
  } = {}
) {
  const normalizedFunctionName = normalizeValue(functionName)

  if (!normalizedFunctionName) {
    throw new Error('Edge function name is required')
  }

  const { internalToken } = assertEdgeInvocationEnv()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${normalizedFunctionName}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'x-infra-internal-token': internalToken,
        },
        cache: 'no-store',
        signal: controller.signal,
        body:
          body === undefined || body === null
            ? undefined
            : JSON.stringify(body),
      }
    )

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(
        normalizeValue(payload?.error) ||
          `Edge function ${normalizedFunctionName} failed with status ${response.status}`
      )

      error.status = response.status
      error.data = payload
      throw error
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(
        `Edge function ${normalizedFunctionName} timed out`
      )
      timeoutError.status = 504
      throw timeoutError
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { errorResponse, jsonResponse } from "../_shared/http.ts"
import { assertInternalAccess, resolveErrorStatus } from "../_shared/internal.ts"
import {
  clamp,
  normalizeLower,
  normalizeTrim,
  parseBoolean,
  parseNumber,
} from "../_shared/normalize.ts"
import { callUpstash, sha256Hex } from "../_shared/upstash.ts"

type RateLimitDimension = {
  id?: string
  limit?: number
  value?: string
}

type RateLimitRequest = {
  dimensions?: RateLimitDimension[]
  message?: string
  namespace?: string
  windowMs?: number
}

type NormalizedDimension = {
  id: string
  limit: number
  value: string
}

type NormalizedInput = {
  dimensions: NormalizedDimension[]
  message: string
  namespace: string
  windowMs: number
}

const DEFAULT_MESSAGE = "Too many requests. Please try again later"
const DEFAULT_KEY_PREFIX = "tvz:rl:v3"

function normalizeInput(input: RateLimitRequest): NormalizedInput {
  const namespace = normalizeLower(input?.namespace)

  if (!namespace) {
    throw new Error("namespace is required")
  }

  const windowMs = clamp(parseNumber(input?.windowMs, 60_000), 1_000, 86_400_000)

  const dimensions = Array.isArray(input?.dimensions)
    ? input.dimensions
        .map((dimension) => ({
          id: normalizeLower(dimension?.id),
          limit: Math.max(0, parseNumber(dimension?.limit, 0)),
          value: normalizeLower(dimension?.value),
        }))
        .filter(
          (dimension) =>
            Boolean(dimension.id && dimension.value && dimension.limit > 0)
        )
    : []

  return {
    dimensions,
    message: normalizeTrim(input?.message) || DEFAULT_MESSAGE,
    namespace,
    windowMs,
  }
}

function getRedisKeyPrefix(): string {
  const normalized = normalizeLower(Deno.env.get("RATE_LIMIT_KEY_PREFIX"))
    .replace(/[^a-z0-9:_-]/g, "")
    .trim()

  return normalized || DEFAULT_KEY_PREFIX
}

function allowedPayload(message: string, degraded = false) {
  return {
    allowed: true,
    degraded,
    dimension: null,
    message,
    retryAfterMs: 0,
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return errorResponse(405, "Method not allowed")
  }

  const failOpen = parseBoolean(Deno.env.get("RATE_LIMIT_FAIL_OPEN"), false)
  let message = DEFAULT_MESSAGE

  try {
    assertInternalAccess(request)

    const payload = (await request.json().catch(() => ({}))) as RateLimitRequest
    const input = normalizeInput(payload)

    message = input.message

    if (!input.dimensions.length) {
      return jsonResponse(200, allowedPayload(input.message))
    }

    const keyPrefix = getRedisKeyPrefix()
    const now = Date.now()

    for (const dimension of input.dimensions) {
      const windowBucket = Math.floor(now / input.windowMs) * input.windowMs
      const ttlSeconds = Math.max(2, Math.ceil(input.windowMs / 1000) + 5)
      const valueHash = await sha256Hex(dimension.value)
      const key = [
        keyPrefix,
        input.namespace,
        dimension.id,
        valueHash,
        String(windowBucket),
      ].join(":")

      const count = Number(await callUpstash(["incr", key])) || 0

      if (count <= 1) {
        await callUpstash(["expire", key, ttlSeconds])
      }

      if (count > dimension.limit) {
        const retryAfterMs = Math.max(1_000, input.windowMs - (now - windowBucket))

        return jsonResponse(200, {
          allowed: false,
          count,
          dimension: dimension.id,
          message: input.message,
          retryAfterMs,
        })
      }
    }

    return jsonResponse(200, allowedPayload(input.message))
  } catch (error) {
    const status = resolveErrorStatus(error)

    if (status >= 500 && failOpen) {
      return jsonResponse(200, allowedPayload(message, true))
    }

    return errorResponse(
      status,
      String((error as Error)?.message || "Rate limit function failed")
    )
  }
})

import { createHash } from 'crypto'

import { createAdminClient } from '@/lib/supabase/admin'

const MEMORY_STORE_KEY = '__tvizzie_auth_sliding_window_rate_limit_store__'
const SUPABASE_FALLBACK_WARN_KEY =
  '__tvizzie_auth_sliding_window_rate_limit_supabase_fallback_warned__'
const SUPABASE_RATE_LIMIT_TABLE = 'auth_rate_limit_windows'

class SlidingWindowRateLimitError extends Error {
  constructor({ message, retryAfterMs, dimension, key }) {
    super(message || 'Too many requests. Please try again later')
    this.name = 'SlidingWindowRateLimitError'
    this.code = 'RATE_LIMIT_EXCEEDED'
    this.status = 429
    this.retryAfterMs = Math.max(1000, Number(retryAfterMs) || 1000)
    this.retryAfterSeconds = Math.ceil(this.retryAfterMs / 1000)
    this.dimension = dimension || null
    this.key = key || null
  }
}

function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function getStore() {
  if (!globalThis[MEMORY_STORE_KEY]) {
    globalThis[MEMORY_STORE_KEY] = new Map()
  }

  return globalThis[MEMORY_STORE_KEY]
}

function pruneEntries(entries = [], now, windowMs) {
  return entries
    .map((timestamp) => Number(timestamp))
    .filter(
      (timestamp) =>
        Number.isFinite(timestamp) && timestamp > 0 && now - timestamp < windowMs
    )
}

function buildBucketKey(namespace, dimension, value) {
  return `${namespace}:${dimension}:${value}`
}

function resolveStorageMode() {
  const mode = normalizeValue(process.env.RATE_LIMIT_STORAGE || 'auto')

  if (mode === 'memory' || mode === 'supabase' || mode === 'auto') {
    return mode
  }

  return 'auto'
}

function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production'
}

function resolveSupabaseTableName() {
  const tableName = normalizeValue(process.env.RATE_LIMIT_SUPABASE_TABLE)
  return tableName || SUPABASE_RATE_LIMIT_TABLE
}

function hashValue(value) {
  return createHash('sha256')
    .update(String(value || ''))
    .digest('hex')
}

function toDimensions(input = []) {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((dimension) => ({
      id: normalizeValue(dimension?.id),
      limit: Number(dimension?.limit) || 0,
      value: normalizeValue(dimension?.value),
    }))
    .filter((dimension) =>
      Boolean(dimension.id && dimension.value && dimension.limit > 0)
    )
}

export function isSlidingWindowRateLimitError(error) {
  return error?.code === 'RATE_LIMIT_EXCEEDED'
}

function normalizeRateLimitInput({
  namespace,
  windowMs = 15 * 60 * 1000,
  dimensions = [],
  message = 'Too many requests. Please try again later',
}) {
  const normalizedNamespace = normalizeValue(namespace)

  if (!normalizedNamespace) {
    throw new Error('Rate limit namespace is required')
  }

  const normalizedWindowMs = Math.max(1000, Number(windowMs) || 1000)
  const normalizedDimensions = toDimensions(dimensions)

  if (!normalizedDimensions.length) {
    return null
  }

  return {
    message,
    normalizedDimensions,
    normalizedNamespace,
    normalizedWindowMs,
  }
}

function enforceInMemorySlidingWindowRateLimit({
  message,
  normalizedDimensions,
  normalizedNamespace,
  normalizedWindowMs,
}) {
  const now = Date.now()
  const store = getStore()
  const pendingUpdates = []

  for (const dimension of normalizedDimensions) {
    const bucketKey = buildBucketKey(
      normalizedNamespace,
      dimension.id,
      dimension.value
    )
    const currentEntries = pruneEntries(
      store.get(bucketKey) || [],
      now,
      normalizedWindowMs
    )

    if (currentEntries.length >= dimension.limit) {
      const oldestAllowedTimestamp = currentEntries[0] || now
      const retryAfterMs = Math.max(
        1000,
        normalizedWindowMs - (now - oldestAllowedTimestamp)
      )

      throw new SlidingWindowRateLimitError({
        message,
        retryAfterMs,
        dimension: dimension.id,
        key: bucketKey,
      })
    }

    pendingUpdates.push({
      bucketKey,
      entries: [...currentEntries, now],
    })
  }

  for (const update of pendingUpdates) {
    store.set(update.bucketKey, update.entries)
  }
}

async function enforceSupabaseSlidingWindowRateLimit({
  message,
  normalizedDimensions,
  normalizedNamespace,
  normalizedWindowMs,
}) {
  const admin = createAdminClient()
  const tableName = resolveSupabaseTableName()
  const now = Date.now()
  const updatedAt = new Date(now).toISOString()
  const expiresAt = new Date(now + normalizedWindowMs).toISOString()
  const pendingUpdates = []

  for (const dimension of normalizedDimensions) {
    const bucketKey = buildBucketKey(
      normalizedNamespace,
      dimension.id,
      dimension.value
    )
    const keyHash = hashValue(bucketKey)
    const existingResult = await admin
      .from(tableName)
      .select('entries')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (existingResult.error) {
      throw new Error(existingResult.error.message || 'Rate-limit storage unavailable')
    }

    const currentEntries = pruneEntries(
      existingResult.data?.entries || [],
      now,
      normalizedWindowMs
    )

    if (currentEntries.length >= dimension.limit) {
      const oldestAllowedTimestamp = currentEntries[0] || now
      const retryAfterMs = Math.max(
        1000,
        normalizedWindowMs - (now - oldestAllowedTimestamp)
      )

      throw new SlidingWindowRateLimitError({
        message,
        retryAfterMs,
        dimension: dimension.id,
        key: bucketKey,
      })
    }

    pendingUpdates.push({
      bucketKey,
      dimension,
      entries: [...currentEntries, now],
      keyHash,
    })
  }

  for (const update of pendingUpdates) {
    const upsertResult = await admin.from(tableName).upsert(
      {
        bucket_key: update.bucketKey,
        dimension: update.dimension.id,
        entries: update.entries,
        expires_at: expiresAt,
        key_hash: update.keyHash,
        namespace: normalizedNamespace,
        updated_at: updatedAt,
        value_hash: hashValue(update.dimension.value),
      },
      { onConflict: 'key_hash' }
    )

    if (upsertResult.error) {
      throw new Error(upsertResult.error.message || 'Rate-limit write failed')
    }
  }
}

function warnSupabaseFallback(error) {
  if (globalThis[SUPABASE_FALLBACK_WARN_KEY]) {
    return
  }

  globalThis[SUPABASE_FALLBACK_WARN_KEY] = true
  console.warn(
    '[RateLimit] Supabase storage unavailable; falling back to in-memory store',
    error
  )
}

export async function enforceSlidingWindowRateLimit(input) {
  const normalizedInput = normalizeRateLimitInput(input)

  if (!normalizedInput) {
    return
  }

  const storageMode = resolveStorageMode()

  if (storageMode === 'memory') {
    enforceInMemorySlidingWindowRateLimit(normalizedInput)
    return
  }

  try {
    await enforceSupabaseSlidingWindowRateLimit(normalizedInput)
  } catch (error) {
    if (isSlidingWindowRateLimitError(error)) {
      throw error
    }

    if (storageMode === 'supabase') {
      throw error
    }

    if (isProductionEnvironment()) {
      throw error
    }

    warnSupabaseFallback(error)
    enforceInMemorySlidingWindowRateLimit(normalizedInput)
  }
}

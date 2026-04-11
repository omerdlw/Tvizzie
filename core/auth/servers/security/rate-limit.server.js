import { createHash } from 'crypto';

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';

const MEMORY_STORE_KEY = '__tvizzie_auth_rate_limit_memory_store__';
const RATE_LIMIT_FUNCTION_NAME = 'rate-limit';

class SlidingWindowRateLimitError extends Error {
  constructor({ message, retryAfterMs, dimension, key }) {
    super(message || 'Too many requests. Please try again later');
    this.name = 'SlidingWindowRateLimitError';
    this.code = 'RATE_LIMIT_EXCEEDED';
    this.status = 429;
    this.retryAfterMs = Math.max(1000, Number(retryAfterMs) || 1000);
    this.retryAfterSeconds = Math.ceil(this.retryAfterMs / 1000);
    this.dimension = dimension || null;
    this.key = key || null;
  }
}

function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function hashValue(value) {
  return createHash('sha256')
    .update(String(value || ''))
    .digest('hex');
}

function getStore() {
  if (!globalThis[MEMORY_STORE_KEY]) {
    globalThis[MEMORY_STORE_KEY] = new Map();
  }

  return globalThis[MEMORY_STORE_KEY];
}

function toDimensions(input = []) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((dimension) => ({
      id: normalizeValue(dimension?.id),
      limit: Number(dimension?.limit) || 0,
      value: normalizeValue(dimension?.value),
    }))
    .filter((dimension) => Boolean(dimension.id && dimension.value && dimension.limit > 0));
}

export function isSlidingWindowRateLimitError(error) {
  return error?.code === 'RATE_LIMIT_EXCEEDED';
}

function normalizeRateLimitInput({
  namespace,
  windowMs = 15 * 60 * 1000,
  dimensions = [],
  message = 'Too many requests. Please try again later',
}) {
  const normalizedNamespace = normalizeValue(namespace);

  if (!normalizedNamespace) {
    throw new Error('Rate limit namespace is required');
  }

  const normalizedWindowMs = Math.max(1000, Number(windowMs) || 1000);
  const normalizedDimensions = toDimensions(dimensions);

  if (!normalizedDimensions.length) {
    return null;
  }

  return {
    message,
    normalizedDimensions,
    normalizedNamespace,
    normalizedWindowMs,
  };
}

function shouldUseMemoryFallback() {
  const mode = normalizeValue(process.env.RATE_LIMIT_FALLBACK || 'auto');

  if (mode === 'memory') {
    return true;
  }

  if (mode === 'none') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

function enforceInMemoryRateLimit({ message, normalizedDimensions, normalizedNamespace, normalizedWindowMs }) {
  const now = Date.now();
  const bucket = Math.floor(now / normalizedWindowMs);
  const store = getStore();

  for (const dimension of normalizedDimensions) {
    const key = `${normalizedNamespace}:${dimension.id}:${hashValue(dimension.value)}:${bucket}`;
    const current = Number(store.get(key) || 0) + 1;

    store.set(key, current);

    if (current > dimension.limit) {
      const retryAfterMs = normalizedWindowMs - (now - bucket * normalizedWindowMs);

      throw new SlidingWindowRateLimitError({
        message,
        retryAfterMs,
        dimension: dimension.id,
        key,
      });
    }
  }
}

async function enforceEdgeRateLimit({ message, normalizedDimensions, normalizedNamespace, normalizedWindowMs }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server admin environment is not configured');
  }

  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);

  if (!internalToken) {
    throw new Error('INFRA_INTERNAL_TOKEN is required for rate-limit');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${RATE_LIMIT_FUNCTION_NAME}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-infra-internal-token': internalToken,
    },
    body: JSON.stringify({
      dimensions: normalizedDimensions,
      message,
      namespace: normalizedNamespace,
      windowMs: normalizedWindowMs,
    }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(normalizeValue(payload?.error) || `Rate-limit function failed with status ${response.status}`);
  }

  if (payload?.allowed === false) {
    throw new SlidingWindowRateLimitError({
      message,
      retryAfterMs: payload?.retryAfterMs,
      dimension: normalizeValue(payload?.dimension) || null,
      key: `${normalizedNamespace}:${normalizeValue(payload?.dimension)}`,
    });
  }
}

export async function enforceSlidingWindowRateLimit(input) {
  const normalizedInput = normalizeRateLimitInput(input);

  if (!normalizedInput) {
    return;
  }

  try {
    await enforceEdgeRateLimit(normalizedInput);
  } catch (error) {
    if (isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    if (!shouldUseMemoryFallback()) {
      throw error;
    }

    enforceInMemoryRateLimit(normalizedInput);
  }
}

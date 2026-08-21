import 'server-only';

import { createAppError } from './app-error.js';
import { normalizeValue } from '@/shared/normalize';

const rateLimitWindows = new Map();
const MAX_RATE_LIMIT_BUCKETS = 10000;

function resolveClientIdentifier(request, userId = null) {
  if (userId) {
    return `user:${normalizeValue(userId)}`;
  }

  if (!request) {
    return 'unknown';
  }

  const headers = request.headers;
  const clientIp =
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0] ||
    '127.0.0.1';

  return `ip:${normalizeValue(clientIp).trim()}`;
}

function cleanupExpiredBuckets(now) {
  if (rateLimitWindows.size < MAX_RATE_LIMIT_BUCKETS) {
    return;
  }

  for (const [key, record] of rateLimitWindows.entries()) {
    if (record.resetAt <= now) {
      rateLimitWindows.delete(key);
    }
  }
}

export function checkRateLimit(
  request,
  { key = 'default', limit = 30, windowSeconds = 60, userId = null } = {},
) {
  const clientId = resolveClientIdentifier(request, userId);
  const bucketKey = `${key}:${clientId}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  cleanupExpiredBuckets(now);

  let record = rateLimitWindows.get(bucketKey);

  if (!record || record.resetAt <= now) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitWindows.set(bucketKey, record);
    return {
      allowed: true,
      current: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      resetInSeconds: windowSeconds,
    };
  }

  record.count += 1;
  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  return {
    allowed,
    current: record.count,
    limit,
    remaining,
    resetInSeconds,
  };
}

export function assertRateLimit(request, options = {}) {
  const result = checkRateLimit(request, options);

  if (!result.allowed) {
    const error = createAppError('Too many requests. Please slow down and try again.', {
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
    });
    error.retryAfterSeconds = result.resetInSeconds;
    throw error;
  }

  return result;
}

export function clearRateLimitMemory() {
  rateLimitWindows.clear();
}

import 'server-only';
import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { normalizeValue, normalizeLowerValue } from '@/shared';

import {
  ROLLOUT_CANARY_PERCENT,
  ROLLOUT_DEFAULT_MODE,
  createAppError,
  normalizeErrorCode,
  normalizeErrorMessage,
  normalizeErrorStatus,
  buildApiErrorResult,
  buildApiSuccessResult,
} from './client.js';

export * from './client.js';

const VALID_ROLLOUT_MODES = new Set(['legacy', 'shadow', 'edge_canary', 'edge_full']);

function hashToPercent(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return 0;
  }

  const hex = createHash('sha256').update(normalized).digest('hex').slice(0, 8);
  const numeric = Number.parseInt(hex, 16);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric % 100;
}

function toMode(value, fallback = 'shadow') {
  const normalized = normalizeValue(value);

  if (VALID_ROLLOUT_MODES.has(normalized)) {
    return normalized;
  }

  return fallback;
}

function toPercent(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, parsed));
}

function parseConfigPatch(rawValue) {
  const normalized = String(rawValue || '').trim();

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return base;
  }

  return Object.entries(patch).reduce(
    (output, [key, value]) => ({
      ...output,
      [key]:
        value && typeof value === 'object' && !Array.isArray(value)
          ? deepMerge(base?.[key] || {}, value)
          : value,
    }),
    { ...base },
  );
}

function deepFreeze(target) {
  if (!target || typeof target !== 'object' || Object.isFrozen(target)) {
    return target;
  }

  Object.freeze(target);
  Object.values(target).forEach(deepFreeze);
  return target;
}

const BASE_ROLLOUT_CONFIG = {
  defaultMode: 'shadow',
  canaryPercent: 5,
  domains: {
    account: {
      defaultMode: 'shadow',
      endpoints: {
        'account-media-upload': {
          mode: 'edge_canary',
          canaryPercent: 10,
        },
        'account-profile-write': {
          mode: 'shadow',
          canaryPercent: 10,
        },
      },
    },
    auth: {
      defaultMode: 'shadow',
      endpoints: {
        'auth-challenge-write': {
          mode: 'shadow',
          canaryPercent: 5,
        },
      },
    },
    follows: {
      defaultMode: 'edge_canary',
      endpoints: {},
    },
    notifications: {
      defaultMode: 'edge_canary',
      endpoints: {},
    },
    reviews: {
      defaultMode: 'shadow',
      endpoints: {},
    },
  },
};

function normalizeRolloutDomains(domains = {}, defaultMode, defaultCanaryPercent) {
  return Object.fromEntries(
    Object.entries(domains).map(([domainKey, domainConfig]) => {
      const normalizedDomain = normalizeValue(domainKey);
      const rawDomainConfig = domainConfig || {};
      const domainMode = toMode(rawDomainConfig.defaultMode, defaultMode);
      const domainCanaryPercent = toPercent(rawDomainConfig.canaryPercent, defaultCanaryPercent);

      return [
        normalizedDomain,
        {
          defaultMode: domainMode,
          canaryPercent: domainCanaryPercent,
          endpoints: Object.fromEntries(
            Object.entries(rawDomainConfig.endpoints || {}).map(([endpointKey, endpointConfig]) => {
              const rawEndpointConfig = endpointConfig || {};

              return [
                normalizeValue(endpointKey),
                {
                  mode: toMode(rawEndpointConfig.mode, domainMode),
                  canaryPercent: toPercent(rawEndpointConfig.canaryPercent, domainCanaryPercent),
                },
              ];
            }),
          ),
        },
      ];
    }),
  );
}

function createRolloutConfig() {
  const rawConfig = deepMerge(
    BASE_ROLLOUT_CONFIG,
    parseConfigPatch(process.env.ROLLOUT_CONFIG_JSON) || {},
  );
  const defaultMode = toMode(ROLLOUT_DEFAULT_MODE, toMode(rawConfig.defaultMode, 'shadow'));
  const canaryPercent = toPercent(ROLLOUT_CANARY_PERCENT, toPercent(rawConfig.canaryPercent, 5));

  return deepFreeze({
    defaultMode,
    canaryPercent,
    domains: normalizeRolloutDomains(rawConfig.domains || {}, defaultMode, canaryPercent),
  });
}

export const ROLLOUT_CONFIG = createRolloutConfig();

function resolveDomainConfig(domain) {
  const normalizedDomain = normalizeValue(domain);

  if (!normalizedDomain) {
    return null;
  }

  return ROLLOUT_CONFIG.domains?.[normalizedDomain] || null;
}

export function resolveWriteRolloutDecision({ domain, endpoint, userId } = {}) {
  const domainConfig = resolveDomainConfig(domain);
  const normalizedEndpoint = normalizeValue(endpoint);
  const endpointConfig = normalizedEndpoint
    ? domainConfig?.endpoints?.[normalizedEndpoint] || null
    : null;
  const defaultMode = toMode(
    domainConfig?.defaultMode,
    toMode(ROLLOUT_CONFIG.defaultMode, 'shadow'),
  );
  const mode = toMode(endpointConfig?.mode, defaultMode);
  const canaryPercent = toPercent(
    endpointConfig?.canaryPercent,
    toPercent(domainConfig?.canaryPercent, 0),
  );
  const userPercent = hashToPercent(userId);
  const inCanary = userPercent < canaryPercent;
  const shouldRunEdgeAuthoritative = mode === 'edge_full' || (mode === 'edge_canary' && inCanary);
  const shouldRunShadow = mode === 'shadow' || (mode === 'edge_canary' && !inCanary);

  return {
    canaryPercent,
    endpoint: normalizedEndpoint || null,
    inCanary,
    mode,
    shouldRunEdgeAuthoritative,
    shouldRunShadow,
    userPercent,
  };
}

export function isRecoverableRolloutError(
  error,
  recoverableStatuses = [408, 409, 429, 500, 502, 503, 504],
) {
  const status = Number(error?.status || 0);

  if (recoverableStatuses.includes(status)) {
    return true;
  }

  const message = normalizeValue(error?.message || '');

  return (
    message.includes('timed out') ||
    message.includes('temporarily unavailable') ||
    message.includes('network') ||
    message.includes('rate limit')
  );
}

export const CACHE_CONTROL = Object.freeze({
  NO_STORE: 'no-store',
  PRIVATE_USER_STATE: 'private, no-cache, no-store, must-revalidate',
  PUBLIC_ACCOUNT_RESOLVE: 'public, s-maxage=300, stale-while-revalidate=1800',
  PUBLIC_COMMUNITY_SEARCH: 'public, s-maxage=60, stale-while-revalidate=300',
  PUBLIC_MEDIA_COLLECTIONS: 'public, max-age=0, s-maxage=5, must-revalidate',
  PUBLIC_MEDIA_REVIEWS: 'public, max-age=0, s-maxage=5, must-revalidate',
  PUBLIC_SOCIAL_PROOF: 'public, s-maxage=60, stale-while-revalidate=300',
  PUBLIC_TMDB_DISCOVER: 'public, s-maxage=1800, stale-while-revalidate=86400',
  PUBLIC_TMDB_ERROR_FALLBACK: 'public, s-maxage=300, stale-while-revalidate=3600',
  PUBLIC_TMDB_GENRES: 'public, s-maxage=604800, stale-while-revalidate=604800',
  PUBLIC_TMDB_SEARCH: 'public, s-maxage=300, stale-while-revalidate=86400',
  PUBLIC_TMDB_TRENDING: 'public, s-maxage=21600, stale-while-revalidate=86400',
});

export function cacheControlHeaders(policy) {
  return {
    'Cache-Control': policy,
  };
}

const DEFAULT_TTL_MS = 2000;
const MAX_CACHE_ENTRIES = 400;
const responseCache = new Map();

function pruneCache() {
  if (responseCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const now = Date.now();

  for (const [key, entry] of responseCache.entries()) {
    if ((entry?.expiresAt || 0) <= now && !entry?.inFlightPromise) {
      responseCache.delete(key);
    }
  }

  if (responseCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const overflowCount = responseCache.size - MAX_CACHE_ENTRIES;
  const keys = Array.from(responseCache.keys());

  for (let index = 0; index < overflowCount; index += 1) {
    const key = keys[index];

    if (key) {
      responseCache.delete(key);
    }
  }
}

export function invalidateCachedValue(cacheKey) {
  const normalizedCacheKey = normalizeValue(cacheKey);

  if (!normalizedCacheKey) {
    return;
  }

  responseCache.delete(normalizedCacheKey);
}

export function invalidateCachedValuesByPrefix(prefix) {
  const normalizedPrefix = normalizeValue(prefix);

  if (!normalizedPrefix) {
    return;
  }

  for (const key of responseCache.keys()) {
    if (String(key || '').startsWith(normalizedPrefix)) {
      responseCache.delete(key);
    }
  }
}

export function invalidateCachedValuesByContains(fragment) {
  const normalizedFragment = normalizeValue(fragment);

  if (!normalizedFragment) {
    return;
  }

  for (const key of responseCache.keys()) {
    if (String(key || '').includes(normalizedFragment)) {
      responseCache.delete(key);
    }
  }
}

export function invalidateCachedValuesWhere(matcher) {
  if (typeof matcher !== 'function') {
    return;
  }

  for (const key of responseCache.keys()) {
    if (matcher(String(key || ''))) {
      responseCache.delete(key);
    }
  }
}

export async function getOrLoadCachedValue({
  cacheKey,
  enabled = true,
  ttlMs = DEFAULT_TTL_MS,
  loader,
}) {
  if (typeof loader !== 'function') {
    throw new Error('loader function is required');
  }

  const normalizedCacheKey = normalizeValue(cacheKey);
  const shouldUseCache = enabled && Boolean(normalizedCacheKey);

  if (!shouldUseCache) {
    return loader();
  }

  const now = Date.now();
  const cachedEntry = responseCache.get(normalizedCacheKey);

  if (cachedEntry?.value !== undefined && cachedEntry.expiresAt > now) {
    return cachedEntry.value;
  }

  if (cachedEntry?.inFlightPromise) {
    return cachedEntry.inFlightPromise;
  }

  const inFlightPromise = Promise.resolve()
    .then(() => loader())
    .then((value) => {
      responseCache.set(normalizedCacheKey, {
        expiresAt: Date.now() + Math.max(1, Number(ttlMs) || DEFAULT_TTL_MS),
        inFlightPromise: null,
        value,
      });
      pruneCache();
      return value;
    })
    .catch((error) => {
      responseCache.delete(normalizedCacheKey);
      throw error;
    });

  responseCache.set(normalizedCacheKey, {
    expiresAt: now + Math.max(1, Number(ttlMs) || DEFAULT_TTL_MS),
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}

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

function readHeader(request, headerName) {
  if (!request?.headers?.get) {
    return '';
  }

  return normalizeValue(request.headers.get(headerName));
}

function hashValue(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return '';
  }

  return createHash('sha256').update(normalized).digest('hex');
}

export function resolveRequestId(request) {
  const fromRequest =
    readHeader(request, 'x-request-id') ||
    readHeader(request, 'x-correlation-id') ||
    readHeader(request, 'x-vercel-id');

  if (fromRequest) {
    return fromRequest;
  }

  return `req_${randomUUID()}`;
}

export function resolveIdempotencyKey({
  explicitKey = null,
  request = null,
  fallbackSeed = '',
} = {}) {
  const fromHeader =
    readHeader(request, 'idempotency-key') || readHeader(request, 'x-idempotency-key');

  if (fromHeader) {
    return fromHeader;
  }

  const normalizedExplicit = normalizeValue(explicitKey);

  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  const normalizedSeed = normalizeValue(fallbackSeed);

  if (!normalizedSeed) {
    return '';
  }

  return `idem_${hashValue(normalizedSeed).slice(0, 32)}`;
}

export function buildInternalRequestMeta({
  request = null,
  authContext = null,
  idempotencyKey = null,
  source = null,
} = {}) {
  const requestId = resolveRequestId(request);
  const userId = normalizeValue(authContext?.userId);
  const sessionId = normalizeValue(authContext?.sessionJti);
  const traceId = `trace_${hashValue(requestId).slice(0, 24)}`;
  const resolvedIdempotencyKey = resolveIdempotencyKey({
    explicitKey: idempotencyKey,
    request,
    fallbackSeed: `${source || ''}|${userId || ''}|${sessionId || ''}|${requestId}`,
  });

  return {
    idempotencyKey: resolvedIdempotencyKey || null,
    requestId,
    sessionId: sessionId || null,
    traceId,
    userId: userId || null,
  };
}

export function setResponseRequestMeta(response, requestMeta = {}) {
  if (!response?.headers?.set) {
    return response;
  }

  const requestId = normalizeValue(requestMeta?.requestId);
  const traceId = normalizeValue(requestMeta?.traceId);

  if (requestId) {
    response.headers.set('x-request-id', requestId);
  }

  if (traceId) {
    response.headers.set('x-trace-id', traceId);
  }

  return response;
}

export function createApiSuccessResponse(
  data = null,
  { status = 200, code = 'OK', message = 'OK', requestMeta, legacyPayload = null } = {},
) {
  const envelope = buildApiSuccessResult(data, {
    code,
    message,
    requestId: requestMeta?.requestId,
  });
  const response = NextResponse.json(
    {
      ...(legacyPayload && typeof legacyPayload === 'object' ? legacyPayload : {}),
      ...envelope,
    },
    {
      status,
    },
  );

  return setResponseRequestMeta(response, requestMeta);
}

export function createApiErrorResponse(
  { message = 'Request failed', code = 'INTERNAL_ERROR', retryable = false, data = null } = {},
  { retryAfterSeconds = null, status = 500, requestMeta } = {},
) {
  const normalizedMessage = normalizeErrorMessage({ message }, 'Request failed');
  const normalizedCode = normalizeErrorCode({ code }, 'INTERNAL_ERROR');
  const response = NextResponse.json(
    {
      ...buildApiErrorResult({
        code: normalizedCode,
        data,
        message: normalizedMessage,
        requestId: requestMeta?.requestId,
        retryable,
      }),
      error: normalizedMessage,
    },
    { status },
  );

  if (Number.isFinite(Number(retryAfterSeconds))) {
    response.headers.set('Retry-After', String(Math.max(1, Math.ceil(retryAfterSeconds))));
  }

  return setResponseRequestMeta(response, requestMeta);
}

const UNAUTHORIZED_MESSAGE_PATTERNS = Object.freeze([
  'authentication session is required',
  'invalid or expired authentication token',
  'authentication token has been revoked',
]);

const DEFAULT_CLIENT_ERROR_PATTERNS = Object.freeze([
  'not found',
  'already been resolved',
  'cannot follow yourself',
  'invalid',
  'required',
  'unsupported',
]);

function hasMessagePattern(message, patterns = []) {
  return patterns.some((pattern) => message.includes(pattern));
}

export function createRouteRequestMeta(request, source) {
  return buildInternalRequestMeta({
    request,
    source,
  });
}

export function createRouteAuthMeta(requestMeta, authContext, userId = null) {
  return {
    ...requestMeta,
    sessionId: authContext?.sessionJti || null,
    userId: userId || authContext?.userId || null,
  };
}

export function normalizeRouteErrorMessage(error, fallbackMessage) {
  return normalizeErrorMessage(error, fallbackMessage);
}

export function resolveRouteStatusCode(
  message,
  { clientErrorPatterns = DEFAULT_CLIENT_ERROR_PATTERNS } = {},
) {
  const normalizedMessage = normalizeValue(message).toLowerCase();

  if (hasMessagePattern(normalizedMessage, UNAUTHORIZED_MESSAGE_PATTERNS)) {
    return 401;
  }

  if (hasMessagePattern(normalizedMessage, clientErrorPatterns)) {
    return 400;
  }

  return 500;
}

export function createRouteValidationErrorResponse({
  authContext,
  message,
  requestMeta,
  status = 400,
  userId = null,
}) {
  return createApiErrorResponse(
    {
      code: 'VALIDATION_ERROR',
      message,
    },
    {
      requestMeta: createRouteAuthMeta(requestMeta, authContext, userId),
      status,
    },
  );
}

export function createRouteSuccessResponse({
  authContext,
  payload,
  requestMeta,
  userId = null,
  legacyPayload = null,
}) {
  const resolvedLegacyPayload =
    legacyPayload && typeof legacyPayload === 'object' ? legacyPayload : payload;

  return createApiSuccessResponse(payload, {
    legacyPayload: resolvedLegacyPayload,
    requestMeta: createRouteAuthMeta(requestMeta, authContext, userId),
  });
}

export function createRouteErrorResponse({
  code,
  error,
  fallbackMessage,
  requestMeta,
  clientErrorPatterns = DEFAULT_CLIENT_ERROR_PATTERNS,
}) {
  const message = normalizeRouteErrorMessage(error, fallbackMessage);
  const status = normalizeErrorStatus(
    error,
    resolveRouteStatusCode(message, {
      clientErrorPatterns,
    }),
  );

  return createApiErrorResponse(
    {
      code: status === 401 ? 'UNAUTHORIZED' : normalizeErrorCode(error, code),
      data: error?.data || null,
      message,
      retryable: error?.retryable === true,
    },
    {
      requestMeta,
      status,
    },
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = normalizeValue(searchParams.get('domain'));
  const endpoint = normalizeValue(searchParams.get('endpoint'));
  const userId = normalizeValue(searchParams.get('userId'));

  if (!domain || !endpoint || !userId) {
    return NextResponse.json(
      {
        error: 'domain, endpoint and userId are required',
      },
      {
        status: 400,
      },
    );
  }

  const decision = resolveWriteRolloutDecision({
    domain,
    endpoint,
    userId,
  });

  return NextResponse.json({
    decision,
  });
}

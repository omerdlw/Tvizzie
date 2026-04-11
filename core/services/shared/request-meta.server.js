import { createHash, randomUUID } from 'crypto';

function normalizeValue(value) {
  return String(value || '').trim();
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

export function resolveIdempotencyKey({ explicitKey = null, request = null, fallbackSeed = '' } = {}) {
  const fromHeader = readHeader(request, 'idempotency-key') || readHeader(request, 'x-idempotency-key');

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

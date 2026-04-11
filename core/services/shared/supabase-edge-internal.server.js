import 'server-only';

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';
import {
  buildInternalRequestMeta,
  resolveIdempotencyKey,
  resolveRequestId,
} from '@/core/services/shared/request-meta.server';
import { normalizeApiResultEnvelope } from '@/core/services/shared/api-result';

function normalizeValue(value) {
  return String(value || '').trim();
}

function assertEdgeInvocationEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server admin environment is not configured');
  }

  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);

  if (!internalToken) {
    throw new Error('INFRA_INTERNAL_TOKEN is required for internal edge function calls');
  }

  return {
    internalToken,
  };
}

function resolveRetryCount(method, retryCount) {
  const explicit = Number(retryCount);

  if (Number.isFinite(explicit) && explicit >= 0) {
    return explicit;
  }

  return String(method || 'POST').toUpperCase() === 'GET' ? 1 : 0;
}

function shouldRetry(error = null) {
  const status = Number(error?.status || 0);

  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const message = normalizeValue(error?.message || '').toLowerCase();

  return (
    message.includes('timed out') ||
    message.includes('temporarily unavailable') ||
    message.includes('network') ||
    message.includes('fetch failed')
  );
}

function wait(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

async function callInternalEdge({
  normalizedFunctionName,
  method,
  body,
  timeoutMs,
  requestMeta,
  idempotencyKey,
  internalToken,
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${normalizedFunctionName}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-idempotency-key': idempotencyKey || '',
        'x-infra-internal-token': internalToken,
        'x-request-id': requestMeta?.requestId || '',
        'x-session-id': requestMeta?.sessionId || '',
        'x-trace-id': requestMeta?.traceId || '',
        'x-user-id': requestMeta?.userId || '',
      },
      cache: 'no-store',
      signal: controller.signal,
      body: body === undefined || body === null ? undefined : JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const envelope = normalizeApiResultEnvelope(payload, {
        fallbackCode: 'EDGE_FUNCTION_ERROR',
        fallbackMessage: `Edge function ${normalizedFunctionName} failed with status ${response.status}`,
      });
      const error = new Error(
        normalizeValue(payload?.error) || envelope.message || `Edge function ${normalizedFunctionName} failed`
      );

      error.status = response.status;
      error.code = envelope.code || 'EDGE_FUNCTION_ERROR';
      error.retryable = envelope.retryable;
      error.requestId = requestMeta?.requestId || envelope?.requestId || null;
      error.data = payload;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Edge function ${normalizedFunctionName} timed out`);
      timeoutError.status = 504;
      timeoutError.code = 'EDGE_TIMEOUT';
      timeoutError.retryable = true;
      timeoutError.requestId = requestMeta?.requestId || null;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function invokeInternalEdgeFunction(
  functionName,
  {
    method = 'POST',
    body = {},
    timeoutMs = 15000,
    request = null,
    requestMeta = null,
    retryCount = null,
    retryDelayMs = 125,
    idempotencyKey = null,
    source = null,
  } = {}
) {
  const normalizedFunctionName = normalizeValue(functionName);

  if (!normalizedFunctionName) {
    throw new Error('Edge function name is required');
  }

  const { internalToken } = assertEdgeInvocationEnv();
  const resolvedRequestMeta =
    requestMeta ||
    buildInternalRequestMeta({
      authContext: {
        sessionJti: requestMeta?.sessionId || body?.sessionJti || null,
        userId: requestMeta?.userId || body?.userId || null,
      },
      request,
      source: source || normalizedFunctionName,
    });

  if (!resolvedRequestMeta.requestId) {
    resolvedRequestMeta.requestId = resolveRequestId(request);
  }

  const resolvedIdempotencyKey =
    normalizeValue(idempotencyKey) ||
    resolveIdempotencyKey({
      explicitKey: requestMeta?.idempotencyKey,
      request,
      fallbackSeed: `${normalizedFunctionName}|${resolvedRequestMeta.requestId}`,
    });
  const resolvedRetryCount = Math.max(0, resolveRetryCount(method, retryCount));

  let attempt = 0;

  while (attempt <= resolvedRetryCount) {
    try {
      return await callInternalEdge({
        body,
        idempotencyKey: resolvedIdempotencyKey,
        internalToken,
        method,
        normalizedFunctionName,
        requestMeta: resolvedRequestMeta,
        timeoutMs,
      });
    } catch (error) {
      const shouldRetryNow = attempt < resolvedRetryCount && shouldRetry(error);

      if (!shouldRetryNow) {
        throw error;
      }

      const delayMs = Math.min(1000, Math.max(0, Number(retryDelayMs) || 0) * Math.pow(2, attempt));
      await wait(delayMs);
      attempt += 1;
    }
  }

  throw new Error(`Edge function ${normalizedFunctionName} failed`);
}

export async function invokeInternalEdgeFunctionResult(functionName, options = {}) {
  const payload = await invokeInternalEdgeFunction(functionName, options);
  return normalizeApiResultEnvelope(payload, {
    fallbackCode: 'OK',
    fallbackMessage: 'OK',
  });
}

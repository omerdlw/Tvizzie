import 'server-only';

import { normalizeErrorCode, normalizeErrorMessage, normalizeErrorStatus } from '@/core/services/shared/app-error';
import { buildInternalRequestMeta, createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/server';
import { normalizeValue } from '@/core/utils/string';

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

export function resolveRouteStatusCode(message, { clientErrorPatterns = DEFAULT_CLIENT_ERROR_PATTERNS } = {}) {
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
    }
  );
}

export function createRouteSuccessResponse({
  authContext,
  payload,
  requestMeta,
  userId = null,
  legacyPayload = null,
}) {
  const resolvedLegacyPayload = legacyPayload && typeof legacyPayload === 'object' ? legacyPayload : payload;

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
    })
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
    }
  );
}

import 'server-only';

import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';

export function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeErrorMessage(error, fallbackMessage) {
  return normalizeValue(error?.message || fallbackMessage);
}

function resolveWriteStatusCode(message) {
  const normalizedMessage = normalizeValue(message).toLowerCase();

  if (
    normalizedMessage.includes('authentication session is required') ||
    normalizedMessage.includes('invalid or expired authentication token') ||
    normalizedMessage.includes('authentication token has been revoked')
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('already been resolved') ||
    normalizedMessage.includes('cannot follow yourself') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('unsupported')
  ) {
    return 400;
  }

  return 500;
}

export function createRequestMeta(request, source) {
  return buildInternalRequestMeta({
    request,
    source,
  });
}

export function createValidationErrorResponse({ authContext, message, requestMeta, status = 400, userId }) {
  return createApiErrorResponse(
    {
      code: 'VALIDATION_ERROR',
      message,
    },
    {
      requestMeta: {
        ...requestMeta,
        sessionId: authContext?.sessionJti || null,
        userId: userId || authContext?.userId || null,
      },
      status,
    }
  );
}

export function createWriteSuccessResponse({ authContext, payload, requestMeta, userId }) {
  return createApiSuccessResponse(payload, {
    legacyPayload: payload,
    requestMeta: {
      ...requestMeta,
      sessionId: authContext.sessionJti,
      userId: userId || authContext.userId,
    },
  });
}

export function createWriteErrorResponse({ code, error, fallbackMessage, requestMeta }) {
  const message = normalizeErrorMessage(error, fallbackMessage);
  const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

  return createApiErrorResponse(
    {
      code: status === 401 ? 'UNAUTHORIZED' : code,
      message,
    },
    {
      requestMeta,
      status,
    }
  );
}

import { normalizeValue } from '@/core/utils/string';
import { NextResponse } from 'next/server';

import { normalizeErrorCode, normalizeErrorMessage } from './app-error.js';
import { buildApiErrorResult, buildApiSuccessResult } from './api-result.js';
import { setResponseRequestMeta } from './request-meta.server.js';

export function createApiSuccessResponse(
  data = null,
  { status = 200, code = 'OK', message = 'OK', requestMeta, legacyPayload = null } = {}
) {
  const envelope = buildApiSuccessResult(data, { code, message, requestId: requestMeta?.requestId });
  const response = NextResponse.json(
    {
      ...(legacyPayload && typeof legacyPayload === 'object' ? legacyPayload : {}),
      ...envelope,
    },
    {
      status,
    }
  );

  return setResponseRequestMeta(response, requestMeta);
}

export function createApiErrorResponse(
  { message = 'Request failed', code = 'INTERNAL_ERROR', retryable = false, data = null } = {},
  { status = 500, requestMeta } = {}
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
    { status }
  );

  return setResponseRequestMeta(response, requestMeta);
}

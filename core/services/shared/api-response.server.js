import { NextResponse } from 'next/server';

import { buildApiErrorResult, buildApiSuccessResult } from '@/core/services/shared/api-result';
import { setResponseRequestMeta } from '@/core/services/shared/request-meta.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

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
  const normalizedMessage = normalizeValue(message) || 'Request failed';
  const response = NextResponse.json(
    {
      ...buildApiErrorResult({
        code,
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

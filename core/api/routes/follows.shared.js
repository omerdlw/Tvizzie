import 'server-only';

import {
  createRouteErrorResponse,
  createRouteRequestMeta,
  createRouteSuccessResponse,
  createRouteValidationErrorResponse,
} from './route-context.server';

import { normalizeValue } from '@/core/utils/string';

export { normalizeValue };

export function createRequestMeta(request, source) {
  return createRouteRequestMeta(request, source);
}

export function createValidationErrorResponse({ authContext, message, requestMeta, status = 400, userId }) {
  return createRouteValidationErrorResponse({
    authContext,
    message,
    requestMeta,
    status,
    userId,
  });
}

export function createWriteSuccessResponse({ authContext, payload, requestMeta, userId }) {
  return createRouteSuccessResponse({
    authContext,
    payload,
    requestMeta,
    userId,
    legacyPayload: payload,
  });
}

export function createWriteErrorResponse({ code, error, fallbackMessage, requestMeta }) {
  return createRouteErrorResponse({
    code,
    error,
    fallbackMessage,
    requestMeta,
    clientErrorPatterns: [
      'not found',
      'already been resolved',
      'cannot follow yourself',
      'invalid',
      'required',
      'unsupported',
    ],
  });
}

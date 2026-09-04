import { normalizeValue, requestJson } from '@/shared';
import { createAuthenticatedDataClient } from '@/infrastructure/supabase/client';

export const RATE_LIMIT_FALLBACK_MODE = 'auto';
export const ROLLOUT_DEFAULT_MODE = 'shadow';
export const ROLLOUT_CANARY_PERCENT = 0;

const DEFAULT_ERROR_CODE = 'INTERNAL_ERROR';
const DEFAULT_ERROR_MESSAGE = 'Request failed';

export class AppError extends Error {
  constructor(
    message = DEFAULT_ERROR_MESSAGE,
    { code = DEFAULT_ERROR_CODE, data = null, retryable = false, status = 500 } = {},
  ) {
    super(normalizeValue(message) || DEFAULT_ERROR_MESSAGE);
    this.name = 'AppError';
    this.code = normalizeValue(code) || DEFAULT_ERROR_CODE;
    this.data = data;
    this.retryable = Boolean(retryable);
    this.status = Number.isFinite(Number(status)) ? Number(status) : 500;
  }
}

export function createAppError(message, options = {}) {
  return new AppError(message, options);
}

export function isAppError(error) {
  return error instanceof AppError || error?.name === 'AppError';
}

export function normalizeErrorMessage(error, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  return normalizeValue(error?.message || fallbackMessage) || DEFAULT_ERROR_MESSAGE;
}

export function normalizeErrorCode(error, fallbackCode = DEFAULT_ERROR_CODE) {
  return normalizeValue(error?.code || fallbackCode) || DEFAULT_ERROR_CODE;
}

export function normalizeErrorStatus(error, fallbackStatus = 500) {
  const status = Number(error?.status ?? error?.statusCode ?? fallbackStatus);
  return Number.isFinite(status) ? status : fallbackStatus;
}

export function buildApiSuccessResult(
  data = null,
  { code = 'OK', message = 'OK', requestId = null } = {},
) {
  const payload = {
    code: normalizeValue(code) || 'OK',
    data,
    message: normalizeValue(message) || 'OK',
    ok: true,
    retryable: false,
  };

  if (requestId) {
    payload.requestId = normalizeValue(requestId);
  }

  return payload;
}

export function buildApiErrorResult({
  code = 'INTERNAL_ERROR',
  message = 'Request failed',
  retryable = false,
  data = null,
  requestId = null,
} = {}) {
  const payload = {
    code: normalizeValue(code) || 'INTERNAL_ERROR',
    data,
    message: normalizeValue(message) || 'Request failed',
    ok: false,
    retryable: Boolean(retryable),
  };

  if (requestId) {
    payload.requestId = normalizeValue(requestId);
  }

  return payload;
}

export function isApiResultEnvelope(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'ok') &&
    Object.prototype.hasOwnProperty.call(value, 'code') &&
    Object.prototype.hasOwnProperty.call(value, 'message') &&
    Object.prototype.hasOwnProperty.call(value, 'retryable'),
  );
}

export function normalizeApiResultEnvelope(
  value,
  { fallbackCode = 'OK', fallbackMessage = 'OK' } = {},
) {
  if (isApiResultEnvelope(value)) {
    return {
      code: normalizeValue(value.code) || (value.ok ? 'OK' : 'INTERNAL_ERROR'),
      data: value.data ?? null,
      message: normalizeValue(value.message) || (value.ok ? 'OK' : 'Request failed'),
      ok: Boolean(value.ok),
      requestId: normalizeValue(value.requestId) || null,
      retryable: Boolean(value.retryable),
    };
  }

  return {
    code: normalizeValue(fallbackCode) || 'OK',
    data: value ?? null,
    message: normalizeValue(fallbackMessage) || 'OK',
    ok: true,
    requestId: null,
    retryable: false,
  };
}

export function unwrapApiResultEnvelope(value) {
  const normalized = normalizeApiResultEnvelope(value);

  if (!normalized.ok) {
    const error = new Error(normalized.message || 'Request failed');
    error.code = normalized.code || 'INTERNAL_ERROR';
    error.data = normalized.data;
    error.retryable = Boolean(normalized.retryable);
    error.requestId = normalized.requestId || null;
    throw error;
  }

  return normalized.data;
}

export async function requestApiJson(path, options = {}) {
  const payload = await requestJson(path, options);
  return isApiResultEnvelope(payload) ? normalizeApiResultEnvelope(payload).data : payload;
}

export function getSupabaseClient() {
  return createAuthenticatedDataClient();
}

export function normalizeSupabaseError(error, fallbackMessage) {
  const message =
    normalizeValue(error?.message) ||
    normalizeValue(error?.error_description) ||
    normalizeValue(fallbackMessage) ||
    'Supabase request failed';
  const normalized = new Error(message);

  normalized.name = error?.name || 'SupabaseError';
  normalized.code = normalizeValue(error?.code || '') || null;
  normalized.status = Number(error?.status) || 0;
  normalized.data = error || null;

  return normalized;
}

export function assertSupabaseResult(result, fallbackMessage) {
  if (result?.error) {
    throw normalizeSupabaseError(result.error, fallbackMessage);
  }

  return result;
}

export function toIsoTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

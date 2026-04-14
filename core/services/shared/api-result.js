function normalizeValue(value) {
  return String(value || '').trim();
}

export function buildApiSuccessResult(data = null, { code = 'OK', message = 'OK', requestId = null } = {}) {
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
    Object.prototype.hasOwnProperty.call(value, 'retryable')
  );
}

export function normalizeApiResultEnvelope(value, { fallbackCode = 'OK', fallbackMessage = 'OK' } = {}) {
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

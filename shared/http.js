const CSRF_COOKIE_NAME = 'tvz_auth_csrf';
const CSRF_ENDPOINT = '/api/auth/csrf';
const RETRIABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let csrfRequest = null;

export class ApiRequestError extends Error {
  constructor(payload, fallbackMessage = 'Request failed', status = 0) {
    super(payload?.error || payload?.message || fallbackMessage);
    this.name = 'ApiRequestError';
    this.code = payload?.code || null;
    this.data = payload || null;
    this.status = status;
  }
}

function buildUrl(path, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function readBrowserCookie(name) {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const entry = String(document.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  if (!entry) return '';

  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return '';
  }
}

function hasHeader(headers, targetName) {
  const normalizedTarget = targetName.toLowerCase();
  return Object.keys(headers).some((name) => name.toLowerCase() === normalizedTarget);
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function createRequestBody(body, headers) {
  if (body === undefined) return undefined;
  if (isFormData(body)) return body;

  if (!hasHeader(headers, 'Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }

  return JSON.stringify(body);
}

function createTimeout(timeoutMs) {
  const controller = new AbortController();
  const duration = Number(timeoutMs);
  const timeoutId =
    Number.isFinite(duration) && duration > 0
      ? setTimeout(() => controller.abort(), duration)
      : null;

  return {
    signal: timeoutId ? controller.signal : undefined,
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

function isRetriableNetworkError(error) {
  return ['ETIMEDOUT', 'ECONNRESET', 'UND_ERR_CONNECT_TIMEOUT'].includes(error?.code);
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(delayMs) || 0)));
}

function getCsrfToken() {
  return readBrowserCookie(CSRF_COOKIE_NAME);
}

async function ensureCsrfToken({ force = false } = {}) {
  const existingToken = !force && getCsrfToken();
  if (existingToken) return existingToken;
  if (!force && csrfRequest) return csrfRequest;

  const request = requestJson(CSRF_ENDPOINT, {
    csrf: false,
    fallbackMessage: 'CSRF token could not be initialized',
    retryCount: 0,
  })
    .then((payload) => {
      if (!payload?.csrfToken) {
        throw new ApiRequestError(payload, 'CSRF token could not be initialized');
      }
      return payload.csrfToken;
    })
    .finally(() => {
      if (csrfRequest === request) csrfRequest = null;
    });

  csrfRequest = request;
  return request;
}

export async function requestJson(
  path,
  {
    body,
    cache = 'no-store',
    credentials = 'include',
    csrf = true,
    fallbackMessage = 'Request failed',
    headers = {},
    keepalive = false,
    method = 'GET',
    query = null,
    retryCount,
    retryDelayMs = 120,
    timeoutMs = 15000,
  } = {},
) {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const maxAttempts = Math.max(
    1,
    Number(retryCount === undefined ? (normalizedMethod === 'GET' ? 1 : 0) : retryCount) + 1,
  );
  const requestHeaders = { Accept: 'application/json', ...headers };

  if (csrf && !SAFE_METHODS.has(normalizedMethod) && !hasHeader(requestHeaders, 'X-CSRF-Token')) {
    requestHeaders['X-CSRF-Token'] = await ensureCsrfToken();
  }

  const requestBody = createRequestBody(body, requestHeaders);
  const url = buildUrl(path, query);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeout = createTimeout(timeoutMs);

    try {
      const response = await fetch(url, {
        body: requestBody,
        cache,
        credentials,
        headers: requestHeaders,
        keepalive,
        method: normalizedMethod,
        signal: timeout.signal,
      });
      const payload = await response.json().catch(() => null);

      if (response.ok) return payload;

      const error = new ApiRequestError(payload, fallbackMessage, response.status);
      if (attempt >= maxAttempts || !RETRIABLE_STATUS_CODES.has(response.status)) throw error;
    } catch (error) {
      const normalizedError =
        error?.name === 'AbortError'
          ? Object.assign(new ApiRequestError(null, 'Request timed out', 408), {
              code: 'ETIMEDOUT',
            })
          : error;
      const canRetry =
        attempt < maxAttempts &&
        (isRetriableNetworkError(normalizedError) ||
          RETRIABLE_STATUS_CODES.has(Number(normalizedError?.status)));

      if (!canRetry) throw normalizedError;
    } finally {
      timeout.clear();
    }

    await wait(retryDelayMs);
  }

  throw new ApiRequestError(null, fallbackMessage);
}

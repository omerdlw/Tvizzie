function buildUrl(path, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function requestApiJson(
  path,
  {
    method = 'GET',
    query = null,
    body,
    headers = {},
    cache = 'no-store',
    // Fail fast to avoid "page takes forever" UX when the network/API stalls.
    timeoutMs = 15000,
    retryCount = method === 'GET' ? 1 : 0,
    retryDelayMs = 120,
  } = {}
) {
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  const maxAttempts = Math.max(1, Number(retryCount) + 1);
  const retriableStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);
  const url = buildUrl(path, query);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId =
      Number.isFinite(Number(timeoutMs)) && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(url, {
        method,
        cache,
        credentials: 'include',
        signal: controller.signal,
        headers:
          body === undefined
            ? requestHeaders
            : {
                ...requestHeaders,
                'Content-Type': 'application/json',
              },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({ error: 'Request failed' }));

      if (!response.ok) {
        const error = new Error(payload?.error || 'Request failed');
        error.status = response.status;
        error.data = payload;

        const canRetry = attempt < maxAttempts && retriableStatusCodes.has(response.status);

        if (!canRetry) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(retryDelayMs) || 0)));
        continue;
      }

      return payload;
    } catch (error) {
      const isTimeoutAbort = error?.name === 'AbortError';
      const normalizedError = isTimeoutAbort
        ? Object.assign(new Error('Request timed out'), {
            status: 408,
            code: 'ETIMEDOUT',
          })
        : error;
      const retriableNetworkError =
        normalizedError?.code === 'ETIMEDOUT' ||
        normalizedError?.code === 'ECONNRESET' ||
        normalizedError?.code === 'UND_ERR_CONNECT_TIMEOUT';
      const canRetry =
        attempt < maxAttempts && (retriableNetworkError || retriableStatusCodes.has(Number(normalizedError?.status)));

      if (!canRetry) {
        throw normalizedError;
      }

      await new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(retryDelayMs) || 0)));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw new Error('Request failed');
}

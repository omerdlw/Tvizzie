function buildUrl(path, query = {}) {
  const params = new URLSearchParams()

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    params.set(key, String(value))
  })

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
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
  } = {}
) {
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }
  const controller = new AbortController()
  const timeoutId = Number.isFinite(Number(timeoutMs)) && timeoutMs > 0
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null

  let response
  try {
    response = await fetch(buildUrl(path, query), {
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
    })
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)

    // `fetch` abort surfaces as an `AbortError` in browsers/undici.
    if (error?.name === 'AbortError') {
      const timedOut = new Error('Request timed out')
      timedOut.status = 408
      timedOut.code = 'ETIMEDOUT'
      throw timedOut
    }

    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  const payload = await response.json().catch(() => ({ error: 'Request failed' }))

  if (!response.ok) {
    const error = new Error(payload?.error || 'Request failed')
    error.status = response.status
    error.data = payload
    throw error
  }

  return payload
}

import { createAuthAdapter } from './create-adapter'

const DEFAULT_ENDPOINTS = {
  confirmPasswordReset: '/password/confirm-reset',
  requestPasswordReset: '/password/request-reset',
  refresh: '/refresh',
  profile: '/profile',
  session: '/session',
  signIn: '/sign-in',
  signOut: '/sign-out',
  signUp: '/sign-up',
}

function createAuthAdapterError(message, status = 0, data = null) {
  const error = new Error(message)
  error.name = 'AuthAdapterError'
  error.status = status
  error.data = data
  return error
}

function defaultMapResponse(payload) {
  if (payload?.session) return payload.session
  if (payload?.data?.session) return payload.data.session
  if (payload?.data) return payload.data
  return payload
}

function resolveUrl(baseUrl, endpoint) {
  if (!endpoint) return null
  if (/^https?:\/\//i.test(endpoint)) return endpoint

  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '')
  const normalizedEndpoint = String(endpoint).startsWith('/')
    ? endpoint
    : `/${endpoint}`

  return normalizedBaseUrl
    ? `${normalizedBaseUrl}${normalizedEndpoint}`
    : normalizedEndpoint
}

async function requestJson(
  url,
  { body, headers = {}, method = 'GET', withCredentials = true } = {}
) {
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  const requestInit = {
    credentials: withCredentials ? 'include' : 'omit',
    method,
    headers: requestHeaders,
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    requestInit.body = JSON.stringify(body)
  }

  const response = await fetch(url, requestInit)
  const contentType = response.headers.get('content-type') || ''

  let payload = null

  if (response.status !== 204) {
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null)
    } else {
      const textPayload = await response.text().catch(() => '')
      payload = textPayload || null
    }
  }

  if (!response.ok) {
    const errorMessage =
      payload?.message ||
      payload?.error ||
      `Authentication request failed with status ${response.status}`

    throw createAuthAdapterError(errorMessage, response.status, payload)
  }

  return payload
}

export function createApiAuthAdapter(options = {}) {
  const {
    mapResponse = defaultMapResponse,
    withCredentials = true,
    endpoints = {},
    getHeaders,
    headers = {},
    baseUrl = '',
  } = options
  const resolvedEndpoints = {
    ...DEFAULT_ENDPOINTS,
    ...endpoints,
  }

  async function callEndpoint(endpointKey, requestOptions = {}, context = {}) {
    const endpoint = resolvedEndpoints[endpointKey]

    if (!endpoint) {
      throw createAuthAdapterError(
        `API auth adapter endpoint "${endpointKey}" is not configured`
      )
    }

    const resolvedHeaders =
      typeof getHeaders === 'function'
        ? await getHeaders(endpointKey, context)
        : {}

    const sessionToken = context?.session?.accessToken

    return requestJson(resolveUrl(baseUrl, endpoint), {
      ...requestOptions,
      headers: {
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...headers,
        ...resolvedHeaders,
        ...(requestOptions.headers || {}),
      },
      withCredentials,
    })
  }

  return createAuthAdapter({
    name: 'api',
    async confirmPasswordReset(payload, context = {}) {
      return callEndpoint(
        'confirmPasswordReset',
        { body: payload, method: 'POST' },
        context
      )
    },
    async getSession(context = {}) {
      if (!resolvedEndpoints.session) return context.session || null

      const payload = await callEndpoint('session', { method: 'GET' }, context)
      return mapResponse(payload, 'getSession', context)
    },
    async refreshSession(session, context = {}) {
      if (!resolvedEndpoints.refresh) return session || null

      const payload = await callEndpoint(
        'refresh',
        { body: { refreshToken: session?.refreshToken }, method: 'POST' },
        { ...context, session }
      )

      return mapResponse(payload, 'refreshSession', context)
    },
    async requestPasswordReset(payload, context = {}) {
      return callEndpoint(
        'requestPasswordReset',
        { body: payload, method: 'POST' },
        context
      )
    },
    async signIn(credentials, context = {}) {
      const payload = await callEndpoint(
        'signIn',
        { body: credentials, method: 'POST' },
        context
      )

      return mapResponse(payload, 'signIn', context)
    },
    async signOut(context = {}) {
      if (!resolvedEndpoints.signOut) return null

      await callEndpoint('signOut', { method: 'POST' }, context)
      return null
    },
    async signUp(payload, context = {}) {
      const responsePayload = await callEndpoint(
        'signUp',
        { body: payload, method: 'POST' },
        context
      )

      return mapResponse(responsePayload, 'signUp', context)
    },
    async updateProfile(payload, context = {}) {
      if (!resolvedEndpoints.profile) {
        throw createAuthAdapterError(
          'API auth adapter endpoint "profile" is not configured'
        )
      }

      const responsePayload = await callEndpoint(
        'profile',
        { body: payload, method: 'PATCH' },
        context
      )

      return mapResponse(responsePayload, 'updateProfile', context)
    },
  })
}

import { randomBytes } from 'crypto'

import { createServerClient } from '@supabase/ssr'

import {
  resolveAuthCapabilities,
  resolvePrimaryProvider,
  resolveProviderDescriptors,
  resolveProviderIds,
  uniqueStrings,
} from '@/lib/auth/capabilities'
import { createAdminAuthFacade } from '@/lib/auth/servers/session/supabase-admin-auth.server'
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  assertSupabaseBrowserEnv,
} from '@/lib/supabase/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertGoogleSessionConsistency } from '@/lib/auth/servers/providers/google-provider.server'

const RESERVED_CLAIM_KEYS = new Set([
  'aal',
  'amr',
  'app_metadata',
  'aud',
  'email',
  'exp',
  'iat',
  'iss',
  'phone',
  'role',
  'session_id',
  'sub',
  'user_metadata',
])

const LEGACY_CSRF_COOKIE_NAME = 'tvz_csrf'

export const CSRF_COOKIE_NAME = 'tvz_auth_csrf'
export const STEP_UP_COOKIE_NAME = 'tvz_stepup'
export const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000
export const STEP_UP_MAX_AGE_SECONDS = STEP_UP_MAX_AGE_MS / 1000
export const AUTH_COOKIE_PATH = '/'

function normalizeValue(value) {
  return String(value || '').trim()
}

function toLowercase(value) {
  return normalizeValue(value).toLowerCase()
}

function getAuthorizationHeader(request) {
  return normalizeValue(request?.headers?.get?.('authorization'))
}

function getBearerToken(request) {
  const header = getAuthorizationHeader(request)

  if (!header.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return normalizeValue(header.slice(7))
}

function getCookieHeaderValue(request) {
  return normalizeValue(request?.headers?.get?.('cookie'))
}

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) {
    return []
  }

  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf('=')

      if (separatorIndex < 0) {
        return null
      }

      return {
        name: item.slice(0, separatorIndex),
        value: item.slice(separatorIndex + 1),
      }
    })
    .filter(Boolean)
}

function getRequestCookies(request) {
  const cookieStoreValues = request?.cookies?.getAll?.()

  if (Array.isArray(cookieStoreValues) && cookieStoreValues.length > 0) {
    return cookieStoreValues
      .map((cookie) => ({
        name: normalizeValue(cookie?.name),
        value: normalizeValue(cookie?.value),
      }))
      .filter((cookie) => cookie.name)
  }

  return parseCookieHeader(getCookieHeaderValue(request))
}

function createRequestSupabaseClient(request) {
  assertSupabaseBrowserEnv()

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return getRequestCookies(request)
      },
      setAll() {
        // Route handlers manage cookie writes explicitly on response objects.
      },
    },
  })
}

function decodeJwtPayload(token) {
  const normalizedToken = normalizeValue(token)

  if (!normalizedToken) {
    return {}
  }

  const parts = normalizedToken.split('.')

  if (parts.length < 2) {
    return {}
  }

  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8')
    const payload = JSON.parse(payloadJson)

    if (payload && typeof payload === 'object') {
      return payload
    }
  } catch {
    return {}
  }

  return {}
}

function toIsoDate(value) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function resolveCustomClaims(decodedToken = {}) {
  return Object.fromEntries(
    Object.entries(decodedToken || {}).filter(
      ([key]) => !RESERVED_CLAIM_KEYS.has(key)
    )
  )
}

function resolveRolesAndCapabilities(decodedToken = {}) {
  const customClaims = resolveCustomClaims(decodedToken)
  const roles = uniqueStrings(customClaims.roles || customClaims.role)
  const permissions = uniqueStrings(customClaims.permissions)
  const capabilities = uniqueStrings([
    ...(Array.isArray(customClaims.capabilities)
      ? customClaims.capabilities
      : customClaims.capabilities
        ? [customClaims.capabilities]
        : []),
    ...permissions,
  ])

  return {
    capabilities,
    customClaims,
    permissions,
    roles,
  }
}

function resolveSupabaseProjectRef() {
  try {
    const hostname = new URL(SUPABASE_URL).hostname
    return hostname.split('.')[0] || ''
  } catch {
    return ''
  }
}

function listSupabaseAuthCookieNames(request = null) {
  const projectRef = resolveSupabaseProjectRef()

  const cookieNamesFromRequest = getRequestCookies(request)
    .map((cookie) => normalizeValue(cookie?.name))
    .filter(Boolean)

  const defaultNames = []

  if (projectRef) {
    const base = `sb-${projectRef}-auth-token`
    const chunkNames = Array.from({ length: 31 }, (_, index) => `${base}.${index}`)

    defaultNames.push(base, ...chunkNames, `${base}-code-verifier`)
  }

  const dynamicNames = cookieNamesFromRequest.filter((cookieName) => {
    const normalizedName = normalizeValue(cookieName)

    if (!normalizedName.startsWith('sb-')) {
      return false
    }

    if (normalizedName.includes('-auth-token')) {
      return true
    }

    if (!projectRef) {
      return false
    }

    return (
      normalizedName.startsWith(`sb-${projectRef}-auth-token`) ||
      normalizedName.startsWith(`sb-${projectRef}-`)
    )
  })

  return uniqueStrings([
    ...defaultNames,
    ...dynamicNames,
    'supabase-auth-token',
    'sb-access-token',
    'sb-refresh-token',
  ])
}

function normalizeSupabaseError(error) {
  const message = toLowercase(error?.message)

  if (
    message.includes('jwt') &&
    (message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('malformed') ||
      message.includes('not found'))
  ) {
    return new Error('Invalid or expired authentication token')
  }

  if (
    message.includes('session') &&
    (message.includes('missing') || message.includes('not found'))
  ) {
    return new Error('Authentication session is required')
  }

  return error
}

export function getCookieValue(request, cookieName) {
  const directValue = request?.cookies?.get?.(cookieName)?.value

  if (directValue) {
    return normalizeValue(directValue)
  }

  const cookieHeader = getCookieHeaderValue(request)

  if (!cookieHeader) {
    return ''
  }

  const prefix = `${cookieName}=`

  for (const item of cookieHeader.split(';')) {
    const normalizedItem = normalizeValue(item)

    if (normalizedItem.startsWith(prefix)) {
      return normalizeValue(decodeURIComponent(normalizedItem.slice(prefix.length)))
    }
  }

  return ''
}

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production'
}

function createCookieOptions({ httpOnly = true, maxAge, sameSite = 'lax' }) {
  return {
    httpOnly,
    maxAge,
    path: AUTH_COOKIE_PATH,
    sameSite,
    secure: isSecureCookieEnvironment(),
  }
}

export function setCsrfCookie(response, csrfToken) {
  response.cookies.set(
    CSRF_COOKIE_NAME,
    csrfToken,
    createCookieOptions({
      httpOnly: false,
      maxAge: 12 * 60 * 60,
      sameSite: 'lax',
    })
  )
}

export function clearCsrfCookie(response) {
  response.cookies.set(
    CSRF_COOKIE_NAME,
    '',
    createCookieOptions({
      httpOnly: false,
      maxAge: 0,
      sameSite: 'lax',
    })
  )

  response.cookies.set(
    LEGACY_CSRF_COOKIE_NAME,
    '',
    createCookieOptions({
      httpOnly: false,
      maxAge: 0,
      sameSite: 'lax',
    })
  )
}

export function applySessionCookies(response, { csrfToken } = {}) {
  if (normalizeValue(csrfToken)) {
    setCsrfCookie(response, csrfToken)
  }
}

function expireCookie(response, cookieName, { httpOnly = true } = {}) {
  response.cookies.delete(cookieName)
  response.cookies.set(cookieName, '', {
    httpOnly,
    maxAge: 0,
    expires: new Date(0),
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  })
}

export function clearAuthCookies(response, request = null) {
  clearCsrfCookie(response)
  expireCookie(response, 'tvz_session', { httpOnly: true })

  for (const cookieName of listSupabaseAuthCookieNames(request)) {
    expireCookie(response, cookieName, { httpOnly: true })
    expireCookie(response, cookieName, { httpOnly: false })
  }
}

export function createCsrfToken() {
  return randomBytes(32).toString('base64url')
}

function toFirebaseLikeUserRecord(user = null) {
  if (!user?.id) {
    return null
  }

  const providerData = resolveProviderDescriptors({
    identities: Array.isArray(user?.identities) ? user.identities : [],
    email: user?.email || null,
    userId: user?.id || null,
  }).map((provider) => ({
    email: provider.email,
    providerId: provider.id,
    uid: provider.uid,
  }))

  return {
    app_metadata: user?.app_metadata || {},
    disabled: user?.banned_until != null,
    displayName:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.name ||
      null,
    email: toLowercase(user?.email) || null,
    emailVerified:
      user?.email_confirmed_at != null ||
      user?.confirmed_at != null ||
      false,
    metadata: {
      creationTime: user?.created_at || null,
      lastSignInTime: user?.last_sign_in_at || null,
    },
    photoURL:
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.avatar ||
      null,
    providerData,
    uid: normalizeValue(user?.id),
    user_metadata: user?.user_metadata || {},
  }
}

export function buildSessionUser(decodedToken = {}, userRecord = null) {
  const accessModel = resolveRolesAndCapabilities(decodedToken)
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
    tokenClaims: decodedToken,
  })
  const providerDescriptors = resolveProviderDescriptors({
    providerData: userRecord?.providerData || [],
    email: userRecord?.email || decodedToken?.email || null,
    userId: userRecord?.uid || decodedToken?.sub || null,
  })
  const authCapabilities = resolveAuthCapabilities({
    providerIds,
    email: userRecord?.email || decodedToken?.email || null,
  })
  const metadata = {
    authCapabilities,
    claims: accessModel.customClaims,
    creationTime: userRecord?.metadata?.creationTime || null,
    emailVerified: Boolean(userRecord?.emailVerified || decodedToken?.email_verified),
    identityCount: providerDescriptors.length,
    lastSignInTime: userRecord?.metadata?.lastSignInTime || null,
    providerDescriptors,
    providerIds,
  }

  return {
    avatarUrl: userRecord?.photoURL || null,
    capabilities: accessModel.capabilities,
    email: toLowercase(userRecord?.email || decodedToken?.email) || null,
    id:
      normalizeValue(userRecord?.uid || decodedToken?.sub || decodedToken?.uid) ||
      null,
    metadata,
    name: userRecord?.displayName || toLowercase(userRecord?.email || decodedToken?.email) || null,
    permissions: accessModel.permissions,
    roles: accessModel.roles,
  }
}

export function buildNormalizedSession(decodedToken = {}, userRecord = null) {
  const user = buildSessionUser(decodedToken, userRecord)
  const expiresAt = Number(decodedToken?.exp)
  const capabilities = user?.metadata?.authCapabilities || resolveAuthCapabilities()

  return {
    capabilities,
    expiresAt:
      Number.isFinite(expiresAt) && expiresAt > 0
        ? toIsoDate(expiresAt * 1000)
        : null,
    metadata: user?.metadata || {},
    provider:
      capabilities.primaryProvider ||
      resolvePrimaryProvider(user?.metadata?.providerIds || []),
    user,
  }
}

function serializeClientSessionUser(user = null) {
  if (!user?.id) {
    return null
  }

  return {
    avatarUrl: user.avatarUrl || null,
    capabilities: Array.isArray(user.capabilities) ? user.capabilities : [],
    id: user.id,
    metadata: {
      authCapabilities: user?.metadata?.authCapabilities || resolveAuthCapabilities(),
      providerIds: Array.isArray(user?.metadata?.providerIds)
        ? user.metadata.providerIds
        : [],
    },
    name: user.name || null,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    roles: Array.isArray(user.roles) ? user.roles : [],
  }
}

export function serializeSessionState(authContext = null, stepUp = null) {
  if (!authContext?.session) {
    return {
      expiresAt: null,
      status: 'anonymous',
      user: null,
      capabilities: resolveAuthCapabilities(),
      stepUp: {
        purposes: Array.isArray(stepUp?.purposes) ? stepUp.purposes : [],
      },
    }
  }

  const serializedUser = serializeClientSessionUser(authContext.session.user)

  return {
    expiresAt: authContext.session.expiresAt || null,
    status: 'authenticated',
    user: serializedUser,
    capabilities:
      authContext.session.capabilities ||
      authContext.session.metadata?.authCapabilities ||
      resolveAuthCapabilities({
        providerIds: serializedUser?.metadata?.providerIds || [],
      }),
    stepUp: {
      purposes: Array.isArray(stepUp?.purposes) ? stepUp.purposes : [],
    },
  }
}

async function buildAuthContextFromAccessToken(accessToken, authMethod = 'session', predefinedUser = null) {
  const normalizedAccessToken = normalizeValue(accessToken)

  if (!normalizedAccessToken) {
    throw new Error('Authentication session is required')
  }

  const decodedToken = decodeJwtPayload(normalizedAccessToken)
  let rawUser = predefinedUser

  // Fallback to JWT payload if no user is provided. This safely extracts user ID and email
  // without hitting the DB, relying on the fact that Next.js middleware or session verification
  // has already validated the JWT signature (via getSession or auth guards).
  if (!rawUser) {
    if (!decodedToken?.sub) {
      throw new Error('Invalid or expired authentication token')
    }
    rawUser = {
      id: decodedToken.sub,
      email: decodedToken.email,
      app_metadata: decodedToken.app_metadata || {},
      user_metadata: decodedToken.user_metadata || {},
    }
  }

  const userRecord = toFirebaseLikeUserRecord(rawUser)
  const userId = normalizeValue(userRecord?.uid || rawUser?.id)
  const email = toLowercase(userRecord?.email || rawUser?.email)

  if (!userId) {
    throw new Error('Invalid or expired authentication token')
  }

  if (!email) {
    throw new Error('Authenticated user does not have an email address')
  }

  await assertGoogleSessionConsistency({
    accessToken: normalizedAccessToken,
    decodedToken,
    rawUser,
    userRecord,
  })

  return {
    accessToken: normalizedAccessToken,
    adminAuth: createAdminAuthFacade(),
    authMethod,
    decodedToken,
    email,
    session: buildNormalizedSession(decodedToken, userRecord),
    sessionCookie: null,
    sessionJti:
      normalizeValue(
        decodedToken?.session_id || decodedToken?.jti || decodedToken?.sub
      ) || null,
    userId,
    userRecord,
  }
}

export async function createSessionFromIdToken(idToken) {
  const normalizedIdToken = normalizeValue(idToken)

  if (!normalizedIdToken) {
    throw new Error('idToken is required')
  }

  const context = await buildAuthContextFromAccessToken(
    normalizedIdToken,
    'bearer'
  )

  return {
    ...context,
    csrfToken: createCsrfToken(),
  }
}

const SUPABASE_FALLBACK_TIMEOUT_MS = 5000

function isTransientNetworkError(error) {
  const message = toLowercase(error?.message)
  const cause = toLowercase(error?.cause?.message || error?.cause?.code)

  return (
    message.includes('fetch failed') ||
    message.includes('connect timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network request failed') ||
    cause.includes('connect timeout') ||
    cause.includes('und_err_connect_timeout')
  )
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Supabase session fetch timed out'))
    }, ms)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export function isTransientSessionError(error) {
  const message = toLowercase(error?.message)

  return (
    isTransientNetworkError(error) ||
    message.includes('supabase session fetch timed out')
  )
}

export async function readSessionFromRequest(
  request,
  { allowBearer = true } = {}
) {
  try {
    const bearerToken = allowBearer ? getBearerToken(request) : ''

    if (bearerToken) {
      return buildAuthContextFromAccessToken(bearerToken, 'bearer')
    }

    const cookieNames = listSupabaseAuthCookieNames(request)
    let accessToken = ''
    let sessionUser = null

    for (const cookieName of cookieNames) {
      const cookieValue = getCookieValue(request, cookieName)

      if (!cookieValue) {
        continue
      }

      try {
        const parsed = JSON.parse(cookieValue)
        const token = normalizeValue(parsed?.access_token)

        if (token) {
          const decoded = decodeJwtPayload(token)
          const expiresAt = Number(decoded?.exp || 0)

          if (expiresAt * 1000 > Date.now() + 60000) {
            accessToken = token
            sessionUser = parsed?.user || null
            break
          }
        }
      } catch {
      }
    }

    if (accessToken) {
      return buildAuthContextFromAccessToken(accessToken, 'session', sessionUser)
    }

    const supabase = createRequestSupabaseClient(request)

    let sessionResult
    try {
      sessionResult = await withTimeout(
        supabase.auth.getSession(),
        SUPABASE_FALLBACK_TIMEOUT_MS
      )
    } catch (fallbackError) {
      if (isTransientNetworkError(fallbackError) || isTransientSessionError(fallbackError)) {
        return null
      }
      throw fallbackError
    }

    if (sessionResult.error) {
      if (isTransientNetworkError(sessionResult.error)) {
        return null
      }
      throw normalizeSupabaseError(sessionResult.error)
    }

    const resultToken = normalizeValue(sessionResult.data?.session?.access_token)

    if (!resultToken) {
      return null
    }

    return buildAuthContextFromAccessToken(
      resultToken,
      'session',
      sessionResult.data?.session?.user || null
    )
  } catch (error) {
    if (isTransientNetworkError(error) || isTransientSessionError(error)) {
      return null
    }
    throw normalizeSupabaseError(error)
  }
}

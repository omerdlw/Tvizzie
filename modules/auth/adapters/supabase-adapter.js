import { resolveAuthCapabilities } from '@/lib/auth/capabilities'
import { createCsrfHeaders } from '@/lib/auth/clients/csrf.client'
import {
  buildGoogleOAuthCallbackUrl,
  normalizeGoogleAuthIntent,
  sanitizeAuthNextPath,
} from '@/lib/auth/oauth-callback'
import {
  createClient as createSupabaseClient,
  terminateBrowserSession,
} from '@/lib/supabase/client'

import { createAuthAdapter } from './create-adapter'

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase()
}

function resolveProviderKey(payload = {}) {
  const provider =
    payload?.provider || payload?.strategy || payload?.authProvider || null

  return normalizeValue(provider).toLowerCase()
}

function resolveNextPath(payload = {}) {
  return sanitizeAuthNextPath(payload?.nextPath || payload?.next, '/account')
}

function createRedirectResult() {
  return {
    requiresRedirect: true,
  }
}

function isManualLinkingDisabledError(error) {
  const message = normalizeValue(
    error?.message || error?.msg || error?.error_description || ''
  ).toLowerCase()
  const code = normalizeValue(error?.code || error?.error_code).toLowerCase()

  if (!message && !code) {
    return false
  }

  return (
    message.includes('manual linking is disabled') ||
    (code === 'validation_failed' && message.includes('manual linking'))
  )
}

function isIgnorableLogoutError(error) {
  const message = normalizeValue(
    error?.message || error?.msg || error?.error_description || ''
  ).toLowerCase()
  const code = normalizeValue(error?.code || error?.error_code).toLowerCase()

  return (
    code === 'bad_jwt' ||
    code === 'session_not_found' ||
    code === 'refresh_token_not_found' ||
    message.includes('invalid jwt') ||
    message.includes('token is malformed') ||
    message.includes('invalid number of segments') ||
    message.includes('session not found') ||
    message.includes('refresh token not found')
  )
}

function toAdapterError(error, fallbackMessage) {
  const message = normalizeValue(
    error?.message ||
      error?.msg ||
      error?.error_description ||
      error?.error
  )

  const normalized = new Error(
    message || fallbackMessage || 'Supabase auth failed'
  )

  normalized.name = error?.name || 'SupabaseAuthError'
  normalized.code = normalizeValue(error?.code || error?.error_code) || null
  normalized.status = Number(error?.status) || 0
  normalized.data = error || null

  return normalized
}

function normalizeAuthCapabilityState(value = {}, email = null) {
  const providerIds = Array.isArray(value?.providerIds) ? value.providerIds : []

  return {
    ...resolveAuthCapabilities({
      providerIds,
      email,
    }),
    ...(value && typeof value === 'object' ? value : {}),
  }
}

function normalizeSessionFromApi(payload = {}) {
  const status = normalizeValue(payload?.status).toLowerCase()

  if (status !== 'authenticated' || !payload?.user?.id) {
    return null
  }

  const capabilities = normalizeAuthCapabilityState(
    payload?.capabilities,
    payload?.user?.email || null
  )
  const metadata = {
    ...(payload?.user?.metadata || {}),
    authCapabilities: capabilities,
  }

  return {
    capabilities,
    expiresAt: payload?.expiresAt || null,
    metadata,
    provider: capabilities.primaryProvider || null,
    user: {
      ...payload.user,
      metadata,
    },
  }
}

async function fetchCanonicalSession() {
  const response = await fetch('/api/auth/session', {
    cache: 'no-store',
    credentials: 'include',
  })

  const payload = await response
    .json()
    .catch(() => ({ status: 'anonymous', user: null }))

  if (!response.ok) {
    throw toAdapterError(payload, 'Session could not be loaded')
  }

  return normalizeSessionFromApi(payload)
}

function getClient(providedClient = null) {
  return providedClient || createSupabaseClient()
}

export function createSupabaseAuthAdapter(options = {}) {
  const {
    client: providedClient = null,
    getOAuthRedirectUrl = null,
    oauthDefaultNextPath = '/account',
  } = options

  async function signInWithGoogle(payload = {}) {
    const client = getClient(providedClient)
    const nextPath = resolveNextPath(payload) || oauthDefaultNextPath
    const fallbackRedirect = `${window.location.origin}${nextPath}`
    const googleAuthIntent = normalizeGoogleAuthIntent(payload?.googleAuthIntent)
    const callbackRedirect = buildGoogleOAuthCallbackUrl({
      intent: googleAuthIntent,
      nextPath,
      origin: window.location.origin,
    })
    const redirectTo =
      typeof getOAuthRedirectUrl === 'function'
        ? getOAuthRedirectUrl({
            intent: googleAuthIntent,
            nextPath,
            provider: 'google',
          }) || callbackRedirect || fallbackRedirect
        : callbackRedirect || fallbackRedirect

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })

    if (error) {
      const normalizedError = toAdapterError(error, 'Google sign-in failed')

      if (googleAuthIntent === 'link' && isManualLinkingDisabledError(error)) {
        normalizedError.code = 'GOOGLE_LINK_MANUAL_LINKING_DISABLED'
        normalizedError.message =
          'Google linking is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again.'
      }

      throw normalizedError
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
    }

    return createRedirectResult()
  }

  async function signUpWithGoogle(payload = {}) {
    return signInWithGoogle(payload)
  }

  return createAuthAdapter({
    name: 'supabase',

    async getSession() {
      return fetchCanonicalSession()
    },

    async refreshSession() {
      const client = getClient(providedClient)
      const { error } = await client.auth.getSession()

      if (error) {
        throw toAdapterError(error, 'Session refresh failed')
      }

      return fetchCanonicalSession()
    },

    async signIn(payload = {}) {
      const providerKey = resolveProviderKey(payload)

      if (providerKey === 'google') {
        return signInWithGoogle(payload)
      }

      const client = getClient(providedClient)
      const { error } = await client.auth.signInWithPassword({
        email: normalizeEmail(payload.email),
        password: String(payload.password || ''),
      })

      if (error) {
        throw toAdapterError(error, 'Sign in failed')
      }

      return fetchCanonicalSession()
    },

    async signUp(payload = {}) {
      const providerKey = resolveProviderKey(payload)

      if (providerKey === 'google') {
        return signUpWithGoogle(payload)
      }

      throw new Error(
        'Password sign-up must be completed through Tvizzie email verification'
      )
    },

    async signOut(adapterContext = {}, options = {}) {
      void adapterContext

      const mode = normalizeValue(options?.mode).toLowerCase()

      if (mode === 'local-purge') {
        await terminateBrowserSession({
          clearServer: true,
          performNetworkSignOut: false,
        })

        return null
      }

      try {
        await terminateBrowserSession({
          clearServer: true,
          performNetworkSignOut: true,
          scope: mode === 'local' ? 'local' : 'global',
        })
      } catch (error) {
        if (isIgnorableLogoutError(error)) {
          return null
        }

        throw toAdapterError(error, 'Sign out failed')
      }

      return null
    },

    async updateProfile(payload = {}) {
      const client = getClient(providedClient)
      const profilePatch = {}

      if (payload.displayName !== undefined) {
        profilePatch.display_name = normalizeValue(payload.displayName) || null
        profilePatch.full_name = normalizeValue(payload.displayName) || null
        profilePatch.name = normalizeValue(payload.displayName) || null
      }

      if (payload.avatarUrl !== undefined || payload.photoURL !== undefined) {
        profilePatch.avatar_url =
          normalizeValue(payload.avatarUrl || payload.photoURL) || null
      }

      const { error } = await client.auth.updateUser({
        data: profilePatch,
      })

      if (error) {
        throw toAdapterError(error, 'Profile update failed')
      }

      return fetchCanonicalSession()
    },

    async reauthenticate(payload = {}, adapterContext = {}) {
      void adapterContext

      const response = await fetch('/api/auth/account/reauthenticate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...createCsrfHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: String(payload.password || ''),
        }),
      })

      const result = await response
        .json()
        .catch(() => ({ error: 'Reauthentication failed' }))

      if (!response.ok) {
        throw toAdapterError(result, 'Reauthentication failed')
      }

      const nextSession = await fetchCanonicalSession()

      return nextSession || adapterContext?.session || null
    },

    async linkProvider(payload = {}) {
      const providerKey = resolveProviderKey(payload)

      if (providerKey !== 'google') {
        throw new Error('Only Google provider linking is currently supported')
      }

      return signInWithGoogle(payload)
    },

    async unlinkProvider(payload = {}) {
      const providerKey = resolveProviderKey(payload)

      if (providerKey !== 'google') {
        throw new Error('Only Google provider unlinking is currently supported')
      }

      const error = new Error(
        'Google unlink is disabled in Tvizzie 2.0 while account linking remains in stabilization.'
      )
      error.code = 'GOOGLE_UNLINK_DISABLED'
      throw error
    },

    async requestPasswordReset(payload = {}) {
      void payload

      throw new Error(
        'Password reset requests must be completed through Tvizzie email verification'
      )
    },

    async confirmPasswordReset(payload = {}) {
      const client = getClient(providedClient)
      const { error } = await client.auth.updateUser({
        password: String(payload.newPassword || payload.password || ''),
      })

      if (error) {
        throw toAdapterError(error, 'Password reset confirmation failed')
      }

      return fetchCanonicalSession()
    },

    onAuthStateChange(callback) {
      const client = getClient(providedClient)
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        if (!session) {
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            callback(null)
          }

          return
        }

        Promise.resolve(fetchCanonicalSession())
          .then((nextSession) => {
            callback(nextSession)
          })
          .catch(() => {
            callback(null)
          })
      })

      return () => {
        subscription?.unsubscribe?.()
      }
    },
  })
}

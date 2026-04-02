'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react'

import { logAuthAuditEvent } from '@/lib/auth/clients/audit.client'
import { EVENT_TYPES, globalEvents } from '@/lib/events'

import { DEFAULT_AUTH_CONFIG, DEFAULT_AUTH_STATE, AUTH_STATUS } from './config'
import { createAuthStorage } from './storage'
import {
  mergeUserIntoSession,
  isSessionExpired,
  normalizeSession,
  hasCapability,
  canAccess,
  hasRole,
} from './utils'

const FALLBACK_AUTH_ACTIONS = Object.freeze({
  clearError: () => {},
  initialize: async () => null,
  linkProvider: async () => null,
  reauthenticate: async () => null,
  refreshSession: async () => null,
  requestPasswordReset: async () => null,
  signIn: async () => null,
  signOut: async () => null,
  signUp: async () => null,
  unlinkProvider: async () => null,
  updateProfile: async () => null,
})

const AuthConfigContext = createContext(DEFAULT_AUTH_CONFIG)
const AuthStateContext = createContext(DEFAULT_AUTH_STATE)
const AuthActionsContext = createContext(FALLBACK_AUTH_ACTIONS)

function toAuthError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error
  }

  const normalizedError = new Error(
    error?.message || fallbackMessage || 'Authentication request failed'
  )

  normalizedError.name = error?.name || 'AuthError'
  normalizedError.status = error?.status || 0
  normalizedError.data = error?.data || null

  return normalizedError
}

function createAdapterContext(config, storage, session) {
  return {
    config,
    storage,
    session: normalizeSession(session),
  }
}

function resolveAuthProvider(payload = {}, session = null) {
  const providerFromPayload =
    payload?.provider || payload?.strategy || payload?.authProvider || null

  const normalizedProvider = String(providerFromPayload || '')
    .trim()
    .toLowerCase()

  if (normalizedProvider) {
    return normalizedProvider
  }

  const providerIds = Array.isArray(session?.metadata?.providerIds)
    ? session.metadata.providerIds
    : []

  if (providerIds.includes('google.com')) {
    return 'google'
  }

  return 'password'
}

function resolveSignInIdentifier(payload = {}) {
  return (
    payload?.email ||
    payload?.identifier ||
    payload?.username ||
    payload?.userId ||
    null
  )
}

function isPendingSignInResult(value) {
  return Boolean(value?.requiresVerification || value?.requiresRedirect)
}

function isIgnorableSignOutError(error) {
  const message = String(error?.message || '').trim().toLowerCase()

  if (!message) {
    return false
  }

  return (
    message.includes('invalid jwt') ||
    message.includes('token is malformed') ||
    message.includes('invalid number of segments') ||
    message.includes('invalid or expired authentication token') ||
    message.includes('authentication token has been revoked') ||
    message.includes('jwt expired')
  )
}

export function AuthProvider({ children, config = {} }) {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_AUTH_CONFIG, ...config }),
    [config]
  )

  const storage = useMemo(
    () => createAuthStorage(mergedConfig.storageKey),
    [mergedConfig.storageKey]
  )

  const adapterRef = useRef(mergedConfig.adapter)
  const bootstrapRef = useRef(false)
  const sessionRef = useRef(null)

  const [state, setState] = useState(DEFAULT_AUTH_STATE)

  adapterRef.current = mergedConfig.adapter
  sessionRef.current = state.session

  const emitAuthEvent = useCallback((eventType, payload = {}) => {
    globalEvents.emit(eventType, {
      timestamp: Date.now(),
      ...payload,
    })
  }, [])

  const applySession = useCallback((nextSession, nextStatus = null) => {
    const normalizedSession = normalizeSession(nextSession)
    const resolvedStatus =
      nextStatus ||
      (normalizedSession ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS)

    setState((prevState) => ({
      ...prevState,
      lastUpdatedAt: Date.now(),
      status: resolvedStatus,
      session: normalizedSession,
      user: normalizedSession?.user || null,
      isReady: true,
      error: null,
    }))

    return normalizedSession
  }, [])

  const clearSession = useCallback(({ preserveError = false } = {}) => {
    setState((prevState) => ({
      ...prevState,
      lastUpdatedAt: Date.now(),
      status: AUTH_STATUS.ANONYMOUS,
      session: null,
      user: null,
      isReady: true,
      error: preserveError ? prevState.error : null,
    }))
  }, [])

  const setAuthError = useCallback(
    (error, fallbackMessage) => {
      const normalizedError = toAuthError(error, fallbackMessage)

      setState((prevState) => ({
        ...prevState,
        lastUpdatedAt: Date.now(),
        status: AUTH_STATUS.ERROR,
        isReady: true,
        error: normalizedError,
      }))

      emitAuthEvent(EVENT_TYPES.AUTH_ERROR, {
        error: normalizedError,
        message: normalizedError.message,
      })

      return normalizedError
    },
    [emitAuthEvent]
  )

  const setLoadingState = useCallback(
    (status = AUTH_STATUS.LOADING, { preserveError = false } = {}) => {
      setState((prevState) => ({
        ...prevState,
        status,
        error: preserveError ? prevState.error : null,
      }))
    },
    []
  )

  const getAdapterContext = useCallback(
    (session = sessionRef.current) =>
      createAdapterContext(mergedConfig, storage, session),
    [mergedConfig, storage]
  )

  const getAdapterMethod = useCallback(
    (methodName, unavailableMessage, fallbackMessage) => {
      const adapter = adapterRef.current

      if (typeof adapter?.[methodName] !== 'function') {
        throw setAuthError(new Error(unavailableMessage), fallbackMessage)
      }

      return adapter
    },
    [setAuthError]
  )

  const emitSessionEvent = useCallback(
    (eventType, session, payload = {}) => {
      emitAuthEvent(eventType, {
        session: session || null,
        user: session?.user || null,
        ...payload,
      })
    },
    [emitAuthEvent]
  )

  const refreshSession = useCallback(
    async ({ session: sourceSession, silent = false } = {}) => {
      const adapter = adapterRef.current
      const activeSession = normalizeSession(
        sourceSession || sessionRef.current
      )

      if (!adapter?.refreshSession || !activeSession) {
        return activeSession
      }

      setLoadingState(
        state.isReady ? AUTH_STATUS.REFRESHING : AUTH_STATUS.LOADING,
        { preserveError: silent }
      )

      try {
        const nextSession = await adapter.refreshSession(
          activeSession,
          getAdapterContext(activeSession)
        )

        const resolvedSession = applySession(nextSession)
        emitSessionEvent(EVENT_TYPES.AUTH_REFRESH, resolvedSession)

        return resolvedSession
      } catch (error) {
        clearSession({ preserveError: silent })

        if (!silent) {
          throw setAuthError(error, 'Session refresh failed')
        }

        return null
      }
    },
    [
      applySession,
      clearSession,
      emitSessionEvent,
      getAdapterContext,
      setAuthError,
      setLoadingState,
      state.isReady,
    ]
  )

  const initialize = useCallback(async () => {
    if (bootstrapRef.current) {
      return
    }

    bootstrapRef.current = true

    if (!mergedConfig.enabled) {
      applySession(null, AUTH_STATUS.ANONYMOUS)
      emitAuthEvent(EVENT_TYPES.AUTH_READY, { session: null, user: null })
      return
    }

    setLoadingState()

    const adapter = adapterRef.current
    const initialSession = normalizeSession(mergedConfig.initialSession)
    const persistedSession =
      mergedConfig.hydrateFromStorage && !initialSession ? storage.read() : null

    let resolvedSession = normalizeSession(initialSession || persistedSession)

    try {
      if (
        resolvedSession &&
        isSessionExpired(resolvedSession, mergedConfig.refreshLeewayMs)
      ) {
        resolvedSession = await refreshSession({
          session: resolvedSession,
          silent: true,
        })
      }

      if (!resolvedSession && adapter?.getSession) {
        resolvedSession = normalizeSession(
          await adapter.getSession(getAdapterContext(null))
        )
      }

      if (resolvedSession) {
        resolvedSession = applySession(resolvedSession)
      } else {
        // Always resolve bootstrap into an anonymous ready state when no
        // session is available. Otherwise auth.isReady can remain false.
        clearSession()
      }

      emitAuthEvent(EVENT_TYPES.AUTH_READY, {
        session: resolvedSession || null,
        user: resolvedSession?.user || null,
      })
    } catch (error) {
      clearSession()
      setAuthError(error, 'Authentication bootstrap failed')
    }
  }, [
    applySession,
    clearSession,
    emitAuthEvent,
    getAdapterContext,
    mergedConfig.enabled,
    mergedConfig.hydrateFromStorage,
    mergedConfig.initialSession,
    mergedConfig.refreshLeewayMs,
    refreshSession,
    setAuthError,
    setLoadingState,
    storage,
  ])

  useEffect(() => {
    bootstrapRef.current = false
  }, [mergedConfig])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!mergedConfig.persistSession) {
      storage.clear()
      return
    }

    if (state.session) {
      storage.write(state.session)
    } else {
      storage.clear()
    }
  }, [mergedConfig.persistSession, state.session, storage])

  useEffect(() => {
    if (!mergedConfig.clearSessionOnUnauthorized) {
      return undefined
    }

    return globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, (eventData) => {
      if (eventData?.source && eventData.source !== 'app') {
        return
      }

      clearSession()

      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'api-unauthorized',
        session: null,
        user: null,
      })
    })
  }, [clearSession, emitAuthEvent, mergedConfig.clearSessionOnUnauthorized])

  useEffect(() => {
    if (!mergedConfig.refreshOnWindowFocus || !mergedConfig.enabled) {
      return undefined
    }

    function handleFocus() {
      const activeSession = sessionRef.current

      if (
        activeSession &&
        isSessionExpired(activeSession, mergedConfig.refreshLeewayMs)
      ) {
        refreshSession({ session: activeSession, silent: true })
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        handleFocus()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    mergedConfig.enabled,
    mergedConfig.refreshLeewayMs,
    mergedConfig.refreshOnWindowFocus,
    refreshSession,
  ])

  useEffect(() => {
    const adapter = adapterRef.current

    if (!adapter?.onAuthStateChange) {
      return undefined
    }

    return adapter.onAuthStateChange((nextSession) => {
      const normalizedSession = normalizeSession(nextSession)

      if (normalizedSession) {
        applySession(normalizedSession)
        emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, normalizedSession, {
          source: 'adapter-subscription',
        })
        return
      }

      clearSession()
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'adapter-subscription',
        session: null,
        user: null,
      })
    }, getAdapterContext(sessionRef.current))
  }, [
    applySession,
    clearSession,
    emitAuthEvent,
    emitSessionEvent,
    getAdapterContext,
  ])

  const signIn = useCallback(
    async (credentials) => {
      const adapter = getAdapterMethod(
        'signIn',
        'Active auth adapter does not implement signIn',
        'Authentication adapter is not configured'
      )

      const provider = resolveAuthProvider(credentials)
      const identifier = resolveSignInIdentifier(credentials)

      setLoadingState()

      try {
        const signInResult = await adapter.signIn(
          credentials,
          getAdapterContext()
        )

        if (isPendingSignInResult(signInResult)) {
          clearSession()
          return signInResult
        }

        const resolvedSession = applySession(signInResult)

        emitSessionEvent(EVENT_TYPES.AUTH_SIGN_IN, resolvedSession)

        logAuthAuditEvent({
          eventType: 'sign-in',
          status: 'success',
          userId: resolvedSession?.user?.id || null,
          email: resolvedSession?.user?.email || identifier || null,
          provider,
          metadata: { source: 'auth-context' },
        })

        return resolvedSession
      } catch (error) {
        logAuthAuditEvent({
          eventType: 'failed-attempt',
          status: 'failure',
          email: identifier || null,
          provider,
          metadata: {
            action: 'sign-in',
            code: error?.code || null,
            message: error?.message || 'Sign in failed',
            source: 'auth-context',
          },
        })

        throw setAuthError(error, 'Sign in failed')
      }
    },
    [
      applySession,
      clearSession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const signUp = useCallback(
    async (payload) => {
      const adapter = getAdapterMethod(
        'signUp',
        'Active auth adapter does not implement signUp',
        'Authentication adapter is not configured'
      )

      setLoadingState()

      try {
        const resolvedSession = applySession(
          await adapter.signUp(payload, getAdapterContext())
        )

        emitSessionEvent(EVENT_TYPES.AUTH_SIGN_UP, resolvedSession)

        return resolvedSession
      } catch (error) {
        throw setAuthError(error, 'Sign up failed')
      }
    },
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const signOut = useCallback(
    async ({ reason = 'logout' } = {}) => {
      const adapter = adapterRef.current
      const previousSession = sessionRef.current
      let signOutError = null
      const shouldUseLocalPurge =
        reason === 'email-change' ||
        reason === 'password-change' ||
        reason === 'password-set' ||
        reason === 'password-reset' ||
        reason === 'delete-account'

      setLoadingState()

      try {
        if (adapter?.signOut) {
          await adapter.signOut(getAdapterContext(previousSession), {
            mode: shouldUseLocalPurge ? 'local-purge' : 'global',
          })
        }
      } catch (error) {
        if (!isIgnorableSignOutError(error)) {
          signOutError = setAuthError(error, 'Sign out failed')
        }
      }

      clearSession({ preserveError: Boolean(signOutError) })

      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        reason,
        previousSession,
        session: null,
        user: null,
      })

      if (signOutError) {
        throw signOutError
      }

      return true
    },
    [
      clearSession,
      emitAuthEvent,
      getAdapterContext,
      setAuthError,
      setLoadingState,
    ]
  )

  const updateProfile = useCallback(
    async (payload) => {
      const adapter = getAdapterMethod(
        'updateProfile',
        'Active auth adapter does not implement updateProfile',
        'Profile updates are not supported by the current auth adapter'
      )

      setLoadingState()

      try {
        const response = await adapter.updateProfile(
          payload,
          getAdapterContext()
        )
        const normalizedResponse = normalizeSession(response)

        const nextSession = normalizedResponse
          ? normalizedResponse
          : mergeUserIntoSession(sessionRef.current, response)

        const resolvedSession = applySession(nextSession)

        emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, resolvedSession)

        return resolvedSession?.user || null
      } catch (error) {
        throw setAuthError(error, 'Profile update failed')
      }
    },
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const reauthenticate = useCallback(
    async (payload) => {
      const adapter = getAdapterMethod(
        'reauthenticate',
        'Active auth adapter does not implement reauthenticate',
        'Reauthentication is not supported by the current auth adapter'
      )

      setLoadingState()

      try {
        const resolvedSession = applySession(
          await adapter.reauthenticate(payload, getAdapterContext())
        )

        emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, resolvedSession, {
          action: 'reauthenticate',
        })

        return resolvedSession
      } catch (error) {
        throw setAuthError(error, 'Reauthentication failed')
      }
    },
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const runProviderMutation = useCallback(
    async (
      payload,
      {
        methodName,
        successEventName,
        successAuditType,
        failureMessage,
        failureAction,
        unsupportedMessage,
      }
    ) => {
      const adapter = getAdapterMethod(
        methodName,
        `Active auth adapter does not implement ${methodName}`,
        unsupportedMessage
      )

      const provider = resolveAuthProvider(payload)

      setLoadingState()

      try {
        const resolvedSession = applySession(
          await adapter[methodName](payload, getAdapterContext())
        )

        emitSessionEvent(successEventName, resolvedSession)

        logAuthAuditEvent({
          eventType: successAuditType,
          status: 'success',
          userId: resolvedSession?.user?.id || null,
          email: resolvedSession?.user?.email || null,
          provider,
          metadata: { source: 'auth-context' },
        })

        return resolvedSession
      } catch (error) {
        logAuthAuditEvent({
          eventType: 'failed-attempt',
          status: 'failure',
          userId: sessionRef.current?.user?.id || null,
          email: sessionRef.current?.user?.email || null,
          provider,
          metadata: {
            action: failureAction,
            code: error?.code || null,
            message: error?.message || failureMessage,
            source: 'auth-context',
          },
        })

        throw setAuthError(error, failureMessage)
      }
    },
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const linkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'linkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        successAuditType: 'link-provider',
        failureMessage: 'Provider linking failed',
        failureAction: 'link-provider',
        unsupportedMessage:
          'Provider linking is not supported by the current auth adapter',
      }),
    [runProviderMutation]
  )

  const unlinkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'unlinkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        successAuditType: 'unlink-provider',
        failureMessage: 'Provider unlinking failed',
        failureAction: 'unlink-provider',
        unsupportedMessage:
          'Provider unlinking is not supported by the current auth adapter',
      }),
    [runProviderMutation]
  )

  const requestPasswordReset = useCallback(
    async (payload) => {
      const adapter = getAdapterMethod(
        'requestPasswordReset',
        'Active auth adapter does not implement requestPasswordReset',
        'Password reset is not supported by the current auth adapter'
      )

      try {
        const response = await adapter.requestPasswordReset(
          payload,
          getAdapterContext()
        )

        emitAuthEvent(EVENT_TYPES.AUTH_UPDATE, {
          action: 'request-password-reset',
          response,
        })

        return response
      } catch (error) {
        throw setAuthError(error, 'Password reset request failed')
      }
    },
    [emitAuthEvent, getAdapterContext, getAdapterMethod, setAuthError]
  )

  const confirmPasswordReset = useCallback(
    async (payload) => {
      const adapter = getAdapterMethod(
        'confirmPasswordReset',
        'Active auth adapter does not implement confirmPasswordReset',
        'Password reset confirmation is not supported by the current auth adapter'
      )

      try {
        const response = await adapter.confirmPasswordReset(
          payload,
          getAdapterContext()
        )

        emitAuthEvent(EVENT_TYPES.AUTH_UPDATE, {
          action: 'confirm-password-reset',
          response,
        })

        return response
      } catch (error) {
        throw setAuthError(error, 'Password reset confirmation failed')
      }
    },
    [emitAuthEvent, getAdapterContext, getAdapterMethod, setAuthError]
  )

  const clearError = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null,
      status: prevState.session
        ? AUTH_STATUS.AUTHENTICATED
        : AUTH_STATUS.ANONYMOUS,
    }))
  }, [])

  const stateValue = useMemo(
    () => ({
      ...state,
      capabilities: state.session?.capabilities || null,
      config: mergedConfig,
      isAuthenticated: Boolean(state.session),
      isAnonymous:
        state.status === AUTH_STATUS.ANONYMOUS ||
        (!state.session && state.isReady),
    }),
    [mergedConfig, state]
  )

  const actionsValue = useMemo(
    () => ({
      confirmPasswordReset,
      requestPasswordReset,
      updateProfile,
      refreshSession,
      reauthenticate,
      unlinkProvider,
      initialize,
      linkProvider,
      clearError,
      signIn,
      signUp,
      signOut,
    }),
    [
      confirmPasswordReset,
      requestPasswordReset,
      updateProfile,
      refreshSession,
      reauthenticate,
      unlinkProvider,
      initialize,
      linkProvider,
      clearError,
      signIn,
      signUp,
      signOut,
    ]
  )

  return (
    <AuthConfigContext.Provider value={mergedConfig}>
      <AuthActionsContext.Provider value={actionsValue}>
        <AuthStateContext.Provider value={stateValue}>
          {children}
        </AuthStateContext.Provider>
      </AuthActionsContext.Provider>
    </AuthConfigContext.Provider>
  )
}

export function useAuthConfig() {
  return useContext(AuthConfigContext)
}

export function useAuthState() {
  return useContext(AuthStateContext)
}

export function useAuthActions() {
  return useContext(AuthActionsContext)
}

export function useAuth() {
  const state = useAuthState()
  const actions = useAuthActions()

  return useMemo(
    () => ({
      ...state,
      ...actions,
      can: (rules) => canAccess(state.session, rules),
      hasRole: (role) => hasRole(state.session, role),
      hasCapability: (capability) => hasCapability(state.session, capability),
    }),
    [actions, state]
  )
}

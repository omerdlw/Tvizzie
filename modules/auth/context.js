'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { apiClient } from '@/modules/api'

import { AUTH_STATUS, DEFAULT_AUTH_CONFIG, DEFAULT_AUTH_STATE } from './config'
import { createAuthStorage } from './storage'
import {
  canAccess,
  getAccessToken,
  hasCapability,
  hasRole,
  isSessionExpired,
  mergeUserIntoSession,
  normalizeSession,
} from './utils'

const AuthStateContext = createContext(null)
const AuthActionsContext = createContext(null)

function toAuthError(error, fallbackMessage) {
  if (error instanceof Error) return error

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
    session: normalizeSession(session),
    config,
    storage,
  }
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

  const applySession = useCallback((nextSession, status = null) => {
    const normalizedSession = normalizeSession(nextSession)
    const resolvedStatus = status
      ? status
      : normalizedSession
        ? AUTH_STATUS.AUTHENTICATED
        : AUTH_STATUS.ANONYMOUS

    setState((prevState) => ({
      ...prevState,
      lastUpdatedAt: Date.now(),
      user: normalizedSession?.user || null,
      session: normalizedSession,
      status: resolvedStatus,
      isReady: true,
      error: null,
    }))

    return normalizedSession
  }, [])

  const clearSession = useCallback(({ preserveError = false } = {}) => {
    setState((prevState) => ({
      ...prevState,
      lastUpdatedAt: Date.now(),
      error: preserveError ? prevState.error : null,
      status: AUTH_STATUS.ANONYMOUS,
      session: null,
      isReady: true,
      user: null,
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
        message: normalizedError.message,
        error: normalizedError,
      })

      return normalizedError
    },
    [emitAuthEvent]
  )

  const setLoadingState = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null,
      status: AUTH_STATUS.LOADING,
    }))
  }, [])

  const getAdapterContext = useCallback(
    (session = sessionRef.current) =>
      createAdapterContext(mergedConfig, storage, session),
    [mergedConfig, storage]
  )

  const getAdapterWithMethod = useCallback(
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
        user: session?.user || null,
        session: session || null,
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

      setState((prevState) => ({
        ...prevState,
        error: silent ? prevState.error : null,
        status: prevState.isReady
          ? AUTH_STATUS.REFRESHING
          : AUTH_STATUS.LOADING,
      }))

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
    ]
  )

  const initialize = useCallback(async () => {
    if (bootstrapRef.current) return

    bootstrapRef.current = true

    if (!mergedConfig.enabled) {
      applySession(null, AUTH_STATUS.ANONYMOUS)
      emitAuthEvent(EVENT_TYPES.AUTH_READY, {
        user: null,
        session: null,
      })
      return
    }

    setState((prevState) => ({
      ...prevState,
      status: AUTH_STATUS.LOADING,
      error: null,
    }))

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
          silent: true,
          session: resolvedSession,
        })
      }

      if (!resolvedSession && adapter?.getSession) {
        resolvedSession = await adapter.getSession(getAdapterContext(null))
        resolvedSession = normalizeSession(resolvedSession)
      }

      if (resolvedSession) {
        resolvedSession = applySession(resolvedSession)
      } else if (!adapter?.onAuthStateChange) {
        clearSession()
      }

      emitAuthEvent(EVENT_TYPES.AUTH_READY, {
        user: resolvedSession?.user || null,
        session: resolvedSession || null,
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
    const authInterceptor = async (requestConfig) => {
      const accessToken = getAccessToken(sessionRef.current)

      if (!accessToken) return requestConfig

      const hasAuthorizationHeader =
        requestConfig?.headers?.Authorization ||
        requestConfig?.headers?.authorization

      if (hasAuthorizationHeader) return requestConfig

      return {
        ...requestConfig,
        headers: {
          ...(requestConfig?.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      }
    }

    apiClient.addRequestInterceptor(authInterceptor)

    return () => {
      apiClient.interceptors.request = apiClient.interceptors.request.filter(
        (interceptor) => interceptor !== authInterceptor
      )
    }
  }, [])

  useEffect(() => {
    if (!mergedConfig.clearSessionOnUnauthorized) return undefined

    return globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, () => {
      clearSession()
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'api-unauthorized',
        user: null,
        session: null,
      })
    })
  }, [clearSession, emitAuthEvent, mergedConfig.clearSessionOnUnauthorized])

  useEffect(() => {
    if (!mergedConfig.refreshOnWindowFocus || !mergedConfig.enabled) {
      return undefined
    }

    const handleFocus = () => {
      const activeSession = sessionRef.current

      if (
        activeSession &&
        isSessionExpired(activeSession, mergedConfig.refreshLeewayMs)
      ) {
        refreshSession({ silent: true, session: activeSession })
      }
    }

    const handleVisibilityChange = () => {
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
    if (!adapter?.onAuthStateChange) return undefined

    return adapter.onAuthStateChange(
      (nextSession) => {
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
          user: null,
          session: null,
        })
      },
      getAdapterContext(sessionRef.current)
    )
  }, [applySession, clearSession, emitAuthEvent, emitSessionEvent, getAdapterContext])

  const signIn = useCallback(
    async (credentials) => {
      const adapter = getAdapterWithMethod(
        'signIn',
        'Active auth adapter does not implement signIn',
        'Authentication adapter is not configured'
      )

      setLoadingState()

      try {
        const nextSession = await adapter.signIn(
          credentials,
          getAdapterContext()
        )
        const resolvedSession = applySession(nextSession)

        emitSessionEvent(EVENT_TYPES.AUTH_SIGN_IN, resolvedSession)

        return resolvedSession
      } catch (error) {
        throw setAuthError(error, 'Sign in failed')
      }
    },
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterWithMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const signUp = useCallback(
    async (payload) => {
      const adapter = getAdapterWithMethod(
        'signUp',
        'Active auth adapter does not implement signUp',
        'Authentication adapter is not configured'
      )

      setLoadingState()

      try {
        const nextSession = await adapter.signUp(
          payload,
          getAdapterContext()
        )
        const resolvedSession = applySession(nextSession)

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
      getAdapterWithMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const signOut = useCallback(
    async ({ skipAdapter = false } = {}) => {
      const adapter = adapterRef.current
      const previousSession = sessionRef.current
      let signOutError = null

      setLoadingState()

      try {
        if (!skipAdapter && adapter?.signOut) {
          await adapter.signOut(getAdapterContext(previousSession))
        }
      } catch (error) {
        signOutError = setAuthError(error, 'Sign out failed')
      }

      clearSession({ preserveError: Boolean(signOutError) })
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        previousSession,
        user: null,
        session: null,
      })

      if (signOutError) {
        throw signOutError
      }

      return true
    },
    [clearSession, emitAuthEvent, getAdapterContext, setAuthError, setLoadingState]
  )

  const updateProfile = useCallback(
    async (payload) => {
      const adapter = getAdapterWithMethod(
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
      getAdapterWithMethod,
      setAuthError,
      setLoadingState,
    ]
  )

  const requestPasswordReset = useCallback(
    async (payload) => {
      const adapter = getAdapterWithMethod(
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
    [emitAuthEvent, getAdapterContext, getAdapterWithMethod, setAuthError]
  )

  const confirmPasswordReset = useCallback(
    async (payload) => {
      const adapter = getAdapterWithMethod(
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
    [emitAuthEvent, getAdapterContext, getAdapterWithMethod, setAuthError]
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
      isAuthenticated: Boolean(state.session),
      isAnonymous:
        state.status === AUTH_STATUS.ANONYMOUS ||
        (!state.session && state.isReady),
      config: mergedConfig,
      ...state,
    }),
    [mergedConfig, state]
  )

  const actionsValue = useMemo(
    () => ({
      requestPasswordReset,
      confirmPasswordReset,
      updateProfile,
      refreshSession,
      initialize,
      clearError,
      signOut,
      signUp,
      signIn,
    }),
    [
      requestPasswordReset,
      confirmPasswordReset,
      updateProfile,
      refreshSession,
      initialize,
      clearError,
      signOut,
      signUp,
      signIn,
    ]
  )

  return (
    <AuthActionsContext.Provider value={actionsValue}>
      <AuthStateContext.Provider value={stateValue}>
        {children}
      </AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  )
}

export function useAuthState() {
  const context = useContext(AuthStateContext)

  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider')
  }

  return context
}

export function useAuthActions() {
  const context = useContext(AuthActionsContext)

  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider')
  }

  return context
}

export function useAuth() {
  const state = useAuthState()
  const actions = useAuthActions()

  return useMemo(
    () => ({
      can: (rules) => canAccess(state.session, rules),
      hasRole: (role) => hasRole(state.session, role),
      hasCapability: (capability) => hasCapability(state.session, capability),
      ...actions,
      ...state,
    }),
    [actions, state]
  )
}

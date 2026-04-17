'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';

import { EVENT_TYPES, globalEvents } from '@/core/constants/events';

import {
  runAuthInitialize,
  runAuthPasswordResetConfirmation,
  runAuthPasswordResetRequest,
  runAuthProviderMutation,
  runAuthReauthenticate,
  runAuthRefreshSession,
  runAuthSignIn,
  runAuthSignUp,
  runAuthSignOut,
  runAuthUpdateProfile,
} from './action-flows';
import { DEFAULT_AUTH_CONFIG, DEFAULT_AUTH_STATE, AUTH_STATUS } from './config';
import { createAuthStorage } from './storage';
import { isSessionExpired, normalizeSession, hasCapability, canAccess, hasRole } from './utils';

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
});

const AuthConfigContext = createContext(DEFAULT_AUTH_CONFIG);
const AuthStateContext = createContext(DEFAULT_AUTH_STATE);
const AuthActionsContext = createContext(FALLBACK_AUTH_ACTIONS);

function toAuthError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error;
  }

  const normalizedError = new Error(error?.message || fallbackMessage || 'Authentication request failed');

  normalizedError.name = error?.name || 'AuthError';
  normalizedError.status = error?.status || 0;
  normalizedError.data = error?.data || null;

  return normalizedError;
}

function createAdapterContext(config, storage, session) {
  return {
    config,
    storage,
    session: normalizeSession(session),
  };
}

const AUTH_FLOW_STATUS = Object.freeze({
  login: Object.freeze({
    priority: 110,
    statusType: 'LOGIN',
    themeType: 'LOGIN',
  }),
  logout: Object.freeze({
    priority: 110,
    statusType: 'LOGOUT',
    themeType: 'LOGOUT',
  }),
});

export function AuthProvider({ children, config = {} }) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_AUTH_CONFIG, ...config }), [config]);

  const storage = useMemo(() => createAuthStorage(mergedConfig.storageKey), [mergedConfig.storageKey]);

  const adapterRef = useRef(mergedConfig.adapter);
  const bootstrapRef = useRef(false);
  const sessionRef = useRef(null);

  const [state, setState] = useState(DEFAULT_AUTH_STATE);

  adapterRef.current = mergedConfig.adapter;
  sessionRef.current = state.session;

  const emitAuthEvent = useCallback((eventType, payload = {}) => {
    globalEvents.emit(eventType, {
      timestamp: Date.now(),
      ...payload,
    });
  }, []);

  const emitAuthFeedback = useCallback(
    (flow, phase, overrides = {}) => {
      const normalizedFlow = String(flow || '')
        .trim()
        .toLowerCase();
      const normalizedPhase = String(phase || '')
        .trim()
        .toLowerCase();

      if (!normalizedFlow || !normalizedPhase) {
        return;
      }

      const config = AUTH_FLOW_STATUS[normalizedFlow] || null;

      emitAuthEvent(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: normalizedFlow,
        phase: normalizedPhase,
        statusType: overrides.statusType || config?.statusType || normalizedFlow.trim().toUpperCase(),
        themeType: overrides.themeType || config?.themeType || 'LOGIN',
        priority: overrides.priority ?? config?.priority ?? 110,
        ...(overrides.title != null ? { title: overrides.title } : {}),
        ...(overrides.description != null ? { description: overrides.description } : {}),
        ...(overrides.icon != null ? { icon: overrides.icon } : {}),
        ...(overrides.duration != null ? { duration: overrides.duration } : {}),
        ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
      });
    },
    [emitAuthEvent]
  );

  const applySession = useCallback((nextSession, nextStatus = null) => {
    const normalizedSession = normalizeSession(nextSession);
    const resolvedStatus = nextStatus || (normalizedSession ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS);

    setState((prevState) => ({
      ...prevState,
      lastUpdatedAt: Date.now(),
      status: resolvedStatus,
      session: normalizedSession,
      user: normalizedSession?.user || null,
      isReady: true,
      error: null,
    }));

    return normalizedSession;
  }, []);

  const clearSession = useCallback(({ preserveError = false } = {}) => {
    setState((prevState) => ({
      ...prevState,
      lastUpdatedAt: Date.now(),
      status: AUTH_STATUS.ANONYMOUS,
      session: null,
      user: null,
      isReady: true,
      error: preserveError ? prevState.error : null,
    }));
  }, []);

  const setAuthError = useCallback(
    (error, fallbackMessage) => {
      const normalizedError = toAuthError(error, fallbackMessage);

      setState((prevState) => ({
        ...prevState,
        lastUpdatedAt: Date.now(),
        status: AUTH_STATUS.ERROR,
        isReady: true,
        error: normalizedError,
      }));

      emitAuthEvent(EVENT_TYPES.AUTH_ERROR, {
        error: normalizedError,
        message: normalizedError.message,
      });

      return normalizedError;
    },
    [emitAuthEvent]
  );

  const setLoadingState = useCallback((status = AUTH_STATUS.LOADING, { preserveError = false } = {}) => {
    setState((prevState) => ({
      ...prevState,
      status,
      error: preserveError ? prevState.error : null,
    }));
  }, []);

  const getAdapterContext = useCallback(
    (session = sessionRef.current) => createAdapterContext(mergedConfig, storage, session),
    [mergedConfig, storage]
  );

  const getAdapterMethod = useCallback(
    (methodName, unavailableMessage, fallbackMessage) => {
      const adapter = adapterRef.current;

      if (typeof adapter?.[methodName] !== 'function') {
        throw setAuthError(new Error(unavailableMessage), fallbackMessage);
      }

      return adapter;
    },
    [setAuthError]
  );

  const emitSessionEvent = useCallback(
    (eventType, session, payload = {}) => {
      emitAuthEvent(eventType, {
        session: session || null,
        user: session?.user || null,
        ...payload,
      });
    },
    [emitAuthEvent]
  );

  const refreshSession = useCallback(
    (payload) =>
      runAuthRefreshSession({
        adapter: adapterRef.current,
        applySession,
        clearSession,
        emitSessionEvent,
        getAdapterContext,
        isReady: state.isReady,
        session: payload?.session || sessionRef.current,
        setAuthError,
        setLoadingState,
        silent: payload?.silent,
      }),
    [applySession, clearSession, emitSessionEvent, getAdapterContext, setAuthError, setLoadingState, state.isReady]
  );

  const initialize = useCallback(async () => {
    if (bootstrapRef.current) {
      return;
    }

    bootstrapRef.current = true;

    await runAuthInitialize({
      adapter: adapterRef.current,
      applySession,
      clearSession,
      emitAuthEvent,
      enabled: mergedConfig.enabled,
      getAdapterContext,
      hydrateFromStorage: mergedConfig.hydrateFromStorage,
      initialSession: mergedConfig.initialSession,
      refreshLeewayMs: mergedConfig.refreshLeewayMs,
      refreshSession,
      setAuthError,
      setLoadingState,
      storage,
    });
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
  ]);

  useEffect(() => {
    bootstrapRef.current = false;
  }, [mergedConfig]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!mergedConfig.persistSession) {
      storage.clear();
      return;
    }

    if (state.session) {
      storage.write(state.session);
    } else {
      storage.clear();
    }
  }, [mergedConfig.persistSession, state.session, storage]);

  useEffect(() => {
    if (!mergedConfig.clearSessionOnUnauthorized) {
      return undefined;
    }

    return globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, (eventData) => {
      if (eventData?.source && eventData.source !== 'app') {
        return;
      }

      clearSession();

      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'api-unauthorized',
        session: null,
        user: null,
      });
    });
  }, [clearSession, emitAuthEvent, mergedConfig.clearSessionOnUnauthorized]);

  useEffect(() => {
    if (!mergedConfig.refreshOnWindowFocus || !mergedConfig.enabled) {
      return undefined;
    }

    function handleFocus() {
      const activeSession = sessionRef.current;

      if (activeSession && isSessionExpired(activeSession, mergedConfig.refreshLeewayMs)) {
        refreshSession({ session: activeSession, silent: true });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mergedConfig.enabled, mergedConfig.refreshLeewayMs, mergedConfig.refreshOnWindowFocus, refreshSession]);

  useEffect(() => {
    const adapter = adapterRef.current;

    if (!adapter?.onAuthStateChange) {
      return undefined;
    }

    return adapter.onAuthStateChange((nextSession) => {
      const normalizedSession = normalizeSession(nextSession);

      if (normalizedSession) {
        applySession(normalizedSession);
        emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, normalizedSession, {
          source: 'adapter-subscription',
        });
        return;
      }

      clearSession();
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'adapter-subscription',
        session: null,
        user: null,
      });
    }, getAdapterContext(sessionRef.current));
  }, [applySession, clearSession, emitAuthEvent, emitSessionEvent, getAdapterContext]);

  const signIn = useCallback(
    (credentials) =>
      runAuthSignIn({
        adapter: getAdapterMethod(
          'signIn',
          'Active auth adapter does not implement signIn',
          'Authentication adapter is not configured'
        ),
        applySession,
        clearSession,
        credentials,
        emitAuthFeedback,
        emitSessionEvent,
        getAdapterContext,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      clearSession,
      emitAuthFeedback,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ]
  );

  const signUp = useCallback(
    (payload) =>
      runAuthSignUp({
        adapter: getAdapterMethod(
          'signUp',
          'Active auth adapter does not implement signUp',
          'Authentication adapter is not configured'
        ),
        applySession,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [applySession, emitSessionEvent, getAdapterContext, getAdapterMethod, setAuthError, setLoadingState]
  );

  const signOut = useCallback(
    (payload) =>
      runAuthSignOut({
        adapter: adapterRef.current,
        clearSession,
        emitAuthEvent,
        emitAuthFeedback,
        getAdapterContext,
        previousSession: sessionRef.current,
        ...(payload || {}),
        setAuthError,
        setLoadingState,
      }),
    [clearSession, emitAuthEvent, emitAuthFeedback, getAdapterContext, setAuthError, setLoadingState]
  );

  const updateProfile = useCallback(
    (payload) =>
      runAuthUpdateProfile({
        adapter: getAdapterMethod(
          'updateProfile',
          'Active auth adapter does not implement updateProfile',
          'Profile updates are not supported by the current auth adapter'
        ),
        applySession,
        currentSession: sessionRef.current,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [applySession, emitSessionEvent, getAdapterContext, getAdapterMethod, setAuthError, setLoadingState]
  );

  const reauthenticate = useCallback(
    (payload) =>
      runAuthReauthenticate({
        adapter: getAdapterMethod(
          'reauthenticate',
          'Active auth adapter does not implement reauthenticate',
          'Reauthentication is not supported by the current auth adapter'
        ),
        applySession,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [applySession, emitSessionEvent, getAdapterContext, getAdapterMethod, setAuthError, setLoadingState]
  );

  const runProviderMutation = useCallback(
    (payload, { methodName, successEventName, successAuditType, failureMessage, failureAction, unsupportedMessage }) =>
      runAuthProviderMutation({
        adapter: getAdapterMethod(
          methodName,
          `Active auth adapter does not implement ${methodName}`,
          unsupportedMessage
        ),
        applySession,
        currentSession: sessionRef.current,
        emitSessionEvent,
        failureAction,
        failureMessage,
        getAdapterContext,
        methodName,
        payload,
        setAuthError,
        setLoadingState,
        successAuditType,
        successEventName,
      }),
    [applySession, emitSessionEvent, getAdapterContext, getAdapterMethod, setAuthError, setLoadingState]
  );

  const linkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'linkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        successAuditType: 'link-provider',
        failureMessage: 'Provider linking failed',
        failureAction: 'link-provider',
        unsupportedMessage: 'Provider linking is not supported by the current auth adapter',
      }),
    [runProviderMutation]
  );

  const unlinkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'unlinkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        successAuditType: 'unlink-provider',
        failureMessage: 'Provider unlinking failed',
        failureAction: 'unlink-provider',
        unsupportedMessage: 'Provider unlinking is not supported by the current auth adapter',
      }),
    [runProviderMutation]
  );

  const requestPasswordReset = useCallback(
    (payload) =>
      runAuthPasswordResetRequest({
        adapter: getAdapterMethod(
          'requestPasswordReset',
          'Active auth adapter does not implement requestPasswordReset',
          'Password reset is not supported by the current auth adapter'
        ),
        emitAuthEvent,
        getAdapterContext,
        payload,
        setAuthError,
      }),
    [emitAuthEvent, getAdapterContext, getAdapterMethod, setAuthError]
  );

  const confirmPasswordReset = useCallback(
    (payload) =>
      runAuthPasswordResetConfirmation({
        adapter: getAdapterMethod(
          'confirmPasswordReset',
          'Active auth adapter does not implement confirmPasswordReset',
          'Password reset confirmation is not supported by the current auth adapter'
        ),
        emitAuthEvent,
        getAdapterContext,
        payload,
        setAuthError,
      }),
    [emitAuthEvent, getAdapterContext, getAdapterMethod, setAuthError]
  );

  const clearError = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null,
      status: prevState.session ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS,
    }));
  }, []);

  const stateValue = useMemo(
    () => ({
      ...state,
      capabilities: state.session?.capabilities || null,
      config: mergedConfig,
      isAuthenticated: Boolean(state.session),
      isAnonymous: state.status === AUTH_STATUS.ANONYMOUS || (!state.session && state.isReady),
    }),
    [mergedConfig, state]
  );

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
  );

  return (
    <AuthConfigContext.Provider value={mergedConfig}>
      <AuthActionsContext.Provider value={actionsValue}>
        <AuthStateContext.Provider value={stateValue}>{children}</AuthStateContext.Provider>
      </AuthActionsContext.Provider>
    </AuthConfigContext.Provider>
  );
}

export function useAuthConfig() {
  return useContext(AuthConfigContext);
}

export function useAuthState() {
  return useContext(AuthStateContext);
}

export function useAuthActions() {
  return useContext(AuthActionsContext);
}

export function useAuth() {
  const state = useAuthState();
  const actions = useAuthActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
      can: (rules) => canAccess(state.session, rules),
      hasRole: (role) => hasRole(state.session, role),
      hasCapability: (capability) => hasCapability(state.session, capability),
    }),
    [actions, state]
  );
}

import React from 'react';

import { EVENT_TYPES, globalEvents, normalizeLowerValue } from '@/shared';

import {
  AUTH_STATUS,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_AUTH_STATE,
  canAccess,
  createAuthStorage,
  hasCapability,
  hasRole,
  isSessionExpired,
  normalizeSession,
} from './config';
import {
  runAuthInitialize,
  runAuthProviderMutation,
  runAuthReauthenticate,
  runAuthRefreshSession,
  runAuthSignIn,
  runAuthSignOut,
  runAuthSignUp,
  runAuthUpdateProfile,
} from './flows';

const createContext =
  typeof React?.createContext === 'function'
    ? React.createContext.bind(React)
    : (defaultValue) => ({
        Provider: ({ children }) => children,
        Consumer: null,
        _currentValue: defaultValue,
      });

const { useCallback, useContext, useEffect, useState, useMemo, useRef } = React || {};

// React context is split by update frequency: consumers that only need actions
// do not rerender for every session transition.
const FALLBACK_AUTH_ACTIONS = Object.freeze({
  clearError: () => {},
  initialize: async () => null,
  linkProvider: async () => null,
  reauthenticate: async () => null,
  refreshSession: async () => null,
  registerPasskey: async () => null,
  listPasskeys: async () => [],
  updatePasskey: async () => null,
  deletePasskey: async () => null,
  listMfaFactors: async () => [],
  enrollMfa: async () => null,
  challengeMfa: async () => null,
  verifyMfa: async () => null,
  unenrollMfa: async () => null,
  getMfaAssuranceLevel: async () => null,
  signIn: async () => null,
  signOutOtherSessions: async () => null,
  signOut: async () => null,
  signUp: async () => null,
  unlinkProvider: async () => null,
  updateProfile: async () => null,
});

const AUTH_FLOW_STATUS = Object.freeze({
  login: Object.freeze({ priority: 110, statusType: 'LOGIN', themeType: 'LOGIN' }),
  logout: Object.freeze({ priority: 110, statusType: 'LOGOUT', themeType: 'LOGOUT' }),
});

function toAuthError(error, fallbackMessage) {
  if (error instanceof Error) return error;
  const normalizedError = new Error(
    error?.message || fallbackMessage || 'Authentication request failed',
  );
  normalizedError.name = error?.name || 'AuthError';
  normalizedError.status = error?.status || 0;
  normalizedError.data = error?.data || null;
  return normalizedError;
}

function createAdapterContext(config, storage, session) {
  return { config, storage, session: normalizeSession(session) };
}

function createSessionState(prevState, nextSession, nextStatus = null) {
  const session = normalizeSession(nextSession);
  return {
    ...prevState,
    lastUpdatedAt: Date.now(),
    status: nextStatus || (session ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS),
    session,
    user: session?.user || null,
    isReady: true,
    error: null,
  };
}

function createAnonymousState(prevState, { preserveError = false } = {}) {
  return {
    ...prevState,
    lastUpdatedAt: Date.now(),
    status: AUTH_STATUS.ANONYMOUS,
    session: null,
    user: null,
    isReady: true,
    error: preserveError ? prevState.error : null,
  };
}

function createAuthErrorState(prevState, error) {
  return {
    ...prevState,
    lastUpdatedAt: Date.now(),
    status: AUTH_STATUS.ERROR,
    isReady: true,
    error,
  };
}

function createAuthLoadingState(
  prevState,
  status = AUTH_STATUS.LOADING,
  { preserveError = false } = {},
) {
  return { ...prevState, status, error: preserveError ? prevState.error : null };
}

function createAuthEventPayload(payload = {}) {
  return { timestamp: Date.now(), ...payload };
}

function createSessionEventPayload(session, payload = {}) {
  return { session: session || null, user: session?.user || null, ...payload };
}

const AuthConfigContext = createContext(DEFAULT_AUTH_CONFIG);
const AuthStateContext = createContext(DEFAULT_AUTH_STATE);
const AuthActionsContext = createContext(FALLBACK_AUTH_ACTIONS);

export function AuthProvider({ children, config = {} }) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_AUTH_CONFIG, ...config }), [config]);
  const storage = useMemo(
    () => createAuthStorage(mergedConfig.storageKey),
    [mergedConfig.storageKey],
  );
  const adapterRef = useRef(mergedConfig.adapter);
  const bootstrapRef = useRef(false);
  const sessionRef = useRef(null);

  const [state, setState] = useState(() => {
    if (mergedConfig.initialSession) {
      const normalizedSession = normalizeSession(mergedConfig.initialSession);
      if (normalizedSession) {
        return createSessionState(DEFAULT_AUTH_STATE, normalizedSession);
      }
    }
    return DEFAULT_AUTH_STATE;
  });

  adapterRef.current = mergedConfig.adapter;
  sessionRef.current = state.session;

  const emitAuthEvent = useCallback((eventType, payload = {}) => {
    globalEvents.emit(eventType, createAuthEventPayload(payload));
  }, []);

  const emitAuthFeedback = useCallback(
    (flow, phase, overrides = {}) => {
      const normalizedFlow = normalizeLowerValue(flow);
      const normalizedPhase = normalizeLowerValue(phase);
      if (!normalizedFlow || !normalizedPhase) return;

      const flowConfig = AUTH_FLOW_STATUS[normalizedFlow] || null;
      emitAuthEvent(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: normalizedFlow,
        phase: normalizedPhase,
        statusType:
          overrides.statusType || flowConfig?.statusType || normalizedFlow.trim().toUpperCase(),
        themeType: overrides.themeType || flowConfig?.themeType || 'LOGIN',
        priority: overrides.priority ?? flowConfig?.priority ?? 110,
        ...(overrides.title != null ? { title: overrides.title } : {}),
        ...(overrides.description != null ? { description: overrides.description } : {}),
        ...(overrides.icon != null ? { icon: overrides.icon } : {}),
        ...(overrides.duration != null ? { duration: overrides.duration } : {}),
        ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
      });
    },
    [emitAuthEvent],
  );

  const applySession = useCallback((nextSession, nextStatus = null) => {
    const normalizedSession = normalizeSession(nextSession);
    setState((prevState) => createSessionState(prevState, normalizedSession, nextStatus));
    return normalizedSession;
  }, []);

  const clearSession = useCallback(({ preserveError = false } = {}) => {
    setState((prevState) => createAnonymousState(prevState, { preserveError }));
  }, []);

  const setAuthError = useCallback(
    (error, fallbackMessage) => {
      const normalizedError = toAuthError(error, fallbackMessage);
      setState((prevState) => createAuthErrorState(prevState, normalizedError));
      emitAuthEvent(EVENT_TYPES.AUTH_ERROR, {
        error: normalizedError,
        message: normalizedError.message,
      });
      return normalizedError;
    },
    [emitAuthEvent],
  );

  const setLoadingState = useCallback(
    (status = AUTH_STATUS.LOADING, { preserveError = false } = {}) => {
      setState((prevState) => createAuthLoadingState(prevState, status, { preserveError }));
    },
    [],
  );

  const getAdapterContext = useCallback(
    (session = sessionRef.current) => createAdapterContext(mergedConfig, storage, session),
    [mergedConfig, storage],
  );

  const getAdapterMethod = useCallback(
    (methodName, unavailableMessage, fallbackMessage) => {
      const adapter = adapterRef.current;
      if (typeof adapter?.[methodName] !== 'function') {
        throw setAuthError(new Error(unavailableMessage), fallbackMessage);
      }
      return adapter;
    },
    [setAuthError],
  );

  const emitSessionEvent = useCallback(
    (eventType, session, payload = {}) => {
      emitAuthEvent(eventType, createSessionEventPayload(session, payload));
    },
    [emitAuthEvent],
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
    [
      applySession,
      clearSession,
      emitSessionEvent,
      getAdapterContext,
      setAuthError,
      setLoadingState,
      state.isReady,
    ],
  );

  const initialize = useCallback(async () => {
    if (bootstrapRef.current) return;
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
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!mergedConfig.persistSession) {
      storage.clear();
      return;
    }

    if (state.session) storage.write(state.session);
    else storage.clear();
  }, [mergedConfig.persistSession, state.session, storage]);

  useEffect(() => {
    if (!mergedConfig.clearSessionOnUnauthorized) return;

    return globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, (eventData) => {
      if (eventData?.source && eventData.source !== 'app') return;

      clearSession();
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'api-unauthorized',
        session: null,
        user: null,
      });
    });
  }, [clearSession, emitAuthEvent, mergedConfig.clearSessionOnUnauthorized]);

  useEffect(() => {
    if (!mergedConfig.refreshOnWindowFocus || !mergedConfig.enabled) return;

    function handleFocus() {
      const activeSession = sessionRef.current;
      if (activeSession && isSessionExpired(activeSession, mergedConfig.refreshLeewayMs)) {
        refreshSession({ session: activeSession, silent: true });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') handleFocus();
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    mergedConfig.enabled,
    mergedConfig.refreshLeewayMs,
    mergedConfig.refreshOnWindowFocus,
    refreshSession,
  ]);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter?.onAuthStateChange) return;

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
          'Authentication adapter is not configured',
        ),
        applySession,
        clearSession,
        credentials,
        emitAuthFeedback,
        emitSessionEvent,
        getAdapterContext,
        previousSession: sessionRef.current,
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
    ],
  );

  const signUp = useCallback(
    (payload) =>
      runAuthSignUp({
        adapter: getAdapterMethod(
          'signUp',
          'Active auth adapter does not implement signUp',
          'Authentication adapter is not configured',
        ),
        applySession,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
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
    [
      clearSession,
      emitAuthEvent,
      emitAuthFeedback,
      getAdapterContext,
      setAuthError,
      setLoadingState,
    ],
  );

  const updateProfile = useCallback(
    (payload) =>
      runAuthUpdateProfile({
        adapter: getAdapterMethod(
          'updateProfile',
          'Active auth adapter does not implement updateProfile',
          'Profile updates are not supported by the current auth adapter',
        ),
        applySession,
        currentSession: sessionRef.current,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const reauthenticate = useCallback(
    (payload) =>
      runAuthReauthenticate({
        adapter: getAdapterMethod(
          'reauthenticate',
          'Active auth adapter does not implement reauthenticate',
          'Reauthentication is not supported by the current auth adapter',
        ),
        applySession,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const runProviderMutation = useCallback(
    (payload, { methodName, successEventName, failureMessage, unsupportedMessage }) =>
      runAuthProviderMutation({
        adapter: getAdapterMethod(
          methodName,
          `Active auth adapter does not implement ${methodName}`,
          unsupportedMessage,
        ),
        applySession,
        emitSessionEvent,
        failureMessage,
        getAdapterContext,
        methodName,
        payload,
        setAuthError,
        setLoadingState,
        successEventName,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const runPasskeyAction = useCallback(
    async (methodName, payload, fallbackMessage) => {
      const adapter = getAdapterMethod(
        methodName,
        `Active auth adapter does not implement ${methodName}`,
        'Passkey authentication is not supported by the current auth adapter',
      );
      try {
        return await adapter[methodName](payload, getAdapterContext(sessionRef.current));
      } catch (error) {
        throw setAuthError(error, fallbackMessage);
      }
    },
    [getAdapterContext, getAdapterMethod, setAuthError],
  );

  const registerPasskey = useCallback(
    (payload) => runPasskeyAction('registerPasskey', payload, 'Passkey registration failed'),
    [runPasskeyAction],
  );
  const listPasskeys = useCallback(
    (payload) => runPasskeyAction('listPasskeys', payload, 'Passkeys could not be loaded'),
    [runPasskeyAction],
  );
  const updatePasskey = useCallback(
    (payload) => runPasskeyAction('updatePasskey', payload, 'Passkey could not be renamed'),
    [runPasskeyAction],
  );
  const deletePasskey = useCallback(
    (payload) => runPasskeyAction('deletePasskey', payload, 'Passkey could not be removed'),
    [runPasskeyAction],
  );

  const runMfaAction = useCallback(
    async (methodName, payload, fallbackMessage) => {
      const adapter = getAdapterMethod(
        methodName,
        `Active auth adapter does not implement ${methodName}`,
        'MFA is not supported by the current auth adapter',
      );
      try {
        return await adapter[methodName](payload, getAdapterContext(sessionRef.current));
      } catch (error) {
        throw setAuthError(error, fallbackMessage);
      }
    },
    [getAdapterContext, getAdapterMethod, setAuthError],
  );

  const listMfaFactors = useCallback(
    (payload) => runMfaAction('listMfaFactors', payload, 'MFA factors could not be loaded'),
    [runMfaAction],
  );
  const enrollMfa = useCallback(
    (payload) => runMfaAction('enrollMfa', payload, 'MFA enrollment could not be started'),
    [runMfaAction],
  );
  const challengeMfa = useCallback(
    (payload) => runMfaAction('challengeMfa', payload, 'MFA challenge could not be created'),
    [runMfaAction],
  );
  const verifyMfa = useCallback(
    (payload) => runMfaAction('verifyMfa', payload, 'MFA code could not be verified'),
    [runMfaAction],
  );
  const unenrollMfa = useCallback(
    (payload) => runMfaAction('unenrollMfa', payload, 'MFA factor could not be removed'),
    [runMfaAction],
  );
  const getMfaAssuranceLevel = useCallback(
    (payload) =>
      runMfaAction('getMfaAssuranceLevel', payload, 'MFA assurance level could not be loaded'),
    [runMfaAction],
  );

  const linkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'linkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        failureMessage: 'Provider linking failed',
        unsupportedMessage: 'Provider linking is not supported by the current auth adapter',
      }),
    [runProviderMutation],
  );
  const unlinkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'unlinkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        failureMessage: 'Provider unlinking failed',
        unsupportedMessage: 'Provider unlinking is not supported by the current auth adapter',
      }),
    [runProviderMutation],
  );
  const signOutOtherSessions = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'signOutOtherSessions',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        failureMessage: 'Other sessions could not be signed out',
        unsupportedMessage: 'Session management is not supported by the current auth adapter',
      }),
    [runProviderMutation],
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
    [mergedConfig, state],
  );

  const actionsValue = useMemo(
    () => ({
      applySession,
      setSession: applySession,
      updateProfile,
      refreshSession,
      registerPasskey,
      listPasskeys,
      updatePasskey,
      deletePasskey,
      listMfaFactors,
      enrollMfa,
      challengeMfa,
      verifyMfa,
      unenrollMfa,
      getMfaAssuranceLevel,
      reauthenticate,
      unlinkProvider,
      initialize,
      linkProvider,
      clearError,
      signIn,
      signOutOtherSessions,
      signUp,
      signOut,
    }),
    [
      applySession,
      updateProfile,
      refreshSession,
      registerPasskey,
      listPasskeys,
      updatePasskey,
      deletePasskey,
      listMfaFactors,
      enrollMfa,
      challengeMfa,
      verifyMfa,
      unenrollMfa,
      getMfaAssuranceLevel,
      reauthenticate,
      unlinkProvider,
      initialize,
      linkProvider,
      clearError,
      signIn,
      signOutOtherSessions,
      signUp,
      signOut,
    ],
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
    [actions, state],
  );
}

export function useAuthSessionReady(expectedUserId = null) {
  const authState = useAuthState();

  return useMemo(() => {
    if (!authState?.isReady) return false;
    if (!expectedUserId) return true;

    const userId = authState?.user?.id ?? null;
    return Boolean(userId) && String(userId) === String(expectedUserId);
  }, [authState, expectedUserId]);
}

export function useAuthorization(rules = {}) {
  const auth = useAuth();
  const isPending =
    !auth.isReady ||
    auth.status === AUTH_STATUS.IDLE ||
    auth.status === AUTH_STATUS.LOADING ||
    auth.status === AUTH_STATUS.REFRESHING;
  const isAllowed = canAccess(auth.session, rules);

  return useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      isAnonymous: auth.isAnonymous,
      isAllowed,
      isPending,
      can: auth.can,
      auth,
    }),
    [isAllowed, isPending, auth],
  );
}

export function AuthGate({ loadingFallback = null, fallback = null, children, ...rules }) {
  const { isAllowed, isPending } = useAuthorization(rules);
  if (isPending) return loadingFallback;
  if (!isAllowed) return fallback;
  return <>{children}</>;
}

export function AnonymousGate({ loadingFallback = null, fallback = null, children }) {
  const auth = useAuth();
  if (!auth.isReady || auth.status === AUTH_STATUS.LOADING) return loadingFallback;
  if (auth.isAuthenticated) return fallback;
  return <>{children}</>;
}

import {
  getOAuthProviderLabel,
  normalizeOAuthProvider,
  resolvePrimaryProvider,
} from './provider-utils';
import { EVENT_TYPES } from '@/shared/events';

import { AUTH_STATUS } from './config';
import { isSessionExpired, mergeUserIntoSession, normalizeSession } from './utils';

const LOCAL_PURGE_SIGN_OUT_REASONS = new Set([
  'delete-account',
  'email-change',
  'password-change',
  'password-reset',
  'password-set',
]);

const IGNORABLE_SIGN_OUT_ERROR_PATTERNS = [
  'authentication token has been revoked',
  'failed to fetch',
  'fetch failed',
  'invalid jwt',
  'invalid number of segments',
  'invalid or expired authentication token',
  'jwt expired',
  'network request failed',
  'request timed out',
  'timeout',
  'timed out',
  'token is malformed',
];

function resolveAuthProvider(payload = {}, session = null) {
  const provider = normalizeOAuthProvider(
    payload?.provider || payload?.strategy || payload?.authProvider || null,
  );
  if (provider) return provider;

  const providerIds = Array.isArray(session?.metadata?.providerIds)
    ? session.metadata.providerIds
    : [];
  const sessionProvider = String(session?.provider || '')
    .trim()
    .toLowerCase();
  return (
    normalizeOAuthProvider(sessionProvider) ||
    sessionProvider ||
    resolvePrimaryProvider(providerIds) ||
    'password'
  );
}

function isPendingSignInResult(value) {
  return Boolean(value?.requiresVerification || value?.requiresRedirect);
}

function isIgnorableSignOutError(error) {
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();
  return (
    Boolean(message) &&
    IGNORABLE_SIGN_OUT_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
  );
}

async function executeAuthMutation({
  adapterMethod,
  applySession,
  emitSessionEvent,
  eventName,
  errorMessage,
  setAuthError,
  setLoadingState,
  transformResponse,
}) {
  setLoadingState();
  try {
    const rawResult = await adapterMethod();
    const resolvedSession = applySession(
      transformResponse ? transformResponse(rawResult) : rawResult,
    );
    if (eventName) {
      emitSessionEvent(eventName, resolvedSession);
    }
    return resolvedSession;
  } catch (error) {
    throw setAuthError(error, errorMessage);
  }
}

export async function runAuthSignIn({
  adapter,
  applySession,
  clearSession,
  credentials,
  emitAuthFeedback,
  emitSessionEvent,
  getAdapterContext,
  previousSession = null,
  setAuthError,
  setLoadingState,
}) {
  const provider = resolveAuthProvider(credentials);

  setLoadingState();
  emitAuthFeedback('login', 'start', {
    description:
      provider !== 'password'
        ? `Redirecting to ${getOAuthProviderLabel(provider)} sign-in`
        : 'Checking credentials and preparing session',
    title: 'Signing In',
  });

  try {
    const signInResult = await adapter.signIn(credentials, getAdapterContext());

    if (isPendingSignInResult(signInResult)) {
      if (signInResult?.requiresVerification) {
        emitAuthFeedback('login', 'clear');
      }

      if (signInResult?.requiresRedirect && typeof window !== 'undefined') {
        window.setTimeout(() => {
          emitAuthFeedback('login', 'clear');
        }, 12000);
      }

      if (previousSession) {
        applySession(previousSession);
      } else {
        clearSession();
      }
      return signInResult;
    }

    const session = applySession(signInResult);

    if (!session?.user) {
      emitAuthFeedback('login', 'clear');
      return session;
    }

    emitSessionEvent(EVENT_TYPES.AUTH_SIGN_IN, session);

    return session;
  } catch (error) {
    emitAuthFeedback('login', 'failure');
    throw setAuthError(error, 'Sign in failed');
  }
}

export async function runAuthRefreshSession({
  adapter,
  applySession,
  clearSession,
  emitSessionEvent,
  getAdapterContext,
  isReady = false,
  session,
  setAuthError,
  setLoadingState,
  silent = false,
}) {
  const activeSession = normalizeSession(session);

  if (!adapter?.refreshSession && !adapter?.getSession) {
    return activeSession;
  }

  setLoadingState(isReady ? AUTH_STATUS.REFRESHING : AUTH_STATUS.LOADING, {
    preserveError: silent,
  });

  try {
    const nextSession = activeSession
      ? await adapter.refreshSession(activeSession, getAdapterContext(activeSession))
      : await adapter.getSession(getAdapterContext(null));
    const resolvedSession = applySession(nextSession);

    emitSessionEvent(EVENT_TYPES.AUTH_REFRESH, resolvedSession);
    return resolvedSession;
  } catch (error) {
    clearSession({ preserveError: silent });

    if (!silent) {
      throw setAuthError(error, 'Session refresh failed');
    }

    return null;
  }
}

export async function runAuthInitialize({
  adapter,
  applySession,
  clearSession,
  emitAuthEvent,
  enabled = true,
  getAdapterContext,
  hydrateFromStorage = true,
  initialSession = null,
  refreshLeewayMs = 0,
  refreshSession,
  setAuthError,
  setLoadingState,
  storage,
}) {
  if (!enabled) {
    applySession(null, AUTH_STATUS.ANONYMOUS);
    emitAuthEvent(EVENT_TYPES.AUTH_READY, { session: null, user: null });
    return;
  }

  setLoadingState();

  let session = normalizeSession(
    initialSession || (hydrateFromStorage && !initialSession ? storage.read() : null),
  );

  try {
    if (session && isSessionExpired(session, refreshLeewayMs)) {
      session = await refreshSession({
        session,
        silent: true,
      });
    }

    if (!session && adapter?.getSession) {
      session = normalizeSession(await adapter.getSession(getAdapterContext(null)));
    }

    if (session) {
      session = applySession(session);
    } else {
      clearSession();
    }

    emitAuthEvent(EVENT_TYPES.AUTH_READY, {
      session: session || null,
      user: session?.user || null,
    });
  } catch (error) {
    clearSession();
    setAuthError(error, 'Authentication bootstrap failed');
  }
}

export async function runAuthSignUp({
  adapter,
  applySession,
  emitSessionEvent,
  getAdapterContext,
  payload,
  setAuthError,
  setLoadingState,
}) {
  setLoadingState();

  try {
    const signUpResult = await adapter.signUp(payload, getAdapterContext());

    if (isPendingSignInResult(signUpResult)) {
      return signUpResult;
    }

    const session = applySession(signUpResult);
    emitSessionEvent(EVENT_TYPES.AUTH_SIGN_UP, session);
    return session;
  } catch (error) {
    throw setAuthError(error, 'Sign up failed');
  }
}

export async function runAuthSignOut({
  adapter,
  clearSession,
  emitAuthEvent,
  emitAuthFeedback,
  getAdapterContext,
  previousSession,
  reason = 'logout',
  setAuthError,
  setLoadingState,
}) {
  let signOutError = null;
  const shouldUseLocalPurge = LOCAL_PURGE_SIGN_OUT_REASONS.has(reason);

  setLoadingState();
  emitAuthFeedback('logout', 'start', {
    description: 'Ending active session',
    title: 'Signing Out',
  });

  try {
    if (adapter?.signOut) {
      await adapter.signOut(getAdapterContext(previousSession), {
        mode: shouldUseLocalPurge ? 'local-purge' : 'global',
      });
    }
  } catch (error) {
    if (!isIgnorableSignOutError(error)) {
      emitAuthFeedback('logout', 'failure');
      signOutError = setAuthError(error, 'Sign out failed');
    }
  }

  clearSession({ preserveError: Boolean(signOutError) });

  emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
    reason,
    previousSession,
    session: null,
    user: null,
  });

  if (!previousSession?.user && reason !== 'delete-account') {
    emitAuthFeedback('logout', 'clear');
  }

  if (signOutError) {
    throw signOutError;
  }

  return true;
}

export async function runAuthUpdateProfile(params) {
  const session = await executeAuthMutation({
    adapterMethod: () => params.adapter.updateProfile(params.payload, params.getAdapterContext()),
    applySession: params.applySession,
    emitSessionEvent: params.emitSessionEvent,
    eventName: EVENT_TYPES.AUTH_UPDATE,
    errorMessage: 'Profile update failed',
    setAuthError: params.setAuthError,
    setLoadingState: params.setLoadingState,
    transformResponse: (response) =>
      normalizeSession(response) || mergeUserIntoSession(params.currentSession, response),
  });

  return session?.user || null;
}

export async function runAuthReauthenticate(params) {
  return executeAuthMutation({
    adapterMethod: () => params.adapter.reauthenticate(params.payload, params.getAdapterContext()),
    applySession: params.applySession,
    emitSessionEvent: (evt, sess) =>
      params.emitSessionEvent(evt, sess, { action: 'reauthenticate' }),
    eventName: EVENT_TYPES.AUTH_UPDATE,
    errorMessage: 'Reauthentication failed',
    setAuthError: params.setAuthError,
    setLoadingState: params.setLoadingState,
  });
}

export async function runAuthProviderMutation({
  adapter,
  applySession,
  emitSessionEvent,
  failureMessage,
  getAdapterContext,
  methodName,
  payload,
  setAuthError,
  setLoadingState,
  successEventName,
}) {
  setLoadingState();

  try {
    const session = applySession(await adapter[methodName](payload, getAdapterContext()));

    emitSessionEvent(successEventName, session);

    return session;
  } catch (error) {
    throw setAuthError(error, failureMessage);
  }
}

export async function runAuthPasswordResetRequest({
  adapter,
  emitAuthEvent,
  getAdapterContext,
  payload,
  setAuthError,
}) {
  try {
    const response = await adapter.requestPasswordReset(payload, getAdapterContext());

    emitAuthEvent(EVENT_TYPES.AUTH_UPDATE, {
      action: 'request-password-reset',
      response,
    });

    return response;
  } catch (error) {
    throw setAuthError(error, 'Password reset request failed');
  }
}

export async function runAuthPasswordResetConfirmation({
  adapter,
  emitAuthEvent,
  getAdapterContext,
  payload,
  setAuthError,
}) {
  try {
    const response = await adapter.confirmPasswordReset(payload, getAdapterContext());

    emitAuthEvent(EVENT_TYPES.AUTH_UPDATE, {
      action: 'confirm-password-reset',
      response,
    });

    return response;
  } catch (error) {
    throw setAuthError(error, 'Password reset confirmation failed');
  }
}

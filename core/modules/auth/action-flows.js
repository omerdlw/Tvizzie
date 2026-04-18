'use client';

import { resolvePrimaryProvider } from '@/core/auth/capabilities';
import { logAuthAuditEvent } from '@/core/auth/clients/audit.client';
import { getOAuthProviderLabel, normalizeOAuthProvider } from '@/core/auth/oauth-providers';
import { EVENT_TYPES } from '@/core/constants/events';

import { AUTH_STATUS } from './config';
import { isSessionExpired, mergeUserIntoSession, normalizeSession } from './utils';

function resolveAuthProvider(payload = {}, session = null) {
  const provider = normalizeOAuthProvider(payload?.provider || payload?.strategy || payload?.authProvider || null);

  if (provider) {
    return provider;
  }

  const providerIds = Array.isArray(session?.metadata?.providerIds) ? session.metadata.providerIds : [];
  const sessionProvider = String(session?.provider || '')
    .trim()
    .toLowerCase();

  return normalizeOAuthProvider(sessionProvider) || sessionProvider || resolvePrimaryProvider(providerIds) || 'password';
}

function resolveSignInIdentifier(payload = {}) {
  return payload?.email || payload?.identifier || payload?.username || payload?.userId || null;
}

function isPendingSignInResult(value) {
  return Boolean(value?.requiresVerification || value?.requiresRedirect);
}

function isIgnorableSignOutError(error) {
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes('invalid jwt') ||
    message.includes('token is malformed') ||
    message.includes('invalid number of segments') ||
    message.includes('invalid or expired authentication token') ||
    message.includes('authentication token has been revoked') ||
    message.includes('jwt expired') ||
    message.includes('request timed out') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed')
  );
}

export async function runAuthSignIn({
  adapter,
  applySession,
  clearSession,
  credentials,
  emitAuthFeedback,
  emitSessionEvent,
  getAdapterContext,
  setAuthError,
  setLoadingState,
}) {
  const provider = resolveAuthProvider(credentials);
  const identifier = resolveSignInIdentifier(credentials);

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

      clearSession();
      return signInResult;
    }

    const session = applySession(signInResult);

    if (!session?.user) {
      emitAuthFeedback('login', 'clear');
      return session;
    }

    emitSessionEvent(EVENT_TYPES.AUTH_SIGN_IN, session);

    logAuthAuditEvent({
      eventType: 'sign-in',
      status: 'success',
      userId: session?.user?.id || null,
      email: session?.user?.email || identifier || null,
      provider,
      metadata: { source: 'auth-context' },
    });

    return session;
  } catch (error) {
    emitAuthFeedback('login', 'failure');

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
    });

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

  setLoadingState(isReady ? AUTH_STATUS.REFRESHING : AUTH_STATUS.LOADING, { preserveError: silent });

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

  let session = normalizeSession(initialSession || (hydrateFromStorage && !initialSession ? storage.read() : null));

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
    const session = applySession(await adapter.signUp(payload, getAdapterContext()));

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
  const shouldUseLocalPurge =
    reason === 'email-change' ||
    reason === 'password-change' ||
    reason === 'password-set' ||
    reason === 'password-reset' ||
    reason === 'delete-account';

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

export async function runAuthUpdateProfile({
  adapter,
  applySession,
  currentSession,
  emitSessionEvent,
  getAdapterContext,
  payload,
  setAuthError,
  setLoadingState,
}) {
  setLoadingState();

  try {
    const response = await adapter.updateProfile(payload, getAdapterContext());
    const session = applySession(normalizeSession(response) || mergeUserIntoSession(currentSession, response));

    emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, session);
    return session?.user || null;
  } catch (error) {
    throw setAuthError(error, 'Profile update failed');
  }
}

export async function runAuthReauthenticate({
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
    const session = applySession(await adapter.reauthenticate(payload, getAdapterContext()));

    emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, session, {
      action: 'reauthenticate',
    });
    return session;
  } catch (error) {
    throw setAuthError(error, 'Reauthentication failed');
  }
}

export async function runAuthProviderMutation({
  adapter,
  applySession,
  currentSession,
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
}) {
  const provider = resolveAuthProvider(payload, currentSession);

  setLoadingState();

  try {
    const session = applySession(await adapter[methodName](payload, getAdapterContext()));

    emitSessionEvent(successEventName, session);

    logAuthAuditEvent({
      eventType: successAuditType,
      status: 'success',
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      provider,
      metadata: { source: 'auth-context' },
    });

    return session;
  } catch (error) {
    logAuthAuditEvent({
      eventType: 'failed-attempt',
      status: 'failure',
      userId: currentSession?.user?.id || null,
      email: currentSession?.user?.email || null,
      provider,
      metadata: {
        action: failureAction,
        code: error?.code || null,
        message: error?.message || failureMessage,
        source: 'auth-context',
      },
    });

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

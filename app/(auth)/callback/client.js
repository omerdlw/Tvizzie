'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { ACCOUNT_CLIENT } from '@/core/services/account/account-client';
import { Z_INDEX } from '@/core/constants';
import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import { normalizeOAuthIntent, sanitizeAuthNextPath } from '@/core/auth/oauth-callback';
import { getOAuthProviderIcon, getOAuthProviderLabel, normalizeOAuthProvider } from '@/core/auth/oauth-providers';
import { createClient as createSupabaseClient } from '@/core/clients/supabase/client';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import { isCanonicalSessionAuthenticated } from '@/core/modules/auth/session-client';
import Icon from '@/ui/icon';
import { Spinner } from '@/ui/loadings/spinner';

const SESSION_SYNC_MAX_ATTEMPTS = 10;
const SESSION_SYNC_RETRY_DELAY_MS = 200;
const BROWSER_SESSION_POLL_MAX_ATTEMPTS = 8;
const BROWSER_SESSION_POLL_RETRY_DELAY_MS = 200;
const CODE_EXCHANGE_MAX_ATTEMPTS = 3;
const CODE_EXCHANGE_RETRY_DELAY_MS = 450;
const IN_FLIGHT_CODE_EXCHANGES = new Map();

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeErrorCode(error) {
  return normalizeValue(error?.code || error?.error_code).toLowerCase();
}

function normalizeErrorMessage(error) {
  return normalizeValue(error?.message || error?.msg || error?.error_description || error?.error).toLowerCase();
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildRouteNoticeRedirect({ includeNext = true, nextPath, notice, origin, pathname }) {
  const redirectUrl = new URL(pathname, origin);

  if (includeNext && nextPath) {
    redirectUrl.searchParams.set('next', nextPath);
  }

  if (notice) {
    redirectUrl.searchParams.set('notice', notice);
  }

  return redirectUrl.toString();
}

function resolveFailureRedirectUrl({ intent, nextPath, origin, provider }) {
  const normalizedProvider = normalizeOAuthProvider(provider);
  const failureNotice =
    normalizedProvider === 'google' ? AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED : AUTH_ROUTE_NOTICE.OAUTH_AUTH_FAILED;

  if (intent === 'sign-up') {
    return buildRouteNoticeRedirect({
      nextPath,
      notice: failureNotice,
      origin,
      pathname: '/sign-up',
    });
  }

  if (intent === 'sign-in') {
    return buildRouteNoticeRedirect({
      nextPath,
      notice: failureNotice,
      origin,
      pathname: '/sign-in',
    });
  }

  return buildRouteNoticeRedirect({
    includeNext: false,
    nextPath,
    notice: failureNotice,
    origin,
    pathname: nextPath,
  });
}

function isTransientOAuthError(error) {
  const code = normalizeErrorCode(error);
  const message = normalizeErrorMessage(error);

  if (!code && !message) {
    return false;
  }

  return (
    code === 'timeout' ||
    code === 'request_timeout' ||
    code === 'network_error' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('connect timeout') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  );
}

async function waitForCanonicalSession({ isCancelled = null } = {}) {
  for (let attempt = 0; attempt < SESSION_SYNC_MAX_ATTEMPTS; attempt += 1) {
    if (typeof isCancelled === 'function' && isCancelled()) {
      return false;
    }

    const isAuthenticated = await isCanonicalSessionAuthenticated({
      force: attempt > 0,
    });

    if (isAuthenticated) {
      return true;
    }

    if (attempt < SESSION_SYNC_MAX_ATTEMPTS - 1) {
      await delay(SESSION_SYNC_RETRY_DELAY_MS);
    }
  }

  return false;
}

function createEmptyBrowserSessionState(error = null) {
  return {
    error,
    session: null,
    user: null,
    userId: '',
  };
}

async function getBrowserSessionState(supabase) {
  try {
    const sessionResult = await supabase.auth.getSession();

    if (sessionResult.error) {
      return createEmptyBrowserSessionState(sessionResult.error);
    }

    const session = sessionResult.data?.session || null;
    const user = session?.user || null;

    return {
      error: null,
      session,
      user,
      userId: normalizeValue(user?.id),
    };
  } catch (error) {
    return createEmptyBrowserSessionState(error);
  }
}

async function waitForBrowserSession({ isCancelled = null, supabase }) {
  let lastError = null;

  for (let attempt = 0; attempt < BROWSER_SESSION_POLL_MAX_ATTEMPTS; attempt += 1) {
    if (typeof isCancelled === 'function' && isCancelled()) {
      return {
        hasSession: false,
        lastError,
      };
    }

    const sessionState = await getBrowserSessionState(supabase);

    if (sessionState.userId) {
      return {
        hasSession: true,
        lastError: null,
        session: sessionState.session,
        user: sessionState.user,
      };
    }

    lastError = sessionState.error || lastError;

    if (attempt < BROWSER_SESSION_POLL_MAX_ATTEMPTS - 1) {
      await delay(BROWSER_SESSION_POLL_RETRY_DELAY_MS);
    }
  }

  return {
    hasSession: false,
    lastError,
    session: null,
    user: null,
  };
}

async function ensureAccountRecord(user = null) {
  if (!user?.id) {
    return;
  }

  await ACCOUNT_CLIENT.ensureAccount({
    avatarUrl: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
    displayName:
      user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null,
    email: user?.email || null,
    id: user.id,
  }).catch(() => null);
}

async function exchangeCodeForSessionWithRetry({ code, supabase }) {
  const normalizedCode = normalizeValue(code);

  if (!normalizedCode) {
    return {
      data: {
        session: null,
      },
      error: null,
    };
  }

  const existingExchange = IN_FLIGHT_CODE_EXCHANGES.get(normalizedCode);

  if (existingExchange) {
    return existingExchange;
  }

  const exchangePromise = (async () => {
    let lastResult = {
      data: {
        session: null,
      },
      error: null,
    };

    for (let attempt = 0; attempt < CODE_EXCHANGE_MAX_ATTEMPTS; attempt += 1) {
      const exchangeResult = await supabase.auth.exchangeCodeForSession(normalizedCode).catch((error) => ({
        data: {
          session: null,
        },
        error,
      }));

      lastResult = exchangeResult;

      if (!exchangeResult.error && exchangeResult.data?.session?.user?.id) {
        return exchangeResult;
      }

      if (!isTransientOAuthError(exchangeResult.error) || attempt >= CODE_EXCHANGE_MAX_ATTEMPTS - 1) {
        return exchangeResult;
      }

      await delay(CODE_EXCHANGE_RETRY_DELAY_MS);
    }

    return lastResult;
  })().finally(() => {
    IN_FLIGHT_CODE_EXCHANGES.delete(normalizedCode);
  });

  IN_FLIGHT_CODE_EXCHANGES.set(normalizedCode, exchangePromise);
  return exchangePromise;
}

function OAuthCallbackLoading({ provider = null }) {
  const providerIcon = getOAuthProviderIcon(provider);

  return (
    <main className="center pointer-events-none fixed inset-0 p-6" style={{ zIndex: Z_INDEX.LOADING }}>
      {providerIcon ? <Icon icon={providerIcon} size={50} /> : <Spinner size={50} />}
    </main>
  );
}

function OAuthCallbackContent({ initialProvider = null }) {
  const searchParams = useSearchParams();
  const provider = normalizeOAuthProvider(searchParams.get('provider')) || normalizeOAuthProvider(initialProvider);

  useEffect(() => {
    const providerLabel = getOAuthProviderLabel(provider, 'social');

    globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
      description: `Finishing ${providerLabel} sign-in`,
      flow: 'oauth-callback',
      icon: getOAuthProviderIcon(provider),
      isOverlay: true,
      phase: 'start',
      priority: 110,
      statusType: 'OAUTH_CALLBACK',
      themeType: 'LOGIN',
      title: `Sign in with ${providerLabel}`,
    });

    return () => {
      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: 'oauth-callback',
        phase: 'clear',
        statusType: 'OAUTH_CALLBACK',
      });
    };
  }, [provider]);

  useEffect(() => {
    let cancelled = false;

    async function finalizeOAuthSession() {
      const origin = window.location.origin;
      const nextPath = sanitizeAuthNextPath(searchParams.get('next'));
      const nextUrl = new URL(nextPath, origin).toString();
      const intent = normalizeOAuthIntent(searchParams.get('intent'), 'sign-in');
      const provider = normalizeOAuthProvider(searchParams.get('provider'));
      const code = normalizeValue(searchParams.get('code'));
      const providerError = normalizeValue(searchParams.get('error') || searchParams.get('error_description'));

      const redirectTo = (url) => {
        if (cancelled) {
          return;
        }

        window.location.replace(url);
      };

      const syncServerSession = async () =>
        waitForCanonicalSession({
          isCancelled: () => cancelled,
        });

      if (providerError) {
        redirectTo(
          resolveFailureRedirectUrl({
            intent,
            nextPath,
            origin,
            provider,
          })
        );
        return;
      }

      const supabase = createSupabaseClient();
      const sessionState = await getBrowserSessionState(supabase);

      if (sessionState.userId) {
        await ensureAccountRecord(sessionState.user);
        await syncServerSession();
        redirectTo(nextUrl);
        return;
      }

      let exchangeError = null;

      if (code) {
        const exchangeResult = await exchangeCodeForSessionWithRetry({
          code,
          supabase,
        });

        exchangeError = exchangeResult.error || null;

        if (!exchangeResult.error && exchangeResult.data?.session?.user?.id) {
          await ensureAccountRecord(exchangeResult.data.session.user);
          await syncServerSession();
          redirectTo(nextUrl);
          return;
        }
      }

      const browserSessionState = await waitForBrowserSession({
        isCancelled: () => cancelled,
        supabase,
      });

      if (browserSessionState.hasSession) {
        await ensureAccountRecord(browserSessionState.user);
        await syncServerSession();
        redirectTo(nextUrl);
        return;
      }

      if (isTransientOAuthError(exchangeError)) {
        const isServerSessionReady = await syncServerSession();

        if (isServerSessionReady) {
          redirectTo(nextUrl);
          return;
        }
      }

      redirectTo(
        resolveFailureRedirectUrl({
          intent,
          nextPath,
          origin,
          provider,
        })
      );
    }

    void finalizeOAuthSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return <OAuthCallbackLoading provider={provider} />;
}

export default function Client({ initialProvider = null }) {
  const provider = normalizeOAuthProvider(initialProvider);

  return (
    <Suspense fallback={<OAuthCallbackLoading provider={provider} />}>
      <OAuthCallbackContent initialProvider={provider} />
    </Suspense>
  );
}

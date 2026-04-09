'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import { normalizeGoogleAuthIntent, sanitizeAuthNextPath } from '@/core/auth/oauth-callback';
import { createClient as createSupabaseClient } from '@/core/clients/supabase/client';

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

function resolveFailureRedirectUrl({ intent, nextPath, origin }) {
  if (intent === 'sign-up') {
    return buildRouteNoticeRedirect({
      nextPath,
      notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
      origin,
      pathname: '/sign-up',
    });
  }

  if (intent === 'sign-in') {
    return buildRouteNoticeRedirect({
      nextPath,
      notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
      origin,
      pathname: '/sign-in',
    });
  }

  return buildRouteNoticeRedirect({
    includeNext: false,
    nextPath,
    notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
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

async function isCanonicalSessionAuthenticated() {
  try {
    const response = await fetch('/api/auth/session', {
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);

    return payload?.status === 'authenticated' && Boolean(payload?.user?.id);
  } catch {
    return false;
  }
}

async function waitForCanonicalSession({ isCancelled = null } = {}) {
  for (let attempt = 0; attempt < SESSION_SYNC_MAX_ATTEMPTS; attempt += 1) {
    if (typeof isCancelled === 'function' && isCancelled()) {
      return false;
    }

    const isAuthenticated = await isCanonicalSessionAuthenticated();

    if (isAuthenticated) {
      return true;
    }

    if (attempt < SESSION_SYNC_MAX_ATTEMPTS - 1) {
      await delay(SESSION_SYNC_RETRY_DELAY_MS);
    }
  }

  return false;
}

async function getBrowserSessionUserId(supabase) {
  try {
    const sessionResult = await supabase.auth.getSession();

    if (sessionResult.error) {
      return {
        error: sessionResult.error,
        userId: '',
      };
    }

    return {
      error: null,
      userId: normalizeValue(sessionResult.data?.session?.user?.id),
    };
  } catch (error) {
    return {
      error,
      userId: '',
    };
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

    const sessionState = await getBrowserSessionUserId(supabase);

    if (sessionState.userId) {
      return {
        hasSession: true,
        lastError: null,
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
  };
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

function OAuthCallbackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-slate-500">Finishing Google sign-in...</p>
    </main>
  );
}

function OAuthCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finalizeOAuthSession() {
      const origin = window.location.origin;
      const nextPath = sanitizeAuthNextPath(searchParams.get('next'));
      const nextUrl = new URL(nextPath, origin).toString();
      const intent = normalizeGoogleAuthIntent(searchParams.get('intent'), 'sign-in');
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
          })
        );
        return;
      }

      const supabase = createSupabaseClient();
      const sessionState = await getBrowserSessionUserId(supabase);

      if (sessionState.userId) {
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
        })
      );
    }

    void finalizeOAuthSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return <OAuthCallbackLoading />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallbackLoading />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

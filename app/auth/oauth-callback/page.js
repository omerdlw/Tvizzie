'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import { normalizeGoogleAuthIntent, sanitizeAuthNextPath } from '@/core/auth/oauth-callback';
import { createClient as createSupabaseClient } from '@/core/clients/supabase/client';

function normalizeValue(value) {
  return String(value || '').trim();
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

function OAuthCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finalizeOAuthSession() {
      const origin = window.location.origin;
      const nextPath = sanitizeAuthNextPath(searchParams.get('next'));
      const intent = normalizeGoogleAuthIntent(searchParams.get('intent'), 'sign-in');
      const code = normalizeValue(searchParams.get('code'));
      const providerError = normalizeValue(searchParams.get('error') || searchParams.get('error_description'));

      const redirectTo = (url) => {
        if (cancelled) {
          return;
        }

        window.location.replace(url);
      };

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
      const sessionResult = await supabase.auth.getSession();

      if (!sessionResult.error && sessionResult.data?.session?.user?.id) {
        redirectTo(new URL(nextPath, origin).toString());
        return;
      }

      if (code) {
        const exchangeResult = await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeResult.error && exchangeResult.data?.session?.user?.id) {
          redirectTo(new URL(nextPath, origin).toString());
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

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

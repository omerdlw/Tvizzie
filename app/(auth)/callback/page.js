'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ACCOUNT_CLIENT } from '@/domains/account/client/profile';
import { AUTH_ROUTE_NOTICE } from '@/domains/auth/utils/routes';
import {
  getOAuthProviderIcon,
  getOAuthProviderLabel,
  normalizeOAuthIntent,
  normalizeOAuthProvider,
  sanitizeAuthNextPath,
} from '@/domains/auth/utils/oauth';
import { createClient as createSupabaseClient } from '@/infrastructure/supabase/client';
import { fetchCanonicalSessionPayload } from '@/modules/auth';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { Z_INDEX } from '@/shared';
import Icon from '@/ui/primitives/icon';
import { Spinner } from '@/ui/feedback/spinner';
import { sendSecurityEventRequest } from '@/domains/auth/client/requests';

const SESSION_POLL_ATTEMPTS = 8;
const SESSION_POLL_DELAY_MS = 200;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRouteNoticeRedirect({ includeNext = true, nextPath, notice, origin, pathname }) {
  const redirectUrl = new URL('/', origin);

  if (pathname === '/sign-in' || pathname === '/sign-up') {
    redirectUrl.searchParams.set('auth', pathname.slice(1));
  }
  if (includeNext && nextPath) redirectUrl.searchParams.set('next', nextPath);
  if (notice) redirectUrl.searchParams.set('notice', notice);

  return redirectUrl.toString();
}

function resolveFailureRedirectUrl({ intent, nextPath, origin, provider }) {
  const notice =
    normalizeOAuthProvider(provider) === 'google'
      ? AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED
      : AUTH_ROUTE_NOTICE.OAUTH_AUTH_FAILED;

  if (intent === 'sign-up') {
    return buildRouteNoticeRedirect({ nextPath, notice, origin, pathname: '/sign-up' });
  }

  if (intent === 'sign-in') {
    return buildRouteNoticeRedirect({ nextPath, notice, origin, pathname: '/sign-in' });
  }

  return buildRouteNoticeRedirect({
    includeNext: false,
    nextPath,
    notice,
    origin,
    pathname: nextPath,
  });
}

async function waitForOAuthSession({ isCancelled, supabase }) {
  for (let attempt = 0; attempt < SESSION_POLL_ATTEMPTS; attempt += 1) {
    if (isCancelled()) return null;

    const sessionResult = await supabase.auth.getSession().catch(() => null);
    const session = sessionResult?.data?.session || null;

    if (session?.user?.id) return session;

    const canonicalSession = await fetchCanonicalSessionPayload({ force: attempt > 0 }).catch(
      () => null,
    );

    if (canonicalSession?.status === 'authenticated' && canonicalSession.user?.id) {
      return { user: canonicalSession.user };
    }

    if (attempt < SESSION_POLL_ATTEMPTS - 1) await delay(SESSION_POLL_DELAY_MS);
  }

  return null;
}

async function ensureAccountRecord(user) {
  if (!user?.id) return null;

  const metadata = user.metadata || user.user_metadata || {};

  return ACCOUNT_CLIENT.ensureAccount({
    displayName: metadata.display_name || metadata.full_name || metadata.name || null,
    email: user.email || null,
    id: user.id,
  });
}

function OAuthCallbackLoading({ provider = null }) {
  const providerIcon = getOAuthProviderIcon(provider);

  return (
    <main
      className="center pointer-events-none fixed inset-0 p-6"
      style={{ zIndex: Z_INDEX.LOADING }}
    >
      {providerIcon ? <Icon icon={providerIcon} size={50} /> : <Spinner size={50} />}
    </main>
  );
}

function OAuthCallbackContent({ initialProvider = null }) {
  const searchParams = useSearchParams();
  const provider =
    normalizeOAuthProvider(searchParams.get('provider')) || normalizeOAuthProvider(initialProvider);
  const intent = normalizeOAuthIntent(searchParams.get('intent'), 'sign-in');
  const isProviderLink = intent === 'link';
  const providerLinkCompletedRef = useRef(false);

  useEffect(() => {
    const providerLabel = getOAuthProviderLabel(provider, 'social');
    const flow = isProviderLink ? 'provider-link' : 'oauth-callback';
    const statusType = isProviderLink ? 'PROVIDER_LINK' : 'OAUTH_CALLBACK';

    globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
      description: isProviderLink
        ? `Finishing ${providerLabel} connection`
        : `Finishing ${providerLabel} sign-in`,
      flow,
      icon: getOAuthProviderIcon(provider),
      isOverlay: true,
      phase: 'start',
      priority: 112,
      statusType,
      themeType: 'LOGIN',
      title: isProviderLink ? `Connect ${providerLabel}` : `Sign in with ${providerLabel}`,
    });

    return () => {
      if (isProviderLink && providerLinkCompletedRef.current) return;

      globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
        flow,
        phase: 'clear',
        statusType,
      });
    };
  }, [isProviderLink, provider]);

  useEffect(() => {
    let isCancelled = false;

    async function finalizeOAuthSession() {
      const origin = window.location.origin;
      const nextPath = sanitizeAuthNextPath(searchParams.get('next'));
      const intent = normalizeOAuthIntent(searchParams.get('intent'), 'sign-in');
      const routeProvider = normalizeOAuthProvider(searchParams.get('provider'));
      const providerError = searchParams.get('error') || searchParams.get('error_description');

      const redirect = (url) => {
        if (!isCancelled) window.location.replace(url);
      };

      if (providerError) {
        if (intent === 'link') {
          globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
            flow: 'provider-link',
            phase: 'clear',
            statusType: 'PROVIDER_LINK',
          });
        }
        redirect(resolveFailureRedirectUrl({ intent, nextPath, origin, provider: routeProvider }));
        return;
      }

      const session = await waitForOAuthSession({
        isCancelled: () => isCancelled,
        supabase: createSupabaseClient(),
      });

      if (!session?.user?.id) {
        if (intent === 'link') {
          globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
            flow: 'provider-link',
            phase: 'clear',
            statusType: 'PROVIDER_LINK',
          });
        }
        redirect(resolveFailureRedirectUrl({ intent, nextPath, origin, provider: routeProvider }));
        return;
      }

      let accountProfile = null;

      try {
        accountProfile = await ensureAccountRecord(session.user);
      } catch {
        if (intent === 'link') {
          globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
            flow: 'provider-link',
            phase: 'clear',
            statusType: 'PROVIDER_LINK',
          });
        }
        redirect(resolveFailureRedirectUrl({ intent, nextPath, origin, provider: routeProvider }));
        return;
      }

      if (!accountProfile?.id) {
        if (intent === 'link') {
          globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
            flow: 'provider-link',
            phase: 'clear',
            statusType: 'PROVIDER_LINK',
          });
        }
        redirect(resolveFailureRedirectUrl({ intent, nextPath, origin, provider: routeProvider }));
        return;
      }
      if (intent === 'link') {
        await sendSecurityEventRequest({ event: 'provider-linked', provider: routeProvider }).catch(
          () => {},
        );
        globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
          description: `${getOAuthProviderLabel(routeProvider, 'social')} is now connected`,
          flow: 'provider-link',
          icon: getOAuthProviderIcon(routeProvider),
          phase: 'success',
          priority: 112,
          statusType: 'PROVIDER_LINK',
          themeType: 'LOGIN',
          title: `${getOAuthProviderLabel(routeProvider, 'social')} Connected`,
        });
        providerLinkCompletedRef.current = true;
      }
      const destination =
        nextPath === '/account' && accountProfile?.username
          ? `/account/${encodeURIComponent(accountProfile.username)}`
          : nextPath;

      redirect(new URL(destination, origin).toString());
    }

    void finalizeOAuthSession();

    return () => {
      isCancelled = true;
    };
  }, [searchParams]);

  return <OAuthCallbackLoading provider={provider} />;
}

function OAuthCallbackView({ initialProvider = null }) {
  const provider = normalizeOAuthProvider(initialProvider);

  return (
    <Suspense fallback={<OAuthCallbackLoading provider={provider} />}>
      <OAuthCallbackContent initialProvider={provider} />
    </Suspense>
  );
}

export default function CallbackPage() {
  return <OAuthCallbackView />;
}

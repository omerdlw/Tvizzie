import { NextResponse } from 'next/server';

import {
  getOAuthProviderLabel,
  normalizeOAuthIntent,
  normalizeOAuthProvider,
  sanitizeAuthNextPath,
} from '@/domains/auth/utils/oauth';
import { createSupabaseResponseClient } from '@/infrastructure/supabase/response-client.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function noStore(response) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function buildFailureRedirectUrl({ intent, nextPath, origin, provider }) {
  const pathname = intent === 'sign-up' ? '/sign-up' : '/sign-in';
  const url = new URL(pathname, origin);
  const providerLabel = getOAuthProviderLabel(provider, 'OAuth');

  url.searchParams.set('next', nextPath);
  url.searchParams.set(
    'notice',
    provider === 'google' ? 'google-auth-failed' : 'oauth-auth-failed',
  );
  url.searchParams.set('provider', provider || providerLabel.toLowerCase());

  return url;
}

function buildCompletionRedirectUrl({ intent, nextPath, origin, provider }) {
  // Keep the existing completion page for account bootstrapping. It now only
  // verifies the server session and creates a profile if the OAuth user is new;
  // it no longer owns the PKCE exchange.
  const url = new URL('/callback', origin);

  url.searchParams.set('next', nextPath);
  url.searchParams.set('intent', intent);
  if (provider) {
    url.searchParams.set('provider', provider);
  }

  return url;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const nextPath = sanitizeAuthNextPath(requestUrl.searchParams.get('next'));
  const intent = normalizeOAuthIntent(requestUrl.searchParams.get('intent'), 'sign-in');
  const provider = normalizeOAuthProvider(requestUrl.searchParams.get('provider'));
  const code = normalizeValue(requestUrl.searchParams.get('code'));
  const providerError = normalizeValue(
    requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_description'),
  );

  if (providerError || !code) {
    return noStore(
      NextResponse.redirect(buildFailureRedirectUrl({ intent, nextPath, origin, provider }), {
        status: 302,
      }),
    );
  }

  const response = noStore(
    NextResponse.redirect(buildCompletionRedirectUrl({ intent, nextPath, origin, provider }), {
      status: 302,
    }),
  );

  try {
    const supabase = createSupabaseResponseClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  } catch {}

  return noStore(
    NextResponse.redirect(buildFailureRedirectUrl({ intent, nextPath, origin, provider }), {
      status: 302,
    }),
  );
}

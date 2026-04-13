import { NextResponse } from 'next/server';

import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import {
  normalizeGoogleAuthIntent,
  sanitizeAuthNextPath,
} from '@/core/auth/oauth-callback';
import { createClient as createSupabaseServerClient } from '@/core/clients/supabase/server';

const CLIENT_OAUTH_CALLBACK_FALLBACK_PATH = '/auth/oauth-callback';

function normalizeValue(value) {
  return String(value || '').trim();
}

function buildAbsoluteRedirectUrl({ requestUrl, pathname, nextPath = '', notice = '' }) {
  const redirectUrl = new URL(pathname, requestUrl.origin);

  if (nextPath) {
    redirectUrl.searchParams.set('next', nextPath);
  }

  if (notice) {
    redirectUrl.searchParams.set('notice', notice);
  }

  return redirectUrl;
}

function buildFailureRedirectUrl({ intent, nextPath, requestUrl }) {
  if (intent === 'sign-up') {
    return buildAbsoluteRedirectUrl({
      nextPath,
      notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
      pathname: '/sign-up',
      requestUrl,
    });
  }

  if (intent === 'sign-in') {
    return buildAbsoluteRedirectUrl({
      nextPath,
      notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
      pathname: '/sign-in',
      requestUrl,
    });
  }

  return buildAbsoluteRedirectUrl({
    notice: AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED,
    pathname: nextPath,
    requestUrl,
  });
}

function buildPostAuthRedirectUrl({ nextPath, request }) {
  const forwardedHost = normalizeValue(request.headers.get('x-forwarded-host'));
  const forwardedProto = normalizeValue(request.headers.get('x-forwarded-proto')) || 'https';
  const requestUrl = new URL(request.url);

  if (process.env.NODE_ENV !== 'development' && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${nextPath}`;
  }

  return `${requestUrl.origin}${nextPath}`;
}

function buildClientFallbackUrl(requestUrl) {
  const redirectUrl = new URL(CLIENT_OAUTH_CALLBACK_FALLBACK_PATH, requestUrl.origin);

  requestUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  return redirectUrl;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = normalizeValue(requestUrl.searchParams.get('code'));
  const providerError = normalizeValue(
    requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_description')
  );
  const nextPath = sanitizeAuthNextPath(requestUrl.searchParams.get('next'));
  const intent = normalizeGoogleAuthIntent(requestUrl.searchParams.get('intent'), 'sign-in');

  if (providerError) {
    return NextResponse.redirect(buildFailureRedirectUrl({ intent, nextPath, requestUrl }));
  }

  if (!code) {
    return NextResponse.redirect(buildClientFallbackUrl(requestUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(buildClientFallbackUrl(requestUrl));
  }

  return NextResponse.redirect(buildPostAuthRedirectUrl({ nextPath, request }));
}

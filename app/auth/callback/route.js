import { NextResponse } from 'next/server';

import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import { normalizeOAuthIntent, sanitizeAuthNextPath } from '@/core/auth/oauth-callback';
import { normalizeOAuthProvider } from '@/core/auth/oauth-providers';

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
  const provider = normalizeOAuthProvider(requestUrl.searchParams.get('provider'));
  const failureNotice = provider === 'google' ? AUTH_ROUTE_NOTICE.GOOGLE_AUTH_FAILED : AUTH_ROUTE_NOTICE.OAUTH_AUTH_FAILED;

  if (intent === 'sign-up') {
    return buildAbsoluteRedirectUrl({
      nextPath,
      notice: failureNotice,
      pathname: '/sign-up',
      requestUrl,
    });
  }

  if (intent === 'sign-in') {
    return buildAbsoluteRedirectUrl({
      nextPath,
      notice: failureNotice,
      pathname: '/sign-in',
      requestUrl,
    });
  }

  return buildAbsoluteRedirectUrl({
    notice: failureNotice,
    pathname: nextPath,
    requestUrl,
  });
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
  const intent = normalizeOAuthIntent(requestUrl.searchParams.get('intent'), 'sign-in');

  if (providerError) {
    return NextResponse.redirect(buildFailureRedirectUrl({ intent, nextPath, requestUrl }));
  }

  if (!code) {
    return NextResponse.redirect(buildClientFallbackUrl(requestUrl));
  }

  return NextResponse.redirect(buildClientFallbackUrl(requestUrl));
}

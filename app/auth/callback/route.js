import { NextResponse } from 'next/server';

import { AUTH_OAUTH_CALLBACK_PATH } from '@/core/auth/oauth-callback';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL(AUTH_OAUTH_CALLBACK_PATH, requestUrl.origin);

  requestUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl);
}

import { NextResponse } from 'next/server';
import { ensureCsrfCookie } from '@/domains/auth/server/security.server';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response.server';
import { createCsrfToken } from '@/domains/auth/server/session.server';

export async function GET(request) {
  const existingToken = request.cookies.get('tvz_auth_csrf')?.value || '';
  const csrfToken = existingToken || createCsrfToken();
  const response = NextResponse.json({ csrfToken, success: true });
  ensureCsrfCookie(response, csrfToken);
  return makeAuthResponsePrivate(response, { varyByCookie: true });
}

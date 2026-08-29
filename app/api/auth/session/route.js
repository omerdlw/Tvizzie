import { handleSessionGet } from '@/domains/auth/server/api-handlers';
import { clearAuthCookies } from '@/domains/auth/server/session';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const response = await handleSessionGet(request);
  return makeAuthResponsePrivate(response, { varyByCookie: true });
}

export async function DELETE(request) {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response, request);
  return makeAuthResponsePrivate(response, { varyByCookie: true });
}

import { handleSessionGet } from '@/domains/auth/server/api-handlers.server';
import {
  applySupabaseSessionToResponse,
  clearAuthCookies,
} from '@/domains/auth/server/session.server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const response = await handleSessionGet(request);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function POST(request) {
  try {
    const { accessToken, refreshToken } = await request.json();
    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'private, no-store');
    await applySupabaseSessionToResponse(request, response, { accessToken, refreshToken });
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: error.message || 'Failed to apply session cookies' },
      { status: 400 },
    );
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Cookie');
    return response;
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Cache-Control', 'private, no-store');
  clearAuthCookies(response);
  return response;
}

import { handleSessionGet } from '@/domains/auth/server/api-handlers.server';
import {
  applySupabaseSessionToResponse,
  clearAuthCookies,
} from '@/domains/auth/server/session.server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  return handleSessionGet(request);
}

export async function POST(request) {
  try {
    const { accessToken, refreshToken } = await request.json();
    const response = NextResponse.json({ success: true });
    await applySupabaseSessionToResponse(request, response, { accessToken, refreshToken });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to apply session cookies' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}

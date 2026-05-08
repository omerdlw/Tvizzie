import { NextResponse } from 'next/server';

import {
  clearAuthRouteNoticeCookie,
  setAuthRouteNoticeCookie,
} from '@/core/auth/servers/notice/auth-route-notice.server';
import { AUTH_ROUTE_NOTICE } from '@/core/auth/route-notice';
import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import {
  clearAuthCookies,
  isTransientSessionError,
  serializeSessionState,
} from '@/core/auth/servers/session/session.server';
import { clearRecentReauthCookie } from '@/core/auth/servers/security/recent-reauth.server';
import {
  clearStepUpCookie,
  listStepUpPurposes,
  readStepUpFromRequest,
} from '@/core/auth/servers/security/step-up.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function shouldClearAuthCookiesForError(error) {
  const errorCode = normalizeValue(error?.code).toUpperCase();

  if (errorCode === 'GOOGLE_PASSWORD_LOGIN_REQUIRED' || errorCode === 'GOOGLE_PROVIDER_COLLISION') {
    return true;
  }

  const message = normalizeValue(error?.message).toLowerCase();

  return (
    message.includes('invalid or expired authentication token') ||
    message.includes('authentication token has been revoked')
  );
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: false,
    });
    const stepUp = readStepUpFromRequest(request);
    const response = NextResponse.json(
      serializeSessionState(authContext, {
        purposes: listStepUpPurposes(stepUp),
      })
    );
    clearAuthRouteNoticeCookie(response);
    return response;
  } catch (error) {
    if (isTransientSessionError(error)) {
      return NextResponse.json(serializeSessionState(null), { status: 200 });
    }

    const response = NextResponse.json(serializeSessionState(null));

    if (String(error?.code || '').trim() === 'GOOGLE_PASSWORD_LOGIN_REQUIRED') {
      setAuthRouteNoticeCookie(response, AUTH_ROUTE_NOTICE.GOOGLE_PASSWORD_LOGIN_REQUIRED);
    } else if (String(error?.code || '').trim() === 'GOOGLE_PROVIDER_COLLISION') {
      setAuthRouteNoticeCookie(response, AUTH_ROUTE_NOTICE.GOOGLE_PROVIDER_COLLISION);
    } else {
      clearAuthRouteNoticeCookie(response);
    }

    if (shouldClearAuthCookiesForError(error)) {
      clearAuthCookies(response, request);
    }

    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Session bootstrap is handled directly by Supabase client auth',
    },
    { status: 410 }
  );
}

export async function DELETE(request) {
  const response = NextResponse.json({ success: true });
  clearAuthRouteNoticeCookie(response);
  clearAuthCookies(response, request);
  clearRecentReauthCookie(response);
  clearStepUpCookie(response);
  return response;
}

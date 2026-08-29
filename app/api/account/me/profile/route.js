import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security';
import { requireProtectedSession } from '@/domains/auth/server/session';
import { accountProfileWriter, isAccountCoreError, toAccountViewer } from '@/domains/account/core';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';

function getProfileUpdateRouteError(error) {
  if (isAccountCoreError(error)) return error;

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('csrf')) {
    return { code: 'CSRF_INVALID', message: 'Invalid CSRF token', status: 403 };
  }
  if (message.includes('authentication session')) {
    return { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required', status: 401 };
  }

  return {
    code: 'PROFILE_UPDATE_FAILED',
    message: 'Profile could not be updated',
    status: 500,
  };
}

export async function PATCH(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    const viewer = toAccountViewer(session);
    const input = await request.json().catch(() => null);
    const account = await accountProfileWriter.updateCurrentProfile({ input, viewer });
    const response = createApiSuccessResponse(account);

    Object.entries(cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)).forEach(
      ([name, value]) => {
        response.headers.set(name, value);
      },
    );
    return response;
  } catch (error) {
    const routeError = getProfileUpdateRouteError(error);
    const response = createApiErrorResponse(
      {
        code: routeError.code,
        message: routeError.message,
        retryable: false,
      },
      { status: routeError.status },
    );
    response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
    return response;
  }
}

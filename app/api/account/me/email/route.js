import { accountLifecycle, isAccountCoreError, toAccountViewer } from '@/domains/account/core';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security';
import { requireProtectedSession } from '@/domains/auth/server/session';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    const account = await accountLifecycle.syncCurrentAccountEmail({
      viewer: toAccountViewer(session),
    });
    const response = createApiSuccessResponse(account);

    Object.entries(cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)).forEach(
      ([name, value]) => {
        response.headers.set(name, value);
      },
    );
    return response;
  } catch (error) {
    const isKnownError = isAccountCoreError(error);
    const response = createApiErrorResponse(
      {
        code: isKnownError ? error.code : 'ACCOUNT_EMAIL_SYNC_FAILED',
        message: isKnownError ? error.message : 'Account email could not be synchronized',
        retryable: false,
      },
      { status: isKnownError ? error.status : 500 },
    );
    response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
    return response;
  }
}

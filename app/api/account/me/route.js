import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';
import {
  accountLifecycle,
  accountProfileReader,
  isAccountCoreError,
  resolveAccountViewer,
  toAccountViewer,
} from '@/domains/account/core';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security';
import { requireProtectedSession } from '@/domains/auth/server/session';

export async function GET(request) {
  try {
    const viewer = await resolveAccountViewer(request);
    const account = await accountProfileReader.readCurrentProfile({ viewerId: viewer?.id || null });
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
        code: isKnownError ? error.code : 'CURRENT_ACCOUNT_READ_FAILED',
        message: isKnownError ? error.message : 'Current account could not be loaded',
        retryable: false,
      },
      { status: isKnownError ? error.status : 500 },
    );
    response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
    return response;
  }
}

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    const viewer = toAccountViewer(session);
    const input = await request.json().catch(() => ({}));
    const account = await accountLifecycle.provisionCurrentAccount({ input, viewer });
    const response = createApiSuccessResponse(account, { status: 201 });

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
        code: isKnownError ? error.code : 'ACCOUNT_PROVISION_FAILED',
        message: isKnownError ? error.message : 'Account could not be provisioned',
        retryable: false,
      },
      { status: isKnownError ? error.status : 500 },
    );
    response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
    return response;
  }
}

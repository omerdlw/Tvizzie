import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';
import {
  accountProfileReader,
  isAccountCoreError,
  resolveAccountViewer,
} from '@/domains/account/core';

function createReadErrorResponse(error) {
  const isKnownError = isAccountCoreError(error);
  const response = createApiErrorResponse(
    {
      code: isKnownError ? error.code : 'PROFILE_READ_FAILED',
      message: isKnownError ? error.message : 'Profile could not be loaded',
      retryable: false,
    },
    { status: isKnownError ? error.status : 500 },
  );
  response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
  return response;
}

export async function GET(request, { params }) {
  try {
    const [{ handle }, viewer] = await Promise.all([params, resolveAccountViewer(request)]);
    const account = await accountProfileReader.readProfileByHandle({
      handle,
      viewerId: viewer?.id || null,
    });
    const response = createApiSuccessResponse(account);
    const policy = CACHE_CONTROL.NO_STORE;

    Object.entries(cacheControlHeaders(policy)).forEach(([name, value]) => {
      response.headers.set(name, value);
    });
    return response;
  } catch (error) {
    return createReadErrorResponse(error);
  }
}

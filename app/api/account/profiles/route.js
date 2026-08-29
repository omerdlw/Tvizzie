import { accountProfileSearch } from '@/domains/account/core';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await accountProfileSearch.search({
      limit: searchParams.get('limit'),
      query: searchParams.get('q'),
    });
    const response = createApiSuccessResponse(result);

    Object.entries(cacheControlHeaders(CACHE_CONTROL.PUBLIC_ACCOUNT_RESOLVE)).forEach(
      ([name, value]) => {
        response.headers.set(name, value);
      },
    );
    return response;
  } catch {
    const response = createApiErrorResponse(
      {
        code: 'PROFILE_SEARCH_FAILED',
        message: 'Profiles could not be searched',
        retryable: false,
      },
      { status: 500 },
    );
    response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
    return response;
  }
}

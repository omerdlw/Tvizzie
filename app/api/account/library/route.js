import {
  accountLibrary,
  isAccountCoreError,
  resolveAccountViewer,
  toAccountViewer,
} from '@/domains/account/core';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security';
import { requireProtectedSession } from '@/domains/auth/server/session';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';

function applyCache(response, policy) {
  Object.entries(cacheControlHeaders(policy)).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}

function errorResponse(error, fallback) {
  const known = isAccountCoreError(error);
  const status = known
    ? error.status
    : Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500;
  const isSafeClientError = status >= 400 && status < 500;
  const response = createApiErrorResponse(
    {
      code: known ? error.code : status === 403 ? 'PROFILE_PRIVATE' : 'ACCOUNT_LIBRARY_FAILED',
      message: known || isSafeClientError ? error.message : fallback,
      retryable: false,
    },
    { status },
  );
  response.headers.set('Cache-Control', CACHE_CONTROL.NO_STORE);
  return response;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewer = await resolveAccountViewer(request);
    const result = await accountLibrary.read({
      input: {
        entityType: searchParams.get('entityType'),
        episodeNumber: searchParams.get('episodeNumber'),
        fromDate: searchParams.get('fromDate'),
        limitCount: searchParams.get('limitCount'),
        listId: searchParams.get('listId'),
        media:
          searchParams.get('entityType') && searchParams.get('entityId')
            ? { entityId: searchParams.get('entityId'), entityType: searchParams.get('entityType') }
            : null,
        resource: searchParams.get('resource'),
        seasonNumber: searchParams.get('seasonNumber'),
        slug: searchParams.get('slug'),
        toDate: searchParams.get('toDate'),
        userId: searchParams.get('userId'),
      },
      viewer,
    });
    return applyCache(
      createApiSuccessResponse(result),
      viewer ? CACHE_CONTROL.PRIVATE_USER_STATE : CACHE_CONTROL.PUBLIC_MEDIA_COLLECTIONS,
    );
  } catch (error) {
    return errorResponse(error, 'Library could not be loaded');
  }
}

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    const body = await request.json().catch(() => null);
    const viewer = toAccountViewer(session);
    const command = body?.command;
    const result =
      command === 'create-list'
        ? await accountLibrary.createList({ input: body, viewer })
        : command === 'media-mutation'
          ? await accountLibrary.mutateMedia({ input: body, viewer })
          : command === 'log-watch'
            ? await accountLibrary.logWatch({ input: body, viewer })
            : command === 'list-memberships'
              ? await accountLibrary.listMemberships({ input: body, viewer })
              : command === 'sync-list'
                ? await accountLibrary.syncList({ input: body, viewer })
                : command === 'toggle-list-like'
                  ? await accountLibrary.toggleListLike({ input: body, viewer })
                  : (() => {
                      throw new Error('Unsupported library command');
                    })();
    return applyCache(
      createApiSuccessResponse(result, { status: command === 'create-list' ? 201 : 200 }),
      CACHE_CONTROL.PRIVATE_USER_STATE,
    );
  } catch (error) {
    return errorResponse(error, 'Library command could not be completed');
  }
}

export async function PATCH(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    const body = await request.json().catch(() => null);
    const viewer = toAccountViewer(session);
    const result =
      body?.command === 'update-list'
        ? await accountLibrary.updateList({ input: body, viewer })
        : body?.command === 'reorder-list'
          ? await accountLibrary.reorderList({ input: body, viewer })
          : (() => {
              throw new Error('Unsupported library command');
            })();
    return applyCache(createApiSuccessResponse(result), CACHE_CONTROL.PRIVATE_USER_STATE);
  } catch (error) {
    return errorResponse(error, 'List could not be updated');
  }
}

export async function DELETE(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    const body = await request.json().catch(() => null);
    const viewer = toAccountViewer(session);
    const result =
      body?.command === 'delete-list-items' || Array.isArray(body?.mediaKeys)
        ? await accountLibrary.deleteListItems({ input: body, viewer })
        : await accountLibrary.deleteList({
            input: body,
            viewer,
          });
    return applyCache(createApiSuccessResponse(result), CACHE_CONTROL.PRIVATE_USER_STATE);
  } catch (error) {
    return errorResponse(error, 'List operation could not be completed');
  }
}

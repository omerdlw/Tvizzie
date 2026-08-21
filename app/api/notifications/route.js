import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';
import { requireAuthenticatedRequest } from '@/domains/auth/server/session.js';
import {
  fetchNotificationsResource,
  mutateNotifications,
} from '@/domains/social/server/notifications';
import {
  createRouteErrorResponse,
  createRouteRequestMeta,
  createRouteSuccessResponse,
  createRouteValidationErrorResponse,
} from '@/infrastructure/http/route-context.server';
import { normalizeValue } from '@/shared/normalize';

const CLIENT_ERROR_PATTERNS = ['invalid', 'required', 'unsupported', 'not found'];

function createNotificationErrorResponse({ code, error, fallbackMessage, requestMeta }) {
  return createRouteErrorResponse({
    code,
    error,
    fallbackMessage,
    requestMeta,
    clientErrorPatterns: CLIENT_ERROR_PATTERNS,
  });
}

function createNotificationSuccessResponse({ authContext, payload, requestMeta }) {
  return createRouteSuccessResponse({
    authContext,
    payload,
    requestMeta,
    legacyPayload: payload?.success === true ? { success: true } : payload,
  });
}

async function runMutation({ action, authContext, notificationId = null, requestMeta }) {
  const payload = await mutateNotifications({
    action,
    notificationId,
    userId: authContext.userId,
  });

  return createNotificationSuccessResponse({ authContext, payload, requestMeta });
}

export async function GET(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/notifications:get');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const data = await fetchNotificationsResource({
      limitCount: searchParams.get('limitCount'),
      resource: normalizeValue(searchParams.get('resource')),
      userId: authContext.userId,
    });

    return createNotificationSuccessResponse({
      authContext,
      payload: { data },
      requestMeta,
    });
  } catch (error) {
    return createNotificationErrorResponse({
      code: 'NOTIFICATIONS_FETCH_FAILED',
      error,
      fallbackMessage: 'Notifications could not be loaded',
      requestMeta,
    });
  }
}

export async function PATCH(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/notifications:patch');

  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const notificationId = normalizeValue(body?.notificationId);

    if (action === 'mark-all-read') {
      return runMutation({ action, authContext, requestMeta });
    }

    if (!notificationId) {
      return createRouteValidationErrorResponse({
        authContext,
        message: 'notificationId is required',
        requestMeta,
      });
    }

    return runMutation({
      action: 'mark-read',
      authContext,
      notificationId,
      requestMeta,
    });
  } catch (error) {
    return createNotificationErrorResponse({
      code: 'NOTIFICATIONS_UPDATE_FAILED',
      error,
      fallbackMessage: 'Notification update failed',
      requestMeta,
    });
  }
}

export async function DELETE(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/notifications:delete');

  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const action = normalizeValue(searchParams.get('action'));
    const notificationId = normalizeValue(searchParams.get('notificationId'));

    if (action === 'delete-all') {
      return runMutation({ action, authContext, requestMeta });
    }

    if (!notificationId) {
      return createRouteValidationErrorResponse({
        authContext,
        message: 'notificationId is required',
        requestMeta,
      });
    }

    return runMutation({
      action: 'delete',
      authContext,
      notificationId,
      requestMeta,
    });
  } catch (error) {
    return createNotificationErrorResponse({
      code: 'NOTIFICATIONS_DELETE_FAILED',
      error,
      fallbackMessage: 'Notification delete failed',
      requestMeta,
    });
  }
}

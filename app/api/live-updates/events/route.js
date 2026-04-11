import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';

export const runtime = 'nodejs';

const SUPPORTED_EVENT_TYPES = new Set(['reviews']);

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeErrorMessage(error) {
  return normalizeValue(error?.message || 'Live update event failed');
}

function resolveStatusCode(message) {
  if (
    message.includes('Authentication session is required') ||
    message.includes('Invalid or expired authentication token') ||
    message.includes('Authentication token has been revoked')
  ) {
    return 401;
  }

  if (message.includes('invalid') || message.includes('unsupported')) {
    return 400;
  }

  return 500;
}

export async function POST(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/live-updates/events',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const eventType = normalizeValue(body?.eventType);
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const targetUserIds = Array.isArray(body?.targetUserIds)
      ? [...new Set(body.targetUserIds.map((value) => normalizeValue(value)).filter(Boolean))]
      : [];

    if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
      throw new Error('unsupported-live-event-type');
    }

    if (!targetUserIds.length) {
      throw new Error('invalid-live-event-targets');
    }

    targetUserIds.forEach((userId) => {
      publishUserEvent(
        userId,
        eventType,
        payload,
        {
          traceId: requestMeta.traceId,
        }
      );
    });

    return createApiSuccessResponse(
      {
        delivered: true,
        eventType,
        targetCount: targetUserIds.length,
      },
      {
        legacyPayload: {
          delivered: true,
          eventType,
          targetCount: targetUserIds.length,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = normalizeErrorMessage(error);

    return createApiErrorResponse(
      {
        code: 'LIVE_EVENT_PUBLISH_FAILED',
        message,
      },
      {
        requestMeta,
        status: resolveStatusCode(message),
      }
    );
  }
}

import { NextResponse } from 'next/server';

import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { deleteAllUserNotifications } from '@/core/services/browser/browser-data.server';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { NOTIFICATION_TYPE_SET } from '@/core/services/notifications/notifications.constants';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const limitCount = searchParams.get('limitCount');
    const validTypes = [...NOTIFICATION_TYPE_SET];

    if (resource === 'unread-count') {
      const payload = await invokeInternalEdgeFunction('notifications-control', {
        body: {
          action: 'unread-count',
          userId: authContext.userId,
          validTypes,
        },
      });
      const data = Number(payload?.data || 0);

      return NextResponse.json({ data });
    }

    const payload = await invokeInternalEdgeFunction('notifications-control', {
      body: {
        action: 'list',
        limitCount,
        userId: authContext.userId,
        validTypes,
      },
    });
    const data = Array.isArray(payload?.data) ? payload.data : [];

    return NextResponse.json({ data });
  } catch (error) {
    const message = String(error?.message || 'Notifications could not be loaded');
    const status = message.includes('Authentication session is required')
      ? 401
      : Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const notificationId = normalizeValue(body?.notificationId);

    if (action === 'mark-all-read') {
      await invokeInternalEdgeFunction('notifications-control', {
        body: {
          action: 'mark-all-read',
          userId: authContext.userId,
        },
      });
      publishUserEvent(authContext.userId, 'notifications', {
        reason: 'mark-all-read',
      });
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
    }

    await invokeInternalEdgeFunction('notifications-control', {
      body: {
        action: 'mark-read',
        notificationId,
        userId: authContext.userId,
      },
    });
    publishUserEvent(authContext.userId, 'notifications', {
      notificationId,
      reason: 'mark-read',
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = String(error?.message || 'Notification update failed');
    const status = message.includes('Authentication session is required')
      ? 401
      : Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const action = normalizeValue(searchParams.get('action'));
    const notificationId = normalizeValue(searchParams.get('notificationId'));

    if (action === 'delete-all') {
      await deleteAllUserNotifications(authContext.userId);
      publishUserEvent(authContext.userId, 'notifications', {
        reason: 'delete-all',
      });
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
    }

    await invokeInternalEdgeFunction('notifications-control', {
      body: {
        action: 'delete',
        notificationId,
        userId: authContext.userId,
      },
    });
    publishUserEvent(authContext.userId, 'notifications', {
      notificationId,
      reason: 'delete',
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = String(error?.message || 'Notification delete failed');
    const status = message.includes('Authentication session is required')
      ? 401
      : Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

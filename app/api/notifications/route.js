import { NextResponse } from 'next/server'

import { requireAuthenticatedRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { publishUserEvent } from '@/lib/live-updates/user-events.server'
import {
  deleteUserNotification,
  getNotificationList,
  getUnreadNotificationCount,
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/browser/browser-data.server'
import {
  NOTIFICATION_TYPE_SET,
} from '@/services/notifications/notifications.constants'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const { searchParams } = new URL(request.url)
    const resource = normalizeValue(searchParams.get('resource'))
    const limitCount = searchParams.get('limitCount')

    if (resource === 'unread-count') {
      const data = await getUnreadNotificationCount(
        authContext.userId,
        NOTIFICATION_TYPE_SET
      )

      return NextResponse.json({ data })
    }

    const data = await getNotificationList(
      authContext.userId,
      NOTIFICATION_TYPE_SET,
      limitCount
    )
    return NextResponse.json({ data })
  } catch (error) {
    const message = String(error?.message || 'Notifications could not be loaded')
    const status = message.includes('Authentication session is required') ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const body = await request.json().catch(() => ({}))
    const action = normalizeValue(body?.action)
    const notificationId = normalizeValue(body?.notificationId)

    if (action === 'mark-all-read') {
      await markAllUserNotificationsAsRead(authContext.userId)
      publishUserEvent(authContext.userId, 'notifications', {
        reason: 'mark-all-read',
      })
      return NextResponse.json({ success: true })
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      )
    }

    await markNotificationAsRead(authContext.userId, notificationId)
    publishUserEvent(authContext.userId, 'notifications', {
      notificationId,
      reason: 'mark-read',
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = String(error?.message || 'Notification update failed')
    const status = message.includes('Authentication session is required') ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const { searchParams } = new URL(request.url)
    const notificationId = normalizeValue(searchParams.get('notificationId'))

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      )
    }

    await deleteUserNotification(authContext.userId, notificationId)
    publishUserEvent(authContext.userId, 'notifications', {
      notificationId,
      reason: 'delete',
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = String(error?.message || 'Notification delete failed')
    const status = message.includes('Authentication session is required') ? 401 : 500

    return NextResponse.json({ error: message }, { status })
  }
}

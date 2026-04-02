import { NextResponse } from 'next/server'

import { requireAuthenticatedRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { processNotificationEvent } from '@/lib/notifications/event-processor.server'

export const runtime = 'nodejs'

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeErrorMessage(error) {
  return normalizeValue(error?.message || 'Notification event failed')
}

function resolveStatusCode(message) {
  if (
    message.includes('Authentication session is required') ||
    message.includes('Invalid or expired authentication token') ||
    message.includes('Authentication token has been revoked')
  ) {
    return 401
  }

  if (message.includes('invalid') || message.includes('unsupported')) {
    return 400
  }

  return 500
}

export async function POST(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const body = await request.json().catch(() => ({}))

    const eventType = normalizeValue(body?.eventType)
    const payload = body?.payload && typeof body.payload === 'object'
      ? body.payload
      : {}

    const result = await processNotificationEvent({
      actorUserId: authContext.userId,
      eventType,
      payload,
    })

    return NextResponse.json({
      delivered: result?.delivered === true,
      reason: result?.reason || null,
    })
  } catch (error) {
    const message = normalizeErrorMessage(error)

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: resolveStatusCode(message),
      }
    )
  }
}

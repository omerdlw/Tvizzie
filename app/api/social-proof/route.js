import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server'
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null)

    const { searchParams } = new URL(request.url)
    const resource = normalizeValue(searchParams.get('resource'))
    const viewerId = authContext?.userId || null
    const payload = await invokeInternalEdgeFunction('social-proof-read', {
      body:
        resource === 'account'
          ? {
              canViewPrivateContent:
                normalizeValue(searchParams.get('canViewPrivateContent')) ===
                'true',
              resource: 'account',
              targetUserId: normalizeValue(searchParams.get('targetUserId')),
              viewerId,
            }
          : {
              entityId: normalizeValue(searchParams.get('entityId')),
              entityType: normalizeValue(searchParams.get('entityType')),
              resource: 'media',
              viewerId,
            },
    })
    const data = payload?.data || null

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Social proof could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status))
          ? Number(error.status)
          : 500,
      }
    )
  }
}

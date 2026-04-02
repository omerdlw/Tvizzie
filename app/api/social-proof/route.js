import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import {
  getAccountSocialProofResource,
  getMediaSocialProofResource,
} from '@/services/browser/browser-social-proof.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null)

    const { searchParams } = new URL(request.url)
    const resource = normalizeValue(searchParams.get('resource'))
    const viewerId = authContext?.userId || null
    const data =
      resource === 'account'
        ? await getAccountSocialProofResource({
            canViewPrivateContent:
              normalizeValue(searchParams.get('canViewPrivateContent')) === 'true',
            targetUserId: normalizeValue(searchParams.get('targetUserId')),
            viewerId,
          })
        : await getMediaSocialProofResource({
            entityId: normalizeValue(searchParams.get('entityId')),
            entityType: normalizeValue(searchParams.get('entityType')),
            viewerId,
          })

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Social proof could not be loaded'),
      },
      { status: 500 }
    )
  }
}

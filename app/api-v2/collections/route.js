import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { getCollectionResource } from '@/services/browser/browser-data-v2.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null)
    const { searchParams } = new URL(request.url)
    const activeTab = normalizeValue(searchParams.get('activeTab'))
    const cursor = normalizeValue(searchParams.get('cursor'))
    const limit = normalizeValue(searchParams.get('limit'))
    const resource = normalizeValue(searchParams.get('resource'))
    const userId = normalizeValue(searchParams.get('userId'))
    const listId = normalizeValue(searchParams.get('listId'))
    const slug = normalizeValue(searchParams.get('slug'))
    const limitCount = searchParams.get('limitCount')
    const media = {
      entityId: normalizeValue(searchParams.get('entityId')),
      entityType: normalizeValue(searchParams.get('entityType')),
      mediaKey: normalizeValue(searchParams.get('mediaKey')),
    }

    const result = await getCollectionResource({
      activeTab,
      cursor,
      limit,
      resource,
      userId,
      viewerId: authContext?.userId || null,
      limitCount,
      media,
      listId,
      slug,
    })

    return NextResponse.json({
      data: result?.data ?? null,
      pageInfo: result?.pageInfo || {
        cursor: null,
        hasMore: false,
      },
    })
  } catch (error) {
    const status = Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500

    return NextResponse.json(
      {
        error: String(error?.message || 'Collection could not be loaded'),
      },
      { status }
    )
  }
}

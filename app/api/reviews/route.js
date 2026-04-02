import { NextResponse } from 'next/server'

import {
  getListReviewsResource,
  getMediaReviewsResource,
} from '@/services/browser/browser-reviews.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const resource = normalizeValue(searchParams.get('resource'))

    const data =
      resource === 'list'
        ? await getListReviewsResource({
            listId: normalizeValue(searchParams.get('listId')),
            ownerId: normalizeValue(searchParams.get('ownerId')),
            limitCount: searchParams.get('limitCount'),
          })
        : await getMediaReviewsResource({
            entityId: normalizeValue(searchParams.get('entityId')),
            entityType: normalizeValue(searchParams.get('entityType')),
            limitCount: searchParams.get('limitCount'),
          })

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Reviews could not be loaded'),
      },
      { status: 500 }
    )
  }
}

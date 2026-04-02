import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { fetchProfileReviewFeedServer } from '@/services/media/reviews.server'

const REVIEW_MODES = new Set(['authored', 'liked'])

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeMode(value) {
  const normalized = normalizeValue(value).toLowerCase()

  return REVIEW_MODES.has(normalized) ? normalized : 'authored'
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const authContext = await requireSessionRequest(request).catch(() => null)
    const result = await fetchProfileReviewFeedServer({
      cursor: searchParams.get('cursor'),
      mode: normalizeMode(searchParams.get('mode')),
      pageSize: Math.min(
        normalizePositiveInteger(searchParams.get('pageSize'), 20),
        100
      ),
      userId: normalizeValue(searchParams.get('userId')),
      viewerId: authContext?.userId || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    const status = Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500
    const message = String(error?.message || 'Reviews could not be loaded')

    return NextResponse.json({ error: message }, { status })
  }
}

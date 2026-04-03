import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server'
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server'

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
    const result = await invokeInternalEdgeFunction('account-reviews-feed', {
      body: {
        cursor: searchParams.get('cursor'),
        mode: normalizeMode(searchParams.get('mode')),
        pageSize: Math.min(
          normalizePositiveInteger(searchParams.get('pageSize'), 20),
          100
        ),
        userId: normalizeValue(searchParams.get('userId')),
        viewerId: authContext?.userId || null,
      },
    })

    return NextResponse.json({
      hasMore: result?.hasMore === true,
      items: Array.isArray(result?.items) ? result.items : [],
      nextCursor: result?.nextCursor ?? null,
    })
  } catch (error) {
    const status = Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500
    const message = String(error?.message || 'Reviews could not be loaded')

    return NextResponse.json({ error: message }, { status })
  }
}

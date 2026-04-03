import { NextResponse } from 'next/server'

import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = normalizeValue(searchParams.get('searchTerm'))
    const limitCount = searchParams.get('limitCount')
    const payload = await invokeInternalEdgeFunction('account-read', {
      body: {
        resource: 'search',
        searchTerm,
        limitCount,
      },
    })
    const items = Array.isArray(payload?.items) ? payload.items : []

    return NextResponse.json({
      items,
    })
  } catch (error) {
    console.error('[Account Search API Error]', error)

    // Graceful recovery for Search: don't break the UI on account search failure.
    return NextResponse.json({
      items: [],
    })
  }
}

import { NextResponse } from 'next/server'

import { searchAccountProfiles } from '@/services/browser/browser-data.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = normalizeValue(searchParams.get('searchTerm'))
    const limitCount = searchParams.get('limitCount')
    const items = await searchAccountProfiles(searchTerm, limitCount)

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

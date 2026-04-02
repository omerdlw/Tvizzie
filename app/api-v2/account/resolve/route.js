import { NextResponse } from 'next/server'

import { getAccountIdByUsername } from '@/services/browser/browser-data-v2.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = normalizeValue(searchParams.get('username'))
    const userId = await getAccountIdByUsername(username)

    return NextResponse.json({
      userId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Username could not be resolved'),
      },
      { status: 500 }
    )
  }
}

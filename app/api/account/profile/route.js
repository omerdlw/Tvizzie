import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import {
  getAccountProfileByUserId,
  getAccountProfileByUsername,
} from '@/services/browser/browser-data.server'

function normalizeValue(value) {
  return String(value || '').trim()
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null)
    const { searchParams } = new URL(request.url)
    const userId = normalizeValue(searchParams.get('userId'))
    const username = normalizeValue(searchParams.get('username'))
    const profile = userId
      ? await getAccountProfileByUserId(userId, {
          viewerId: authContext?.userId || null,
        })
      : await getAccountProfileByUsername(username, {
          viewerId: authContext?.userId || null,
        })

    return NextResponse.json({
      profile,
    })
  } catch (error) {
    const status = Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500

    return NextResponse.json(
      {
        error: String(error?.message || 'Profile could not be loaded'),
      },
      { status }
    )
  }
}

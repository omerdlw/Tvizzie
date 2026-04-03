import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server'
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server'

const PROFILE_CACHE_TTL_MS = 5000
const PROFILE_CACHE_MAX_SIZE = 200
const profileRequestCache = new Map()

function normalizeValue(value) {
  return String(value || '').trim()
}

function getProfileCacheKey({ userId = '', username = '', viewerId = '' } = {}) {
  if (userId) {
    return `id:${userId}|viewer:${viewerId || ''}`
  }

  return `username:${username}|viewer:${viewerId || ''}`
}

function pruneProfileCache() {
  if (profileRequestCache.size <= PROFILE_CACHE_MAX_SIZE) {
    return
  }

  const now = Date.now()

  for (const [key, entry] of profileRequestCache.entries()) {
    if ((entry?.expiresAt || 0) <= now && !entry?.inFlightPromise) {
      profileRequestCache.delete(key)
    }
  }

  if (profileRequestCache.size <= PROFILE_CACHE_MAX_SIZE) {
    return
  }

  const overflowCount = profileRequestCache.size - PROFILE_CACHE_MAX_SIZE
  const keys = Array.from(profileRequestCache.keys())

  for (let index = 0; index < overflowCount; index += 1) {
    const key = keys[index]

    if (key) {
      profileRequestCache.delete(key)
    }
  }
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null)
    const { searchParams } = new URL(request.url)
    const userId = normalizeValue(searchParams.get('userId'))
    const username = normalizeValue(searchParams.get('username'))
    const viewerId = normalizeValue(authContext?.userId || '')

    if (!userId && !username) {
      return NextResponse.json(
        {
          error: 'userId or username is required',
        },
        { status: 400 }
      )
    }

    const cacheKey = getProfileCacheKey({ userId, username, viewerId })
    const cachedEntry = profileRequestCache.get(cacheKey)
    const now = Date.now()

    if (
      cachedEntry &&
      cachedEntry.value !== undefined &&
      cachedEntry.expiresAt > now
    ) {
      return NextResponse.json({
        profile: cachedEntry.value,
      })
    }

    if (cachedEntry?.inFlightPromise) {
      const inFlightProfile = await cachedEntry.inFlightPromise

      return NextResponse.json({
        profile: inFlightProfile,
      })
    }

    const loadProfilePromise = invokeInternalEdgeFunction('account-read', {
      body: {
        resource: 'profile',
        userId: userId || null,
        username: username || null,
        viewerId: viewerId || null,
      },
    })
      .then((payload) => payload?.profile || null)
      .then((profileValue) => {
        profileRequestCache.set(cacheKey, {
          expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
          inFlightPromise: null,
          value: profileValue,
        })
        pruneProfileCache()
        return profileValue
      })
      .catch((error) => {
        profileRequestCache.delete(cacheKey)
        throw error
      })

    profileRequestCache.set(cacheKey, {
      expiresAt: now + PROFILE_CACHE_TTL_MS,
      inFlightPromise: loadProfilePromise,
      value: undefined,
    })

    const profile = await loadProfilePromise

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

export async function POST(request) {
  try {
    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    })
    const body = await request.json().catch(() => ({}))
    const action = normalizeValue(body?.action).toLowerCase()

    if (
      action !== 'ensure' &&
      action !== 'update' &&
      action !== 'sync-email'
    ) {
      return NextResponse.json(
        { error: 'action must be one of: ensure, update, sync-email' },
        { status: 400 }
      )
    }

    const payload = await invokeInternalEdgeFunction('account-profile-write', {
      body: {
        action,
        userId: authContext.userId,
        email: body?.email,
        username: body?.username,
        displayName: body?.displayName,
        avatarUrl: body?.avatarUrl,
        bannerUrl: body?.bannerUrl,
        description: body?.description,
        isPrivate: body?.isPrivate,
      },
    })

    return NextResponse.json({
      ok: true,
      action: payload?.action || action,
      profile: payload?.profile || null,
    })
  } catch (error) {
    const status = Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500

    return NextResponse.json(
      {
        error: String(error?.message || 'Account profile write failed'),
      },
      { status }
    )
  }
}

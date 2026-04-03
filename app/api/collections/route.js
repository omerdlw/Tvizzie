import { NextResponse } from 'next/server'

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server'
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server'

const DEFAULT_COLLECTION_LIMIT = 24
const MAX_COLLECTION_LIMIT = 50
const PAGINATED_RESOURCES = new Set([
  'liked-lists',
  'likes',
  'list-items',
  'lists',
  'watchlist',
  'watched',
])
const TAB_RESOURCE_MAP = Object.freeze({
  activity: new Set([]),
  likes: new Set(['likes', 'liked-lists']),
  lists: new Set(['lists', 'list-items', 'list-by-id', 'list-by-slug']),
  watchlist: new Set(['watchlist', 'watchlist-status']),
  watched: new Set(['watched', 'watched-status']),
})

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeTab(value) {
  return normalizeValue(value).toLowerCase()
}

function normalizeLimit(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_COLLECTION_LIMIT
  }

  return Math.max(1, Math.min(Math.floor(parsed), MAX_COLLECTION_LIMIT))
}

function decodeCursor(cursor) {
  const normalized = normalizeValue(cursor)

  if (!normalized) {
    return 0
  }

  try {
    const payload = JSON.parse(Buffer.from(normalized, 'base64url').toString('utf8'))
    const offset = Number(payload?.offset)

    if (!Number.isFinite(offset) || offset <= 0) {
      return 0
    }

    return Math.floor(offset)
  } catch {
    return 0
  }
}

function encodeCursor(offset) {
  const payload = JSON.stringify({
    offset: Math.max(0, Number(offset) || 0),
  })

  return Buffer.from(payload, 'utf8').toString('base64url')
}

function toPageInfo({ hasMore = false, nextCursor = null } = {}) {
  return {
    cursor: hasMore ? normalizeValue(nextCursor) || null : null,
    hasMore: Boolean(hasMore),
  }
}

function isTabScopedOut({ activeTab, resource }) {
  const normalizedTab = normalizeTab(activeTab)

  if (!normalizedTab) {
    return false
  }

  const allowedResources = TAB_RESOURCE_MAP[normalizedTab]

  if (!allowedResources) {
    return false
  }

  return !allowedResources.has(resource)
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null)
    const { searchParams } = new URL(request.url)
    const activeTab = normalizeTab(searchParams.get('activeTab'))
    const cursor = normalizeValue(searchParams.get('cursor'))
    const limit = normalizeValue(searchParams.get('limit'))
    const resource = normalizeValue(searchParams.get('resource')).toLowerCase()
    const userId = normalizeValue(searchParams.get('userId'))
    const listId = normalizeValue(searchParams.get('listId'))
    const slug = normalizeValue(searchParams.get('slug'))
    const limitCount = searchParams.get('limitCount')
    const media = {
      entityId: normalizeValue(searchParams.get('entityId')),
      entityType: normalizeValue(searchParams.get('entityType')),
      mediaKey: normalizeValue(searchParams.get('mediaKey')),
    }

    if (isTabScopedOut({ activeTab, resource })) {
      return NextResponse.json({
        data: [],
        pageInfo: toPageInfo(),
      })
    }

    const normalizedCursor = normalizeValue(cursor)
    const normalizedLimit = normalizeValue(limit || limitCount)
    const shouldPaginate =
      PAGINATED_RESOURCES.has(resource) &&
      Boolean(normalizedCursor || normalizedLimit)
    const pageLimit = shouldPaginate ? normalizeLimit(limit || limitCount) : null
    const offset = shouldPaginate ? decodeCursor(cursor) : 0
    const fetchLimitCount = shouldPaginate ? offset + pageLimit + 1 : limitCount
    const payload = await invokeInternalEdgeFunction('collections-read', {
      body: {
        resource,
        userId,
        viewerId: authContext?.userId || null,
        limitCount: fetchLimitCount,
        media,
        listId,
        slug,
        strict: true,
      },
    })
    const rawData = payload?.data ?? null

    if (!Array.isArray(rawData) || !shouldPaginate) {
      return NextResponse.json({
        data: rawData,
        pageInfo: toPageInfo(),
      })
    }

    const data = rawData.slice(offset, offset + pageLimit)
    const hasMore = rawData.length > offset + pageLimit
    const pageInfo = toPageInfo({
      hasMore,
      nextCursor: hasMore ? encodeCursor(offset + pageLimit) : null,
    })

    return NextResponse.json({
      data,
      pageInfo,
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

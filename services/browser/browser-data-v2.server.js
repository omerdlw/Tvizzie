import {
  getAccountIdByUsername as getAccountIdByUsernameV1,
  getCollectionResource as getCollectionResourceV1,
  getFollowResource as getFollowResourceV1,
  searchAccountProfiles as searchAccountProfilesV1,
} from '@/services/browser/browser-data.server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccountSnapshotByUserId as getAccountSnapshotByUserIdV2 } from '@/services/account/account-v2.server'

const DEFAULT_COLLECTION_LIMIT = 24
const MAX_COLLECTION_LIMIT = 50

const TAB_RESOURCE_MAP = Object.freeze({
  activity: new Set([]),
  likes: new Set(['likes', 'liked-lists']),
  lists: new Set(['lists', 'list-items', 'list-by-id', 'list-by-slug']),
  watchlist: new Set(['watchlist', 'watchlist-status']),
  watched: new Set(['watched', 'watched-status']),
})

const PAGINATED_RESOURCES = new Set([
  'liked-lists',
  'likes',
  'list-items',
  'lists',
  'watchlist',
  'watched',
])
const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
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

function encodeCursor(offset) {
  const payload = JSON.stringify({
    offset: Math.max(0, Number(offset) || 0),
  })

  return Buffer.from(payload, 'utf8').toString('base64url')
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

function toPageInfo({ hasMore = false, nextCursor = null } = {}) {
  return {
    cursor: hasMore ? normalizeValue(nextCursor) || null : null,
    hasMore: Boolean(hasMore),
  }
}

export async function getCollectionResource({
  activeTab = null,
  cursor = null,
  limit = null,
  limitCount = null,
  listId = null,
  media = null,
  resource,
  slug = null,
  userId,
  viewerId = null,
}) {
  const normalizedResource = normalizeValue(resource).toLowerCase()

  if (!normalizedResource) {
    return {
      data: null,
      pageInfo: toPageInfo(),
    }
  }

  if (isTabScopedOut({ activeTab, resource: normalizedResource })) {
    return {
      data: [],
      pageInfo: toPageInfo(),
    }
  }

  const shouldPaginate = PAGINATED_RESOURCES.has(normalizedResource)
  const pageLimit = normalizeLimit(limit ?? limitCount)
  const offset = shouldPaginate ? decodeCursor(cursor) : 0
  const fetchLimitCount = shouldPaginate ? offset + pageLimit + 1 : limitCount
  const rawData = await getCollectionResourceV1({
    limitCount: fetchLimitCount,
    listId,
    media,
    resource: normalizedResource,
    slug,
    userId,
    viewerId,
  })

  if (!Array.isArray(rawData) || !shouldPaginate) {
    return {
      data: rawData,
      pageInfo: toPageInfo(),
    }
  }

  const pageSlice = rawData.slice(offset, offset + pageLimit)
  const hasMore = rawData.length > offset + pageLimit

  return {
    data: pageSlice,
    pageInfo: toPageInfo({
      hasMore,
      nextCursor: hasMore ? encodeCursor(offset + pageLimit) : null,
    }),
  }
}

export async function getAccountProfileByUserId(userId, options = {}) {
  const canAccessPrivateDetails = await canViewerAccessUserContentV2({
    ownerId: userId,
    viewerId: options?.viewerId || null,
  }).catch(() => false)
  const snapshot = await getAccountSnapshotByUserIdV2(userId, {
    includePrivateDetails: canAccessPrivateDetails,
  })

  return snapshot?.profile || null
}

export async function getAccountProfileByUsername(username, options = {}) {
  const resolvedUserId = await getAccountIdByUsernameV1(username)

  if (!resolvedUserId) {
    return null
  }

  const canAccessPrivateDetails = await canViewerAccessUserContentV2({
    ownerId: resolvedUserId,
    viewerId: options?.viewerId || null,
  }).catch(() => false)
  const snapshot = await getAccountSnapshotByUserIdV2(resolvedUserId, {
    includePrivateDetails: canAccessPrivateDetails,
  })

  return snapshot?.profile || null
}

export async function searchAccountProfiles(searchTerm, limitCount = 6) {
  return searchAccountProfilesV1(searchTerm, limitCount)
}

export async function getFollowResource(input = {}) {
  return getFollowResourceV1(input)
}

export async function getAccountIdByUsername(username) {
  return getAccountIdByUsernameV1(username)
}

async function canViewerAccessUserContentV2({
  ownerId,
  viewerId = null,
}) {
  const normalizedOwnerId = normalizeValue(ownerId)
  const normalizedViewerId = normalizeValue(viewerId)

  if (!normalizedOwnerId) {
    return false
  }

  if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) {
    return true
  }

  const admin = createAdminClient()
  const profileResult = await admin
    .from('profiles')
    .select('is_private')
    .eq('id', normalizedOwnerId)
    .maybeSingle()

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile visibility could not be checked')
  }

  if (!profileResult.data) {
    return false
  }

  if (profileResult.data.is_private !== true) {
    return true
  }

  if (!normalizedViewerId) {
    return false
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', normalizedViewerId)
    .eq('following_id', normalizedOwnerId)
    .eq('status', FOLLOW_STATUSES.ACCEPTED)
    .maybeSingle()

  if (followResult.error) {
    throw new Error(followResult.error.message || 'Profile visibility could not be checked')
  }

  return Boolean(followResult.data)
}

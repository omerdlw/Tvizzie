import 'server-only'

import { createClient as createServerClient } from '@/core/clients/supabase/server'
import { buildMediaItemKey } from '@/core/services/shared/media-key.service'

const PREVIEW_LIMIT = 3
const SHARED_TITLES_LIMIT = 2
const FOLLOWING_SELECT = [
  'following_avatar_url',
  'following_display_name',
  'following_id',
  'following_username',
].join(',')
const SOCIAL_PROOF_SELECT = ['user_id'].join(',')
const SHARED_LIKES_SELECT = ['media_key', 'title'].join(',')

function createEmptyProofGroup() {
  return {
    count: 0,
    previewUsers: [],
    users: [],
  }
}

function createEmptyMediaSocialProof() {
  return {
    reviews: createEmptyProofGroup(),
    likes: createEmptyProofGroup(),
    watchlist: createEmptyProofGroup(),
  }
}

function createEmptyProfileSocialProof() {
  return {
    mutualFollowersCount: 0,
    sharedLikes: {
      count: 0,
      titles: [],
    },
  }
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage)
  }

  return result
}

function normalizeSocialUser(user = {}) {
  if (!user?.id) {
    return null
  }

  return {
    avatarUrl: user.avatarUrl || null,
    displayName:
      user.displayName || user.name || user.email || user.username || 'User',
    id: user.id,
    username: user.username || null,
  }
}

function buildPreviewUsers(records, followProfileMap) {
  const previews = []
  const seen = new Set()

  records.forEach((record) => {
    const followProfile = followProfileMap.get(record.userId)
    const normalized = normalizeSocialUser({
      ...record.user,
      ...followProfile,
      id: record.userId,
    })

    if (!normalized || seen.has(normalized.id)) {
      return
    }

    previews.push(normalized)
    seen.add(normalized.id)
  })

  return previews.slice(0, PREVIEW_LIMIT)
}

function buildUsers(records, followProfileMap) {
  const users = []
  const seen = new Set()

  records.forEach((record) => {
    const followProfile = followProfileMap.get(record.userId)
    const normalized = normalizeSocialUser({
      ...record.user,
      ...followProfile,
      id: record.userId,
    })

    if (!normalized || seen.has(normalized.id)) {
      return
    }

    users.push(normalized)
    seen.add(normalized.id)
  })

  return users
}

function buildProofGroup(recordsMap, followProfileMap) {
  const records = Array.from(recordsMap.values())

  return {
    count: records.length,
    previewUsers: buildPreviewUsers(records, followProfileMap),
    users: buildUsers(records, followProfileMap),
  }
}

function buildLikeMap(rows = []) {
  const map = new Map()

  rows.forEach((row) => {
    const mediaKey = row.media_key

    if (!mediaKey) {
      return
    }

    map.set(mediaKey, row)
  })

  return map
}

export async function getMediaSocialProofResource({
  entityId,
  entityType,
  viewerId,
}) {
  if (!viewerId || !entityId || !entityType) {
    return createEmptyMediaSocialProof()
  }

  const client = await createServerClient()
  const followingResult = await client
    .from('follows')
    .select(FOLLOWING_SELECT)
    .eq('follower_id', viewerId)
    .eq('status', 'accepted')

  assertResult(followingResult, 'Following list could not be loaded')

  const followingRows = followingResult.data || []
  const followingIds = followingRows
    .map((row) => row.following_id)
    .filter(Boolean)

  if (followingIds.length === 0) {
    return createEmptyMediaSocialProof()
  }

  const followProfileMap = new Map()

  followingRows.forEach((row) => {
    if (!row.following_id) {
      return
    }

    followProfileMap.set(row.following_id, {
      avatarUrl: row.following_avatar_url || null,
      displayName: row.following_display_name || null,
      id: row.following_id,
      username: row.following_username || null,
    })
  })

  const mediaKey = buildMediaItemKey(entityType, entityId)
  const [likesResult, watchlistResult, reviewsResult] = await Promise.all([
    client
      .from('likes')
      .select(SOCIAL_PROOF_SELECT)
      .eq('media_key', mediaKey)
      .in('user_id', followingIds),
    client
      .from('watchlist')
      .select(SOCIAL_PROOF_SELECT)
      .eq('media_key', mediaKey)
      .in('user_id', followingIds),
    client
      .from('media_reviews')
      .select(SOCIAL_PROOF_SELECT)
      .eq('media_key', mediaKey)
      .in('user_id', followingIds),
  ])

  assertResult(likesResult, 'Media social proof could not be loaded')
  assertResult(watchlistResult, 'Media social proof could not be loaded')
  assertResult(reviewsResult, 'Media social proof could not be loaded')

  const categoryState = {
    likes: new Map(),
    reviews: new Map(),
    watchlist: new Map(),
  }

  ;(likesResult.data || []).forEach((row) => {
    categoryState.likes.set(row.user_id, {
      user: null,
      userId: row.user_id,
    })
  })

  ;(watchlistResult.data || []).forEach((row) => {
    categoryState.watchlist.set(row.user_id, {
      user: null,
      userId: row.user_id,
    })
  })

  ;(reviewsResult.data || []).forEach((row) => {
    categoryState.reviews.set(row.user_id, {
      user: null,
      userId: row.user_id,
    })
  })

  return {
    reviews: buildProofGroup(categoryState.reviews, followProfileMap),
    likes: buildProofGroup(categoryState.likes, followProfileMap),
    watchlist: buildProofGroup(categoryState.watchlist, followProfileMap),
  }
}

async function withQueryTimeout(
  promise,
  { timeoutMs = 4000, fallbackValue = { data: [], error: null }, label = 'Query' } = {}
) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(
      () => resolve({ ...fallbackValue, timedOut: true, label }),
      timeoutMs
    )
  )

  const result = await Promise.race([promise, timeoutPromise])

  if (result?.timedOut) {
    console.warn(`[Supabase Social Proof ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`)
    return result
  }

  return result
}

export async function getAccountSocialProofResource({
  canViewPrivateContent = false,
  targetUserId,
  viewerId,
}) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return createEmptyProfileSocialProof()
  }

  if (!canViewPrivateContent) {
    return createEmptyProfileSocialProof()
  }

  const client = await createServerClient()

  // 1. Fetch viewer's follower IDs (the set we intersect with)
  const viewerFollowersResult = await withQueryTimeout(
    client
      .from('follows')
      .select('follower_id')
      .eq('following_id', viewerId)
      .eq('status', 'accepted'),
    {
      label: `Viewer followers check for ${viewerId}`,
      fallbackValue: { data: [], error: null },
    }
  )

  if (viewerFollowersResult.timedOut) {
    return createEmptyProfileSocialProof()
  }

  assertResult(viewerFollowersResult, 'Social proof could not be loaded')

  const viewerFollowerIds = (viewerFollowersResult.data || []).map(
    (row) => row.follower_id
  )

  let mutualFollowersCount = 0

  if (viewerFollowerIds.length > 0) {
    // 2. Query target's followers that are in viewer's follower list (intersection at DB level)
    const mutualFollowersResult = await withQueryTimeout(
      client
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', targetUserId)
        .eq('status', 'accepted')
        .in('follower_id', viewerFollowerIds.slice(0, 1000)), // Safety limit for filter string size
      {
        label: `Mutual followers check ${viewerId} <-> ${targetUserId}`,
        fallbackValue: { data: [], count: 0, error: null },
        timeoutMs: 3000,
      }
    )

    if (mutualFollowersResult.timedOut) {
      mutualFollowersCount = 0
    } else {
      assertResult(mutualFollowersResult, 'Social proof could not be loaded')
      mutualFollowersCount = mutualFollowersResult.count || 0
    }
  }

  // 3. Fetch viewer's liked media keys
  const viewerLikesResult = await withQueryTimeout(
    client.from('likes').select('media_key').eq('user_id', viewerId),
    {
      label: `Viewer likes check for ${viewerId}`,
      fallbackValue: { data: [], error: null },
    }
  )

  if (viewerLikesResult.timedOut) {
    return {
      mutualFollowersCount,
      sharedLikes: {
        count: 0,
        titles: [],
      },
    }
  }

  assertResult(viewerLikesResult, 'Social proof could not be loaded')

  const viewerLikesKeys = (viewerLikesResult.data || []).map(
    (row) => row.media_key
  )

  let sharedCount = 0
  let sharedTitles = []

  if (viewerLikesKeys.length > 0) {
    // 4. Find shared likes using the intersection of media keys
    const sharedLikesResult = await withQueryTimeout(
      client
        .from('likes')
        .select(SHARED_LIKES_SELECT, { count: 'exact' })
        .eq('user_id', targetUserId)
        .in('media_key', viewerLikesKeys.slice(0, 1000)), // Safety limit for filter string size
      {
        label: `Shared likes check ${viewerId} <-> ${targetUserId}`,
        fallbackValue: { data: [], count: 0, error: null },
        timeoutMs: 3000,
      }
    )

    if (sharedLikesResult.timedOut) {
      sharedCount = 0
      sharedTitles = []
    } else {
      assertResult(sharedLikesResult, 'Social proof could not be loaded')

      sharedCount = sharedLikesResult.count || 0
      sharedTitles = (sharedLikesResult.data || [])
        .slice(0, SHARED_TITLES_LIMIT)
        .map((item) => item.title)
        .filter(Boolean)
    }
  }

  return {
    mutualFollowersCount,
    sharedLikes: {
      count: sharedCount,
      titles: sharedTitles,
    },
  }
}

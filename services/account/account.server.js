import 'server-only'

import { isMovieMediaType } from '@/lib/media'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeTimestamp } from '@/services/core/data-utils'
import { cache } from 'react'

const ACCEPTED_FOLLOW_STATUS = 'accepted'
const EMPTY_EDITABLE_ACCOUNT_COUNTS = Object.freeze({
  followers: 0,
  following: 0,
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
})
const ACCOUNT_PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
  'watched_count',
].join(',')

function normalizeFavoriteShowcaseItems(value = []) {
  return value
    .map((item) => ({
      addedAt: normalizeTimestamp(item?.addedAt),
      backdrop_path: item?.backdrop_path || item?.backdropPath || null,
      entityId: String(item?.entityId ?? item?.id ?? '').trim() || null,
      entityType: String(
        item?.entityType ?? item?.media_type ?? item?.type ?? ''
      )
        .trim()
        .toLowerCase(),
      first_air_date: item?.first_air_date || null,
      id: String(item?.entityId ?? item?.id ?? '').trim() || null,
      mediaKey: item?.mediaKey || null,
      media_type:
        String(item?.entityType ?? item?.media_type ?? item?.type ?? '')
          .trim()
          .toLowerCase() || null,
      name: item?.name || item?.original_name || '',
      original_name: item?.original_name || null,
      original_title: item?.original_title || null,
      poster_path: item?.poster_path || item?.posterPath || null,
      position: Number.isFinite(Number(item?.position))
        ? Number(item.position)
        : null,
      release_date: item?.release_date || null,
      title: item?.title || item?.original_title || '',
      updatedAt: normalizeTimestamp(item?.updatedAt),
      vote_average: Number.isFinite(Number(item?.vote_average))
        ? Number(item.vote_average)
        : null,
    }))
    .filter(
      (item) =>
        item.entityId && item.entityType && isMovieMediaType(item.entityType)
    )
}

function normalizeAccountData(
  data = {},
  id = null,
  { includeEmail = false, includePrivateDetails = false } = {}
) {
  const displayName = data.display_name || data.displayName || 'Anonymous User'
  const isPrivate = data.is_private === true || data.isPrivate === true
  const canIncludePrivateDetails = !isPrivate || includePrivateDetails
  const favoriteShowcaseRaw =
    Array.isArray(data.favorite_showcase) && data.favorite_showcase.length > 0
      ? data.favorite_showcase
      : Array.isArray(data.favoriteShowcase)
        ? data.favoriteShowcase
        : []

  return {
    avatarUrl: data.avatar_url || data.avatarUrl || null,
    bannerUrl: data.banner_url || data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.created_at || data.createdAt),
    description: data.description || '',
    displayName,
    displayNameLower:
      data.display_name_lower ||
      data.displayNameLower ||
      String(displayName).toLowerCase(),
    id: id || data.id || null,
    isPrivate,
    followerCount: Number.isFinite(
      Number(data.follower_count ?? data.followerCount)
    )
      ? Number(data.follower_count ?? data.followerCount)
      : 0,
    followingCount: Number.isFinite(
      Number(data.following_count ?? data.followingCount)
    )
      ? Number(data.following_count ?? data.followingCount)
      : 0,
    updatedAt: normalizeTimestamp(data.updated_at || data.updatedAt),
    username: data.username || null,
    usernameLower:
      data.username_lower ||
      data.usernameLower ||
      (data.username ? String(data.username).toLowerCase() : null),
    ...(includeEmail ? { email: data.email || null } : {}),
    ...(canIncludePrivateDetails
      ? {
          favoriteShowcase: normalizeFavoriteShowcaseItems(favoriteShowcaseRaw),
          lastActivityAt: normalizeTimestamp(
            data.last_activity_at || data.lastActivityAt
          ),
          likesCount: Number.isFinite(Number(data.likes_count ?? data.likesCount))
            ? Number(data.likes_count ?? data.likesCount)
            : 0,
          listsCount: Number.isFinite(Number(data.lists_count ?? data.listsCount))
            ? Number(data.lists_count ?? data.listsCount)
            : 0,
          watchedCount: Number.isFinite(
            Number(data.watched_count ?? data.watchedCount)
          )
            ? Number(data.watched_count ?? data.watchedCount)
            : 0,
          watchlistCount: Number.isFinite(
            Number(data.watchlist_count ?? data.watchlistCount)
          )
            ? Number(data.watchlist_count ?? data.watchlistCount)
            : 0,
        }
      : {
          favoriteShowcase: [],
          lastActivityAt: null,
          likesCount: 0,
          listsCount: 0,
          watchedCount: 0,
          watchlistCount: 0,
        }),
  }
}

async function getUserIdByUsername(username) {
  if (!username) {
    return null
  }

  const admin = createAdminClient()
  const result = await admin
    .from('usernames')
    .select('user_id')
    .eq('username_lower', String(username).trim().toLowerCase())
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message || 'Username lookup failed')
  }

  return result.data?.user_id || null
}

const getUserAccount = cache(async (
  userId,
  { includeEmail = false, includePrivateDetails = false } = {}
) => {
  if (!userId) {
    return null
  }

  const admin = createAdminClient()
  const [
    result,
    followerCount,
    followingCount,
    likesCount,
    listsCount,
    watchlistCount,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(ACCOUNT_PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle(),
    countFollowCollection(userId, 'followers'),
    countFollowCollection(userId, 'following'),
    countRows('likes', (query) => query.eq('user_id', userId)),
    countRows('lists', (query) => query.eq('user_id', userId)),
    countRows('watchlist', (query) => query.eq('user_id', userId)),
  ])

  if (result.error) {
    throw new Error(result.error.message || 'Account lookup failed')
  }

  if (!result.data) {
    return null
  }

  return normalizeAccountData(
    {
      ...result.data,
      follower_count: followerCount,
      following_count: followingCount,
      likes_count: likesCount,
      lists_count: listsCount,
      watchlist_count: watchlistCount,
    },
    result.data.id,
    {
      includeEmail,
      includePrivateDetails,
    }
  )
})

async function countRows(tableName, configureQuery) {
  const admin = createAdminClient()
  let query = admin.from(tableName).select('*', {
    count: 'exact',
    head: true,
  })

  if (typeof configureQuery === 'function') {
    query = configureQuery(query)
  }

  const result = await query

  if (result.error) {
    throw new Error(result.error.message || `${tableName} count failed`)
  }

  return Number(result.count) || 0
}

async function countFollowCollection(userId, direction) {
  const baseColumn = direction === 'followers' ? 'following_id' : 'follower_id'

  return countRows('follows', (query) =>
    query.eq(baseColumn, userId).eq('status', ACCEPTED_FOLLOW_STATUS)
  )
}

export async function getAccountSnapshotByUserId(
  userId,
  options = {}
) {
  try {
    const profile = await getUserAccount(userId, options)

    if (!profile) {
      return {
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      }
    }

    return {
      profile,
      resolvedUserId: userId,
      resolveError: null,
    }
  } catch {
    return {
      profile: null,
      resolvedUserId: null,
      resolveError: null,
    }
  }
}

export async function getAccountSnapshotByUsername(
  username,
  options = {}
) {
  try {
    const userId = await getUserIdByUsername(username)

    if (!userId) {
      return {
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      }
    }

    const profile = await getUserAccount(userId, options)

    if (!profile) {
      return {
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      }
    }

    return {
      profile,
      resolvedUserId: userId,
      resolveError: null,
    }
  } catch {
    return {
      profile: null,
      resolvedUserId: null,
      resolveError: null,
    }
  }
}

export async function getEditableAccountSnapshotByUserId(userId) {
  if (!userId) {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: null,
      resolveError: 'Account not found',
    }
  }

  try {
    const profile = await getUserAccount(userId, {
      includeEmail: true,
      includePrivateDetails: true,
    })

    if (!profile) {
      return {
        counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      }
    }

    return {
      counts: {
        followers: Number(profile?.followerCount || 0),
        following: Number(profile?.followingCount || 0),
        likes: Number(profile?.likesCount || 0),
        lists: Number(profile?.listsCount || 0),
        watched: Number(profile?.watchedCount || 0),
        watchlist: Number(profile?.watchlistCount || 0),
      },
      profile,
      resolvedUserId: userId,
      resolveError: null,
    }
  } catch {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: userId,
      resolveError: null,
    }
  }
}

'use client'

import {
  assertMovieMedia,
  buildMediaItemKey,
} from '@/services/core/media-key.service'
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/services/core/polling-subscription.service'
import { scheduleAccountSummaryRefresh } from '@/services/core/account-summary-v2.service'
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/services/core/supabase-data.service'
import { requestApiJson } from '@/services/core/api-request.service'
import {
  assertMoviePayload,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
  resolveLimitCount,
} from '@/services/core/supabase-media-utils.service'

const LIKE_ROW_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',')
const INFRA_V2_CLIENT_ENABLED =
  process.env.NEXT_PUBLIC_INFRA_V2_ENABLED === 'true'

function resolveRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null
  }

  if (data && typeof data === 'object') {
    return data
  }

  return null
}

function buildLikeRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage likes')

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in likes')

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'likes',
    userId,
  }
}

function buildMediaIdentity(media) {
  return {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  }
}

function getLikeStatusSubscriptionKey({ media, userId }) {
  return buildPollingSubscriptionKey('likes:status', {
    media: buildMediaIdentity(media),
    userId,
  })
}

function getUserLikesSubscriptionKey(userId, options = {}) {
  return buildPollingSubscriptionKey('likes:user', {
    limitCount: options.limitCount ?? null,
    userId,
  })
}

function getFavoriteShowcaseSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('likes:favorite-showcase', {
    userId,
  })
}

function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', {
    userId,
  })
}

function refreshAccountSummary(userId) {
  if (!userId) {
    return
  }

  if (INFRA_V2_CLIENT_ENABLED) {
    scheduleAccountSummaryRefresh(userId)
    return
  }

  invalidatePollingSubscription(getUserAccountSubscriptionKey(userId), {
    refetch: true,
  })
}

function buildFavoriteShowcaseItem(media = {}) {
  const normalizedType = assertMoviePayload(
    media,
    'Favorite showcase supports movies only'
  )
  const entityId = String(media?.entityId ?? media?.id ?? '').trim()

  if (!entityId) {
    return null
  }

  const mediaKey =
    media?.mediaKey || buildMediaItemKey(normalizedType, entityId)

  return {
    addedAt: media?.addedAt || new Date().toISOString(),
    backdropPath: media?.backdropPath || media?.backdrop_path || null,
    backdrop_path: media?.backdrop_path || media?.backdropPath || null,
    entityId,
    entityType: normalizedType,
    first_air_date: null,
    mediaKey,
    media_type: normalizedType,
    name: media?.name || media?.original_name || '',
    original_name: media?.original_name || null,
    original_title: media?.original_title || null,
    posterPath: media?.posterPath || media?.poster_path || null,
    poster_path: media?.poster_path || media?.posterPath || null,
    position: Number.isFinite(Number(media?.position))
      ? Number(media.position)
      : Date.now(),
    release_date: media?.release_date || null,
    title: media?.title || media?.original_title || media?.name || 'Untitled',
    updatedAt: media?.updatedAt || new Date().toISOString(),
    vote_average: Number.isFinite(Number(media?.vote_average))
      ? Number(media.vote_average)
      : null,
  }
}

async function fetchLikeStatus({ media, userId }) {
  if (!userId || !media) {
    return {
      isLiked: false,
      like: null,
    }
  }

  const likeRef = buildLikeRef(userId, media)
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: media?.entityId ?? media?.id ?? null,
      entityType: media?.entityType ?? media?.media_type ?? null,
      mediaKey: likeRef.id,
      resource: 'like-status',
      userId,
    },
  })

  return payload?.data || {
    isLiked: false,
    like: null,
  }
}

async function fetchLikes(userId, options = {}) {
  if (!userId) {
    return []
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      limitCount: resolvedLimitCount,
      resource: 'likes',
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

async function readFavoriteShowcase(userId) {
  if (!userId) {
    return []
  }

  const payload = await requestApiJson('/api/account/profile', {
    query: {
      userId,
    },
  })

  const showcase = Array.isArray(payload?.profile?.favoriteShowcase)
    ? payload.profile.favoriteShowcase.map(buildFavoriteShowcaseItem).filter(Boolean)
    : []

  return showcase
}

async function writeFavoriteShowcase(userId, items = []) {
  const showcaseItems = items.map(buildFavoriteShowcaseItem).filter(Boolean)
  const client = getSupabaseClient()
  const result = await client
    .from('profiles')
    .update({
      favorite_showcase: showcaseItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  assertSupabaseResult(result, 'Favorite showcase could not be updated')

  return showcaseItems
}

async function removeLikeFromShowcase(userId, mediaKey) {
  const showcase = await readFavoriteShowcase(userId)
  const nextShowcase = showcase.filter((item) => item.mediaKey !== mediaKey)

  if (nextShowcase.length === showcase.length) {
    return false
  }

  await writeFavoriteShowcase(userId, nextShowcase)
  return true
}

export function getLikeDocRef(userId, media) {
  return buildLikeRef(userId, media)
}

export async function ensureLegacyFavoritesBackfilled(userId) {
  if (!userId) {
    return false
  }

  return false
}

export function subscribeToLikeStatus(
  { media, userId },
  callback,
  options = {}
) {
  return createPollingSubscription(
    () => fetchLikeStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isLiked), result?.like || null)
    },
    {
      ...options,
      subscriptionKey: getLikeStatusSubscriptionKey({ media, userId }),
    }
  )
}

export function subscribeToUserLikes(userId, callback, options = {}) {
  return createPollingSubscription(
    () => fetchLikes(userId, options),
    callback,
    {
      ...options,
      subscriptionKey: getUserLikesSubscriptionKey(userId, options),
    }
  )
}

export function subscribeToFavoriteShowcase(userId, callback, options = {}) {
  return createPollingSubscription(
    () => readFavoriteShowcase(userId),
    callback,
    {
      ...options,
      subscriptionKey: getFavoriteShowcaseSubscriptionKey(userId),
    }
  )
}

export async function updateFavoriteShowcase({ items = [], userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage favorites')

  if (!Array.isArray(items)) {
    throw new Error('Favorite showcase must be an array')
  }

  if (items.length > 5) {
    throw new Error('Favorite showcase can contain up to 5 titles')
  }

  const showcase = await writeFavoriteShowcase(userId, items)

  primePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), showcase)
  refreshAccountSummary(userId)

  return showcase
}

export async function toggleUserLike({ media, userId }) {
  const likeRef = buildLikeRef(userId, media)
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const row = createMediaRow(media, userId)
    const rpcResult = await client.rpc('collection_toggle_like_v2', {
      p_backdrop_path: row.backdrop_path || null,
      p_entity_id: row.entity_id || null,
      p_entity_type: row.entity_type || null,
      p_media_key: row.media_key,
      p_payload: row.payload || {},
      p_poster_path: row.poster_path || null,
      p_title: row.title || null,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'Like could not be updated')

    const rpcRow = resolveRpcRow(rpcResult.data)
    const isLiked = rpcRow?.is_liked === true

    if (!isLiked) {
      await removeLikeFromShowcase(userId, likeRef.id)
    }

    const nextResult = {
      isLiked,
      like: isLiked ? normalizeMediaPayload(row.payload || {}, row) : null,
      mediaKey: likeRef.id,
    }

    primePollingSubscription(
      getLikeStatusSubscriptionKey({ media, userId }),
      nextResult
    )
    invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
      refetch: true,
    })
    invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return nextResult
  }

  const existing = await client
    .from('likes')
    .select('media_key')
    .eq('user_id', userId)
    .eq('media_key', likeRef.id)
    .maybeSingle()

  assertSupabaseResult(existing, 'Like state could not be loaded')

  if (existing.data) {
    const removeResult = await client
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('media_key', likeRef.id)

    assertSupabaseResult(removeResult, 'Like could not be removed')
    await removeLikeFromShowcase(userId, likeRef.id)

    primePollingSubscription(getLikeStatusSubscriptionKey({ media, userId }), {
      isLiked: false,
      like: null,
    })
    invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return {
      isLiked: false,
      mediaKey: likeRef.id,
    }
  }

  const row = createMediaRow(media, userId)
  const upsertResult = await client
    .from('likes')
    .upsert(row, { onConflict: 'user_id,media_key' })
    .select(LIKE_ROW_SELECT)
    .single()

  assertSupabaseResult(upsertResult, 'Like could not be saved')

  const nextResult = {
    isLiked: true,
    like: normalizeMediaPayload(
      upsertResult.data?.payload || {},
      upsertResult.data || {}
    ),
    mediaKey: likeRef.id,
  }

  primePollingSubscription(
    getLikeStatusSubscriptionKey({ media, userId }),
    nextResult
  )
  invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
    refetch: true,
  })
  refreshAccountSummary(userId)

  return nextResult
}

export async function removeUserLike({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage likes')

  const resolvedMediaKey = mediaKey || getLikeDocRef(userId, media).id
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const rpcResult = await client.rpc('collection_remove_like_v2', {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'Like could not be removed')

    const rpcRow = resolveRpcRow(rpcResult.data)

    if (rpcRow?.removed) {
      await removeLikeFromShowcase(userId, resolvedMediaKey)
    }

    invalidatePollingSubscription(getLikeStatusSubscriptionKey({ media, userId }), {
      payload: {
        isLiked: false,
        like: null,
      },
    })
    invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
      refetch: true,
    })
    invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return {
      mediaKey: resolvedMediaKey,
    }
  }

  const result = await client
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('media_key', resolvedMediaKey)

  assertSupabaseResult(result, 'Like could not be removed')
  await removeLikeFromShowcase(userId, resolvedMediaKey)

  invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
    refetch: true,
  })
  invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
    refetch: true,
  })
  refreshAccountSummary(userId)

  return {
    mediaKey: resolvedMediaKey,
  }
}

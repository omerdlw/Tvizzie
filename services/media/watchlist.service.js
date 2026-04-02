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
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
  resolveLimitCount,
} from '@/services/core/supabase-media-utils.service'
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/services/activity/activity-events.service'
import { buildCanonicalActivityDedupeKey } from '@/lib/activity/canonical-key'

const WATCHLIST_ROW_SELECT = [
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

function createWatchlistRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items')

  const mediaSnapshot = assertMovieMedia(
    media,
    'Only movies are supported in watchlist'
  )

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watchlist',
    userId,
  }
}

function buildMediaIdentity(media) {
  return {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  }
}

function getWatchlistStatusSubscriptionKey({ media, userId }) {
  return buildPollingSubscriptionKey('watchlist:status', {
    media: buildMediaIdentity(media),
    userId,
  })
}

function getUserWatchlistSubscriptionKey(userId, options = {}) {
  return buildPollingSubscriptionKey('watchlist:user', {
    limitCount: options.limitCount ?? null,
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

async function fetchWatchlistStatus({ media, userId }) {
  if (!userId || !media) {
    return {
      isInWatchlist: false,
      item: null,
    }
  }

  const watchlistRef = createWatchlistRef(userId, media)
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: media?.entityId ?? media?.id ?? null,
      entityType: media?.entityType ?? media?.media_type ?? null,
      mediaKey: watchlistRef.id,
      resource: 'watchlist-status',
      userId,
    },
  })

  return payload?.data || {
    isInWatchlist: false,
    item: null,
  }
}

async function fetchWatchlist(userId, options = {}) {
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
      resource: 'watchlist',
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

export function getWatchlistDocRef(userId, media) {
  return createWatchlistRef(userId, media)
}

export function subscribeToWatchlistStatus(
  { media, userId },
  callback,
  options = {}
) {
  return createPollingSubscription(
    () => fetchWatchlistStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isInWatchlist), result?.item || null)
    },
    {
      ...options,
      subscriptionKey: getWatchlistStatusSubscriptionKey({ media, userId }),
    }
  )
}

export function subscribeToUserWatchlist(userId, callback, options = {}) {
  return createPollingSubscription(
    () => fetchWatchlist(userId, options),
    callback,
    {
      ...options,
      subscriptionKey: getUserWatchlistSubscriptionKey(userId, options),
    }
  )
}

export async function toggleUserWatchlistItem({ media, userId }) {
  const watchlistRef = createWatchlistRef(userId, media)
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const row = createMediaRow(media, userId)
    const rpcResult = await client.rpc('collection_toggle_watchlist_v2', {
      p_backdrop_path: row.backdrop_path || null,
      p_entity_id: row.entity_id || null,
      p_entity_type: row.entity_type || null,
      p_media_key: row.media_key,
      p_payload: row.payload || {},
      p_poster_path: row.poster_path || null,
      p_title: row.title || null,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'Watchlist item could not be updated')

    const rpcRow = resolveRpcRow(rpcResult.data)
    const isInWatchlist = rpcRow?.is_in_watchlist === true

    if (isInWatchlist) {
      const mediaSnapshot = assertMovieMedia(
        media,
        'Only movies are supported in watchlist'
      )

      fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED, {
        dedupeKey: buildCanonicalActivityDedupeKey({
          actorUserId: userId,
          subjectId: mediaSnapshot.entityId,
          subjectType: mediaSnapshot.entityType,
        }),
        subjectId: mediaSnapshot.entityId,
        subjectPoster: media?.posterPath || media?.poster_path || null,
        subjectTitle: media?.title || media?.name || 'Untitled',
        subjectType: mediaSnapshot.entityType,
      })
    }

    const nextResult = {
      isInWatchlist,
      item: isInWatchlist
        ? normalizeMediaPayload(row.payload || {}, row)
        : null,
      mediaKey: watchlistRef.id,
    }

    primePollingSubscription(
      getWatchlistStatusSubscriptionKey({ media, userId }),
      nextResult
    )
    invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return nextResult
  }

  const existing = await client
    .from('watchlist')
    .select('media_key')
    .eq('user_id', userId)
    .eq('media_key', watchlistRef.id)
    .maybeSingle()

  assertSupabaseResult(existing, 'Watchlist state could not be loaded')

  if (existing.data) {
    const removeResult = await client
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('media_key', watchlistRef.id)

    assertSupabaseResult(removeResult, 'Watchlist item could not be removed')

    primePollingSubscription(
      getWatchlistStatusSubscriptionKey({ media, userId }),
      {
        isInWatchlist: false,
        item: null,
      }
    )
    invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return {
      isInWatchlist: false,
      item: null,
      mediaKey: watchlistRef.id,
    }
  }

  const row = createMediaRow(media, userId)
  const upsertResult = await client
    .from('watchlist')
    .upsert(row, { onConflict: 'user_id,media_key' })
    .select(WATCHLIST_ROW_SELECT)
    .single()

  assertSupabaseResult(upsertResult, 'Watchlist item could not be saved')

  const mediaSnapshot = assertMovieMedia(
    media,
    'Only movies are supported in watchlist'
  )

  fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      subjectId: mediaSnapshot.entityId,
      subjectType: mediaSnapshot.entityType,
    }),
    subjectId: mediaSnapshot.entityId,
    subjectPoster: media?.posterPath || media?.poster_path || null,
    subjectTitle: media?.title || media?.name || 'Untitled',
    subjectType: mediaSnapshot.entityType,
  })

  const nextResult = {
    isInWatchlist: true,
    item: normalizeMediaPayload(upsertResult.data?.payload || {}, upsertResult.data || {}),
    mediaKey: watchlistRef.id,
  }

  primePollingSubscription(
    getWatchlistStatusSubscriptionKey({ media, userId }),
    nextResult
  )
  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  })
  refreshAccountSummary(userId)

  return nextResult
}

export async function removeUserWatchlistItem({
  media = null,
  mediaKey = null,
  userId,
}) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items')

  const resolvedMediaKey = mediaKey || getWatchlistDocRef(userId, media).id
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const rpcResult = await client.rpc('collection_remove_watchlist_v2', {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'Watchlist item could not be removed')

    invalidatePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), {
      payload: {
        isInWatchlist: false,
        item: null,
      },
    })
    invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return {
      mediaKey: resolvedMediaKey,
    }
  }

  const result = await client
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('media_key', resolvedMediaKey)

  assertSupabaseResult(result, 'Watchlist item could not be removed')

  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  })
  refreshAccountSummary(userId)

  return {
    mediaKey: resolvedMediaKey,
  }
}

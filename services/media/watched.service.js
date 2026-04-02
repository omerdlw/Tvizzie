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
  createMediaPayload,
  ensureUserId,
  normalizeMediaPayload,
  resolveLimitCount,
} from '@/services/core/supabase-media-utils.service'
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/services/activity/activity-events.service'
import { buildCanonicalActivityDedupeKey } from '@/lib/activity/canonical-key'

const WATCHED_ROW_SELECT = [
  'created_at',
  'last_watched_at',
  'media_key',
  'payload',
  'watch_count',
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

function createWatchedRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items')

  const mediaSnapshot = assertMovieMedia(
    media,
    'Only movies are supported in watched items'
  )

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watched',
    userId,
  }
}

function buildMediaIdentity(media) {
  return {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  }
}

function getWatchedStatusSubscriptionKey({ media, userId }) {
  return buildPollingSubscriptionKey('watched:status', {
    media: buildMediaIdentity(media),
    userId,
  })
}

function getUserWatchedSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('watched:user', {
    userId,
  })
}

function getUserWatchlistSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('watchlist:user', {
    userId,
  })
}

function getWatchlistStatusSubscriptionKey({ media, userId }) {
  return buildPollingSubscriptionKey('watchlist:status', {
    media: buildMediaIdentity(media),
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

async function fetchWatchedStatus({ media, userId }) {
  if (!userId || !media) {
    return {
      isWatched: false,
      watched: null,
    }
  }

  const watchedRef = createWatchedRef(userId, media)
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: media?.entityId ?? media?.id ?? null,
      entityType: media?.entityType ?? media?.media_type ?? null,
      mediaKey: watchedRef.id,
      resource: 'watched-status',
      userId,
    },
  })

  return payload?.data || {
    isWatched: false,
    watched: null,
  }
}

async function fetchWatchedList(userId, options = {}) {
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
      resource: 'watched',
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

export function getWatchedDocRef(userId, media) {
  return createWatchedRef(userId, media)
}

export function subscribeToWatchedStatus(
  { media, userId },
  callback,
  options = {}
) {
  return createPollingSubscription(
    () => fetchWatchedStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isWatched), result?.watched || null)
    },
    {
      ...options,
      subscriptionKey: getWatchedStatusSubscriptionKey({ media, userId }),
    }
  )
}

export function subscribeToUserWatched(userId, callback, options = {}) {
  if (!userId) {
    callback([])
    return () => {}
  }

  return createPollingSubscription(
    () => fetchWatchedList(userId, options),
    callback,
    {
      ...options,
      subscriptionKey: getUserWatchedSubscriptionKey(userId),
    }
  )
}

export async function markUserWatched({
  media,
  sourceLastAction = 'watched',
  userId,
  watchedAt = new Date(),
}) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items')

  const mediaSnapshot = assertMovieMedia(
    media,
    'Only movies are supported in watched items'
  )
  const watchedAtValue = watchedAt instanceof Date ? watchedAt : new Date(watchedAt)

  if (Number.isNaN(watchedAtValue.getTime())) {
    throw new Error('watchedAt is invalid')
  }

  const watchedAtIso = watchedAtValue.toISOString()
  const watchedRef = createWatchedRef(userId, media)
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const mediaPayload = createMediaPayload(media, userId, {
      addedAt: watchedAtIso,
      updatedAt: new Date().toISOString(),
    })
    const watchedPayload = {
      ...mediaPayload,
      firstWatchedAt: watchedAtIso,
      lastWatchedAt: watchedAtIso,
      sourceLastAction,
      watchCount: 1,
    }
    const rpcResult = await client.rpc('collection_mark_watched_v2', {
      p_backdrop_path: mediaPayload.backdrop_path || null,
      p_entity_id: mediaPayload.entityId || null,
      p_entity_type: mediaPayload.entityType || null,
      p_last_watched_at: watchedAtIso,
      p_media_key: watchedRef.id,
      p_payload: watchedPayload,
      p_poster_path: mediaPayload.poster_path || null,
      p_source_last_action: sourceLastAction || 'watched',
      p_title: mediaPayload.title || null,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'Watched item could not be saved')

    const rpcRow = resolveRpcRow(rpcResult.data)
    const isNew = rpcRow?.is_new === true
    const watchCount = Number(rpcRow?.watch_count || 1)
    const wasRemovedFromWatchlist = rpcRow?.was_removed_from_watchlist === true

    if (isNew) {
      fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHED_MARKED, {
        dedupeKey: buildCanonicalActivityDedupeKey({
          actorUserId: userId,
          subjectId: mediaSnapshot.entityId,
          subjectType: mediaSnapshot.entityType,
        }),
        subjectId: mediaSnapshot.entityId,
        subjectPoster: media?.poster_path || media?.posterPath || null,
        subjectTitle: media?.title || media?.name || 'Untitled',
        subjectType: mediaSnapshot.entityType,
        watchedAt: watchedAtIso,
      })
    }

    primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
      isWatched: true,
      watched: {
        ...normalizeMediaPayload(media, {
          entity_id: mediaSnapshot.entityId,
          entity_type: mediaSnapshot.entityType,
        }),
        firstWatchedAt: watchedAtIso,
        lastWatchedAt: watchedAtIso,
        sourceLastAction,
        watchCount,
      },
    })
    invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
      refetch: true,
    })
    invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
      refetch: true,
    })
    invalidatePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), {
      payload: {
        isInWatchlist: false,
        item: null,
      },
    })
    refreshAccountSummary(userId)

    return {
      isAlreadyWatched: !isNew,
      mediaKey: watchedRef.id,
      wasRemovedFromWatchlist,
      watchCount,
    }
  }

  const [profileResult, watchedResult] = await Promise.all([
    client
      .from('profiles')
      .select('watched_count')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('watched')
      .select(WATCHED_ROW_SELECT)
      .eq('user_id', userId)
      .eq('media_key', watchedRef.id)
      .maybeSingle(),
  ])

  assertSupabaseResult(profileResult, 'Profile could not be loaded')
  assertSupabaseResult(watchedResult, 'Watched state could not be loaded')

  const existingRow = watchedResult.data || null
  const existingPayload =
    existingRow?.payload && typeof existingRow.payload === 'object'
      ? existingRow.payload
      : {}
  const isAlreadyWatched = Boolean(existingRow)
  const nextWatchCount = Number.isFinite(Number(existingPayload.watchCount))
    ? Math.max(1, Number(existingPayload.watchCount))
    : 1
  const mediaPayload = createMediaPayload(media, userId, {
    addedAt: existingPayload.addedAt || watchedAtIso,
    updatedAt: new Date().toISOString(),
  })
  const watchedPayload = {
    ...mediaPayload,
    firstWatchedAt: existingPayload.firstWatchedAt || watchedAtIso,
    lastWatchedAt: watchedAtIso,
    sourceLastAction,
    watchCount: nextWatchCount,
  }

  const upsertResult = await client
    .from('watched')
    .upsert(
      {
        user_id: userId,
        media_key: watchedRef.id,
        entity_id: mediaPayload.entityId,
        entity_type: mediaPayload.entityType,
        title: mediaPayload.title,
        poster_path: mediaPayload.poster_path,
        backdrop_path: mediaPayload.backdrop_path,
        payload: watchedPayload,
        watch_count: nextWatchCount,
        last_watched_at: watchedAtIso,
        created_at: existingRow?.created_at || watchedAtIso,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,media_key' }
    )

  assertSupabaseResult(upsertResult, 'Watched item could not be saved')

  const removeWatchlistResult = await client
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('media_key', watchedRef.id)
    .select('media_key')

  assertSupabaseResult(removeWatchlistResult, 'Watchlist item could not be removed')

  if (!isAlreadyWatched) {
    const currentWatchedCount = Number(profileResult.data?.watched_count || 0)
    const profileUpdateResult = await client
      .from('profiles')
      .update({
        watched_count: currentWatchedCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    assertSupabaseResult(profileUpdateResult, 'Profile watched count could not be updated')

    fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHED_MARKED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        subjectId: mediaSnapshot.entityId,
        subjectType: mediaSnapshot.entityType,
      }),
      subjectId: mediaSnapshot.entityId,
      subjectPoster: media?.poster_path || media?.posterPath || null,
      subjectTitle: media?.title || media?.name || 'Untitled',
      subjectType: mediaSnapshot.entityType,
      watchedAt: watchedAtIso,
    })
  }

  primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
    isWatched: true,
    watched: {
      ...normalizeMediaPayload(media, {
        entity_id: mediaSnapshot.entityId,
        entity_type: mediaSnapshot.entityType,
      }),
      firstWatchedAt:
        existingPayload?.firstWatchedAt || existingRow?.created_at || watchedAtIso,
      lastWatchedAt: watchedAtIso,
      sourceLastAction,
      watchCount: nextWatchCount,
    },
  })
  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
    refetch: true,
  })
  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  })
  invalidatePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), {
    payload: {
      isInWatchlist: false,
      item: null,
    },
  })
  refreshAccountSummary(userId)

  return {
    isAlreadyWatched,
    mediaKey: watchedRef.id,
    wasRemovedFromWatchlist: (removeWatchlistResult.data || []).length > 0,
    watchCount: nextWatchCount,
  }
}

export async function removeUserWatchedItem({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items')

  const resolvedMediaKey = mediaKey || getWatchedDocRef(userId, media).id
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const rpcResult = await client.rpc('collection_remove_watched_v2', {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'Watched item could not be removed')

    const rpcRow = resolveRpcRow(rpcResult.data)
    const wasRemoved = rpcRow?.removed === true

    primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
      isWatched: false,
      watched: null,
    })
    invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
      refetch: true,
    })
    refreshAccountSummary(userId)

    return {
      isWatched: false,
      mediaKey: resolvedMediaKey,
      wasRemoved,
    }
  }

  const [profileResult, watchedResult] = await Promise.all([
    client
      .from('profiles')
      .select('watched_count')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('watched')
      .select('media_key')
      .eq('user_id', userId)
      .eq('media_key', resolvedMediaKey)
      .maybeSingle(),
  ])

  assertSupabaseResult(profileResult, 'Profile could not be loaded')
  assertSupabaseResult(watchedResult, 'Watched state could not be loaded')

  const existingRow = watchedResult.data || null

  if (!existingRow) {
    primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
      isWatched: false,
      watched: null,
    })
    return {
      isWatched: false,
      mediaKey: resolvedMediaKey,
      wasRemoved: false,
    }
  }

  const result = await client
    .from('watched')
    .delete()
    .eq('user_id', userId)
    .eq('media_key', resolvedMediaKey)

  assertSupabaseResult(result, 'Watched item could not be removed')

  const currentWatchedCount = Number(profileResult.data?.watched_count || 0)
  const nextWatchedCount = Math.max(0, currentWatchedCount - 1)
  const profileUpdateResult = await client
    .from('profiles')
    .update({
      watched_count: nextWatchedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  assertSupabaseResult(profileUpdateResult, 'Profile watched count could not be updated')

  primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
    isWatched: false,
    watched: null,
  })

  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
    refetch: true,
  })
  refreshAccountSummary(userId)

  return {
    isWatched: false,
    mediaKey: resolvedMediaKey,
    wasRemoved: true,
  }
}

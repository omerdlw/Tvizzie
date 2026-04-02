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

  const payload = await requestApiJson('/api/collections', {
    query: {
      limitCount: resolveLimitCount(options.limitCount, 0, 200) || null,
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
    invalidatePollingSubscription(getUserAccountSubscriptionKey(userId), {
      refetch: true,
    })

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
  invalidatePollingSubscription(getUserAccountSubscriptionKey(userId), {
    refetch: true,
  })

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
  const result = await client
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('media_key', resolvedMediaKey)

  assertSupabaseResult(result, 'Watchlist item could not be removed')

  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  })
  invalidatePollingSubscription(getUserAccountSubscriptionKey(userId), {
    refetch: true,
  })

  return {
    mediaKey: resolvedMediaKey,
  }
}

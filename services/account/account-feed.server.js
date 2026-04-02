import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { buildCanonicalActivityDedupeKey } from '@/lib/activity/canonical-key'
import { normalizeTimestamp } from '@/services/core/data-utils'
import { buildMediaItemKey } from '@/services/core/media-key.service'
import {
  isMovieMediaType,
  isSupportedContentSubjectType,
  isTvReference,
  normalizeMediaType,
} from '@/lib/media'

const HIDDEN_ACTIVITY_EVENT_TYPES = new Set([
  'FOLLOW_ACCEPTED',
  'FOLLOW_CREATED',
])
const FOLLOW_STATUS_ACCEPTED = 'accepted'
const ACTIVITY_SELECT = [
  'created_at',
  'dedupe_key',
  'event_type',
  'id',
  'payload',
  'updated_at',
  'user_id',
].join(',')
const ACTIVITY_MOVIE_REVIEW_SELECT = ['content', 'media_key', 'payload', 'rating', 'user_id'].join(
  ','
)
const ACTIVITY_LIST_REVIEW_SELECT = ['content', 'list_id', 'payload', 'rating', 'user_id'].join(
  ','
)
const ACTIVITY_LIST_SNAPSHOT_SELECT = ['id', 'payload', 'poster_path', 'title', 'user_id'].join(
  ','
)

function normalizeActor(value = {}) {
  return {
    avatarUrl: value?.avatarUrl || null,
    displayName: value?.displayName || value?.name || 'Someone',
    id: value?.id || null,
    username: value?.username || null,
  }
}

function normalizeSubject(value = {}) {
  return {
    href: value?.href || null,
    id: value?.id || null,
    ownerId: value?.ownerId || null,
    ownerUsername: value?.ownerUsername || null,
    poster: value?.poster || null,
    slug: value?.slug || null,
    title: value?.title || 'Untitled',
    type: value?.type || null,
  }
}

function normalizeActivityRow(row = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}

  return {
    actor: normalizeActor(payload.actor || {}),
    createdAt: normalizeTimestamp(row.created_at || payload.createdAt),
    updatedAt: normalizeTimestamp(row.updated_at || payload.updatedAt || row.created_at),
    dedupeKey: row.dedupe_key || payload.dedupeKey || null,
    eventType: row.event_type || payload.eventType || 'UNKNOWN',
    id: row.id || null,
    payload:
      payload.payload && typeof payload.payload === 'object'
        ? payload.payload
        : payload,
    sourceUserId: row.user_id || null,
    subject: normalizeSubject(payload.subject || {}),
    visibility: payload.visibility || 'public',
  }
}

function isVisibleActivityItem(item = {}) {
  if (HIDDEN_ACTIVITY_EVENT_TYPES.has(String(item?.eventType || '').trim())) {
    return false
  }

  const subjectType = normalizeMediaType(item?.subject?.type)
  const subjectHref = item?.subject?.href || null

  if (subjectHref && isTvReference(subjectHref)) {
    return false
  }

  if (!subjectType) {
    return true
  }

  return isSupportedContentSubjectType(subjectType)
}

function getActivityTimestamp(item = {}) {
  const timestamp = item?.updatedAt || item?.createdAt
    ? new Date(item.updatedAt || item.createdAt).getTime()
    : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function sortActivityItems(items = []) {
  return [...items].sort((left, right) => {
    const timestampDiff = getActivityTimestamp(right) - getActivityTimestamp(left)

    if (timestampDiff !== 0) {
      return timestampDiff
    }

    return String(right?.id || '').localeCompare(String(left?.id || ''))
  })
}

function chunkArray(values = [], size = 100) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function buildFollowPairKey(followerId, followingId) {
  return `${String(followerId || '').trim()}:${String(followingId || '').trim()}`
}

async function reconcileFollowActivityItems(admin, items = []) {
  const followPairs = [...new Set(
    items
      .filter((item) => item?.eventType === 'FOLLOW_CREATED')
      .map((item) => {
        const actorUserId = String(item?.actor?.id || '').trim()
        const subjectUserId = String(item?.subject?.id || '').trim()
        const followStatus = String(item?.payload?.status || '').trim().toLowerCase()

        if (!actorUserId || !subjectUserId || followStatus === FOLLOW_STATUS_ACCEPTED) {
          return null
        }

        return buildFollowPairKey(actorUserId, subjectUserId)
      })
      .filter(Boolean),
  )]

  if (!followPairs.length) {
    return items.filter(Boolean)
  }

  const acceptedPairs = new Set()

  for (const pairChunk of chunkArray(followPairs, 50)) {
    const filter = pairChunk
      .map((pair) => {
        const [followerId, followingId] = pair.split(':')
        return `and(follower_id.eq.${followerId},following_id.eq.${followingId})`
      })
      .join(',')

    if (!filter) {
      continue
    }

    const result = await admin
      .from('follows')
      .select('follower_id,following_id')
      .eq('status', FOLLOW_STATUS_ACCEPTED)
      .or(filter)

    if (result.error) {
      throw new Error(result.error.message || 'Follow activity could not be reconciled')
    }

    ;(result.data || []).forEach((row) => {
      acceptedPairs.add(buildFollowPairKey(row.follower_id, row.following_id))
    })
  }

  return items
    .map((item) => {
      if (item?.eventType !== 'FOLLOW_CREATED') {
        return item
      }

      const actorUserId = String(item?.actor?.id || '').trim()
      const subjectUserId = String(item?.subject?.id || '').trim()

      if (!actorUserId || !subjectUserId) {
        return null
      }

      const followStatus = String(item?.payload?.status || '').trim().toLowerCase()

      if (followStatus === FOLLOW_STATUS_ACCEPTED) {
        return item
      }

      if (!acceptedPairs.has(buildFollowPairKey(actorUserId, subjectUserId))) {
        return null
      }

      return {
        ...item,
        payload: {
          ...(item.payload || {}),
          status: FOLLOW_STATUS_ACCEPTED,
        },
      }
    })
    .filter(Boolean)
}

function dedupeActivityItems(items = []) {
  const seenKeys = new Set()

  return items.filter((item) => {
    const key =
      buildCanonicalActivityDedupeKey({
        actorUserId: item?.sourceUserId || item?.actor?.id,
        subjectId: item?.subject?.id,
        subjectType: item?.subject?.type,
      }) ||
      item?.dedupeKey ||
      `${item?.actor?.id || 'actor'}:${item?.eventType || 'event'}:${item?.id || 'id'}`

    if (seenKeys.has(key)) {
      return false
    }

    seenKeys.add(key)
    return true
  })
}

function paginateItems(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Number(cursor) : 0
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Number(pageSize))
    : 20
  const nextItems = items.slice(offset, offset + normalizedPageSize)
  const nextOffset = offset + nextItems.length

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
  }
}

function normalizeListPreviewItem(value = {}) {
  const entityId = String(value?.entityId ?? value?.id ?? '').trim()
  const entityType = String(value?.entityType ?? value?.media_type ?? '').trim().toLowerCase()

  if (!entityId || !entityType) {
    return null
  }

  return {
    entityId,
    entityType,
    mediaKey: value?.mediaKey || buildMediaItemKey(entityType, entityId),
    poster_path: value?.poster_path || value?.posterPath || null,
    title: value?.title || value?.name || 'Untitled',
  }
}

function buildMovieStateKey(userId, mediaKey) {
  return `${String(userId || '').trim()}:${String(mediaKey || '').trim()}`
}

function buildListStateKey(userId, listId) {
  return `${String(userId || '').trim()}:${String(listId || '').trim()}`
}

async function enrichActivityItems(admin, items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }

  const movieRefs = []
  const listRefs = []

  items.forEach((item) => {
    const sourceUserId = String(item?.sourceUserId || '').trim()
    const subjectId = String(item?.subject?.id || '').trim()
    const subjectType = normalizeMediaType(item?.subject?.type)

    if (!sourceUserId || !subjectId) {
      return
    }

    if (isMovieMediaType(subjectType)) {
      movieRefs.push({
        key: buildMovieStateKey(sourceUserId, buildMediaItemKey(subjectType, subjectId)),
        mediaKey: buildMediaItemKey(subjectType, subjectId),
        userId: sourceUserId,
      })
    }

    if (subjectType === 'list') {
      listRefs.push({
        key: buildListStateKey(sourceUserId, subjectId),
        listId: subjectId,
        userId: sourceUserId,
      })
    }
  })

  const movieStateMap = new Map()
  const listStateMap = new Map()
  const uniqueMovieKeys = [...new Set(movieRefs.map((item) => item.mediaKey))]
  const uniqueMovieUserIds = [...new Set(movieRefs.map((item) => item.userId))]
  const uniqueListIds = [...new Set(listRefs.map((item) => item.listId))]
  const uniqueListUserIds = [...new Set(listRefs.map((item) => item.userId))]

  if (uniqueMovieKeys.length > 0 && uniqueMovieUserIds.length > 0) {
      const [likesResult, reviewsResult, watchedResult] = await Promise.all([
        admin
          .from('likes')
          .select('media_key,user_id')
        .in('user_id', uniqueMovieUserIds)
        .in('media_key', uniqueMovieKeys),
      admin
        .from('media_reviews')
        .select(ACTIVITY_MOVIE_REVIEW_SELECT)
        .in('user_id', uniqueMovieUserIds)
        .in('media_key', uniqueMovieKeys),
        admin
          .from('watched')
          .select('media_key,user_id,watch_count')
          .in('user_id', uniqueMovieUserIds)
          .in('media_key', uniqueMovieKeys),
      ])

    ;[likesResult, reviewsResult, watchedResult].forEach((result) => {
      if (result?.error) {
        throw new Error(result.error.message || 'Activity state could not be loaded')
      }
    })

    ;(likesResult.data || []).forEach((row) => {
      const key = buildMovieStateKey(row.user_id, row.media_key)
      movieStateMap.set(key, {
        ...(movieStateMap.get(key) || {}),
        isLiked: true,
      })
    })

    ;(reviewsResult.data || []).forEach((row) => {
      const key = buildMovieStateKey(row.user_id, row.media_key)
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
      const content = String(row.content || payload.content || '').trim()
      const rating =
        row.rating === null || row.rating === undefined
          ? payload.rating ?? null
          : Number(row.rating)

      movieStateMap.set(key, {
        ...(movieStateMap.get(key) || {}),
        hasReview: content.length > 0,
        rating: Number.isFinite(Number(rating)) ? Number(rating) : movieStateMap.get(key)?.rating ?? null,
      })
    })

    ;(watchedResult.data || []).forEach((row) => {
      const key = buildMovieStateKey(row.user_id, row.media_key)
      movieStateMap.set(key, {
        ...(movieStateMap.get(key) || {}),
        isRewatch: Number(row.watch_count || 0) > 1,
      })
    })
  }

  if (uniqueListIds.length > 0) {
    const [likesResult, reviewsResult, listSnapshotsResult] = await Promise.all([
      admin
        .from('list_likes')
        .select('list_id,user_id')
        .in('user_id', uniqueListUserIds)
        .in('list_id', uniqueListIds),
      admin
        .from('list_reviews')
        .select(ACTIVITY_LIST_REVIEW_SELECT)
        .in('user_id', uniqueListUserIds)
        .in('list_id', uniqueListIds),
      admin
        .from('lists')
        .select(ACTIVITY_LIST_SNAPSHOT_SELECT)
        .in('id', uniqueListIds),
    ])

    ;[likesResult, reviewsResult, listSnapshotsResult].forEach((result) => {
      if (result?.error) {
        throw new Error(result.error.message || 'List activity state could not be loaded')
      }
    })

    const listSnapshotMap = new Map(
      (listSnapshotsResult.data || []).map((row) => [row.id, row])
    )

    ;(likesResult.data || []).forEach((row) => {
      const key = buildListStateKey(row.user_id, row.list_id)
      listStateMap.set(key, {
        ...(listStateMap.get(key) || {}),
        isLiked: true,
      })
    })

    ;(reviewsResult.data || []).forEach((row) => {
      const key = buildListStateKey(row.user_id, row.list_id)
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
      const content = String(row.content || payload.content || '').trim()
      const rating =
        row.rating === null || row.rating === undefined
          ? payload.rating ?? null
          : Number(row.rating)

      listStateMap.set(key, {
        ...(listStateMap.get(key) || {}),
        hasReview: content.length > 0,
        rating: Number.isFinite(Number(rating)) ? Number(rating) : listStateMap.get(key)?.rating ?? null,
      })
    })

    listRefs.forEach((ref) => {
      const key = buildListStateKey(ref.userId, ref.listId)
      const current = listStateMap.get(key) || {}
      const snapshot = listSnapshotMap.get(ref.listId)
      const payload = snapshot?.payload && typeof snapshot.payload === 'object' ? snapshot.payload : {}

      listStateMap.set(key, {
        ...current,
        previewItems: Array.isArray(payload.previewItems)
          ? payload.previewItems.map(normalizeListPreviewItem).filter(Boolean).slice(0, 3)
          : [],
      })
    })
  }

  return items.map((item) => {
    const sourceUserId = String(item?.sourceUserId || '').trim()
    const subjectId = String(item?.subject?.id || '').trim()
    const subjectType = normalizeMediaType(item?.subject?.type)

    if (!sourceUserId || !subjectId) {
      return item
    }

    if (isMovieMediaType(subjectType)) {
      const mediaKey = buildMediaItemKey(subjectType, subjectId)
      const state = movieStateMap.get(buildMovieStateKey(sourceUserId, mediaKey)) || {}

      return {
        ...item,
        activityState: {
          hasReview: Boolean(state.hasReview),
          isLiked: Boolean(state.isLiked),
          isRewatch: Boolean(state.isRewatch),
          previewItems: [],
          rating:
            state.rating === null || state.rating === undefined ? null : Number(state.rating),
        },
      }
    }

    if (subjectType === 'list') {
      const state = listStateMap.get(buildListStateKey(sourceUserId, subjectId)) || {}

      return {
        ...item,
        activityState: {
          hasReview: Boolean(state.hasReview),
          isLiked: Boolean(state.isLiked),
          isRewatch: false,
          previewItems: Array.isArray(state.previewItems) ? state.previewItems : [],
          rating:
            state.rating === null || state.rating === undefined ? null : Number(state.rating),
        },
      }
    }

    return item
  })
}

async function canViewerAccessUserContent({ admin, ownerId, viewerId = null }) {
  if (!ownerId) {
    return false
  }

  if (viewerId && viewerId === ownerId) {
    return true
  }

  const profileResult = await admin
    .from('profiles')
    .select('is_private')
    .eq('id', ownerId)
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

  if (!viewerId) {
    return false
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', viewerId)
    .eq('following_id', ownerId)
    .eq('status', FOLLOW_STATUS_ACCEPTED)
    .maybeSingle()

  if (followResult.error) {
    throw new Error(followResult.error.message || 'Profile visibility could not be checked')
  }

  return Boolean(followResult.data)
}

async function fetchActivitiesForSources(admin, sourceIds = [], pageSize = null) {
  const uniqueSourceIds = [...new Set(sourceIds.map((value) => String(value || '').trim()).filter(Boolean))]

  if (!uniqueSourceIds.length) {
    return []
  }

  const perSourceLimit =
    Number.isFinite(Number(pageSize)) && Number(pageSize) > 0
      ? Number(pageSize)
      : null
  const groups = await Promise.all(
    chunkArray(uniqueSourceIds, 100).map(async (idChunk) => {
      let queryBuilder = admin
        .from('activity')
        .select(ACTIVITY_SELECT)
        .in('user_id', idChunk)
        .order('updated_at', { ascending: false })

      if (perSourceLimit) {
        queryBuilder = queryBuilder.limit(idChunk.length * perSourceLimit)
      }

      const result = await queryBuilder

      if (result.error) {
        throw new Error(result.error.message || 'Activity feed could not be loaded')
      }

      return (result.data || [])
        .map(normalizeActivityRow)
        .filter(isVisibleActivityItem)
    })
  )
  const countsBySource = new Map()
  const normalizedItems = sortActivityItems(groups.flat()).filter((item) => {
    if (!perSourceLimit) {
      return true
    }

    const sourceUserId = String(item?.sourceUserId || '').trim()

    if (!sourceUserId) {
      return false
    }

    const currentCount = countsBySource.get(sourceUserId) || 0

    if (currentCount >= perSourceLimit) {
      return false
    }

    countsBySource.set(sourceUserId, currentCount + 1)
    return true
  })

  return reconcileFollowActivityItems(admin, normalizedItems)
}

async function fetchAcceptedFollowingIds(admin, userId) {
  const result = await admin
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', FOLLOW_STATUS_ACCEPTED)

  if (result.error) {
    throw new Error(result.error.message || 'Following list could not be loaded')
  }

  return (result.data || [])
    .map((item) => item.following_id)
    .filter(Boolean)
}

export async function fetchAccountActivityFeedServer({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    }
  }

  const admin = createAdminClient()
  const canViewProfile = await canViewerAccessUserContent({
    admin,
    ownerId: userId,
    viewerId,
  })

  if (!canViewProfile) {
    const error = new Error('This profile is private')
    error.status = 403
    throw error
  }

  const followingIds = await fetchAcceptedFollowingIds(admin, userId).catch(() => [])
  const sourceIds = scope === 'following' ? [...new Set(followingIds)] : [userId]
  const sourcePageSize = Math.max(Number(pageSize || 20) * 2, 24)

  if (sourceIds.length === 0) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    }
  }

  const items = sortActivityItems(
    dedupeActivityItems(
      (await fetchActivitiesForSources(admin, sourceIds, sourcePageSize)).map((item) => ({
        ...item,
        isFromFollowing: String(item?.sourceUserId || '').trim() !== String(userId || '').trim(),
      }))
    )
  )

  const paginated = paginateItems(items, cursor, pageSize)

  return {
    ...paginated,
    items: await enrichActivityItems(admin, paginated.items),
  }
}

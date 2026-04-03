import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { assertMethod, errorResponse, jsonResponse, mapErrorToStatus, readJsonBody } from "../_shared/http.ts"
import { assertInternalAccess } from "../_shared/internal.ts"
import { normalizeInteger, normalizeValue } from "../_shared/normalize.ts"
import { createAdminClient } from "../_shared/supabase.ts"

type ActivityFeedRequest = {
  cursor?: number | string | null
  pageSize?: number | string | null
  scope?: "user" | "following" | string | null
  userId?: string
  viewerId?: string | null
}

type ActivityRow = {
  created_at: string | null
  dedupe_key: string | null
  event_type: string | null
  id: string
  payload: Record<string, unknown> | null
  updated_at: string | null
  user_id: string | null
}

const FOLLOW_STATUS_ACCEPTED = "accepted"
const ACTIVITY_SELECT = [
  "created_at",
  "dedupe_key",
  "event_type",
  "id",
  "payload",
  "updated_at",
  "user_id",
].join(",")

const ACTIVITY_MOVIE_REVIEW_SELECT = [
  "content",
  "media_key",
  "payload",
  "rating",
  "user_id",
].join(",")

const ACTIVITY_LIST_REVIEW_SELECT = [
  "content",
  "list_id",
  "payload",
  "rating",
  "user_id",
].join(",")

const ACTIVITY_LIST_SNAPSHOT_SELECT = [
  "id",
  "payload",
  "poster_path",
  "title",
  "user_id",
].join(",")

const HIDDEN_ACTIVITY_EVENT_TYPES = new Set([
  "FOLLOW_ACCEPTED",
  "FOLLOW_CREATED",
])

function normalizeScope(value: unknown) {
  const normalized = normalizeValue(value).toLowerCase()

  if (normalized === "following") {
    return "following"
  }

  return "user"
}

function normalizeMediaType(value: unknown) {
  return normalizeValue(value).toLowerCase()
}

function isMovieMediaType(value: unknown) {
  return normalizeMediaType(value) === "movie"
}

function isListSubjectType(value: unknown) {
  return normalizeMediaType(value) === "list"
}

function isUserSubjectType(value: unknown) {
  return normalizeMediaType(value) === "user"
}

function isSupportedContentSubjectType(value: unknown) {
  return (
    isMovieMediaType(value) ||
    isListSubjectType(value) ||
    isUserSubjectType(value)
  )
}

function isTvReference(value: unknown) {
  const normalized = normalizeValue(value)
  return normalized.startsWith("/tv/") || normalized.includes("tv_")
}

function buildMediaItemKey(entityType: string, entityId: string) {
  return `${normalizeMediaType(entityType)}_${normalizeValue(entityId)}`
}

function normalizeActor(value: Record<string, unknown> = {}) {
  return {
    avatarUrl: normalizeValue(value.avatarUrl) || null,
    displayName: normalizeValue(value.displayName || value.name) || "Someone",
    id: normalizeValue(value.id) || null,
    username: normalizeValue(value.username) || null,
  }
}

function normalizeSubject(value: Record<string, unknown> = {}) {
  return {
    href: normalizeValue(value.href) || null,
    id: normalizeValue(value.id) || null,
    ownerId: normalizeValue(value.ownerId) || null,
    ownerUsername: normalizeValue(value.ownerUsername) || null,
    poster: normalizeValue(value.poster) || null,
    slug: normalizeValue(value.slug) || null,
    title: normalizeValue(value.title) || "Untitled",
    type: normalizeValue(value.type) || null,
  }
}

function normalizeActivityRow(row: ActivityRow) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {}
  const nestedPayload =
    payload.payload && typeof payload.payload === "object"
      ? (payload.payload as Record<string, unknown>)
      : payload

  return {
    actor: normalizeActor((payload.actor as Record<string, unknown>) || {}),
    createdAt: normalizeValue(row.created_at || payload.createdAt) || null,
    dedupeKey: normalizeValue(row.dedupe_key || payload.dedupeKey) || null,
    eventType: normalizeValue(row.event_type || payload.eventType) || "UNKNOWN",
    id: normalizeValue(row.id) || null,
    payload: nestedPayload,
    sourceUserId: normalizeValue(row.user_id) || null,
    subject: normalizeSubject((payload.subject as Record<string, unknown>) || {}),
    updatedAt: normalizeValue(row.updated_at || payload.updatedAt || row.created_at) || null,
    visibility: normalizeValue(payload.visibility) || "public",
  }
}

function isVisibleActivityItem(item: Record<string, unknown>) {
  const eventType = normalizeValue(item.eventType)

  if (HIDDEN_ACTIVITY_EVENT_TYPES.has(eventType)) {
    return false
  }

  const subject = (item.subject as Record<string, unknown>) || {}
  const subjectType = normalizeMediaType(subject.type)
  const subjectHref = normalizeValue(subject.href)

  if (subjectHref && isTvReference(subjectHref)) {
    return false
  }

  if (!subjectType) {
    return true
  }

  return isSupportedContentSubjectType(subjectType)
}

function getActivityTimestamp(item: Record<string, unknown>) {
  const updatedAt = normalizeValue(item.updatedAt)
  const createdAt = normalizeValue(item.createdAt)
  const source = updatedAt || createdAt
  const timestamp = source ? Date.parse(source) : 0

  return Number.isFinite(timestamp) ? timestamp : 0
}

function sortActivityItems(items: Record<string, unknown>[]) {
  return [...items].sort((left, right) => {
    const timestampDiff = getActivityTimestamp(right) - getActivityTimestamp(left)

    if (timestampDiff !== 0) {
      return timestampDiff
    }

    return normalizeValue(right.id).localeCompare(normalizeValue(left.id))
  })
}

function dedupeActivityItems(items: Record<string, unknown>[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key =
      normalizeValue(item.dedupeKey) ||
      `${normalizeValue(item.sourceUserId)}:${normalizeValue(item.eventType)}:${normalizeValue(item.id)}`

    if (!key) {
      return false
    }

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function paginateItems(
  items: Record<string, unknown>[],
  cursor: unknown,
  pageSize: unknown
) {
  const offset = normalizeInteger(cursor, {
    fallback: 0,
    min: 0,
  })
  const size = normalizeInteger(pageSize, {
    fallback: 20,
    min: 1,
    max: 100,
  })

  const nextItems = items.slice(offset, offset + size)
  const nextOffset = offset + nextItems.length

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
  }
}

function chunkArray<T>(values: T[], size = 100) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function buildFollowPairKey(followerId: string, followingId: string) {
  return `${normalizeValue(followerId)}:${normalizeValue(followingId)}`
}

async function reconcileFollowActivityItems(
  admin: ReturnType<typeof createAdminClient>,
  items: Record<string, unknown>[]
) {
  const followPairs = [...new Set(
    items
      .filter((item) => normalizeValue(item.eventType) === "FOLLOW_CREATED")
      .map((item) => {
        const actor = (item.actor as Record<string, unknown>) || {}
        const subject = (item.subject as Record<string, unknown>) || {}
        const payload = (item.payload as Record<string, unknown>) || {}
        const actorUserId = normalizeValue(actor.id)
        const subjectUserId = normalizeValue(subject.id)
        const followStatus = normalizeValue(payload.status).toLowerCase()

        if (!actorUserId || !subjectUserId || followStatus === FOLLOW_STATUS_ACCEPTED) {
          return null
        }

        return buildFollowPairKey(actorUserId, subjectUserId)
      })
      .filter(Boolean),
  )]

  if (!followPairs.length) {
    return items
  }

  const acceptedPairs = new Set<string>()

  for (const pairChunk of chunkArray(followPairs, 50)) {
    const filter = pairChunk
      .map((pair) => {
        const [followerId, followingId] = String(pair).split(":")
        return `and(follower_id.eq.${followerId},following_id.eq.${followingId})`
      })
      .join(",")

    if (!filter) {
      continue
    }

    const result = await admin
      .from("follows")
      .select("follower_id,following_id")
      .eq("status", FOLLOW_STATUS_ACCEPTED)
      .or(filter)

    if (result.error) {
      throw new Error(result.error.message || "Follow activity could not be reconciled")
    }

    ;(result.data || []).forEach((row) => {
      acceptedPairs.add(buildFollowPairKey(row.follower_id, row.following_id))
    })
  }

  return items.filter((item) => {
    if (normalizeValue(item.eventType) !== "FOLLOW_CREATED") {
      return true
    }

    const actor = (item.actor as Record<string, unknown>) || {}
    const subject = (item.subject as Record<string, unknown>) || {}
    const payload = (item.payload as Record<string, unknown>) || {}
    const actorUserId = normalizeValue(actor.id)
    const subjectUserId = normalizeValue(subject.id)

    if (!actorUserId || !subjectUserId) {
      return false
    }

    const followStatus = normalizeValue(payload.status).toLowerCase()

    if (followStatus === FOLLOW_STATUS_ACCEPTED) {
      return true
    }

    return acceptedPairs.has(buildFollowPairKey(actorUserId, subjectUserId))
  })
}

function buildMovieStateKey(userId: string, mediaKey: string) {
  return `${normalizeValue(userId)}:${normalizeValue(mediaKey)}`
}

function buildListStateKey(userId: string, listId: string) {
  return `${normalizeValue(userId)}:${normalizeValue(listId)}`
}

function normalizeListPreviewItem(value: Record<string, unknown> = {}) {
  const entityId = normalizeValue(value.entityId || value.id)
  const entityType = normalizeMediaType(value.entityType || value.media_type)

  if (!entityId || !entityType) {
    return null
  }

  return {
    entityId,
    entityType,
    mediaKey: normalizeValue(value.mediaKey) || buildMediaItemKey(entityType, entityId),
    poster_path: normalizeValue(value.poster_path || value.posterPath) || null,
    title: normalizeValue(value.title || value.name) || "Untitled",
  }
}

async function enrichActivityItems(
  admin: ReturnType<typeof createAdminClient>,
  items: Record<string, unknown>[]
) {
  if (!items.length) {
    return []
  }

  const movieRefs: Array<{ key: string; mediaKey: string; userId: string }> = []
  const listRefs: Array<{ key: string; listId: string; userId: string }> = []

  items.forEach((item) => {
    const sourceUserId = normalizeValue(item.sourceUserId)
    const subject = (item.subject as Record<string, unknown>) || {}
    const subjectId = normalizeValue(subject.id)
    const subjectType = normalizeMediaType(subject.type)

    if (!sourceUserId || !subjectId) {
      return
    }

    if (isMovieMediaType(subjectType)) {
      const mediaKey = buildMediaItemKey(subjectType, subjectId)
      movieRefs.push({
        key: buildMovieStateKey(sourceUserId, mediaKey),
        mediaKey,
        userId: sourceUserId,
      })
    }

    if (isListSubjectType(subjectType)) {
      listRefs.push({
        key: buildListStateKey(sourceUserId, subjectId),
        listId: subjectId,
        userId: sourceUserId,
      })
    }
  })

  const movieStateMap = new Map<string, Record<string, unknown>>()
  const listStateMap = new Map<string, Record<string, unknown>>()

  const uniqueMovieKeys = [...new Set(movieRefs.map((item) => item.mediaKey))]
  const uniqueMovieUserIds = [...new Set(movieRefs.map((item) => item.userId))]
  const uniqueListIds = [...new Set(listRefs.map((item) => item.listId))]
  const uniqueListUserIds = [...new Set(listRefs.map((item) => item.userId))]

  if (uniqueMovieKeys.length > 0 && uniqueMovieUserIds.length > 0) {
    const [likesResult, reviewsResult, watchedResult] = await Promise.all([
      admin
        .from("likes")
        .select("media_key,user_id")
        .in("user_id", uniqueMovieUserIds)
        .in("media_key", uniqueMovieKeys),
      admin
        .from("media_reviews")
        .select(ACTIVITY_MOVIE_REVIEW_SELECT)
        .in("user_id", uniqueMovieUserIds)
        .in("media_key", uniqueMovieKeys),
      admin
        .from("watched")
        .select("media_key,user_id,watch_count")
        .in("user_id", uniqueMovieUserIds)
        .in("media_key", uniqueMovieKeys),
    ])

    ;[likesResult, reviewsResult, watchedResult].forEach((result) => {
      if (result.error) {
        throw new Error(result.error.message || "Activity state could not be loaded")
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
      const payload = row.payload && typeof row.payload === "object" ? row.payload : {}
      const content = normalizeValue(row.content || payload.content)
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

  if (uniqueListIds.length > 0 && uniqueListUserIds.length > 0) {
    const [likesResult, reviewsResult, listSnapshotsResult] = await Promise.all([
      admin
        .from("list_likes")
        .select("list_id,user_id")
        .in("user_id", uniqueListUserIds)
        .in("list_id", uniqueListIds),
      admin
        .from("list_reviews")
        .select(ACTIVITY_LIST_REVIEW_SELECT)
        .in("user_id", uniqueListUserIds)
        .in("list_id", uniqueListIds),
      admin
        .from("lists")
        .select(ACTIVITY_LIST_SNAPSHOT_SELECT)
        .in("id", uniqueListIds),
    ])

    ;[likesResult, reviewsResult, listSnapshotsResult].forEach((result) => {
      if (result.error) {
        throw new Error(result.error.message || "List activity state could not be loaded")
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
      const payload = row.payload && typeof row.payload === "object" ? row.payload : {}
      const content = normalizeValue(row.content || payload.content)
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
      const payload = snapshot?.payload && typeof snapshot.payload === "object"
        ? snapshot.payload
        : {}

      listStateMap.set(key, {
        ...current,
        previewItems: Array.isArray(payload.previewItems)
          ? payload.previewItems.map((item) => normalizeListPreviewItem(item)).filter(Boolean).slice(0, 3)
          : [],
      })
    })
  }

  return items.map((item) => {
    const sourceUserId = normalizeValue(item.sourceUserId)
    const subject = (item.subject as Record<string, unknown>) || {}
    const subjectId = normalizeValue(subject.id)
    const subjectType = normalizeMediaType(subject.type)

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

    if (isListSubjectType(subjectType)) {
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

async function canViewerAccessUserContent(
  admin: ReturnType<typeof createAdminClient>,
  {
    ownerId,
    viewerId,
  }: {
    ownerId: string
    viewerId: string | null
  }
) {
  if (!ownerId) {
    return false
  }

  if (viewerId && ownerId === viewerId) {
    return true
  }

  const profileResult = await admin
    .from("profiles")
    .select("is_private")
    .eq("id", ownerId)
    .maybeSingle()

  if (profileResult.error) {
    throw new Error(profileResult.error.message || "Profile visibility could not be checked")
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
    .from("follows")
    .select("status")
    .eq("follower_id", viewerId)
    .eq("following_id", ownerId)
    .eq("status", FOLLOW_STATUS_ACCEPTED)
    .maybeSingle()

  if (followResult.error) {
    throw new Error(followResult.error.message || "Profile visibility could not be checked")
  }

  return Boolean(followResult.data)
}

async function fetchAcceptedFollowingIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const result = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", FOLLOW_STATUS_ACCEPTED)

  if (result.error) {
    throw new Error(result.error.message || "Following list could not be loaded")
  }

  return (result.data || [])
    .map((row) => normalizeValue(row.following_id))
    .filter(Boolean)
}

async function fetchActivitiesForSources(
  admin: ReturnType<typeof createAdminClient>,
  sourceIds: string[],
  perSourceLimit: number
) {
  const uniqueSourceIds = [...new Set(sourceIds.map((value) => normalizeValue(value)).filter(Boolean))]

  if (!uniqueSourceIds.length) {
    return []
  }

  const groups = await Promise.all(
    chunkArray(uniqueSourceIds, 100).map(async (idChunk) => {
      const result = await admin
        .from("activity")
        .select(ACTIVITY_SELECT)
        .in("user_id", idChunk)
        .order("updated_at", { ascending: false })
        .limit(idChunk.length * perSourceLimit)

      if (result.error) {
        throw new Error(result.error.message || "Activity feed could not be loaded")
      }

      return (result.data || [])
        .map((row) => normalizeActivityRow(row as ActivityRow))
        .filter((item) => isVisibleActivityItem(item))
    })
  )

  const countsBySource = new Map<string, number>()

  return sortActivityItems(groups.flat()).filter((item) => {
    const sourceUserId = normalizeValue(item.sourceUserId)

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
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ["POST"])
    assertInternalAccess(request)

    const payload = await readJsonBody<ActivityFeedRequest>(request)
    const userId = normalizeValue(payload.userId)
    const viewerId = normalizeValue(payload.viewerId) || null
    const scope = normalizeScope(payload.scope)
    const pageSize = normalizeInteger(payload.pageSize, {
      fallback: 20,
      min: 1,
      max: 100,
    })

    if (!userId) {
      return jsonResponse(200, {
        hasMore: false,
        items: [],
        nextCursor: null,
      })
    }

    const admin = createAdminClient()
    const canViewProfile = await canViewerAccessUserContent(admin, {
      ownerId: userId,
      viewerId,
    })

    if (!canViewProfile) {
      const privacyError = new Error("This profile is private")
      ;(privacyError as Error & { status?: number }).status = 403
      throw privacyError
    }

    const followingIds = scope === "following"
      ? await fetchAcceptedFollowingIds(admin, userId).catch(() => [])
      : []
    const sourceIds = scope === "following" ? [...new Set(followingIds)] : [userId]

    if (!sourceIds.length) {
      return jsonResponse(200, {
        hasMore: false,
        items: [],
        nextCursor: null,
      })
    }

    const perSourceLimit = Math.max(pageSize * 2, 24)
    const rawItems = await fetchActivitiesForSources(admin, sourceIds, perSourceLimit)
    const reconciled = await reconcileFollowActivityItems(admin, rawItems)
    const sortedItems = sortActivityItems(dedupeActivityItems(reconciled)).map((item) => ({
      ...item,
      isFromFollowing:
        normalizeValue(item.sourceUserId) !== normalizeValue(userId),
    }))

    const paginated = paginateItems(sortedItems, payload.cursor, pageSize)
    const enrichedItems = await enrichActivityItems(admin, paginated.items)

    return jsonResponse(200, {
      hasMore: paginated.hasMore,
      items: enrichedItems,
      nextCursor: paginated.nextCursor,
    })
  } catch (error) {
    const status = mapErrorToStatus(error)
    const message = normalizeValue((error as Error)?.message) || "account-activity-feed failed"

    if (status === 405) {
      return errorResponse(405, "Method not allowed")
    }

    return errorResponse(status, message)
  }
})

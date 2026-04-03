import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import {
  assertInternalAccess,
  assertMethod,
  assertResult,
  buildMediaItemKey,
  createAdminClient,
  errorResponse,
  jsonResponse,
  mapErrorToStatus,
  normalizeTimestamp,
  normalizeTrim,
  readJsonBody,
} from "../_internal/common.ts"

type ReviewsReadResource = "media" | "list"

type ReviewsReadRequest = {
  entityId?: string | null
  entityType?: string | null
  limitCount?: number | string | null
  listId?: string | null
  ownerId?: string | null
  resource?: ReviewsReadResource | string | null
}

const REVIEW_LIMIT = 120
const MEDIA_REVIEW_SELECT = [
  "content",
  "created_at",
  "is_spoiler",
  "media_key",
  "payload",
  "rating",
  "updated_at",
  "user_id",
].join(",")

const LIST_REVIEW_SELECT = [
  "content",
  "created_at",
  "is_spoiler",
  "list_id",
  "payload",
  "rating",
  "updated_at",
  "user_id",
].join(",")

function normalizeResource(value: unknown): ReviewsReadResource {
  const normalized = normalizeTrim(value).toLowerCase()

  if (normalized === "list") {
    return "list"
  }

  return "media"
}

function resolveLimitCount(value: unknown): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return REVIEW_LIMIT
  }

  return Math.max(1, Math.min(Math.floor(parsed), REVIEW_LIMIT))
}

function createListReviewLikeKey(ownerId: string, listId: string) {
  return `list:${ownerId}:${listId}`
}

function buildReviewDocPath(
  subject: {
    subjectId?: string | null
    subjectKey?: string | null
    subjectOwnerId?: string | null
    subjectType?: string | null
  } = {},
  userId: string | null
) {
  if (subject.subjectType === "list") {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`
  }

  return `media_items/${subject.subjectKey}/reviews/${userId}`
}

function normalizeReviewRow(
  row: Record<string, unknown> = {},
  subjectOverrides: Record<string, unknown> = {},
  likes: string[] = []
) {
  const payload = row.payload && typeof row.payload === "object"
    ? (row.payload as Record<string, unknown>)
    : {}
  const user = payload.user && typeof payload.user === "object"
    ? (payload.user as Record<string, unknown>)
    : {}

  const subject = {
    subjectHref: normalizeTrim(payload.subjectHref) || null,
    subjectId: normalizeTrim(payload.subjectId) || null,
    subjectKey: normalizeTrim(payload.subjectKey || row.media_key) || null,
    subjectOwnerId: normalizeTrim(payload.subjectOwnerId) || null,
    subjectOwnerUsername: normalizeTrim(payload.subjectOwnerUsername) || null,
    subjectPoster: normalizeTrim(payload.subjectPoster) || null,
    subjectSlug: normalizeTrim(payload.subjectSlug) || null,
    subjectTitle: normalizeTrim(payload.subjectTitle || payload.title) || "Untitled",
    subjectType: normalizeTrim(payload.subjectType) || null,
    ...subjectOverrides,
  }
  const reviewUserId = normalizeTrim(row.user_id || payload.authorId || user.id) || null
  const docPath = buildReviewDocPath(subject, reviewUserId)

  return {
    authorId: reviewUserId,
    content: normalizeTrim(row.content || payload.content) || "",
    createdAt: normalizeTimestamp(row.created_at),
    docPath,
    id: `${docPath}:${reviewUserId}`,
    isSpoiler: Boolean(row.is_spoiler || payload.isSpoiler),
    likes,
    mediaKey: normalizeTrim(row.media_key || subject.subjectKey) || null,
    rating:
      row.rating === null || row.rating === undefined
        ? payload.rating ?? null
        : Number(row.rating),
    reviewUserId,
    subjectHref: subject.subjectHref,
    subjectId: subject.subjectId,
    subjectKey: subject.subjectKey,
    subjectOwnerId: subject.subjectOwnerId,
    subjectOwnerUsername: subject.subjectOwnerUsername,
    subjectPoster: subject.subjectPoster,
    subjectSlug: subject.subjectSlug,
    subjectTitle: subject.subjectTitle,
    subjectType: subject.subjectType,
    updatedAt: normalizeTimestamp(row.updated_at),
    user: {
      avatarUrl: normalizeTrim(user.avatarUrl) || null,
      id: reviewUserId,
      name: normalizeTrim(user.name) || "Anonymous User",
      username: normalizeTrim(user.username) || null,
    },
  }
}

function buildLikesMap(rows: Record<string, unknown>[] = []) {
  const map = new Map<string, string[]>()

  rows.forEach((row) => {
    const key = `${normalizeTrim(row.media_key)}:${normalizeTrim(row.review_user_id)}`

    if (!key || key === ":") {
      return
    }

    const current = map.get(key) || []
    current.push(normalizeTrim(row.user_id))
    map.set(key, current.filter(Boolean))
  })

  return map
}

async function fetchReviewLikes(
  admin: ReturnType<typeof createAdminClient>,
  mediaKeys: string[] = []
): Promise<Map<string, string[]>> {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map()
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))]
  const likesRows: Record<string, unknown>[] = []

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100)
    const result = await admin
      .from("review_likes")
      .select("media_key,review_user_id,user_id")
      .in("media_key", chunk)

    assertResult(result, "Review likes could not be loaded")
    likesRows.push(...((result.data || []) as Record<string, unknown>[]))
  }

  return buildLikesMap(likesRows)
}

async function loadListSubject(
  admin: ReturnType<typeof createAdminClient>,
  {
    ownerId,
    listId,
  }: {
    ownerId: string
    listId: string
  }
) {
  const listResult = await admin
    .from("lists")
    .select("id,user_id,slug,title,poster_path,payload")
    .eq("id", listId)
    .eq("user_id", ownerId)
    .maybeSingle()

  assertResult(listResult, "List reviews could not be loaded")

  if (!listResult.data) {
    return {
      subjectHref: null,
      subjectId: listId,
      subjectKey: createListReviewLikeKey(ownerId, listId),
      subjectOwnerId: ownerId,
      subjectOwnerUsername: ownerId,
      subjectPoster: null,
      subjectSlug: listId,
      subjectTitle: "Untitled List",
      subjectType: "list",
    }
  }

  const payload =
    listResult.data.payload && typeof listResult.data.payload === "object"
      ? (listResult.data.payload as Record<string, unknown>)
      : {}
  const ownerSnapshot =
    payload.ownerSnapshot && typeof payload.ownerSnapshot === "object"
      ? (payload.ownerSnapshot as Record<string, unknown>)
      : {}
  const ownerUsername = normalizeTrim(ownerSnapshot.username || listResult.data.user_id || ownerId)
  const resolvedSlug = normalizeTrim(listResult.data.slug || listResult.data.id)

  return {
    subjectHref: `/account/${ownerUsername}/lists/${resolvedSlug}`,
    subjectId: normalizeTrim(listResult.data.id),
    subjectKey: createListReviewLikeKey(
      normalizeTrim(listResult.data.user_id),
      normalizeTrim(listResult.data.id)
    ),
    subjectOwnerId: normalizeTrim(listResult.data.user_id),
    subjectOwnerUsername: ownerUsername,
    subjectPoster: normalizeTrim(listResult.data.poster_path || payload.coverUrl) || null,
    subjectSlug: resolvedSlug,
    subjectTitle: normalizeTrim(listResult.data.title) || "Untitled List",
    subjectType: "list",
  }
}

async function getMediaReviews(
  admin: ReturnType<typeof createAdminClient>,
  {
    entityId,
    entityType,
    limitCount,
  }: {
    entityId: string
    entityType: string
    limitCount: number
  }
) {
  const mediaKey = buildMediaItemKey(entityType, entityId)

  if (!mediaKey) {
    return []
  }

  const result = await admin
    .from("media_reviews")
    .select(MEDIA_REVIEW_SELECT)
    .eq("media_key", mediaKey)
    .order("updated_at", { ascending: false })
    .limit(limitCount)

  assertResult(result, "Media reviews could not be loaded")

  const likesMap = await fetchReviewLikes(admin, [mediaKey])

  return (result.data || []).map((row) =>
    normalizeReviewRow(
      row as Record<string, unknown>,
      {},
      likesMap.get(`${mediaKey}:${normalizeTrim((row as Record<string, unknown>).user_id)}`) || []
    )
  )
}

async function getListReviews(
  admin: ReturnType<typeof createAdminClient>,
  {
    ownerId,
    listId,
    limitCount,
  }: {
    ownerId: string
    listId: string
    limitCount: number
  }
) {
  const subject = await loadListSubject(admin, { ownerId, listId })
  const result = await admin
    .from("list_reviews")
    .select(LIST_REVIEW_SELECT)
    .eq("list_id", listId)
    .order("updated_at", { ascending: false })
    .limit(limitCount)

  assertResult(result, "List reviews could not be loaded")

  const likesMap = await fetchReviewLikes(admin, [normalizeTrim(subject.subjectKey)])

  return (result.data || []).map((row) =>
    normalizeReviewRow(
      row as Record<string, unknown>,
      subject,
      likesMap.get(
        `${normalizeTrim(subject.subjectKey)}:${normalizeTrim((row as Record<string, unknown>).user_id)}`
      ) || []
    )
  )
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ["POST"])
    assertInternalAccess(request)

    const payload = await readJsonBody<ReviewsReadRequest>(request)
    const resource = normalizeResource(payload.resource)
    const admin = createAdminClient()
    const limitCount = resolveLimitCount(payload.limitCount)

    if (resource === "list") {
      const listId = normalizeTrim(payload.listId)
      const ownerId = normalizeTrim(payload.ownerId)

      if (!listId || !ownerId) {
        return jsonResponse(200, {
          data: [],
          ok: true,
          resource,
        })
      }

      const data = await getListReviews(admin, {
        limitCount,
        listId,
        ownerId,
      })

      return jsonResponse(200, {
        data,
        ok: true,
        resource,
      })
    }

    const entityId = normalizeTrim(payload.entityId)
    const entityType = normalizeTrim(payload.entityType)

    if (!entityId || !entityType) {
      return jsonResponse(200, {
        data: [],
        ok: true,
        resource,
      })
    }

    const data = await getMediaReviews(admin, {
      entityId,
      entityType,
      limitCount,
    })

    return jsonResponse(200, {
      data,
      ok: true,
      resource,
    })
  } catch (error) {
    return errorResponse(
      mapErrorToStatus(error),
      String((error as Error)?.message || "reviews-read failed")
    )
  }
})

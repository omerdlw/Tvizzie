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
  normalizeTrim,
  parseBoolean,
  readJsonBody,
  withQueryTimeout,
} from "../_internal/common.ts"

type SocialProofResource = "account" | "media"

type SocialProofReadRequest = {
  canViewPrivateContent?: boolean | string | null
  entityId?: string | null
  entityType?: string | null
  resource?: SocialProofResource | string | null
  targetUserId?: string | null
  viewerId?: string | null
}

const PREVIEW_LIMIT = 3
const SHARED_TITLES_LIMIT = 2
const FOLLOWING_SELECT = [
  "following_avatar_url",
  "following_display_name",
  "following_id",
  "following_username",
].join(",")

function normalizeResource(value: unknown): SocialProofResource {
  const normalized = normalizeTrim(value).toLowerCase()

  if (normalized === "account") {
    return "account"
  }

  return "media"
}

function createEmptyProofGroup() {
  return {
    count: 0,
    previewUsers: [],
    users: [],
  }
}

function createEmptyMediaSocialProof() {
  return {
    likes: createEmptyProofGroup(),
    reviews: createEmptyProofGroup(),
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

function normalizeSocialUser(user: Record<string, unknown> = {}) {
  const userId = normalizeTrim(user.id)

  if (!userId) {
    return null
  }

  return {
    avatarUrl: normalizeTrim(user.avatarUrl) || null,
    displayName:
      normalizeTrim(user.displayName || user.name || user.email || user.username) ||
      "User",
    id: userId,
    username: normalizeTrim(user.username) || null,
  }
}

function buildPreviewUsers(
  records: Array<{ user: Record<string, unknown> | null; userId: string }>,
  followProfileMap: Map<string, Record<string, unknown>>
) {
  const previews: Array<{ avatarUrl: string | null; displayName: string; id: string; username: string | null }> = []
  const seen = new Set<string>()

  records.forEach((record) => {
    const followProfile = followProfileMap.get(record.userId) || {}
    const normalized = normalizeSocialUser({
      ...(record.user || {}),
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

function buildUsers(
  records: Array<{ user: Record<string, unknown> | null; userId: string }>,
  followProfileMap: Map<string, Record<string, unknown>>
) {
  const users: Array<{ avatarUrl: string | null; displayName: string; id: string; username: string | null }> = []
  const seen = new Set<string>()

  records.forEach((record) => {
    const followProfile = followProfileMap.get(record.userId) || {}
    const normalized = normalizeSocialUser({
      ...(record.user || {}),
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

function buildProofGroup(
  recordsMap: Map<string, { user: Record<string, unknown> | null; userId: string }>,
  followProfileMap: Map<string, Record<string, unknown>>
) {
  const records = Array.from(recordsMap.values())

  return {
    count: records.length,
    previewUsers: buildPreviewUsers(records, followProfileMap),
    users: buildUsers(records, followProfileMap),
  }
}

async function getMediaSocialProofResource(
  admin: ReturnType<typeof createAdminClient>,
  {
    entityId,
    entityType,
    viewerId,
  }: {
    entityId: string
    entityType: string
    viewerId: string
  }
) {
  if (!viewerId || !entityId || !entityType) {
    return createEmptyMediaSocialProof()
  }

  const followingResult = await admin
    .from("follows")
    .select(FOLLOWING_SELECT)
    .eq("follower_id", viewerId)
    .eq("status", "accepted")

  assertResult(followingResult, "Following list could not be loaded")

  const followingRows = (followingResult.data || []) as Record<string, unknown>[]
  const followingIds = followingRows
    .map((row) => normalizeTrim(row.following_id))
    .filter(Boolean)

  if (followingIds.length === 0) {
    return createEmptyMediaSocialProof()
  }

  const followProfileMap = new Map<string, Record<string, unknown>>()

  followingRows.forEach((row) => {
    const followingId = normalizeTrim(row.following_id)

    if (!followingId) {
      return
    }

    followProfileMap.set(followingId, {
      avatarUrl: normalizeTrim(row.following_avatar_url) || null,
      displayName: normalizeTrim(row.following_display_name) || null,
      id: followingId,
      username: normalizeTrim(row.following_username) || null,
    })
  })

  const mediaKey = buildMediaItemKey(entityType, entityId)

  if (!mediaKey) {
    return createEmptyMediaSocialProof()
  }

  const [likesResult, watchlistResult, reviewsResult] = await Promise.all([
    admin
      .from("likes")
      .select("user_id")
      .eq("media_key", mediaKey)
      .in("user_id", followingIds),
    admin
      .from("watchlist")
      .select("user_id")
      .eq("media_key", mediaKey)
      .in("user_id", followingIds),
    admin
      .from("media_reviews")
      .select("user_id")
      .eq("media_key", mediaKey)
      .in("user_id", followingIds),
  ])

  assertResult(likesResult, "Media social proof could not be loaded")
  assertResult(watchlistResult, "Media social proof could not be loaded")
  assertResult(reviewsResult, "Media social proof could not be loaded")

  const categoryState = {
    likes: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
    reviews: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
    watchlist: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
  }

  ;(likesResult.data || []).forEach((row) => {
    const userId = normalizeTrim((row as Record<string, unknown>).user_id)

    if (!userId) {
      return
    }

    categoryState.likes.set(userId, {
      user: null,
      userId,
    })
  })

  ;(watchlistResult.data || []).forEach((row) => {
    const userId = normalizeTrim((row as Record<string, unknown>).user_id)

    if (!userId) {
      return
    }

    categoryState.watchlist.set(userId, {
      user: null,
      userId,
    })
  })

  ;(reviewsResult.data || []).forEach((row) => {
    const userId = normalizeTrim((row as Record<string, unknown>).user_id)

    if (!userId) {
      return
    }

    categoryState.reviews.set(userId, {
      user: null,
      userId,
    })
  })

  return {
    likes: buildProofGroup(categoryState.likes, followProfileMap),
    reviews: buildProofGroup(categoryState.reviews, followProfileMap),
    watchlist: buildProofGroup(categoryState.watchlist, followProfileMap),
  }
}

async function getAccountSocialProofResource(
  admin: ReturnType<typeof createAdminClient>,
  {
    canViewPrivateContent,
    targetUserId,
    viewerId,
  }: {
    canViewPrivateContent: boolean
    targetUserId: string
    viewerId: string
  }
) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return createEmptyProfileSocialProof()
  }

  if (!canViewPrivateContent) {
    return createEmptyProfileSocialProof()
  }

  const viewerFollowersResult = await withQueryTimeout(
    admin
      .from("follows")
      .select("follower_id")
      .eq("following_id", viewerId)
      .eq("status", "accepted"),
    {
      fallbackValue: { data: [], error: null },
      timeoutMs: 4000,
    }
  )

  if (viewerFollowersResult.timedOut) {
    return createEmptyProfileSocialProof()
  }

  assertResult(viewerFollowersResult, "Social proof could not be loaded")

  const viewerFollowerIds = (viewerFollowersResult.data || [])
    .map((row) => normalizeTrim((row as Record<string, unknown>).follower_id))
    .filter(Boolean)

  let mutualFollowersCount = 0

  if (viewerFollowerIds.length > 0) {
    const mutualFollowersResult = await withQueryTimeout(
      admin
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", targetUserId)
        .eq("status", "accepted")
        .in("follower_id", viewerFollowerIds.slice(0, 1000)),
      {
        fallbackValue: { data: [], count: 0, error: null },
        timeoutMs: 3000,
      }
    )

    if (!mutualFollowersResult.timedOut) {
      assertResult(mutualFollowersResult, "Social proof could not be loaded")
      mutualFollowersCount = Number(mutualFollowersResult.count || 0)
    }
  }

  const viewerLikesResult = await withQueryTimeout(
    admin
      .from("likes")
      .select("media_key,title")
      .eq("user_id", viewerId),
    {
      fallbackValue: { data: [], error: null },
      timeoutMs: 4000,
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

  assertResult(viewerLikesResult, "Social proof could not be loaded")

  const viewerLikesKeys = (viewerLikesResult.data || [])
    .map((row) => normalizeTrim((row as Record<string, unknown>).media_key))
    .filter(Boolean)

  let sharedCount = 0
  let sharedTitles: string[] = []

  if (viewerLikesKeys.length > 0) {
    const sharedLikesResult = await withQueryTimeout(
      admin
        .from("likes")
        .select("media_key,title", { count: "exact" })
        .eq("user_id", targetUserId)
        .in("media_key", viewerLikesKeys.slice(0, 1000)),
      {
        fallbackValue: { data: [], count: 0, error: null },
        timeoutMs: 3000,
      }
    )

    if (!sharedLikesResult.timedOut) {
      assertResult(sharedLikesResult, "Social proof could not be loaded")
      sharedCount = Number(sharedLikesResult.count || 0)
      sharedTitles = (sharedLikesResult.data || [])
        .map((item) => normalizeTrim((item as Record<string, unknown>).title))
        .filter(Boolean)
        .slice(0, SHARED_TITLES_LIMIT)
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

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ["POST"])
    assertInternalAccess(request)

    const payload = await readJsonBody<SocialProofReadRequest>(request)
    const resource = normalizeResource(payload.resource)
    const admin = createAdminClient()

    if (resource === "account") {
      const data = await getAccountSocialProofResource(admin, {
        canViewPrivateContent: parseBoolean(payload.canViewPrivateContent, false),
        targetUserId: normalizeTrim(payload.targetUserId),
        viewerId: normalizeTrim(payload.viewerId),
      })

      return jsonResponse(200, {
        data,
        ok: true,
        resource,
      })
    }

    const data = await getMediaSocialProofResource(admin, {
      entityId: normalizeTrim(payload.entityId),
      entityType: normalizeTrim(payload.entityType),
      viewerId: normalizeTrim(payload.viewerId),
    })

    return jsonResponse(200, {
      data,
      ok: true,
      resource,
    })
  } catch (error) {
    return errorResponse(
      mapErrorToStatus(error),
      String((error as Error)?.message || "social-proof-read failed")
    )
  }
})

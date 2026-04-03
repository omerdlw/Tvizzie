import {
  cleanString,
  isValidHttpUrl,
  normalizeEmail,
  normalizeValue,
} from "./normalize.ts"

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 24
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/

function normalizeReservedSegments(value: unknown): Set<string> {
  return new Set(
    String(value || "")
      .split(",")
      .map((segment) => normalizeValue(segment).toLowerCase())
      .filter(Boolean)
  )
}

const RESERVED_SEGMENTS = normalizeReservedSegments(
  Deno.env.get("ACCOUNT_RESERVED_SEGMENTS") ||
    "account,edit,lists,watchlist,watched,reviews,likes,activity,sign-in,sign-up,api"
)

export function buildUsernameCandidate(value: unknown) {
  const turkishMap: Record<string, string> = {
    "\u00e7": "c",
    "\u011f": "g",
    "\u0131": "i",
    "\u00f6": "o",
    "\u015f": "s",
    "\u00fc": "u",
  }

  const normalized = cleanString(value)
    .toLowerCase()
    .replace(/[\u00e7\u011f\u0131\u015f\u00fc\u00f6]/g, (char) => turkishMap[char] || char)

  return normalized
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
}

export function validateUsername(value: unknown) {
  const username = buildUsernameCandidate(value)

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`
    )
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Username can only contain lowercase letters, numbers, and hyphens"
    )
  }

  if (RESERVED_SEGMENTS.has(username)) {
    throw new Error("This username is reserved")
  }

  return username
}

export function buildAvailableUsername(base: string, attempt = 0) {
  if (attempt <= 0) {
    return base
  }

  const suffix = String(attempt + 1)
  const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length - 1
  const trimmedBase = base.slice(0, Math.max(USERNAME_MIN_LENGTH, maxBaseLength))

  return `${trimmedBase}_${suffix}`
}

export function getDefaultUsernameBase({
  displayName,
  email,
  userId,
}: {
  displayName?: unknown
  email?: unknown
  userId?: unknown
}) {
  const localEmail = normalizeEmail(email).split("@")[0] || ""
  const seed =
    buildUsernameCandidate(displayName) ||
    buildUsernameCandidate(localEmail) ||
    buildUsernameCandidate(normalizeValue(userId).slice(0, 12)) ||
    "tvizzie-user"

  const normalized = seed.slice(0, USERNAME_MAX_LENGTH)
  return validateUsername(normalized)
}

export function normalizeOptionalUrl(value: unknown) {
  const normalized = cleanString(value)

  if (!normalized) {
    return null
  }

  if (!isValidHttpUrl(normalized)) {
    throw new Error("Image URLs must start with http:// or https://")
  }

  return normalized
}

export function normalizeProfileResponse(profile: Record<string, unknown> | null, counters?: Record<string, unknown> | null) {
  if (!profile) {
    return null
  }

  const toCount = (value: unknown, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback
  }

  return {
    id: normalizeValue(profile.id) || null,
    username: normalizeValue(profile.username) || null,
    usernameLower: normalizeValue(profile.username_lower) || null,
    displayName: normalizeValue(profile.display_name) || "Anonymous User",
    displayNameLower: normalizeValue(profile.display_name_lower) || null,
    avatarUrl: normalizeValue(profile.avatar_url) || null,
    bannerUrl: normalizeValue(profile.banner_url) || null,
    description: normalizeValue(profile.description) || "",
    email: normalizeEmail(profile.email) || null,
    isPrivate: profile.is_private === true,
    favoriteShowcase: Array.isArray(profile.favorite_showcase)
      ? profile.favorite_showcase
      : [],
    followerCount: toCount(counters?.follower_count),
    followingCount: toCount(counters?.following_count),
    likesCount: toCount(counters?.likes_count),
    listsCount: toCount(counters?.lists_count),
    watchedCount: toCount(counters?.watched_count),
    watchlistCount: toCount(counters?.watchlist_count),
    createdAt: normalizeValue(profile.created_at) || null,
    updatedAt: normalizeValue(profile.updated_at) || null,
    lastActivityAt: normalizeValue(profile.last_activity_at) || null,
  }
}

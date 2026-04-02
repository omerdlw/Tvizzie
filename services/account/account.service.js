'use client'

import { isReservedAccountSegment } from '@/lib/account/route-segments'
import { isValidUrl } from '@/lib/utils'
import { isMovieMediaType } from '@/lib/media'
import { cleanString, normalizeTimestamp } from '@/services/core/data-utils'
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  primePollingSubscription,
} from '@/services/core/polling-subscription.service'
import {
  assertSupabaseResult,
  getSupabaseClient,
  normalizeSupabaseError,
  toIsoTimestamp,
} from '@/services/core/supabase-data.service'
import { requestApiJson } from '@/services/core/api-request.service'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 24
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/

function normalizeOptionalUrl(value) {
  const normalized = cleanString(value)

  if (!normalized) return null
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://')
  }

  return normalized
}

function buildUsernameCandidate(value) {
  const turkishMap = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  }

  const normalized = cleanString(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => turkishMap[char] || char)

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
}

function createUserIdentity(user = {}) {
  return {
    avatarUrl: user.avatarUrl || user.photoURL || null,
    displayName:
      user.displayName || user.name || user.email || 'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  }
}

function normalizeDisplayNameSearchValue(value) {
  return cleanString(value).toLocaleLowerCase()
}

function buildAvailableUsername(base, attempt = 0) {
  if (attempt === 0) {
    return base
  }

  const suffix = String(attempt + 1)
  const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length - 1
  const trimmedBase = base.slice(
    0,
    Math.max(USERNAME_MIN_LENGTH, maxBaseLength)
  )

  return `${trimmedBase}_${suffix}`
}

function getDefaultUsernameBase(user = {}) {
  const identity = createUserIdentity(user)

  const base =
    buildUsernameCandidate(identity.displayName) ||
    buildUsernameCandidate(identity.email?.split('@')[0]) ||
    buildUsernameCandidate(identity.id?.slice(0, 12)) ||
    'tvizzie-user'

  return base.slice(0, USERNAME_MAX_LENGTH)
}

function normalizeAccountData(data = {}, id = null) {
  const displayName = data.display_name || data.displayName || 'Anonymous User'

  return {
    avatarUrl: data.avatar_url || data.avatarUrl || null,
    bannerUrl: data.banner_url || data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.created_at || data.createdAt),
    description: data.description || '',
    displayName,
    displayNameLower:
      data.display_name_lower ||
      data.displayNameLower ||
      normalizeDisplayNameSearchValue(displayName),
    email: data.email || null,
    followerCount: Number.isFinite(
      Number(data.follower_count ?? data.followerCount)
    )
      ? Number(data.follower_count ?? data.followerCount)
      : 0,
    favoriteShowcase: Array.isArray(data.favorite_showcase)
      ? data.favorite_showcase
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
              item.entityId &&
              item.entityType &&
              isMovieMediaType(item.entityType)
          )
      : [],
    id: id || data.id || null,
    isPrivate: data.is_private === true || data.isPrivate === true,
    lastActivityAt: normalizeTimestamp(data.last_activity_at || data.lastActivityAt),
    followingCount: Number.isFinite(
      Number(data.following_count ?? data.followingCount)
    )
      ? Number(data.following_count ?? data.followingCount)
      : 0,
    updatedAt: normalizeTimestamp(data.updated_at || data.updatedAt),
    watchedCount: Number.isFinite(Number(data.watched_count ?? data.watchedCount))
      ? Number(data.watched_count ?? data.watchedCount)
      : 0,
    username: data.username || null,
    usernameLower:
      data.username_lower ||
      data.usernameLower ||
      (data.username ? String(data.username).toLowerCase() : null),
  }
}

async function claimUsernameForProfile({
  avatarUrl = null,
  displayName,
  email = null,
  failIfProfileHasUsername = false,
  preserveExisting = false,
  userId,
  username,
}) {
  const client = getSupabaseClient()
  const { error } = await client.rpc('claim_username', {
    p_avatar_url: avatarUrl,
    p_display_name: displayName,
    p_email: email,
    p_fail_if_profile_has_username: failIfProfileHasUsername,
    p_preserve_existing: preserveExisting,
    p_user_id: userId,
    p_username: username,
  })

  if (error) {
    throw normalizeSupabaseError(error, 'Username could not be claimed')
  }
}

async function promotePendingFollowersToAccepted(userId) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc(
    'promote_pending_followers_to_accepted',
    {
      p_user_id: userId,
    }
  )

  if (error) {
    throw normalizeSupabaseError(error, 'Pending followers could not be promoted')
  }

  return Number(data) || 0
}

export function sanitizeUsername(value) {
  return buildUsernameCandidate(value)
}

export function validateUsername(value) {
  const username = sanitizeUsername(value)

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`
    )
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'Username can only contain lowercase letters, numbers, and hyphens'
    )
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved')
  }

  return username
}

export function normalizeAccountSnapshot(snapshot) {
  if (!snapshot) {
    return null
  }

  return normalizeAccountData(snapshot, snapshot.id || null)
}

export async function getUserAccount(userId) {
  if (!userId) {
    return null
  }

  const payload = await requestApiJson('/api/account/profile', {
    query: {
      userId,
    },
  })

  return payload?.profile || null
}

export async function getUserIdByUsername(username) {
  const normalizedUsername = validateUsername(username)
  const payload = await requestApiJson('/api/account/resolve', {
    query: {
      username: normalizedUsername,
    },
  })

  return payload?.userId || null
}

export async function getUserAccountByUsername(username) {
  const normalizedUsername = validateUsername(username)
  const payload = await requestApiJson('/api/account/profile', {
    query: {
      username: normalizedUsername,
    },
  })

  return payload?.profile || null
}

export async function searchUserAccounts(searchTerm, options = {}) {
  const rawSearchTerm = cleanString(searchTerm)

  if (!rawSearchTerm) {
    return []
  }

  const payload = await requestApiJson('/api/account/search', {
    query: {
      limitCount: options.limitCount ?? null,
      searchTerm: rawSearchTerm,
    },
  })

  return Array.isArray(payload?.items) ? payload.items : []
}

export function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', {
    userId,
  })
}

export function primeUserAccount(userId, profile) {
  if (!userId || !profile) {
    return
  }

  primePollingSubscription(getUserAccountSubscriptionKey(userId), profile, {
    emit: false,
  })
}

export function subscribeToUserAccount(userId, callback, options = {}) {
  return createPollingSubscription(
    () => getUserAccount(userId),
    callback,
    {
      ...options,
      subscriptionKey: getUserAccountSubscriptionKey(userId),
    }
  )
}

export async function ensureUserAccount(user = {}, options = {}) {
  const identity = createUserIdentity(user)
  const preferredDisplayName = cleanString(options.displayName)
  const preferredUsername = options.username
    ? validateUsername(options.username)
    : null

  if (!identity.id) {
    throw new Error('Authenticated user is required to bootstrap an account')
  }

  const existingProfile = await getUserAccount(identity.id)
  const syncedDisplayName =
    preferredDisplayName || existingProfile?.displayName || identity.displayName
  const syncedAvatarUrl = existingProfile?.avatarUrl || identity.avatarUrl || null
  const syncedEmail = existingProfile?.email || identity.email || null
  const syncedDisplayNameLower = normalizeDisplayNameSearchValue(
    syncedDisplayName
  )
  const shouldSyncExistingProfile = Boolean(
    existingProfile &&
      (
        existingProfile.avatarUrl !== syncedAvatarUrl ||
        existingProfile.displayName !== syncedDisplayName ||
        existingProfile.displayNameLower !== syncedDisplayNameLower ||
        existingProfile.email !== syncedEmail
      )
  )

  if (preferredUsername) {
    if (
      existingProfile?.username === preferredUsername &&
      !shouldSyncExistingProfile
    ) {
      return existingProfile
    }

    await claimUsernameForProfile({
      avatarUrl: syncedAvatarUrl,
      displayName: syncedDisplayName,
      email: syncedEmail,
      preserveExisting: false,
      userId: identity.id,
      username: preferredUsername,
    })

    const nextProfile = await getUserAccount(identity.id)
    primeUserAccount(identity.id, nextProfile)
    return nextProfile
  }

  if (existingProfile?.username) {
    if (!shouldSyncExistingProfile) {
      primeUserAccount(identity.id, existingProfile)
      return existingProfile
    }

    const client = getSupabaseClient()
    const usernamesResult = await client
      .from('usernames')
      .upsert(
        {
          created_at: toIsoTimestamp(existingProfile.createdAt) || undefined,
          updated_at: new Date().toISOString(),
          user_id: identity.id,
          username: existingProfile.username,
          username_lower:
            existingProfile.usernameLower || existingProfile.username,
        },
        { onConflict: 'user_id' }
      )

    assertSupabaseResult(usernamesResult, 'Username mapping could not be synced')

    const profilePatch = {
      avatar_url: syncedAvatarUrl,
      display_name: syncedDisplayName,
      display_name_lower: syncedDisplayNameLower,
      email: syncedEmail,
      is_private: existingProfile.isPrivate === true,
      last_activity_at: toIsoTimestamp(existingProfile.lastActivityAt),
      updated_at: new Date().toISOString(),
      watched_count: Number(existingProfile.watchedCount || 0),
    }

    const profileResult = await client
      .from('profiles')
      .update(profilePatch)
      .eq('id', identity.id)

    assertSupabaseResult(profileResult, 'Profile could not be synced')
    const nextProfile = await getUserAccount(identity.id)
    primeUserAccount(identity.id, nextProfile)
    return nextProfile
  }

  const baseUsername = validateUsername(getDefaultUsernameBase(identity))

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = buildAvailableUsername(baseUsername, attempt)

    try {
      await claimUsernameForProfile({
        avatarUrl: identity.avatarUrl,
        displayName: preferredDisplayName || identity.displayName,
        email: identity.email,
        failIfProfileHasUsername: true,
        preserveExisting: true,
        userId: identity.id,
        username: candidate,
      })

      const nextProfile = await getUserAccount(identity.id)
      primeUserAccount(identity.id, nextProfile)
      return nextProfile
    } catch (error) {
      const message = String(error?.message || '')

      if (
        message.includes('USERNAME_TAKEN') ||
        message.includes('duplicate key value')
      ) {
        continue
      }

      if (message.includes('PROFILE_USERNAME_EXISTS')) {
        const nextProfile = await getUserAccount(identity.id)
        primeUserAccount(identity.id, nextProfile)
        return nextProfile
      }

      throw error
    }
  }

  throw new Error('Could not generate an available username for this account')
}

export async function updateUserAccount({ userId, updates = {} }) {
  if (!userId) {
    throw new Error('Authenticated user is required to update the account')
  }

  const currentProfile = await getUserAccount(userId)

  if (!currentProfile) {
    throw new Error('Profile does not exist yet. Please sign in again')
  }

  const nextUsername =
    updates.username !== undefined
      ? validateUsername(updates.username)
      : currentProfile.username
  const nextDisplayName =
    updates.displayName !== undefined
      ? cleanString(updates.displayName) || 'Anonymous User'
      : currentProfile.displayName
  const shouldPromotePendingFollowers =
    currentProfile.isPrivate === true && Boolean(updates.isPrivate) === false

  await claimUsernameForProfile({
    avatarUrl:
      updates.avatarUrl !== undefined
        ? normalizeOptionalUrl(updates.avatarUrl)
        : currentProfile.avatarUrl,
    displayName: nextDisplayName,
    email: currentProfile.email || null,
    preserveExisting: false,
    userId,
    username: nextUsername,
  })

  const client = getSupabaseClient()
  const profileResult = await client
    .from('profiles')
    .update({
      avatar_url:
        updates.avatarUrl !== undefined
          ? normalizeOptionalUrl(updates.avatarUrl)
          : currentProfile.avatarUrl,
      banner_url:
        updates.bannerUrl !== undefined
          ? normalizeOptionalUrl(updates.bannerUrl)
          : currentProfile.bannerUrl,
      description:
        updates.description !== undefined
          ? cleanString(updates.description)
          : currentProfile.description,
      display_name: nextDisplayName,
      display_name_lower: normalizeDisplayNameSearchValue(nextDisplayName),
      email: currentProfile.email || null,
      is_private:
        updates.isPrivate !== undefined
          ? Boolean(updates.isPrivate)
          : currentProfile.isPrivate === true,
      updated_at: new Date().toISOString(),
      username: nextUsername,
      username_lower: nextUsername,
    })
    .eq('id', userId)

  assertSupabaseResult(profileResult, 'Account update failed')

  if (shouldPromotePendingFollowers) {
    try {
      await promotePendingFollowersToAccepted(userId)
    } catch (error) {
      console.error(
        '[Account] Pending follower auto-accept failed after privacy update:',
        error
      )
    }
  }

  const nextProfile = await getUserAccount(userId)
  primeUserAccount(userId, nextProfile)
  return nextProfile
}

export async function deleteUsernameMapping(username) {
  if (!username) return

  const normalized = validateUsername(username)
  const client = getSupabaseClient()
  const result = await client
    .from('usernames')
    .delete()
    .eq('username_lower', normalized)

  assertSupabaseResult(result, 'Username mapping could not be deleted')
}

export async function syncUserAccountEmail({ userId, email }) {
  if (!userId) {
    throw new Error('Authenticated user is required to sync email')
  }

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address')
  }

  const client = getSupabaseClient()
  const result = await client
    .from('profiles')
    .update({
      email: normalizedEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  assertSupabaseResult(result, 'Email could not be synced')
  const nextProfile = await getUserAccount(userId)
  primeUserAccount(userId, nextProfile)
  return nextProfile
}

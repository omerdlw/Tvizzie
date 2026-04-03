'use client'

import { isReservedAccountSegment } from '@/features/account/route-segments'
import { isValidUrl } from '@/core/utils'
import { isMovieMediaType } from '@/core/utils/media'
import { cleanString, normalizeTimestamp } from '@/core/services/shared/data-utils'
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  primePollingSubscription,
} from '@/core/services/shared/polling-subscription.service'
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/core/services/shared/supabase-data.service'
import { requestApiJson } from '@/core/services/shared/api-request.service'

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
  const preferredDisplayName = cleanString(options.displayName) || null
  const preferredUsername =
    options.username !== undefined && options.username !== null
      ? validateUsername(options.username)
      : null

  if (!identity.id) {
    throw new Error('Authenticated user is required to bootstrap an account')
  }

  const payload = await requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'ensure',
      avatarUrl: identity.avatarUrl
        ? normalizeOptionalUrl(identity.avatarUrl)
        : null,
      displayName: preferredDisplayName || identity.displayName,
      email: identity.email || null,
      userId: identity.id,
      username: preferredUsername,
    },
  })
  const profile = normalizeAccountSnapshot(payload?.profile)

  if (!profile) {
    throw new Error('Could not generate an available username for this account')
  }

  primeUserAccount(identity.id, profile)
  return profile
}

export async function updateUserAccount({ userId, updates = {} }) {
  if (!userId) {
    throw new Error('Authenticated user is required to update the account')
  }

  const payload = await requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'update',
      avatarUrl:
        updates.avatarUrl !== undefined
          ? normalizeOptionalUrl(updates.avatarUrl)
          : undefined,
      bannerUrl:
        updates.bannerUrl !== undefined
          ? normalizeOptionalUrl(updates.bannerUrl)
          : undefined,
      description:
        updates.description !== undefined
          ? cleanString(updates.description)
          : undefined,
      displayName:
        updates.displayName !== undefined
          ? cleanString(updates.displayName) || 'Anonymous User'
          : undefined,
      isPrivate:
        updates.isPrivate !== undefined ? Boolean(updates.isPrivate) : undefined,
      userId,
      username:
        updates.username !== undefined
          ? validateUsername(updates.username)
          : undefined,
    },
  })
  const profile = normalizeAccountSnapshot(payload?.profile)

  if (!profile) {
    throw new Error('Account update failed')
  }

  primeUserAccount(userId, profile)
  return profile
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

  const payload = await requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'sync-email',
      email: normalizedEmail,
      userId,
    },
  })
  const profile = normalizeAccountSnapshot(payload?.profile)

  if (!profile) {
    throw new Error('Email could not be synced')
  }

  primeUserAccount(userId, profile)
  return profile
}

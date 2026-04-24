'use client';

import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';
import { normalizeAccountDisplayNameSearchValue, validateUsername } from '@/core/utils/account';
import { isValidUrl } from '@/core/utils';
import { cleanString, normalizeTimestamp } from '@/core/utils';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  primePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';
import { normalizeFavoriteShowcaseItems } from '@/core/services/shared/supabase-media-utils.service';
export { sanitizeUsername, validateUsername } from '@/core/utils/account';

const ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 2500;
const ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 8000;
const ACCOUNT_RESOLVE_CACHE_TTL_MS = 5 * 60 * 1000;
const accountResolveRequestCache = new Map();

function normalizeOptionalUrl(value) {
  const normalized = cleanString(value);

  if (!normalized) return null;
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://');
  }

  return normalized;
}

function createUserIdentity(user = {}) {
  return {
    avatarUrl: user.avatarUrl || user.photoURL || null,
    displayName: user.displayName || user.name || user.email || 'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  };
}

function normalizeAccountData(data = {}, id = null) {
  const displayName = data.display_name || data.displayName || 'Anonymous User';

  return {
    avatarUrl: data.avatar_url || data.avatarUrl || null,
    bannerUrl: data.banner_url || data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.created_at || data.createdAt),
    description: data.description || '',
    displayName,
    displayNameLower:
      data.display_name_lower || data.displayNameLower || normalizeAccountDisplayNameSearchValue(displayName),
    email: data.email || null,
    followerCount: Number.isFinite(Number(data.follower_count ?? data.followerCount))
      ? Number(data.follower_count ?? data.followerCount)
      : 0,
    favoriteShowcase: normalizeFavoriteShowcaseItems(data.favorite_showcase),
    id: id || data.id || null,
    isPrivate: data.is_private === true || data.isPrivate === true,
    lastActivityAt: normalizeTimestamp(data.last_activity_at || data.lastActivityAt),
    followingCount: Number.isFinite(Number(data.following_count ?? data.followingCount))
      ? Number(data.following_count ?? data.followingCount)
      : 0,
    updatedAt: normalizeTimestamp(data.updated_at || data.updatedAt),
    watchedCount: Number.isFinite(Number(data.watched_count ?? data.watchedCount))
      ? Number(data.watched_count ?? data.watchedCount)
      : 0,
    username: data.username || null,
    usernameLower:
      data.username_lower || data.usernameLower || (data.username ? String(data.username).toLowerCase() : null),
  };
}

export function normalizeAccountSnapshot(snapshot) {
  if (!snapshot) {
    return null;
  }

  return normalizeAccountData(snapshot, snapshot.id || null);
}

export async function getUserAccount(userId) {
  if (!userId) {
    return null;
  }

  const payload = await requestApiJson('/api/account/profile', {
    query: {
      userId,
    },
  });

  return payload?.profile || null;
}

export async function getUserIdByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const now = Date.now();
  const cachedEntry = accountResolveRequestCache.get(normalizedUsername);

  if (cachedEntry?.value !== undefined && (cachedEntry?.expiresAt || 0) > now) {
    return cachedEntry.value;
  }

  if (cachedEntry?.inFlightPromise) {
    return cachedEntry.inFlightPromise;
  }

  const inFlightPromise = Promise.resolve()
    .then(() =>
      requestApiJson('/api/account/resolve', {
        query: {
          username: normalizedUsername,
        },
      })
    )
    .then((payload) => {
      const userId = payload?.userId || null;

      accountResolveRequestCache.set(normalizedUsername, {
        expiresAt: Date.now() + ACCOUNT_RESOLVE_CACHE_TTL_MS,
        inFlightPromise: null,
        value: userId,
      });

      return userId;
    })
    .catch((error) => {
      accountResolveRequestCache.delete(normalizedUsername);
      throw error;
    });

  accountResolveRequestCache.set(normalizedUsername, {
    expiresAt: now + ACCOUNT_RESOLVE_CACHE_TTL_MS,
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}

export async function getUserAccountByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const payload = await requestApiJson('/api/account/profile', {
    query: {
      username: normalizedUsername,
    },
  });

  return payload?.profile || null;
}

export async function searchUserAccounts(searchTerm, options = {}) {
  const rawSearchTerm = cleanString(searchTerm);

  if (!rawSearchTerm) {
    return [];
  }

  const payload = await requestApiJson('/api/account/search', {
    query: {
      limitCount: options.limitCount ?? null,
      searchTerm: rawSearchTerm,
    },
  });

  return Array.isArray(payload?.items) ? payload.items : [];
}

export function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', {
    userId,
  });
}

export function primeUserAccount(userId, profile) {
  if (!userId || !profile) {
    return;
  }

  primePollingSubscription(getUserAccountSubscriptionKey(userId), profile, {
    emit: false,
  });
}

export function subscribeToUserAccount(userId, callback, options = {}) {
  return createPollingSubscription(() => getUserAccount(userId), callback, {
    ...options,
    hiddenIntervalMs: options.hiddenIntervalMs ?? ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
    intervalMs: options.intervalMs ?? ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
    subscriptionKey: getUserAccountSubscriptionKey(userId),
  });
}

export async function ensureUserAccount(user = {}, options = {}) {
  const identity = createUserIdentity(user);
  const preferredDisplayName = cleanString(options.displayName) || null;
  const preferredUsername =
    options.username !== undefined && options.username !== null ? validateUsername(options.username) : null;

  if (!identity.id) {
    throw new Error('Authenticated user is required to bootstrap an account');
  }

  const existingProfile = await getUserAccount(identity.id).catch(() => null);

  if (existingProfile?.id) {
    const normalizedExistingProfile = normalizeAccountSnapshot(existingProfile);

    if (normalizedExistingProfile) {
      primeUserAccount(identity.id, normalizedExistingProfile);
      return normalizedExistingProfile;
    }
  }

  const payload = await requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'ensure',
      avatarUrl: identity.avatarUrl ? normalizeOptionalUrl(identity.avatarUrl) : null,
      displayName: preferredDisplayName || identity.displayName,
      email: identity.email || null,
      userId: identity.id,
      username: preferredUsername,
    },
  });
  const profile = normalizeAccountSnapshot(payload?.profile);

  if (!profile) {
    throw new Error('Could not generate an available username for this account');
  }

  primeUserAccount(identity.id, profile);
  return profile;
}

export async function updateUserAccount({ userId, updates = {} }) {
  if (!userId) {
    throw new Error('Authenticated user is required to update the account');
  }

  const payload = await requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'update',
      avatarUrl: updates.avatarUrl !== undefined ? normalizeOptionalUrl(updates.avatarUrl) : undefined,
      bannerUrl: updates.bannerUrl !== undefined ? normalizeOptionalUrl(updates.bannerUrl) : undefined,
      description: updates.description !== undefined ? cleanString(updates.description) : undefined,
      displayName: updates.displayName !== undefined ? cleanString(updates.displayName) || 'Anonymous User' : undefined,
      isPrivate: updates.isPrivate !== undefined ? Boolean(updates.isPrivate) : undefined,
      userId,
      username: updates.username !== undefined ? validateUsername(updates.username) : undefined,
    },
  });
  const profile = normalizeAccountSnapshot(payload?.profile);

  if (!profile) {
    throw new Error('Account update failed');
  }

  primeUserAccount(userId, profile);
  return profile;
}

function normalizeMediaTarget(value) {
  const normalized = cleanString(value).toLowerCase();

  if (normalized === 'avatar') {
    return 'avatar';
  }

  if (normalized === 'logo' || normalized === 'banner') {
    return 'banner';
  }

  throw new Error('Media target must be avatar or logo');
}

export async function uploadAccountMediaFile({ file, target = 'avatar' }) {
  if (!file || typeof file !== 'object') {
    throw new Error('Select an image file');
  }

  const normalizedTarget = normalizeMediaTarget(target);
  const formData = new FormData();

  formData.set('target', normalizedTarget);
  formData.set('file', file);

  const response = await fetch('/api/account/media', {
    method: 'POST',
    credentials: 'include',
    headers: createCsrfHeaders(),
    body: formData,
  });

  const payload = await response.json().catch(() => ({ error: 'Image upload failed' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Image upload failed');
  }

  const url = cleanString(payload?.url);

  if (!url) {
    throw new Error('Image upload returned an invalid URL');
  }

  return {
    bucket: cleanString(payload?.bucket) || null,
    path: cleanString(payload?.path) || null,
    url,
  };
}

export async function deleteUsernameMapping(username) {
  if (!username) return;

  const normalized = validateUsername(username);
  const client = getSupabaseClient();
  const result = await client.from('usernames').delete().eq('username_lower', normalized);

  assertSupabaseResult(result, 'Username mapping could not be deleted');
}

export async function syncUserAccountEmail({ userId, email }) {
  if (!userId) {
    throw new Error('Authenticated user is required to sync email');
  }

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const payload = await requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'sync-email',
      email: normalizedEmail,
      userId,
    },
  });
  const profile = normalizeAccountSnapshot(payload?.profile);

  if (!profile) {
    throw new Error('Email could not be synced');
  }

  primeUserAccount(userId, profile);
  return profile;
}

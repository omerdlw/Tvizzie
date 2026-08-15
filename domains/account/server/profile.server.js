import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { invokeInternalEdgeFunction } from '@/infrastructure/http/http-server';
import { cleanString, normalizeTimestamp } from '@/shared/utils';
import { normalizeFavoriteShowcaseItems } from '@/domains/media/shared/media';
import {
  ACCOUNT_PROFILE_SELECT,
  ACCOUNT_READ_FUNCTION,
  COUNTER_SELECT,
  EMPTY_EDITABLE_ACCOUNT_COUNTS,
  FOLLOW_COUNTS_TIMEOUT_MS,
  FOLLOW_STATUS_ACCEPTED,
  PROFILE_COUNTERS_TIMEOUT_MS,
  assertResult,
  isValidUuid,
} from '@/domains/account/utils';

// ============================================================
// Profile Normalizers & Data Transforms
// ============================================================

export function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeCount(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function normalizeAccountData(
  data = {},
  id = null,
  { includeEmail = false, includePrivateDetails = false } = {},
) {
  const displayName = data.display_name || data.displayName || 'Anonymous User';
  const isPrivate = data.is_private === true || data.isPrivate === true;
  const canIncludePrivateDetails = !isPrivate || includePrivateDetails;
  const favoriteShowcaseRaw =
    Array.isArray(data.favorite_showcase) && data.favorite_showcase.length > 0
      ? data.favorite_showcase
      : Array.isArray(data.favoriteShowcase)
        ? data.favoriteShowcase
        : [];

  return {
    avatarUrl: data.avatar_url || data.avatarUrl || null,
    bannerUrl: data.banner_url || data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.created_at || data.createdAt),
    description: data.description || '',
    displayName,
    displayNameLower:
      data.display_name_lower || data.displayNameLower || String(displayName).toLowerCase(),
    id: id || data.id || null,
    isPrivate,
    followerCount: normalizeCount(data.follower_count ?? data.followerCount, 0),
    followingCount: normalizeCount(data.following_count ?? data.followingCount, 0),
    updatedAt: normalizeTimestamp(data.updated_at || data.updatedAt),
    username: data.username || null,
    usernameLower:
      data.username_lower ||
      data.usernameLower ||
      (data.username ? String(data.username).toLowerCase() : null),
    ...(includeEmail ? { email: data.email || null } : {}),
    ...(canIncludePrivateDetails
      ? {
          favoriteShowcase: normalizeFavoriteShowcaseItems(favoriteShowcaseRaw),
          lastActivityAt: normalizeTimestamp(data.last_activity_at || data.lastActivityAt),
          likesCount: normalizeCount(data.likes_count ?? data.likesCount, 0),
          listsCount: normalizeCount(data.lists_count ?? data.listsCount, 0),
          watchedCount: normalizeCount(data.watched_count ?? data.watchedCount, 0),
          watchlistCount: normalizeCount(data.watchlist_count ?? data.watchlistCount, 0),
        }
      : {
          favoriteShowcase: [],
          lastActivityAt: null,
          likesCount: 0,
          listsCount: 0,
          watchedCount: 0,
          watchlistCount: 0,
        }),
  };
}

async function resolveWithTimeout(operation, timeoutMs) {
  let timer = null;
  try {
    return await Promise.race([
      operation,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ data: null, error: null, timedOut: true }), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ============================================================
// Server-Side Profile Readers & Snapshot Loaders
// ============================================================

async function getUserIdByUsername(username) {
  const normalizedUsername = normalizeValue(username).toLowerCase();
  if (!normalizedUsername) return null;

  const result = await createAdminClient()
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message || 'Username lookup failed');
  return result.data?.user_id || null;
}

async function loadProfileCounters(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const admin = createAdminClient();
  const timeoutResult = await resolveWithTimeout(
    admin
      .from('profile_counters')
      .select(COUNTER_SELECT)
      .eq('user_id', normalizedUserId)
      .maybeSingle(),
    PROFILE_COUNTERS_TIMEOUT_MS,
  );

  if (timeoutResult?.timedOut) return null;
  if (timeoutResult.error)
    throw new Error(timeoutResult.error.message || 'Profile counters could not be loaded');
  return timeoutResult.data || null;
}

async function loadFollowCounts(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const admin = createAdminClient();
  const timeoutResult = await resolveWithTimeout(
    Promise.all([
      admin
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', normalizedUserId)
        .eq('status', FOLLOW_STATUS_ACCEPTED),
      admin
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', normalizedUserId)
        .eq('status', FOLLOW_STATUS_ACCEPTED),
    ]),
    FOLLOW_COUNTS_TIMEOUT_MS,
  );

  if (timeoutResult?.timedOut) return null;
  const [followersResult, followingResult] = timeoutResult;

  if (followersResult?.error)
    throw new Error(followersResult.error.message || 'Follower count could not be loaded');
  if (followingResult?.error)
    throw new Error(followingResult.error.message || 'Following count could not be loaded');

  return {
    followerCount: normalizeCount(followersResult?.count, 0),
    followingCount: normalizeCount(followingResult?.count, 0),
  };
}

async function loadCollectionCounts(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const admin = createAdminClient();
  const timeoutResult = await resolveWithTimeout(
    Promise.all([
      admin
        .from('likes')
        .select('media_key', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
      admin
        .from('lists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
      admin
        .from('watched')
        .select('media_key', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
      admin
        .from('watchlist')
        .select('media_key', { count: 'exact', head: true })
        .eq('user_id', normalizedUserId),
    ]),
    PROFILE_COUNTERS_TIMEOUT_MS,
  );

  if (timeoutResult?.timedOut) return null;
  const [likesResult, listsResult, watchedResult, watchlistResult] = timeoutResult;
  const firstError = [likesResult, listsResult, watchedResult, watchlistResult].find(
    (r) => r?.error,
  )?.error;

  if (firstError) throw new Error(firstError.message || 'Collection counts could not be loaded');

  return {
    likesCount: normalizeCount(likesResult?.count, 0),
    listsCount: normalizeCount(listsResult?.count, 0),
    watchedCount: normalizeCount(watchedResult?.count, 0),
    watchlistCount: normalizeCount(watchlistResult?.count, 0),
  };
}

export const getAccountProfile = cache(
  async (userId, { includeEmail = false, includePrivateDetails = false } = {}) => {
    const normalizedUserId = normalizeValue(userId);
    if (!normalizedUserId) return null;

    const admin = createAdminClient();
    const [profileResult, counters] = await Promise.all([
      admin
        .from('profiles')
        .select(ACCOUNT_PROFILE_SELECT)
        .eq('id', normalizedUserId)
        .maybeSingle(),
      loadProfileCounters(normalizedUserId).catch(() => null),
    ]);

    if (profileResult.error)
      throw new Error(profileResult.error.message || 'Account lookup failed');
    if (!profileResult.data) return null;

    // profile_counters is maintained by the collection/follow RPCs and gives
    // us one consistent snapshot. Only fall back to exact counts for legacy
    // rows where the counter record has not been created yet.
    const fallbackCounts = counters
      ? null
      : await Promise.all([
          loadFollowCounts(normalizedUserId).catch(() => null),
          loadCollectionCounts(normalizedUserId).catch(() => null),
        ]);
    const [followCounts, collectionCounts] = fallbackCounts || [];

    return normalizeAccountData(
      {
        ...profileResult.data,
        follower_count:
          Number.isFinite(Number(followCounts?.followerCount)) &&
          Number(followCounts.followerCount) >= 0
            ? Number(followCounts.followerCount)
            : Number.isFinite(Number(counters?.follower_count))
              ? Number(counters.follower_count)
              : 0,
        following_count:
          Number.isFinite(Number(followCounts?.followingCount)) &&
          Number(followCounts.followingCount) >= 0
            ? Number(followCounts.followingCount)
            : Number.isFinite(Number(counters?.following_count))
              ? Number(counters.following_count)
              : 0,
        likes_count: Number.isFinite(Number(collectionCounts?.likesCount))
          ? Number(collectionCounts.likesCount)
          : (counters?.likes_count ?? 0),
        lists_count: Number.isFinite(Number(collectionCounts?.listsCount))
          ? Number(collectionCounts.listsCount)
          : (counters?.lists_count ?? 0),
        watched_count: Number.isFinite(Number(collectionCounts?.watchedCount))
          ? Number(collectionCounts.watchedCount)
          : Number.isFinite(Number(counters?.watched_count))
            ? Number(counters.watched_count)
            : Number(profileResult.data?.watched_count ?? 0),
        watchlist_count: Number.isFinite(Number(collectionCounts?.watchlistCount))
          ? Number(collectionCounts.watchlistCount)
          : (counters?.watchlist_count ?? 0),
      },
      profileResult.data.id,
      { includeEmail, includePrivateDetails },
    );
  },
);

export async function getAccountSnapshotByUserId(userId, options = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) {
    return { profile: null, resolvedUserId: null, resolveError: 'Account not found' };
  }
  try {
    const profile = await getAccountProfile(normalizedUserId, options);
    return { profile: profile || null, resolvedUserId: normalizedUserId, resolveError: null };
  } catch (error) {
    return {
      profile: null,
      resolvedUserId: normalizedUserId,
      resolveError: error?.message || 'Account could not be loaded',
    };
  }
}

export async function getAccountSnapshotByUsername(username, options = {}) {
  try {
    const userId = await getUserIdByUsername(username);
    if (!userId) {
      return { profile: null, resolvedUserId: null, resolveError: 'Account not found' };
    }
    const profile = await getAccountProfile(userId, options);
    if (!profile) {
      return { profile: null, resolvedUserId: null, resolveError: 'Account not found' };
    }
    return { profile, resolvedUserId: userId, resolveError: null };
  } catch (error) {
    return {
      profile: null,
      resolvedUserId: null,
      resolveError: error?.message || 'Account could not be loaded',
    };
  }
}

export async function getEditableAccountSnapshotByUserId(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: null,
      resolveError: 'Account not found',
    };
  }

  try {
    const profile = await getAccountProfile(normalizedUserId, {
      includeEmail: true,
      includePrivateDetails: true,
    });

    if (!profile) {
      return {
        counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
        profile: null,
        resolvedUserId: normalizedUserId,
        resolveError: null,
      };
    }

    return {
      counts: {
        followers: normalizeCount(profile.followerCount, 0),
        following: normalizeCount(profile.followingCount, 0),
        likes: normalizeCount(profile.likesCount, 0),
        lists: normalizeCount(profile.listsCount, 0),
        watched: normalizeCount(profile.watchedCount, 0),
        watchlist: normalizeCount(profile.watchlistCount, 0),
      },
      profile,
      resolvedUserId: normalizedUserId,
      resolveError: null,
    };
  } catch (error) {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: normalizedUserId,
      resolveError: error?.message || 'Account could not be loaded',
    };
  }
}

// ============================================================
// Public Access Controls & Username Resolvers
// ============================================================

export const canViewerAccessUserContent = cache(
  async ({ client = null, ownerId, viewerId = null }) => {
    const normalizedOwnerId = normalizeValue(ownerId);
    const normalizedViewerId = normalizeValue(viewerId);

    if (!normalizedOwnerId) return false;
    if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) return true;

    const admin = client || createAdminClient();
    const profileResult = await admin
      .from('profiles')
      .select('is_private')
      .eq('id', normalizedOwnerId)
      .maybeSingle();

    assertResult(profileResult, 'Profile visibility could not be checked');
    if (!profileResult.data) return false;
    if (profileResult.data.is_private !== true) return true;
    if (!normalizedViewerId) return false;

    const followResult = await admin
      .from('follows')
      .select('status')
      .eq('follower_id', normalizedViewerId)
      .eq('following_id', normalizedOwnerId)
      .eq('status', FOLLOW_STATUS_ACCEPTED)
      .maybeSingle();

    assertResult(followResult, 'Profile visibility could not be checked');
    return Boolean(followResult.data);
  },
);

export function createPrivateProfileError() {
  const error = new Error('This profile is private');
  error.status = 403;
  return error;
}

async function resolveAccountIdByUsernameLegacy(username) {
  const normalizedUsername = cleanString(username).toLowerCase();
  if (!normalizedUsername) return null;

  const admin = createAdminClient();
  const usernameLookup = await admin
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  assertResult(usernameLookup, 'Username could not be resolved');
  if (usernameLookup.data?.user_id) return usernameLookup.data.user_id;

  const profileByUsernameLookup = await admin
    .from('profiles')
    .select('id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  assertResult(profileByUsernameLookup, 'Username could not be resolved');
  if (profileByUsernameLookup.data?.id) return profileByUsernameLookup.data.id;

  if (!isValidUuid(normalizedUsername)) return null;

  const profileByIdLookup = await admin
    .from('profiles')
    .select('id')
    .eq('id', normalizedUsername)
    .maybeSingle();

  assertResult(profileByIdLookup, 'Username could not be resolved');
  return profileByIdLookup.data?.id || null;
}

export const getAccountIdByUsername = cache(async (username) => {
  const normalizedUsername = cleanString(username);
  if (!normalizedUsername) return null;

  try {
    const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
      body: { resource: 'resolve', username: normalizedUsername },
      timeoutMs: 600,
    });
    if (payload?.userId) {
      return payload.userId;
    }
  } catch {}

  return resolveAccountIdByUsernameLegacy(normalizedUsername);
});

async function loadAccountProfileFallback(userId, viewerId = null) {
  const includePrivateDetails = await canViewerAccessUserContent({
    ownerId: userId,
    viewerId,
  }).catch(() => false);
  const snapshot = await getAccountSnapshotByUserId(userId, { includePrivateDetails });
  return snapshot.profile || null;
}

const SERVER_PROFILE_CACHE = new Map();
const SERVER_PROFILE_INFLIGHT = new Map();
const SERVER_PROFILE_CACHE_TTL_MS = 4000;

function getServerProfileCacheKey(userId, viewerId = null) {
  return `${normalizeValue(userId)}:${normalizeValue(viewerId) || 'anon'}`;
}

export function invalidateCachedAccountProfiles(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return;

  for (const key of SERVER_PROFILE_CACHE.keys()) {
    if (key.startsWith(`${normalizedUserId}:`)) SERVER_PROFILE_CACHE.delete(key);
  }
}

export async function getAccountProfileByUserId(
  userId,
  { viewerId = null, bypassCache = false } = {},
) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return null;

  const cacheKey = getServerProfileCacheKey(normalizedUserId, viewerId);
  const now = Date.now();
  const cached = SERVER_PROFILE_CACHE.get(cacheKey);

  if (!bypassCache && cached && cached.expiresAt > now) {
    return cached.profile;
  }

  if (bypassCache) {
    SERVER_PROFILE_CACHE.delete(cacheKey);
  }

  if (!bypassCache && SERVER_PROFILE_INFLIGHT.has(cacheKey)) {
    return SERVER_PROFILE_INFLIGHT.get(cacheKey);
  }

  const profilePromise = (async () => {
    let profile = null;
    try {
      const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
        body: {
          resource: 'profile',
          userId: normalizedUserId,
          viewerId: normalizeValue(viewerId) || null,
        },
        timeoutMs: 600,
      });
      if (payload?.profile) profile = payload.profile;
    } catch {}

    if (!profile) profile = await loadAccountProfileFallback(normalizedUserId, viewerId);

    if (profile) {
      SERVER_PROFILE_CACHE.set(cacheKey, {
        expiresAt: Date.now() + SERVER_PROFILE_CACHE_TTL_MS,
        profile,
      });
      if (SERVER_PROFILE_CACHE.size > 300) {
        const firstKey = SERVER_PROFILE_CACHE.keys().next().value;
        SERVER_PROFILE_CACHE.delete(firstKey);
      }
    }

    return profile;
  })();

  SERVER_PROFILE_INFLIGHT.set(cacheKey, profilePromise);
  try {
    return await profilePromise;
  } finally {
    SERVER_PROFILE_INFLIGHT.delete(cacheKey);
  }
}

export async function getAccountProfileByUsername(username, { viewerId = null } = {}) {
  const normalizedUsername = cleanString(username);
  if (!normalizedUsername) return null;

  try {
    const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
      body: {
        resource: 'profile',
        username: normalizedUsername,
        viewerId: normalizeValue(viewerId) || null,
      },
      timeoutMs: 600,
    });
    if (payload?.profile) {
      return payload.profile;
    }
  } catch {}

  const accountId = await getAccountIdByUsername(normalizedUsername);
  if (!accountId) return null;
  return loadAccountProfileFallback(accountId, viewerId);
}

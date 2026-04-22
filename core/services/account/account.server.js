import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { normalizeTimestamp } from '@/core/utils';
import { normalizeFavoriteShowcaseItems } from '@/core/services/shared/supabase-media-utils.service';
import { cache } from 'react';

const EMPTY_EDITABLE_ACCOUNT_COUNTS = Object.freeze({
  followers: 0,
  following: 0,
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
});
const ACCOUNT_PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
].join(',');

const COUNTER_SELECT = [
  'follower_count',
  'following_count',
  'likes_count',
  'lists_count',
  'watched_count',
  'watchlist_count',
].join(',');
const PROFILE_COUNTERS_TIMEOUT_MS = 1200;
const FOLLOW_COUNTS_TIMEOUT_MS = 1200;
const FOLLOW_STATUS_ACCEPTED = 'accepted';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeCount(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function normalizeAccountData(data = {}, id = null, { includeEmail = false, includePrivateDetails = false } = {}) {
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
    displayNameLower: data.display_name_lower || data.displayNameLower || String(displayName).toLowerCase(),
    id: id || data.id || null,
    isPrivate,
    followerCount: normalizeCount(data.follower_count ?? data.followerCount, 0),
    followingCount: normalizeCount(data.following_count ?? data.followingCount, 0),
    updatedAt: normalizeTimestamp(data.updated_at || data.updatedAt),
    username: data.username || null,
    usernameLower:
      data.username_lower || data.usernameLower || (data.username ? String(data.username).toLowerCase() : null),
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

async function getUserIdByUsername(username) {
  const normalizedUsername = normalizeValue(username).toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  const result = await createAdminClient()
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Username lookup failed');
  }

  return result.data?.user_id || null;
}

async function loadProfileCounters(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const admin = createAdminClient();
  const timeoutResult = await Promise.race([
    admin.from('profile_counters').select(COUNTER_SELECT).eq('user_id', normalizedUserId).maybeSingle(),
    new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: null, timedOut: true }), PROFILE_COUNTERS_TIMEOUT_MS)
    ),
  ]);

  if (timeoutResult?.timedOut) {
    return null;
  }

  if (timeoutResult.error) {
    throw new Error(timeoutResult.error.message || 'Profile counters could not be loaded');
  }

  return timeoutResult.data || null;
}

async function loadFollowCounts(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const admin = createAdminClient();
  const timeoutResult = await Promise.race([
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
    new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: null, timedOut: true }), FOLLOW_COUNTS_TIMEOUT_MS)
    ),
  ]);

  if (timeoutResult?.timedOut) {
    return null;
  }

  const [followersResult, followingResult] = timeoutResult;

  if (followersResult?.error) {
    throw new Error(followersResult.error.message || 'Follower count could not be loaded');
  }

  if (followingResult?.error) {
    throw new Error(followingResult.error.message || 'Following count could not be loaded');
  }

  return {
    followerCount: normalizeCount(followersResult?.count, 0),
    followingCount: normalizeCount(followingResult?.count, 0),
  };
}

const getAccountProfile = cache(async (userId, { includeEmail = false, includePrivateDetails = false } = {}) => {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const admin = createAdminClient();
  const profileResult = await admin
    .from('profiles')
    .select(ACCOUNT_PROFILE_SELECT)
    .eq('id', normalizedUserId)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Account lookup failed');
  }

  if (!profileResult.data) {
    return null;
  }

  const [counters, followCounts] = await Promise.all([
    loadProfileCounters(normalizedUserId).catch(() => null),
    loadFollowCounts(normalizedUserId).catch(() => null),
  ]);

  return normalizeAccountData(
    {
      ...profileResult.data,
      follower_count:
        Number.isFinite(Number(followCounts?.followerCount)) && Number(followCounts.followerCount) >= 0
          ? Number(followCounts.followerCount)
          : Number.isFinite(Number(counters?.follower_count))
            ? Number(counters.follower_count)
            : 0,
      following_count:
        Number.isFinite(Number(followCounts?.followingCount)) && Number(followCounts.followingCount) >= 0
          ? Number(followCounts.followingCount)
          : Number.isFinite(Number(counters?.following_count))
            ? Number(counters.following_count)
            : 0,
      likes_count: counters?.likes_count ?? 0,
      lists_count: counters?.lists_count ?? 0,
      watched_count: Number.isFinite(Number(counters?.watched_count))
        ? Number(counters.watched_count)
        : Number(profileResult.data?.watched_count ?? 0),
      watchlist_count: counters?.watchlist_count ?? 0,
    },
    profileResult.data.id,
    {
      includeEmail,
      includePrivateDetails,
    }
  );
});

export async function getAccountSnapshotByUserId(userId, options = {}) {
  try {
    const profile = await getAccountProfile(userId, options);

    if (!profile) {
      return {
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      };
    }

    return {
      profile,
      resolvedUserId: normalizeValue(userId),
      resolveError: null,
    };
  } catch {
    return {
      profile: null,
      resolvedUserId: null,
      resolveError: null,
    };
  }
}

export async function getAccountSnapshotByUsername(username, options = {}) {
  try {
    const userId = await getUserIdByUsername(username);

    if (!userId) {
      return {
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      };
    }

    const profile = await getAccountProfile(userId, options);

    if (!profile) {
      return {
        profile: null,
        resolvedUserId: null,
        resolveError: 'Account not found',
      };
    }

    return {
      profile,
      resolvedUserId: userId,
      resolveError: null,
    };
  } catch {
    return {
      profile: null,
      resolvedUserId: null,
      resolveError: null,
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
        resolvedUserId: null,
        resolveError: 'Account not found',
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
  } catch {
    return {
      counts: EMPTY_EDITABLE_ACCOUNT_COUNTS,
      profile: null,
      resolvedUserId: normalizedUserId,
      resolveError: null,
    };
  }
}

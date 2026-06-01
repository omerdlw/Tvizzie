import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { cache } from 'react';
import {
  ACCOUNT_PROFILE_SELECT,
  COUNTER_SELECT,
  EMPTY_EDITABLE_ACCOUNT_COUNTS,
  FOLLOW_COUNTS_TIMEOUT_MS,
  FOLLOW_STATUS_ACCEPTED,
  PROFILE_COUNTERS_TIMEOUT_MS,
} from './account.constants';
import { normalizeAccountData, normalizeCount, normalizeValue } from './account.normalizers';

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

async function loadCollectionCounts(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const admin = createAdminClient();
  const timeoutResult = await Promise.race([
    Promise.all([
      admin.from('likes').select('media_key', { count: 'exact', head: true }).eq('user_id', normalizedUserId),
      admin.from('lists').select('id', { count: 'exact', head: true }).eq('user_id', normalizedUserId),
      admin.from('watched').select('media_key', { count: 'exact', head: true }).eq('user_id', normalizedUserId),
      admin.from('watchlist').select('media_key', { count: 'exact', head: true }).eq('user_id', normalizedUserId),
    ]),
    new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: null, timedOut: true }), PROFILE_COUNTERS_TIMEOUT_MS)
    ),
  ]);

  if (timeoutResult?.timedOut) {
    return null;
  }

  const [likesResult, listsResult, watchedResult, watchlistResult] = timeoutResult;
  const firstError = [likesResult, listsResult, watchedResult, watchlistResult].find((result) => result?.error)?.error;

  if (firstError) {
    throw new Error(firstError.message || 'Collection counts could not be loaded');
  }

  return {
    likesCount: normalizeCount(likesResult?.count, 0),
    listsCount: normalizeCount(listsResult?.count, 0),
    watchedCount: normalizeCount(watchedResult?.count, 0),
    watchlistCount: normalizeCount(watchlistResult?.count, 0),
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

  const [counters, followCounts, collectionCounts] = await Promise.all([
    loadProfileCounters(normalizedUserId).catch(() => null),
    loadFollowCounts(normalizedUserId).catch(() => null),
    loadCollectionCounts(normalizedUserId).catch(() => null),
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

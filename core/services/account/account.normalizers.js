import 'server-only';

import { normalizeFavoriteShowcaseItems } from '@/core/services/shared/supabase-media-utils.service.js';
import { normalizeTimestamp } from '@/core/utils';

export function normalizeValue(value) {
  return String(value || '').trim();
}

export function normalizeCount(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

export function normalizeAccountData(
  data = {},
  id = null,
  { includeEmail = false, includePrivateDetails = false } = {}
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

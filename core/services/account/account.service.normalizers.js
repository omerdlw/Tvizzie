import { normalizeFavoriteShowcaseItems } from '@/core/services/shared/media';
import { normalizeAccountDisplayNameSearchValue } from '@/core/utils/account';
import { normalizeTimestamp } from '@/core/utils/format';
import { cleanString } from '@/core/utils/string';
import { isValidUrl } from '@/core/utils/url';

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

export function normalizeOptionalUrl(value) {
  const normalized = cleanString(value);

  if (!normalized) return null;
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://');
  }

  return normalized;
}

export function createUserIdentity(user = {}) {
  return {
    avatarUrl: user.avatarUrl || user.photoURL || null,
    displayName: user.displayName || user.name || user.email || 'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  };
}

export function normalizeMediaTarget(value) {
  const normalized = cleanString(value).toLowerCase();

  if (normalized === 'avatar') {
    return 'avatar';
  }

  if (normalized === 'logo' || normalized === 'banner') {
    return 'banner';
  }

  throw new Error('Media target must be avatar or logo');
}

export function normalizeEmailAddress(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

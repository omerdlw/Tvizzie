import 'server-only';

import { createClient as createServerClient } from '@/core/clients/supabase/server';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { getAccountSnapshotByUserId, getAccountSnapshotByUsername } from '@/core/services/account/account.server';
import { cleanString, normalizeTimestamp } from '@/core/services/shared/data-utils';
import { buildMediaItemKey } from '@/core/services/shared/media-key.service';
import { isMovieMediaType, isSupportedContentSubjectType, isTvReference, normalizeMediaType } from '@/core/utils/media';

const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

const NOTIFICATION_LIMIT = 50;
const ACCOUNT_SEARCH_LIMIT = 10;
const ACCOUNT_SEARCH_SELECT = [
  'avatar_url',
  'created_at',
  'display_name',
  'display_name_lower',
  'id',
  'is_private',
  'updated_at',
  'username',
  'username_lower',
].join(',');
const MEDIA_COLLECTION_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',');
const LIST_COLLECTION_SELECT = [
  'created_at',
  'description',
  'id',
  'likes_count',
  'payload',
  'poster_path',
  'reviews_count',
  'slug',
  'title',
  'updated_at',
  'user_id',
].join(',');
const LIST_ITEM_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'position',
  'title',
  'updated_at',
  'user_id',
].join(',');
const WATCHED_SELECT = [
  'backdrop_path',
  'created_at',
  'entity_id',
  'entity_type',
  'last_watched_at',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
  'watch_count',
].join(',');
const FOLLOW_SELECT = [
  'created_at',
  'follower_avatar_url',
  'follower_display_name',
  'follower_id',
  'follower_username',
  'following_avatar_url',
  'following_display_name',
  'following_id',
  'following_username',
  'responded_at',
  'status',
  'updated_at',
].join(',');
const NOTIFICATION_SELECT = ['actor_user_id', 'created_at', 'event_type', 'id', 'metadata', 'read'].join(',');

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizeEntityType(value) {
  return normalizeValue(value).toLowerCase();
}

function resolveLimitCount(value, fallback = 0, max = 100) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('fetch failed') || message.includes('socket') || message.includes('connection')) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }

    throw new Error(error.message || fallbackMessage);
  }

  return result;
}

async function withQueryTimeout(
  promise,
  { timeoutMs = 4000, fallbackValue = { data: [], error: null }, label = 'Query' } = {}
) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs)
  );

  const result = await Promise.race([promise, timeoutPromise]);

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }

  return result;
}

async function executeCollectionQuery(
  query,
  { fallbackValue = { data: [], error: null }, label = 'Collection query', strict = false, timeoutMs = 4000 } = {}
) {
  if (strict) {
    return query;
  }

  return withQueryTimeout(query, {
    fallbackValue,
    label,
    timeoutMs,
  });
}

function normalizeMediaPayload(payload = {}, row = {}) {
  const entityId = normalizeValue(payload.entityId || row.entity_id || payload.id || '');
  const entityType = normalizeEntityType(payload.entityType || row.entity_type || payload.media_type);

  return {
    addedAt: normalizeTimestamp(payload.addedAt || row.added_at),
    backdrop_path: payload.backdrop_path || payload.backdropPath || row.backdrop_path || null,
    entityId: entityId || null,
    entityType: entityType || null,
    first_air_date: payload.first_air_date || null,
    id: entityId || normalizeValue(payload.id || row.media_key) || null,
    mediaKey:
      payload.mediaKey || row.media_key || (entityType && entityId ? buildMediaItemKey(entityType, entityId) : null),
    media_type: entityType || null,
    name: payload.name || payload.original_name || '',
    original_name: payload.original_name || null,
    original_title: payload.original_title || null,
    poster_path: payload.poster_path || payload.posterPath || row.poster_path || null,
    position: normalizeNumber(payload.position, null),
    release_date: payload.release_date || null,
    title: payload.title || payload.original_title || row.title || payload.name || payload.original_name || '',
    updatedAt: normalizeTimestamp(payload.updatedAt || row.updated_at),
    userId: payload.userId || row.user_id || null,
    vote_average: normalizeNumber(payload.vote_average, null),
  };
}

function normalizeWatchedRow(row = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const baseMedia = normalizeMediaPayload(payload, row);

  return {
    ...baseMedia,
    firstWatchedAt: normalizeTimestamp(payload.firstWatchedAt || row.created_at),
    lastWatchedAt: normalizeTimestamp(payload.lastWatchedAt || row.last_watched_at),
    sourceLastAction: payload.sourceLastAction || 'watched',
    watchCount: Number.isFinite(Number(payload.watchCount ?? row.watch_count))
      ? Number(payload.watchCount ?? row.watch_count)
      : 1,
  };
}

function normalizeListOwnerSnapshot(value = {}, fallbackOwnerId = null) {
  const ownerId = value?.id || fallbackOwnerId || null;

  return ownerId
    ? {
        avatarUrl: value?.avatarUrl || null,
        displayName: value?.displayName || value?.username || 'Anonymous User',
        id: ownerId,
        username: value?.username || null,
      }
    : null;
}

function normalizeListPreviewItem(value = {}) {
  const normalized = normalizeMediaPayload(value, value);

  if (!normalized.entityId || !isMovieMediaType(normalized.entityType)) {
    return null;
  }

  return {
    ...normalized,
    id: normalized.entityId,
  };
}

function normalizeListRow(row = {}, likesMap = new Map()) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const ownerSnapshot = normalizeListOwnerSnapshot(payload.ownerSnapshot || {}, row.user_id);
  const likes = Array.isArray(likesMap.get(row.id)) ? likesMap.get(row.id) : [];

  return {
    coverUrl: payload.coverUrl || row.poster_path || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likes,
    likesCount: Number.isFinite(Number(row.likes_count)) ? Number(row.likes_count) : likes.length,
    ownerId: row.user_id,
    ownerSnapshot,
    previewItems: Array.isArray(payload.previewItems)
      ? payload.previewItems.map(normalizeListPreviewItem).filter(Boolean)
      : [],
    reviewsCount: Number.isFinite(Number(row.reviews_count))
      ? Number(row.reviews_count)
      : Number(payload.reviewsCount || 0),
    slug: row.slug || payload.slug || row.id,
    title: row.title || payload.title || 'Untitled List',
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function normalizeFollowRecord(record = {}, direction = 'followers') {
  const isFollowersDirection = direction === 'followers';
  const userId = isFollowersDirection ? record.follower_id : record.following_id;

  return {
    avatarUrl: isFollowersDirection ? record.follower_avatar_url || null : record.following_avatar_url || null,
    createdAt: normalizeTimestamp(record.created_at),
    displayName: isFollowersDirection ? record.follower_display_name || null : record.following_display_name || null,
    id: userId,
    respondedAt: normalizeTimestamp(record.responded_at),
    status: record.status || FOLLOW_STATUSES.ACCEPTED,
    updatedAt: normalizeTimestamp(record.updated_at),
    userId,
    username: isFollowersDirection ? record.follower_username || null : record.following_username || null,
  };
}

function sortFollowSnapshots(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    return rightTime - leftTime;
  });
}

function createEmptyRelationshipState() {
  return {
    canViewPrivateContent: false,
    inboundRelationship: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    inboundStatus: null,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundRelationship: null,
    outboundStatus: null,
    showFollowBack: false,
  };
}

import { cache } from 'react';

const canViewerAccessUserContent = cache(async ({ client = null, ownerId, viewerId = null }) => {
  const normalizedOwnerId = normalizeValue(ownerId);
  const normalizedViewerId = normalizeValue(viewerId);

  if (!normalizedOwnerId) {
    return false;
  }

  if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) {
    return true;
  }

  const admin = client || createAdminClient();
  const profileResult = await admin.from('profiles').select('is_private').eq('id', normalizedOwnerId).maybeSingle();

  assertResult(profileResult, 'Profile visibility could not be checked');

  if (!profileResult.data) {
    return false;
  }

  if (profileResult.data.is_private !== true) {
    return true;
  }

  if (!normalizedViewerId) {
    return false;
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', normalizedViewerId)
    .eq('following_id', normalizedOwnerId)
    .eq('status', FOLLOW_STATUSES.ACCEPTED)
    .maybeSingle();

  assertResult(followResult, 'Profile visibility could not be checked');
  return Boolean(followResult.data);
});

function createPrivateProfileError() {
  const error = new Error('This profile is private');
  error.status = 403;
  return error;
}

function isValidNotificationType(type, validTypes) {
  return validTypes.has(type);
}

function normalizeNotificationRow(row = {}) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const actor = metadata.actor && typeof metadata.actor === 'object' ? metadata.actor : {};

  return {
    actor: {
      avatarUrl: actor.avatarUrl || actor.avatar_url || null,
      displayName: actor.displayName || actor.display_name || 'Someone',
      id: actor.id || row.actor_user_id || null,
      username: actor.username || null,
    },
    createdAt: normalizeTimestamp(row.created_at),
    id: row.id,
    payload: metadata.payload && typeof metadata.payload === 'object' ? metadata.payload : {},
    read: row.read === true,
    type: row.event_type || 'UNKNOWN',
  };
}

function hasSupportedNotificationPayload(notification = {}) {
  const payload = notification?.payload || {};
  const subject = payload?.subject && typeof payload.subject === 'object' ? payload.subject : null;
  const list = payload?.list && typeof payload.list === 'object' ? payload.list : null;
  const subjectHref = subject?.href || payload?.subjectHref || list?.href || payload?.listHref || null;
  const subjectType = normalizeMediaType(subject?.type || payload?.subjectType || list?.type);

  if (subjectHref && isTvReference(subjectHref)) {
    return false;
  }

  if (!subjectType) {
    return true;
  }

  return isSupportedContentSubjectType(subjectType);
}

function buildUsernameCandidate(value) {
  const turkishMap = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return cleanString(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => turkishMap[char] || char)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function normalizeDisplayNameSearchValue(value) {
  return cleanString(value).toLocaleLowerCase();
}

function buildAccountSearchScore(profile, rawSearchTerm, normalizedUsername, normalizedDisplayName) {
  const username = profile?.usernameLower || '';
  const displayName = profile?.displayName || '';
  const displayNameLower = profile?.displayNameLower || normalizeDisplayNameSearchValue(displayName);

  let score = 0;

  if (normalizedUsername) {
    if (username === normalizedUsername) {
      score += 120;
    } else if (username.startsWith(normalizedUsername)) {
      score += 90;
    }
  }

  if (displayNameLower === normalizedDisplayName) {
    score += 110;
  } else if (displayNameLower.startsWith(normalizedDisplayName)) {
    score += 70;
  } else if (displayName.startsWith(rawSearchTerm)) {
    score += 50;
  }

  return score;
}

async function countListLikesByListIds(client, listIds = []) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return new Map();
  }

  const likesMap = new Map();

  for (let index = 0; index < listIds.length; index += 100) {
    const ids = listIds.slice(index, index + 100);
    const result = await client.from('list_likes').select('list_id, user_id').in('list_id', ids);

    assertResult(result, 'List likes could not be loaded');
    (result.data || []).forEach((row) => {
      const current = likesMap.get(row.list_id) || [];
      current.push(row.user_id);
      likesMap.set(row.list_id, current);
    });
  }

  return likesMap;
}

export async function getAccountProfileByUserId(userId, { viewerId = null } = {}) {
  const includePrivateDetails = await canViewerAccessUserContent({
    ownerId: userId,
    viewerId,
  }).catch(() => false);
  const snapshot = await getAccountSnapshotByUserId(userId, {
    includePrivateDetails,
  });
  return snapshot.profile || null;
}

export async function getAccountProfileByUsername(username, { viewerId = null } = {}) {
  const accountId = await getAccountIdByUsername(username);

  if (!accountId) {
    return null;
  }

  const includePrivateDetails = await canViewerAccessUserContent({
    ownerId: accountId,
    viewerId,
  }).catch(() => false);
  const snapshot = await getAccountSnapshotByUserId(accountId, {
    includePrivateDetails,
  });
  return snapshot.profile || null;
}

export const getAccountIdByUsername = cache(async (username) => {
  const normalizedUsername = cleanString(username).toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  const admin = createAdminClient();
  const result = await admin.from('usernames').select('user_id').eq('username_lower', normalizedUsername).maybeSingle();

  assertResult(result, 'Username could not be resolved');
  return result.data?.user_id || null;
});

export async function searchAccountProfiles(searchTerm, limitCount = 6) {
  const rawSearchTerm = cleanString(searchTerm);

  if (!rawSearchTerm) {
    return [];
  }

  const admin = createAdminClient();
  const normalizedUsername = buildUsernameCandidate(rawSearchTerm);
  const normalizedDisplayName = normalizeDisplayNameSearchValue(rawSearchTerm);
  const resolvedLimitCount = Math.min(Math.max(Number(limitCount) || 6, 1), ACCOUNT_SEARCH_LIMIT);
  const queryPromise = admin
    .from('profiles')
    .select(ACCOUNT_SEARCH_SELECT)
    .or([`username_lower.ilike.${normalizedUsername}%`, `display_name_lower.ilike.${normalizedDisplayName}%`].join(','))
    .limit(resolvedLimitCount * 2);

  const result = await withQueryTimeout(queryPromise, {
    label: `Account search for "${searchTerm}"`,
    timeoutMs: 2500,
  });

  if (result?.timedOut) {
    return [];
  }

  assertResult(result, 'Account search failed');

  return (result.data || [])
    .map((row) => ({
      avatarUrl: row.avatar_url || null,
      bannerUrl: row.banner_url || null,
      createdAt: normalizeTimestamp(row.created_at),
      description: row.description || '',
      displayName: row.display_name || 'Anonymous User',
      displayNameLower: row.display_name_lower || normalizeDisplayNameSearchValue(row.display_name || 'Anonymous User'),
      id: row.id,
      isPrivate: row.is_private === true,
      updatedAt: normalizeTimestamp(row.updated_at),
      username: row.username || null,
      usernameLower: row.username_lower || null,
    }))
    .filter((profile) => {
      const username = profile?.usernameLower || '';
      const displayName = profile?.displayNameLower || normalizeDisplayNameSearchValue(profile?.displayName);

      return (
        (normalizedUsername && username.startsWith(normalizedUsername)) || displayName.startsWith(normalizedDisplayName)
      );
    })
    .sort((left, right) => {
      const scoreDiff =
        buildAccountSearchScore(right, rawSearchTerm, normalizedUsername, normalizedDisplayName) -
        buildAccountSearchScore(left, rawSearchTerm, normalizedUsername, normalizedDisplayName);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (left.displayName || '').localeCompare(right.displayName || '');
    })
    .slice(0, resolvedLimitCount);
}

export async function getCollectionResource({
  resource,
  userId,
  viewerId = null,
  limitCount = null,
  media = null,
  listId = null,
  slug = null,
  strict = false,
}) {
  const admin = createAdminClient();
  const requiresProtectedAccess =
    userId &&
    new Set([
      'like-status',
      'liked-lists',
      'likes',
      'list-by-id',
      'list-by-slug',
      'list-items',
      'lists',
      'watchlist',
      'watchlist-status',
      'watched',
      'watched-status',
    ]).has(resource);

  if (requiresProtectedAccess) {
    const canAccess = await canViewerAccessUserContent({
      ownerId: userId,
      viewerId,
    });

    if (!canAccess) {
      throw createPrivateProfileError();
    }
  }

  if (resource === 'likes') {
    let query = admin
      .from('likes')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Likes for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Likes could not be loaded');

    return (result.data || [])
      .map((row) => normalizeMediaPayload(row.payload || {}, row))
      .filter((item) => isMovieMediaType(item?.entityType));
  }

  if (resource === 'watchlist') {
    let query = admin
      .from('watchlist')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Watchlist for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Watchlist could not be loaded');

    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
  }

  if (resource === 'lists') {
    let query = admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Lists could not be loaded');

    const rows = result.data || [];
    const likesMap = await countListLikesByListIds(
      admin,
      rows.map((row) => row.id)
    );

    return rows.map((row) => normalizeListRow(row, likesMap));
  }

  if (resource === 'list-items') {
    let query = admin
      .from('list_items')
      .select(LIST_ITEM_SELECT)
      .eq('user_id', userId)
      .eq('list_id', listId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `List items for list ${listId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'List items could not be loaded');

    return (result.data || [])
      .map((row) => normalizeMediaPayload(row.payload || {}, row))
      .filter((item) => isMovieMediaType(item?.entityType));
  }

  if (resource === 'list-by-id') {
    const result = await admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle();

    assertResult(result, 'List could not be loaded');

    if (!result.data) {
      return null;
    }

    const likesMap = await countListLikesByListIds(admin, [result.data.id]);
    return normalizeListRow(result.data, likesMap);
  }

  if (resource === 'list-by-slug') {
    const result = await admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle();

    assertResult(result, 'List could not be loaded');

    if (!result.data) {
      return null;
    }

    const likesMap = await countListLikesByListIds(admin, [result.data.id]);
    return normalizeListRow(result.data, likesMap);
  }

  if (resource === 'liked-lists') {
    let likesQuery = admin
      .from('list_likes')
      .select('list_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      likesQuery = likesQuery.limit(resolvedLimitCount);
    }

    const likesResult = await executeCollectionQuery(likesQuery, {
      label: `Liked lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (likesResult?.timedOut) {
      return [];
    }

    assertResult(likesResult, 'Liked lists could not be loaded');

    const listIds = [...new Set((likesResult.data || []).map((row) => row.list_id))];

    if (listIds.length === 0) {
      return [];
    }

    const listRows = [];

    for (let index = 0; index < listIds.length; index += 100) {
      const ids = listIds.slice(index, index + 100);
      const listResult = await admin.from('lists').select(LIST_COLLECTION_SELECT).in('id', ids);

      assertResult(listResult, 'Liked lists could not be loaded');
      listRows.push(...(listResult.data || []));
    }

    const likesMap = await countListLikesByListIds(
      admin,
      listRows.map((row) => row.id)
    );

    return listRows
      .map((row) => normalizeListRow(row, likesMap))
      .sort((left, right) => {
        const leftTime = left?.updatedAt ? new Date(left.updatedAt).getTime() : 0;
        const rightTime = right?.updatedAt ? new Date(right.updatedAt).getTime() : 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return String(right?.id || '').localeCompare(String(left?.id || ''));
      });
  }

  if (resource === 'like-status') {
    const mediaKey =
      media?.mediaKey ||
      (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null);

    if (!userId || !mediaKey) {
      return { isLiked: false, like: null };
    }

    const result = await admin
      .from('likes')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('added_at', { ascending: false, nullsFirst: false })
      .limit(1);

    assertResult(result, 'Like status could not be loaded');
    const row = Array.isArray(result.data) ? result.data[0] || null : null;

    return {
      isLiked: Boolean(row),
      like: row ? normalizeMediaPayload(row.payload || {}, row) : null,
    };
  }

  if (resource === 'watchlist-status') {
    const mediaKey =
      media?.mediaKey ||
      (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null);

    if (!userId || !mediaKey) {
      return { isInWatchlist: false, item: null };
    }

    const result = await admin
      .from('watchlist')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('added_at', { ascending: false, nullsFirst: false })
      .limit(1);

    assertResult(result, 'Watchlist status could not be loaded');
    const row = Array.isArray(result.data) ? result.data[0] || null : null;

    return {
      isInWatchlist: Boolean(row),
      item: row ? normalizeMediaPayload(row.payload || {}, row) : null,
    };
  }

  if (resource === 'watched-status') {
    const mediaKey =
      media?.mediaKey ||
      (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null);

    if (!userId || !mediaKey) {
      return { isWatched: false, watched: null };
    }

    const result = await admin
      .from('watched')
      .select(WATCHED_SELECT)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .order('last_watched_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1);

    assertResult(result, 'Watched status could not be loaded');
    const row = Array.isArray(result.data) ? result.data[0] || null : null;

    return {
      isWatched: Boolean(row),
      watched: row ? normalizeWatchedRow(row) : null,
    };
  }

  if (resource === 'watched') {
    let query = admin
      .from('watched')
      .select(WATCHED_SELECT)
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Watched for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Watched list could not be loaded');

    return (result.data || []).map(normalizeWatchedRow).filter((item) => isMovieMediaType(item?.entityType));
  }

  throw new Error('Unsupported collection resource');
}

export async function getFollowResource({
  resource,
  userId,
  targetId = null,
  viewerId = null,
  status = null,
  strict = false,
}) {
  const admin = createAdminClient();

  if (resource === 'followers' || resource === 'following') {
    const normalizedStatus = normalizeValue(status).toLowerCase() || null;
    const canAccessCollection = await canViewerAccessUserContent({
      ownerId: userId,
      viewerId,
    });

    if (!canAccessCollection) {
      throw createPrivateProfileError();
    }

    if (
      normalizedStatus &&
      normalizedStatus !== FOLLOW_STATUSES.ACCEPTED &&
      normalizeValue(viewerId) !== normalizeValue(userId)
    ) {
      const error = new Error('You are not allowed to view this follow collection');
      error.status = 403;
      throw error;
    }

    const direction = resource;
    const baseColumn = direction === 'followers' ? 'following_id' : 'follower_id';
    let query = admin.from('follows').select(FOLLOW_SELECT).eq(baseColumn, userId);

    if (normalizedStatus) {
      query = query.eq('status', normalizedStatus);
    }

    const result = await executeCollectionQuery(query.order('created_at', { ascending: false }), {
      label: `${direction} for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Follow collection could not be loaded');

    return sortFollowSnapshots((result.data || []).map((row) => normalizeFollowRecord(row, direction)));
  }

  if (resource === 'relationship') {
    if (!targetId) {
      return createEmptyRelationshipState();
    }

    const targetProfile = await getAccountProfileByUserId(targetId);
    const runRelationshipQuery = (queryPromise, label) =>
      executeCollectionQuery(queryPromise, {
        fallbackValue: { data: null, error: null },
        label,
        strict,
        timeoutMs: 2500,
      });
    const [outboundResult, inboundResult] = await Promise.all([
      viewerId && viewerId !== targetId
        ? runRelationshipQuery(
            admin
              .from('follows')
              .select(FOLLOW_SELECT)
              .eq('follower_id', viewerId)
              .eq('following_id', targetId)
              .maybeSingle(),
            `Outbound follow check ${viewerId} -> ${targetId}`
          )
        : Promise.resolve({ data: null, error: null }),
      viewerId && viewerId !== targetId
        ? runRelationshipQuery(
            admin
              .from('follows')
              .select(FOLLOW_SELECT)
              .eq('follower_id', targetId)
              .eq('following_id', viewerId)
              .maybeSingle(),
            `Inbound follow check ${targetId} -> ${viewerId}`
          )
        : Promise.resolve({ data: null, error: null }),
    ]);

    assertResult(outboundResult, 'Outbound relationship could not be loaded');
    assertResult(inboundResult, 'Inbound relationship could not be loaded');

    const outboundRelationship = outboundResult.data ? normalizeFollowRecord(outboundResult.data, 'following') : null;
    const inboundRelationship = inboundResult.data ? normalizeFollowRecord(inboundResult.data, 'followers') : null;
    const outboundStatus = outboundRelationship?.status || null;
    const inboundStatus = inboundRelationship?.status || null;
    const isPrivateProfile = !!targetProfile?.isPrivate;
    const canViewPrivateContent =
      !isPrivateProfile || viewerId === targetId || outboundStatus === FOLLOW_STATUSES.ACCEPTED;

    return {
      canViewPrivateContent,
      inboundRelationship,
      isInboundRelationshipLoaded: true,
      isOutboundRelationshipLoaded: true,
      inboundStatus,
      isPrivateProfile,
      isTargetProfileLoaded: true,
      outboundRelationship,
      outboundStatus,
      showFollowBack: inboundStatus === FOLLOW_STATUSES.ACCEPTED && outboundStatus !== FOLLOW_STATUSES.ACCEPTED,
    };
  }

  throw new Error('Unsupported follow resource');
}

export async function getNotificationList(userId, validTypes, limitCount = NOTIFICATION_LIMIT) {
  const client = await createServerClient();
  const resolvedLimitCount = Number.isFinite(Number(limitCount))
    ? Math.max(1, Math.min(Number(limitCount), 100))
    : NOTIFICATION_LIMIT;
  const validTypeList = Array.isArray(validTypes) ? validTypes : validTypes instanceof Set ? [...validTypes] : [];
  const result = await client
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .in('event_type', validTypeList.length > 0 ? validTypeList : ['__none__'])
    .order('created_at', { ascending: false })
    .limit(resolvedLimitCount);

  assertResult(result, 'Notifications could not be loaded');

  return (result.data || [])
    .map(normalizeNotificationRow)
    .filter((notification) => isValidNotificationType(notification.type, validTypes))
    .filter(hasSupportedNotificationPayload);
}

export async function getUnreadNotificationCount(userId, validTypes) {
  const client = await createServerClient();
  const validTypeList = Array.isArray(validTypes) ? validTypes : validTypes instanceof Set ? [...validTypes] : [];
  const result = await client
    .from('notifications')
    .select('event_type,metadata')
    .eq('user_id', userId)
    .eq('read', false)
    .in('event_type', validTypeList.length > 0 ? validTypeList : ['__none__']);

  assertResult(result, 'Unread notification count could not be loaded');

  return (result.data || [])
    .map((row) => ({
      payload: row?.metadata && typeof row.metadata === 'object' && row.metadata.payload ? row.metadata.payload : {},
      type: row?.event_type || 'UNKNOWN',
    }))
    .filter((notification) => isValidNotificationType(notification.type, validTypes))
    .filter(hasSupportedNotificationPayload).length;
}

export async function markNotificationAsRead(userId, notificationId) {
  const client = await createServerClient();
  const result = await client
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', notificationId);

  assertResult(result, 'Notification could not be marked as read');
}

export async function markAllUserNotificationsAsRead(userId) {
  const client = await createServerClient();
  const result = await client
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('read', false);

  assertResult(result, 'Notifications could not be marked as read');
}

export async function deleteUserNotification(userId, notificationId) {
  const client = await createServerClient();
  const result = await client.from('notifications').delete().eq('user_id', userId).eq('id', notificationId);

  assertResult(result, 'Notification could not be deleted');
}

export async function deleteAllUserNotifications(userId) {
  const client = await createServerClient();
  const result = await client.from('notifications').delete().eq('user_id', userId);

  assertResult(result, 'Notifications could not be deleted');
}

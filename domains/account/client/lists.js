'use client';

import { cleanString, normalizeTimestamp } from '@/shared';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
} from '@/infrastructure/realtime/client';
import { requestApiJson } from '@/infrastructure/http/client';
import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  fetchAccountListById,
  fetchAccountListBySlug,
  fetchAccountListItems,
  fetchCollectionResource,
} from '@/domains/account/client/collections';
import { getUserAccount } from '@/domains/account/client/profile';
import { assertTitleMedia, buildMediaItemKey } from '@/domains/media/utils/media-key';
import {
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/utils/media-payload';
import { isTitleMediaType } from '@/domains/media/utils/media-key';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/domains/social/client/activity';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/domains/social/client/notifications';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils/constants';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';

export function resolveRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (data && typeof data === 'object') {
    return data;
  }

  return null;
}

export function slugifyListTitle(value) {
  const trMap = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    İ: 'i',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  };

  return cleanString(value)
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (match) => trMap[match])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function normalizeListOwnerSnapshot(value = {}, fallbackOwnerId = null) {
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

export function normalizeListPreviewItem(value = {}) {
  const normalized = normalizeMediaPayload(value, value);

  if (!normalized.entityId || !isTitleMediaType(normalized.entityType)) {
    return null;
  }

  return {
    ...normalized,
    id: normalized.entityId,
  };
}

export function validateListTitle(value) {
  const title = cleanString(value);

  if (title.length < 2) {
    throw new Error('List title must be at least 2 characters long');
  }

  return title.slice(0, 80);
}

export function validateListDescription(value) {
  return cleanString(value).slice(0, 280);
}

export function dedupeListItems(items = []) {
  const uniqueItems = new Map();

  items.forEach((item, index) => {
    const mediaSnapshot = assertTitleMedia(item, 'Lists support movies and TV series only');

    if (!mediaSnapshot.entityId || !mediaSnapshot.entityType || !mediaSnapshot.title) {
      return;
    }

    const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);

    if (uniqueItems.has(mediaKey)) {
      return;
    }

    uniqueItems.set(mediaKey, {
      ...item,
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
      id: mediaSnapshot.entityId,
      mediaKey,
      position: index + 1,
      title: item?.title || item?.original_title || item?.name || item?.original_name,
    });
  });

  return Array.from(uniqueItems.values());
}

export async function buildListOwnerSnapshot(userId) {
  const profile = await getUserAccount(userId);

  return normalizeListOwnerSnapshot(
    {
      avatarUrl: profile?.avatarUrl || null,
      displayName: profile?.displayName || profile?.username || 'Anonymous User',
      id: userId,
      username: profile?.username || null,
    },
    userId,
  );
}

export function normalizeListRow(row = {}, likesMap = new Map()) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const ownerSnapshot = normalizeListOwnerSnapshot(payload.ownerSnapshot || {}, row.user_id);
  const likes = Array.isArray(likesMap.get(row.id))
    ? likesMap.get(row.id)
    : Array.isArray(payload.likes)
      ? payload.likes
      : [];

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

export function createListPayload({
  coverUrl,
  description,
  ownerSnapshot,
  previewItems = [],
  reviewsCount = 0,
  title,
  slug,
  itemsCount = 0,
}) {
  return {
    coverUrl,
    description,
    itemsCount,
    likes: [],
    ownerSnapshot,
    previewItems,
    reviewsCount,
    slug,
    title,
  };
}

export async function fetchUserLists(userId, options = {}) {
  return fetchCollectionResource('lists', userId, options);
}

export async function fetchListById(userId, listId) {
  return fetchAccountListById({ listId, userId });
}

export async function fetchListBySlug(userId, slug) {
  return fetchAccountListBySlug({ slug, userId });
}

export async function fetchLikedLists(userId, options = {}) {
  return fetchCollectionResource('liked-lists', userId, options);
}

export async function fetchListItems(userId, listId, options = {}) {
  return fetchAccountListItems({
    limitCount: options.limitCount,
    listId,
    userId,
  });
}

export function subscribeToUserLists(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchUserLists(userId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:user', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      limitCount: options.limitCount ?? null,
      userId,
    }),
  });
}

export function subscribeToUserList(userId, listId, callback, options = {}) {
  return createPollingSubscription(() => fetchListById(userId, listId), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:item', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      listId,
      userId,
    }),
  });
}

export function subscribeToUserListBySlug(userId, slug, callback, options = {}) {
  return createPollingSubscription(() => fetchListBySlug(userId, slug), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:slug', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      slug,
      userId,
    }),
  });
}

export function subscribeToLikedLists(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchLikedLists(userId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:liked', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      userId,
    }),
  });
}

export function subscribeToUserListItems(userId, listId, callback, options = {}) {
  return createPollingSubscription(() => fetchListItems(userId, listId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:items', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      listId,
      userId,
    }),
  });
}

export async function syncUserListDerivedState({ userId, listId }) {
  void userId;
  const result = await requestApiJson('/api/account/library', {
    body: { command: 'sync-list', listId },
    method: 'POST',
  });
  return result?.previewItems || [];
}

export async function getUserListMemberships({ userId, listIds = [], media }) {
  if (!userId || !media || listIds.length === 0) {
    return {};
  }

  const result = await requestApiJson('/api/account/library', {
    body: { command: 'list-memberships', listIds, media },
    method: 'POST',
  });
  return result?.memberships || {};
}

export async function toggleUserListItem({ userId, listId, media }) {
  ensureUserId(userId, 'Authenticated user and listId are required to update list items');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to update list items');
  }

  const mediaSnapshot = assertTitleMedia(media, 'Lists support movies and TV series only');
  const nowIso = new Date().toISOString();
  const row = createMediaRow(media, userId, {
    addedAt: nowIso,
    position: Number.isFinite(Number(media?.position)) ? Number(media.position) : null,
    updatedAt: nowIso,
  });
  const rpcRow = await executeMediaCollectionRpc({
    fnName: 'collection_toggle_list_item',
    params: createMediaCollectionToggleRpcParams({
      row,
      extras: {
        p_list_id: listId,
        p_position: Number.isFinite(Number(row.payload?.position))
          ? Number(row.payload.position)
          : null,
      },
    }),
    fallbackMessage: 'List item could not be updated',
  });
  const resolvedRpcRow = resolveRpcRow(rpcRow);
  const isInList = resolvedRpcRow?.is_in_list === true || resolvedRpcRow?.isInList === true;

  invalidatePollingSubscription('lists:items', { refetch: true });
  invalidatePollingSubscription('lists:item', { refetch: true });
  invalidatePollingSubscription('lists:slug', { refetch: true });
  invalidatePollingSubscription('lists:user', { refetch: true });

  if (!isInList) {
    return {
      isInList: false,
      mediaKey:
        row.media_key || buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    };
  }

  return {
    isInList: true,
    item: {
      ...row.payload,
      addedAt: nowIso,
      updatedAt: nowIso,
    },
    mediaKey: row.media_key || buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
  };
}

export async function reorderUserListItems({ userId, listId, items = [] }) {
  ensureUserId(userId, 'Authenticated user and listId are required to reorder list items');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to reorder list items');
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { success: true };
  }

  await requestApiJson('/api/account/library', {
    body: { command: 'reorder-list', items, listId },
    method: 'PATCH',
  });

  invalidatePollingSubscription('lists:items', { refetch: true });
  invalidatePollingSubscription('lists:item', { refetch: true });
  invalidatePollingSubscription('lists:slug', { refetch: true });
  invalidatePollingSubscription('lists:user', { refetch: true });

  return { success: true };
}

export async function toggleListLike({ ownerId, listId, userId }) {
  if (!ownerId || !listId || !userId) {
    throw new Error('ownerId, listId, and userId are required to like a list');
  }

  if (ownerId === userId) {
    throw new Error('You cannot like your own list');
  }

  const result = await requestApiJson('/api/account/library', {
    method: 'POST',
    body: {
      command: 'toggle-list-like',
      listId,
      ownerId,
    },
  });
  const isNowLiked = result?.isNowLiked === true;

  if (isNowLiked) {
    const listOwnerUsername = result?.list?.ownerUsername || null;
    const listTitle = result?.list?.title || 'Untitled List';
    const listSlug = result?.list?.slug || listId;
    const listPoster = result?.list?.poster || null;

    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.LIST_LIKED, {
      listOwnerId: ownerId,
      listId,
      listSlug,
      listTitle,
      subjectId: listId,
      subjectOwnerId: ownerId,
      subjectOwnerUsername: listOwnerUsername,
      subjectSlug: listSlug,
      subjectTitle: listTitle,
      subjectType: 'list',
    });
    fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_LIKED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        primaryRef: buildActivitySubjectRef({
          subjectId: listId,
          subjectType: 'list',
        }),
        secondaryRef: ownerId,
        slotType: ACTIVITY_SLOT_TYPES.LIST_LIKE,
      }),
      listId,
      listSlug,
      listTitle,
      ownerUsername: listOwnerUsername,
      subjectId: listId,
      subjectOwnerId: ownerId,
      subjectOwnerUsername: listOwnerUsername,
      subjectPoster: listPoster,
      subjectSlug: listSlug,
      subjectTitle: listTitle,
      subjectType: 'list',
    });
  }

  invalidatePollingSubscription('lists:slug', { refetch: true });
  invalidatePollingSubscription('lists:liked', { refetch: true });
  invalidatePollingSubscription('lists:user', { refetch: true });
  invalidatePollingSubscription('lists:item', { refetch: true });

  return isNowLiked;
}

function fireListCreatedActivity({ listId, ownerSnapshot, slug, title, userId }) {
  fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_CREATED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      primaryRef: buildActivitySubjectRef({
        subjectId: listId,
        subjectType: 'list',
      }),
      slotType: ACTIVITY_SLOT_TYPES.LIST_CREATED,
    }),
    listId,
    listSlug: slug,
    listTitle: title,
    subjectOwnerId: userId,
    ownerUsername: ownerSnapshot?.username || null,
    subjectId: listId,
    subjectTitle: title,
    subjectType: 'list',
  });
}

export async function createUserListWithItems({
  userId,
  title,
  description = '',
  coverUrl = '',
  items = [],
}) {
  ensureUserId(userId, 'Authenticated user is required to create a list');

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const normalizedItems = dedupeListItems(items);
  const slug = slugifyListTitle(validatedTitle) || 'list';
  const result = await requestApiJson('/api/account/library', {
    body: {
      command: 'create-list',
      coverUrl,
      description: validatedDescription,
      items: normalizedItems,
      title: validatedTitle,
    },
    method: 'POST',
  });
  const createdRow = result?.list;

  fireListCreatedActivity({
    listId: createdRow.id,
    ownerSnapshot: createdRow?.ownerSnapshot,
    slug: createdRow?.slug || slug,
    title: validatedTitle,
    userId,
  });

  return createdRow;
}

export async function updateUserList({ userId, listId, title, description = '', coverUrl = '' }) {
  ensureUserId(userId, 'Authenticated user and listId are required to update a list');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to update a list');
  }

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const result = await requestApiJson('/api/account/library', {
    body: {
      command: 'update-list',
      coverUrl,
      description: validatedDescription,
      listId,
      title: validatedTitle,
    },
    method: 'PATCH',
  });
  return result?.list || null;
}

export async function deleteUserList({ userId, listId }) {
  ensureUserId(userId, 'Authenticated user and listId are required to delete a list');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to delete a list');
  }

  const result = await requestApiJson('/api/account/library', {
    body: { listId },
    method: 'DELETE',
  });
  return result?.deleted === true;
}

export async function deleteUserListItems({ userId, listId, mediaKeys = [] }) {
  ensureUserId(userId, 'Authenticated user and listId are required to delete list items');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to delete list items');
  }

  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return { deletedCount: 0 };
  }

  const result = await requestApiJson('/api/account/library', {
    body: { command: 'delete-list-items', listId, mediaKeys },
    method: 'DELETE',
  });

  invalidatePollingSubscription('lists:items', { refetch: true });
  invalidatePollingSubscription('lists:item', { refetch: true });
  invalidatePollingSubscription('lists:slug', { refetch: true });
  invalidatePollingSubscription('lists:user', { refetch: true });

  return result;
}

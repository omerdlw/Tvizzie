'use client';

import { cleanString, chunkArray, normalizeTimestamp } from '@/domains/shell/shared/utils';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import { requestApiJson } from '@/infrastructure/http/api-request-service';
import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  fetchAccountListById,
  fetchAccountListBySlug,
  fetchAccountListItems,
  fetchCollectionResource,
} from '@/domains/account/client/collections.client';
import {
  getUserAccount,
} from '@/domains/account/client/profile.client';
import {
  assertTitleMedia,
  buildMediaItemKey,
} from '@/domains/media/utils/media-key';
import {
  createMediaPayload,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
  resolveLimitCount,
} from '@/domains/media/utils/media-payload';
import {
  isTitleMediaType,
} from '@/domains/media/utils/media-key';
import {
  LIST_ITEM_PREVIEW_SELECT,
  LIST_ROW_SELECT,
} from '@/domains/media/utils/constants';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
  removeActivityEvents,
} from '@/domains/social/client/activity';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/domains/social/client/notifications';
import {
  ACTIVITY_SLOT_TYPES,
} from '@/domains/social/utils/constants';
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

export async function fetchProfileLikedLists({ cursor = null, pageSize = 36, userId }) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  const targetCount = resolveLimitCount(pageSize, 36, 500);
  let currentCursor = cursor || null;
  let hasMore = true;
  const items = [];

  while (hasMore && items.length < targetCount) {
    const batchLimit = Math.min(50, Math.max(1, targetCount - items.length));
    const payload = await requestApiJson('/api/collections', {
      query: {
        activeTab: 'likes',
        cursor: currentCursor,
        limit: batchLimit,
        resource: 'liked-lists',
        userId,
      },
    });

    const batch = Array.isArray(payload?.data) ? payload.data : [];
    items.push(...batch);
    hasMore = payload?.pageInfo?.hasMore === true;
    currentCursor = payload?.pageInfo?.cursor || null;

    if (cursor) {
      break;
    }
  }

  return {
    hasMore,
    items,
    nextCursor: hasMore ? currentCursor : null,
  };
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
  const client = getSupabaseClient();
  const [listResult, countResult, itemsPreviewResult] = await Promise.all([
    client.from('lists').select('id,payload').eq('id', listId).eq('user_id', userId).maybeSingle(),
    client
      .from('list_items')
      .select('media_key', {
        count: 'exact',
        head: true,
      })
      .eq('list_id', listId)
      .eq('user_id', userId),
    client
      .from('list_items')
      .select(LIST_ITEM_PREVIEW_SELECT)
      .eq('list_id', listId)
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(5),
  ]);

  assertSupabaseResult(listResult, 'List could not be loaded');
  assertSupabaseResult(countResult, 'List items could not be counted');
  assertSupabaseResult(itemsPreviewResult, 'List items could not be loaded');

  if (!listResult.data) {
    return [];
  }

  const payload =
    listResult.data.payload && typeof listResult.data.payload === 'object'
      ? listResult.data.payload
      : {};
  const previewItems = (itemsPreviewResult.data || [])
    .map((row) => normalizeMediaPayload(row.payload || {}, row))
    .map(normalizeListPreviewItem)
    .filter(Boolean);

  const updateResult = await client
    .from('lists')
    .update({
      payload: {
        ...payload,
        itemsCount: Number(countResult.count) || 0,
        previewItems,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', userId);

  assertSupabaseResult(updateResult, 'List derived state could not be synced');

  return previewItems;
}

export async function getUserListMemberships({ userId, listIds = [], media }) {
  if (!userId || !media || listIds.length === 0) {
    return {};
  }

  const mediaSnapshot = assertTitleMedia(media, 'Lists support movies and TV series only');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);
  const client = getSupabaseClient();
  const memberships = {};

  for (const ids of chunkArray(listIds, 100)) {
    const result = await client
      .from('list_items')
      .select('list_id')
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .in('list_id', ids);

    assertSupabaseResult(result, 'List memberships could not be loaded');

    const existingSet = new Set((result.data || []).map((row) => row.list_id));

    ids.forEach((id) => {
      memberships[id] = existingSet.has(id);
    });
  }

  return memberships;
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
    client: getSupabaseClient(),
    fnName: 'collection_toggle_list_item',
    params: createMediaCollectionToggleRpcParams({
      row,
      userId,
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

  const client = getSupabaseClient();
  const nowIso = new Date().toISOString();

  const updates = items.map((item, index) => {
    const entityType =
      String(
        item?.entityType || item?.entity_type || item?.media_type || item?.mediaType || 'movie',
      )
        .trim()
        .toLowerCase() === 'tv'
        ? 'tv'
        : 'movie';
    const rawId = String(
      item?.entityId || item?.entity_id || item?.id || item?.mediaKey || item?.media_key || '',
    ).trim();
    const cleanId = rawId.replace(/^(movie|tv)[-_]/, '');
    const mediaKey =
      item?.media_key ||
      (item?.mediaKey && typeof item.mediaKey === 'string' && item.mediaKey.includes('_')
        ? item.mediaKey
        : buildMediaItemKey(entityType, cleanId));
    const position = index + 1;

    return client
      .from('list_items')
      .update({
        position,
        updated_at: nowIso,
      })
      .eq('user_id', userId)
      .eq('list_id', listId)
      .eq('media_key', mediaKey);
  });

  const results = await Promise.all(updates);
  for (const res of results) {
    assertSupabaseResult(res, 'List item order could not be updated');
  }

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

  const result = await requestApiJson('/api/lists/like', {
    method: 'POST',
    body: {
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

async function applyProfileListCounterDelta(client, userId, delta) {
  const result = await client.rpc('profile_counter_apply_delta', {
    p_lists_delta: delta,
    p_user_id: userId,
  });

  assertSupabaseResult(result, 'Profile list count could not be updated');
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

export async function createUserList({ userId, title, description = '', coverUrl = '' }) {
  ensureUserId(userId, 'Authenticated user is required to create a list');

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const slug = slugifyListTitle(validatedTitle) || 'list';
  const ownerSnapshot = await buildListOwnerSnapshot(userId);
  const normalizedCoverUrl = cleanString(coverUrl);
  const payload = createListPayload({
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    ownerSnapshot,
    previewItems: [],
    slug,
    title: validatedTitle,
  });
  const client = getSupabaseClient();
  const insertResult = await client.rpc('list_create_atomic', {
    p_description: validatedDescription,
    p_payload: payload,
    p_poster_path: normalizedCoverUrl,
    p_slug: slug,
    p_title: validatedTitle,
    p_user_id: userId,
  });

  assertSupabaseResult(insertResult, 'List could not be created');
  const createdRow = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data;

  fireListCreatedActivity({
    listId: createdRow.id,
    ownerSnapshot,
    slug,
    title: validatedTitle,
    userId,
  });

  return normalizeListRow(createdRow, new Map());
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
  const ownerSnapshot = await buildListOwnerSnapshot(userId);
  const normalizedCoverUrl = cleanString(coverUrl);
  const previewItems = normalizedItems.slice(0, 5).map(normalizeListPreviewItem).filter(Boolean);
  const nowIso = new Date().toISOString();
  const payload = createListPayload({
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    itemsCount: normalizedItems.length,
    ownerSnapshot,
    previewItems,
    slug,
    title: validatedTitle,
  });
  const client = getSupabaseClient();
  const insertResult = await client
    .from('lists')
    .insert({
      user_id: userId,
      slug,
      title: validatedTitle,
      description: validatedDescription,
      poster_path: normalizedCoverUrl,
      likes_count: 0,
      reviews_count: 0,
      payload,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(LIST_ROW_SELECT)
    .single();

  assertSupabaseResult(insertResult, 'List could not be created');
  if (normalizedItems.length > 0) {
    const itemRows = normalizedItems.map((item) => {
      const mediaPayload = createMediaPayload(
        {
          ...item,
          position: item.position,
        },
        userId,
        {
          addedAt: nowIso,
          updatedAt: nowIso,
          position: item.position,
        },
      );

      return {
        list_id: insertResult.data.id,
        user_id: userId,
        media_key: mediaPayload.mediaKey,
        entity_id: mediaPayload.entityId,
        entity_type: mediaPayload.entityType,
        title: mediaPayload.title,
        poster_path: mediaPayload.poster_path,
        backdrop_path: mediaPayload.backdrop_path,
        position: Number.isFinite(Number(item.position)) ? Number(item.position) : null,
        payload: mediaPayload,
        added_at: nowIso,
        updated_at: nowIso,
      };
    });

    const [itemInsertResult] = await Promise.all([
      client.from('list_items').insert(itemRows),
      applyProfileListCounterDelta(client, userId, 1),
    ]);

    assertSupabaseResult(itemInsertResult, 'List items could not be created');
  } else {
    await applyProfileListCounterDelta(client, userId, 1);
  }

  fireListCreatedActivity({
    listId: insertResult.data.id,
    ownerSnapshot,
    slug,
    title: validatedTitle,
    userId,
  });

  return normalizeListRow(insertResult.data, new Map());
}

export async function updateUserList({ userId, listId, title, description = '', coverUrl = '' }) {
  ensureUserId(userId, 'Authenticated user and listId are required to update a list');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to update a list');
  }

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const normalizedCoverUrl = cleanString(coverUrl);
  const client = getSupabaseClient();
  const listResult = await client
    .from('lists')
    .select('payload')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  assertSupabaseResult(listResult, 'List could not be loaded');

  if (!listResult.data) {
    throw new Error('List not found');
  }

  const existingPayload =
    listResult.data.payload && typeof listResult.data.payload === 'object'
      ? listResult.data.payload
      : {};
  const ownerSnapshot =
    normalizeListOwnerSnapshot(existingPayload.ownerSnapshot, userId) ||
    (await buildListOwnerSnapshot(userId));
  const nextPayload = {
    ...existingPayload,
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    ownerSnapshot,
    slug: slugifyListTitle(validatedTitle) || 'list',
    title: validatedTitle,
  };
  const updateResult = await client
    .from('lists')
    .update({
      title: validatedTitle,
      description: validatedDescription,
      slug: slugifyListTitle(validatedTitle) || 'list',
      poster_path: normalizedCoverUrl,
      payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', userId);

  assertSupabaseResult(updateResult, 'List could not be updated');

  return fetchListById(userId, listId);
}

export async function deleteUserList({ userId, listId }) {
  ensureUserId(userId, 'Authenticated user and listId are required to delete a list');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to delete a list');
  }

  const client = getSupabaseClient();
  await removeActivityEvents({
    action: 'delete-list-activity',
    listId,
  });
  const result = await client.rpc('list_delete_cascade', {
    p_list_id: listId,
    p_user_id: userId,
  });

  assertSupabaseResult(result, 'List could not be deleted');
  return true;
}

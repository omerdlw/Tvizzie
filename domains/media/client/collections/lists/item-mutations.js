'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
} from '@/domains/account/client';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import {
  assertTitleMedia,
  buildMediaItemKey,
  createMediaRow,
  ensureUserId,
} from '@/domains/media/shared/media';
import { invalidatePollingSubscription } from '@/infrastructure/realtime/polling-subscription-service';
import { chunkArray } from '@/shared/utils';
import { resolveRpcRow } from './list-shared.js';

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
  const rpcRow = await executeMediaCollectionRpc(
    'collection_toggle_list_item',
    createMediaCollectionToggleRpcParams({
      row,
      userId,
      extras: {
        p_list_id: listId,
        p_position: Number.isFinite(Number(row.payload?.position))
          ? Number(row.payload.position)
          : null,
      },
    }),
    'List item could not be updated',
  );
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
      item?.entityId || item?.entity_id || item?.id || item?.mediaKey || '',
    ).trim();
    const cleanId = rawId.replace(/^(movie|tv)-/, '');
    const mediaKey =
      item?.mediaKey && typeof item.mediaKey === 'string' && item.mediaKey.includes('-')
        ? item.mediaKey
        : `${entityType}-${cleanId}`;
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

'use client';

import {
  assertSupabaseResult,
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  getSupabaseClient,
} from '@/core/services/shared/client';
import {
  assertTitleMedia,
  buildMediaItemKey,
  createMediaRow,
  ensureUserId,
} from '@/core/services/shared/media';

import { chunkArray, resolveRpcRow } from './shared.js';

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
        p_position: Number.isFinite(Number(row.payload?.position)) ? Number(row.payload.position) : null,
      },
    }),
    'List item could not be updated'
  );
  const isInList = rpcRow?.is_in_list === true;

  if (!isInList) {
    return {
      isInList: false,
      mediaKey: row.media_key || buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
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

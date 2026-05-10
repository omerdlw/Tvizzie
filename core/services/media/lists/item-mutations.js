'use client';

import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service.js';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service.js';
import { createMediaPayload, ensureUserId } from '@/core/services/shared/supabase-media-utils.service.js';
import { chunkArray, resolveRpcRow } from './shared.js';

export async function getUserListMemberships({ userId, listIds = [], media }) {
  if (!userId || !media || listIds.length === 0) {
    return {};
  }

  const mediaSnapshot = assertMovieMedia(media, 'Lists support movies only');
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

  const mediaSnapshot = assertMovieMedia(media, 'Lists support movies only');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);
  const nowIso = new Date().toISOString();
  const client = getSupabaseClient();
  const mediaPayload = createMediaPayload(media, userId, {
    addedAt: nowIso,
    position: Number.isFinite(Number(media?.position)) ? Number(media.position) : null,
    updatedAt: nowIso,
  });
  const rpcResult = await client.rpc('collection_toggle_list_item', {
    p_backdrop_path: mediaPayload.backdrop_path || null,
    p_entity_id: mediaPayload.entityId || null,
    p_entity_type: mediaPayload.entityType || null,
    p_list_id: listId,
    p_media_key: mediaPayload.mediaKey,
    p_payload: mediaPayload,
    p_position: Number.isFinite(Number(mediaPayload.position)) ? Number(mediaPayload.position) : null,
    p_poster_path: mediaPayload.poster_path || null,
    p_title: mediaPayload.title || null,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'List item could not be updated');

  const rpcRow = resolveRpcRow(rpcResult.data);
  const isInList = rpcRow?.is_in_list === true;

  if (!isInList) {
    return {
      isInList: false,
      mediaKey,
    };
  }

  return {
    isInList: true,
    item: {
      ...mediaPayload,
      addedAt: nowIso,
      updatedAt: nowIso,
    },
    mediaKey: mediaPayload.mediaKey,
  };
}

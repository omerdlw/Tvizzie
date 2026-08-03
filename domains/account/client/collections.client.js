'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';

export async function fetchCollectionResource({
  entityId = null,
  entityType = null,
  limitCount = null,
  listId = null,
  media = null,
  resource,
  slug = null,
  userId = null,
} = {}) {
  const resolvedMedia = media || (entityType && entityId ? { entityId, entityType } : null);
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: resolvedMedia?.entityId || null,
      entityType: resolvedMedia?.entityType || null,
      limitCount,
      listId,
      resource,
      slug,
      userId,
    },
  });
  return payload?.items || payload?.data || payload || [];
}

export async function fetchMediaCollectionStatus({ media = null, resource, userId = null } = {}) {
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: media?.entityId || null,
      entityType: media?.entityType || null,
      resource,
      userId,
    },
  });
  return payload?.data || payload || null;
}

export function createMediaCollectionToggleRpcParams({ extraPayload = {}, row = {}, userId }) {
  return {
    p_added_at: row.addedAt || row.added_at || new Date().toISOString(),
    p_backdrop_path: row.backdrop_path || row.backdropPath || null,
    p_entity_id: String(row.entityId || row.entity_id || row.id || '').trim(),
    p_entity_type: String(row.entityType || row.entity_type || row.media_type || '').trim().toLowerCase(),
    p_extra_payload: extraPayload,
    p_media_key: row.mediaKey || row.media_key || null,
    p_poster_path: row.poster_path || row.posterPath || null,
    p_title: row.title || row.name || 'Untitled',
    p_user_id: userId,
  };
}

export async function executeMediaCollectionRpc({ client, fnName, params, fallbackMessage }) {
  const result = await client.rpc(fnName, params);
  if (result.error) throw new Error(result.error.message || fallbackMessage);
  return result.data;
}

export function buildUserMediaCollectionSubscriptionKey(resource, userId) {
  return `account:collection:${resource}:${userId}`;
}

export function buildMediaCollectionStatusSubscriptionKey(resource, userId, mediaKey) {
  return `account:status:${resource}:${userId}:${mediaKey}`;
}

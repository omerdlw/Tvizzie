import { getAccountCollectionsServer } from '../api/collections.server';

export async function fetchCollectionResource(arg1, arg2, arg3, arg4) {
  let params = {};

  if (typeof arg1 === 'string') {
    params = {
      resource: arg1,
      userId: arg2,
      ...(arg3 && typeof arg3 === 'object' ? arg3 : {}),
      ...(arg4 && typeof arg4 === 'object' ? arg4 : {}),
    };
  } else if (arg1 && typeof arg1 === 'object') {
    params = arg1;
  }

  const {
    entityId = null,
    entityType = null,
    limitCount = null,
    listId = null,
    media = null,
    resource,
    slug = null,
    userId = null,
  } = params;

  const res = await getAccountCollectionsServer({
    entityId,
    entityType,
    limitCount,
    listId,
    media,
    resource,
    slug,
    userId,
  });
  if (!res.success) return [];
  return res.items || res.data || [];
}

export async function fetchMediaCollectionStatus({ media = null, resource, userId = null } = {}) {
  const res = await getAccountCollectionsServer({
    media,
    resource,
    userId,
  });
  if (!res.success) return null;
  return res.data || null;
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

export function buildUserMediaCollectionSubscriptionKey(resource, userId, options = {}) {
  const limit = options?.limitCount ?? null;
  const suffix = limit !== null ? `:${limit}` : '';
  return `account:collection:${resource}:${userId}${suffix}`;
}

export function buildMediaCollectionStatusSubscriptionKey(resource, userId, mediaKey) {
  return `account:status:${resource}:${userId}:${mediaKey}`;
}

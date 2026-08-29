import { requestApiJson } from '@/infrastructure/http/client';

function getResourceItems(response) {
  return response?.items || response?.data || [];
}

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

  const res = await requestApiJson('/api/account/library', {
    query: {
      entityId: entityId || media?.entityId || media?.entity_id || media?.id || null,
      entityType:
        entityType || media?.entityType || media?.entity_type || media?.media_type || null,
      limitCount,
      listId,
      resource,
      slug,
      userId,
    },
  });
  return getResourceItems(res);
}

export async function fetchAccountListById({ listId, userId } = {}) {
  if (!listId) return null;

  const response = await requestApiJson('/api/account/library', {
    query: {
      listId,
      resource: 'list-by-id',
      userId,
    },
  });
  return response?.data || null;
}

export async function fetchAccountListBySlug({ slug, userId } = {}) {
  if (!slug) return null;

  const response = await requestApiJson('/api/account/library', {
    query: {
      resource: 'list-by-slug',
      slug,
      userId,
    },
  });
  return response?.data || null;
}

export async function fetchAccountListItems({ limitCount = null, listId, userId } = {}) {
  if (!listId || !userId) return [];

  const response = await requestApiJson('/api/account/library', {
    query: {
      limitCount,
      listId,
      resource: 'list-items',
      userId,
    },
  });
  return getResourceItems(response);
}

export async function fetchMediaCollectionStatus({ media = null, resource, userId = null } = {}) {
  const res = await requestApiJson('/api/account/library', {
    query: {
      entityId: media?.entityId || media?.entity_id || media?.id || null,
      entityType: media?.entityType || media?.entity_type || media?.media_type || null,
      resource,
      userId,
    },
  });
  return res?.data || null;
}

export function createMediaCollectionToggleRpcParams({ extras = {}, row = {} }) {
  return {
    p_backdrop_path: row.backdrop_path || row.backdropPath || null,
    p_entity_id: String(row.entityId || row.entity_id || row.id || '').trim(),
    p_entity_type: String(row.entityType || row.entity_type || row.media_type || '')
      .trim()
      .toLowerCase(),
    p_media_key: row.mediaKey || row.media_key || null,
    p_payload: row.payload || {},
    p_poster_path: row.poster_path || row.posterPath || null,
    p_title: row.title || row.name || 'Untitled',
    ...extras,
  };
}

export async function executeMediaCollectionRpc(
  fnNameOrOptions,
  paramsArg,
  fallbackMessageArg,
  clientArg,
) {
  let fnName;
  let params;
  let fallbackMessage;
  let client;

  if (typeof fnNameOrOptions === 'object' && fnNameOrOptions !== null) {
    ({ client, fnName, params, fallbackMessage } = fnNameOrOptions);
  } else {
    fnName = fnNameOrOptions;
    params = paramsArg;
    fallbackMessage = fallbackMessageArg;
    client = clientArg;
  }

  if (params && Object.prototype.hasOwnProperty.call(params, 'p_user_id')) {
    throw new Error('Browser collection RPC actors must be derived from the authenticated session');
  }
  void client;
  const result = await requestApiJson('/api/account/library', {
    body: { command: 'media-mutation', operation: fnName, params },
    method: 'POST',
  });
  return result?.result;
}

export function buildUserMediaCollectionSubscriptionKey(resource, userId, options = {}) {
  const limit = options?.limitCount ?? null;
  const suffix = limit !== null ? `:${limit}` : '';
  return `account:collection:${resource}:${userId}${suffix}`;
}

export function buildMediaCollectionStatusSubscriptionKey(resource, userId, mediaKey) {
  return `account:status:${resource}:${userId}:${mediaKey}`;
}

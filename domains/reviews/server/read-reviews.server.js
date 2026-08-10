import 'server-only';

import {
  getOrLoadCachedValue,
  invokeInternalEdgeFunction,
} from '@/infrastructure/http/http-server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeReviewReadRequest(query = {}) {
  const resource = normalizeValue(query.resource) === 'list' ? 'list' : 'media';
  const request = {
    entityId: normalizeValue(query.entityId),
    entityType: normalizeValue(query.entityType),
    limitCount: normalizeValue(query.limitCount),
    listId: normalizeValue(query.listId),
    ownerId: normalizeValue(query.ownerId),
    resource,
  };

  const isValid = resource === 'list'
    ? Boolean(request.listId && request.ownerId)
    : Boolean(request.entityId && request.entityType);

  return { isValid, request };
}

export async function readReviews(query = {}) {
  const { isValid, request } = normalizeReviewReadRequest(query);
  if (!isValid) return { data: [] };

  const cacheKey = `reviews|resource=${request.resource}|listId=${request.listId}|ownerId=${request.ownerId}|entity=${request.entityType}:${request.entityId}|limit=${request.limitCount}`;
  const body = request.resource === 'list'
    ? {
        limitCount: request.limitCount,
        listId: request.listId,
        ownerId: request.ownerId,
        resource: request.resource,
      }
    : {
        entityId: request.entityId,
        entityType: request.entityType,
        limitCount: request.limitCount,
        resource: request.resource,
      };
  const payload = await getOrLoadCachedValue({
    cacheKey,
    enabled: true,
    ttlMs: 2000,
    loader: () => invokeInternalEdgeFunction('reviews-read', { body }),
  });

  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
  };
}

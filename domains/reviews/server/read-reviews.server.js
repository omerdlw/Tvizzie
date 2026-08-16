import 'server-only';

import { getOrLoadCachedValue } from '@/infrastructure/http/http-server';
import {
  getListReviewsResource,
  getMediaReviewsResource,
} from './read-resources.server';

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

  const isValid =
    resource === 'list'
      ? Boolean(request.listId && request.ownerId)
      : Boolean(request.entityId && request.entityType);

  return { isValid, request };
}

export async function readReviews(query = {}) {
  const { isValid, request } = normalizeReviewReadRequest(query);
  if (!isValid) return { data: [] };

  const cacheKey = `reviews|resource=${request.resource}|listId=${request.listId}|ownerId=${request.ownerId}|entity=${request.entityType}:${request.entityId}|limit=${request.limitCount}`;

  const data = await getOrLoadCachedValue({
    cacheKey,
    enabled: true,
    ttlMs: 2000,
    loader: async () => {
      if (request.resource === 'list') {
        return getListReviewsResource({
          limitCount: request.limitCount,
          listId: request.listId,
          ownerId: request.ownerId,
        });
      }

      return getMediaReviewsResource({
        entityId: request.entityId,
        entityType: request.entityType,
        limitCount: request.limitCount,
      });
    },
  });

  return {
    data: Array.isArray(data) ? data : [],
  };
}


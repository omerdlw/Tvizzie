'use server';

import { getOrLoadCachedValue, invokeInternalEdgeFunction } from '@/infrastructure/http/http-server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function getReviewsServer({ resource, listId, ownerId, entityId, entityType, limitCount }) {
  try {
    const normResource = normalizeValue(resource);
    const normListId = normalizeValue(listId);
    const normOwnerId = normalizeValue(ownerId);
    const normEntityId = normalizeValue(entityId);
    const normEntityType = normalizeValue(entityType);

    const cacheKey = `reviews|resource=${normResource}|listId=${normListId}|ownerId=${normOwnerId}|entity=${normEntityType}:${normEntityId}|limit=${limitCount}`;
    const payload = await getOrLoadCachedValue({
      cacheKey,
      enabled: true,
      ttlMs: 2000,
      loader: () =>
        invokeInternalEdgeFunction('reviews-read', {
          body:
            normResource === 'list'
              ? {
                  resource: 'list',
                  listId: normListId,
                  ownerId: normOwnerId,
                  limitCount,
                }
              : {
                  resource: 'media',
                  entityId: normEntityId,
                  entityType: normEntityType,
                  limitCount,
                },
        }),
    });
    const data = Array.isArray(payload?.data) ? payload.data : [];
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || 'Reviews could not be loaded' };
  }
}

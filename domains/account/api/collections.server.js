'use server';

import { normalizeValue } from '@/shared/utils';
import { getAccountIdByUsername } from '../server/profile.server';
import { getAccountCollectionResource } from '../server/collections.server';

export async function getAccountCollectionsServer({ entityId, entityType, limitCount, listId, media, resource, slug, userId, username, viewerId }) {
  try {
    let resolvedUserId = userId || null;
    if (!resolvedUserId && username) {
      resolvedUserId = await getAccountIdByUsername(username);
    }
    if (!resolvedUserId && viewerId) {
      resolvedUserId = viewerId;
    }

    if (!resolvedUserId && resource !== 'list-by-slug') {
      return { success: true, data: null, items: [] };
    }

    const resolvedMedia = media || (entityType && entityId ? { entityId, entityType } : null);

    const data = await getAccountCollectionResource({
      limitCount,
      listId,
      media: resolvedMedia,
      resource,
      slug,
      userId: resolvedUserId,
      viewerId,
    });

    return { success: true, data, items: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false, error: error.message || 'Collections could not be loaded' };
  }
}

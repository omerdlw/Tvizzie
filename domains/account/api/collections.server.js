'use server';

import { normalizeValue } from '@/shared/utils';
import { getAccountIdByUsername } from '../server/profile.server';
import { getAccountCollectionResource } from '../server/collections.server';
import { getViewerSessionContext } from '../server/routes.server';

export async function getAccountCollectionsServer({
  entityId,
  entityType,
  limitCount,
  listId,
  media,
  resource,
  slug,
  userId,
  username,
}) {
  try {
    const sessionContext = await getViewerSessionContext().catch(() => null);
    const authenticatedViewerId = sessionContext?.userId || null;
    let resolvedUserId = userId || null;
    if (!resolvedUserId && username) {
      resolvedUserId = await getAccountIdByUsername(username);
    }
    if (!resolvedUserId) resolvedUserId = authenticatedViewerId;

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
      viewerId: authenticatedViewerId,
    });

    return { success: true, data, items: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false, error: error.message || 'Collections could not be loaded' };
  }
}

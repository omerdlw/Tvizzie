'use server';

import { normalizeValue } from '@/shared/utils';
import { getAccountIdByUsername } from '../server/profile.server';
import { getAccountCollectionResource } from '../server/collections.server';
import { getViewerSessionContext } from '../server/routes.server';

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

    // Auto-resolve viewerId from session if not explicitly provided.
    // This is required for PROTECTED_ACCOUNT_COLLECTION_RESOURCES access checks
    // (e.g. list-by-slug, list-by-id, list-items) when called from client subscriptions.
    let resolvedViewerId = viewerId || null;
    if (!resolvedViewerId) {
      const sessionContext = await getViewerSessionContext().catch(() => null);
      resolvedViewerId = sessionContext?.userId || null;
    }

    const resolvedMedia = media || (entityType && entityId ? { entityId, entityType } : null);

    const data = await getAccountCollectionResource({
      limitCount,
      listId,
      media: resolvedMedia,
      resource,
      slug,
      userId: resolvedUserId,
      viewerId: resolvedViewerId,
    });

    return { success: true, data, items: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { success: false, error: error.message || 'Collections could not be loaded' };
  }
}

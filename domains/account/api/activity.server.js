'use server';

import { normalizeValue } from '@/shared/utils';
import { getAccountIdByUsername } from '../server/profile.server';
import { fetchAccountActivityFeedServer } from '../server/feed.server';
import { getViewerSessionContext } from '../server/routes.server';

export async function getAccountActivityFeedServerAction({
  cursor,
  pageSize,
  scope,
  sort,
  subject,
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

    if (!resolvedUserId) {
      return { success: true, hasMore: false, items: [], nextCursor: null, totalCount: 0 };
    }

    const payload = await fetchAccountActivityFeedServer({
      cursor,
      pageSize,
      scope,
      sort,
      subject,
      userId: resolvedUserId,
      viewerId: authenticatedViewerId,
    });

    return { success: true, ...payload };
  } catch (error) {
    return { success: false, error: error.message || 'Activity feed could not be loaded' };
  }
}

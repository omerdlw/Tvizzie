'use server';

import { normalizeValue } from '@/shared/utils';
import { getAccountIdByUsername } from '../server/profile.server';
import { fetchAccountActivityFeedServer } from '../server/feed.server';

export async function getAccountActivityFeedServerAction({ cursor, pageSize, scope, sort, subject, userId, username, viewerId }) {
  try {
    let resolvedUserId = userId || null;
    if (!resolvedUserId && username) {
      resolvedUserId = await getAccountIdByUsername(username);
    }
    if (!resolvedUserId && viewerId) {
      resolvedUserId = viewerId;
    }

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
      viewerId,
    });

    return { success: true, ...payload };
  } catch (error) {
    return { success: false, error: error.message || 'Activity feed could not be loaded' };
  }
}

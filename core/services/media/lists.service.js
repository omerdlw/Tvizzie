'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';
import { resolveLimitCount } from '@/core/services/shared/supabase-media-utils.service';

export {
  createUserList,
  createUserListWithItems,
  deleteUserList,
  getUserListMemberships,
  toggleListLike,
  toggleUserListItem,
  updateListReviewsCount,
  updateUserList,
} from './lists.mutations';
export {
  subscribeToLikedLists,
  subscribeToUserList,
  subscribeToUserListBySlug,
  subscribeToUserListItems,
  subscribeToUserLists,
} from './lists.subscriptions';

export async function fetchProfileLikedLists({ cursor = null, pageSize = 36, userId }) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  const targetCount = resolveLimitCount(pageSize, 36, 500);
  let currentCursor = cursor || null;
  let hasMore = true;
  const items = [];

  while (hasMore && items.length < targetCount) {
    const batchLimit = Math.min(50, Math.max(1, targetCount - items.length));
    const payload = await requestApiJson('/api/collections', {
      query: {
        activeTab: 'likes',
        cursor: currentCursor,
        limit: batchLimit,
        resource: 'liked-lists',
        userId,
      },
    });

    const batch = Array.isArray(payload?.data) ? payload.data : [];
    items.push(...batch);
    hasMore = payload?.pageInfo?.hasMore === true;
    currentCursor = payload?.pageInfo?.cursor || null;

    if (cursor) {
      break;
    }
  }

  return {
    hasMore,
    items,
    nextCursor: hasMore ? currentCursor : null,
  };
}

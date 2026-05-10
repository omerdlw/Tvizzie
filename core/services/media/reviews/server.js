import 'server-only';

import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server.js';
import { ACCOUNT_REVIEWS_FEED_FUNCTION } from './server.constants.js';
import { fetchProfileReviewFeedLegacyServer } from './server.queries.js';
import { paginateReviewItems } from './server.shared.js';

export { fetchListReviewFeedServer } from './server.queries.js';

export async function fetchProfileReviewFeedServer({
  cursor = null,
  mode = 'authored',
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return paginateReviewItems([], cursor, pageSize);
  }

  try {
    const result = await invokeInternalEdgeFunction(ACCOUNT_REVIEWS_FEED_FUNCTION, {
      body: {
        cursor,
        mode,
        pageSize,
        userId,
        viewerId,
      },
    });

    return {
      hasMore: result?.hasMore === true,
      items: Array.isArray(result?.items) ? result.items : [],
      nextCursor: result?.nextCursor ?? null,
      totalCount: Number.isFinite(Number(result?.totalCount))
        ? Number(result.totalCount)
        : Array.isArray(result?.items)
          ? result.items.length
          : 0,
    };
  } catch {
    return fetchProfileReviewFeedLegacyServer({
      cursor,
      mode,
      pageSize,
      userId,
      viewerId,
    });
  }
}

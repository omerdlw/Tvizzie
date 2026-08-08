import 'server-only';

import { invokeInternalEdgeFunction } from '@/infrastructure/http/http-server';
import { ACCOUNT_REVIEWS_FEED_FUNCTION } from '@/domains/reviews/utils';
import { fetchProfileReviewFeedLegacyServer } from './review-server-queries.js';
import { paginateReviewItems } from './review-server-shared.js';

export { fetchListReviewFeedServer } from './review-server-queries.js';

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
    const directResult = await fetchProfileReviewFeedLegacyServer({
      cursor,
      mode,
      pageSize,
      userId,
      viewerId,
    });

    if (Array.isArray(directResult?.items)) {
      return directResult;
    }
  } catch {}

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
    return paginateReviewItems([], cursor, pageSize);
  }
}

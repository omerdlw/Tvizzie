import 'server-only';

import { fetchListReviewFeedServer } from './list-feed.server.js';
import { fetchProfileReviewFeedLegacyServer } from './profile-feed.server.js';
import { paginateReviewItems } from './review-normalizer.server.js';

export { fetchListReviewFeedServer };

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
  } catch (error) {
    if (Number(error?.status) === 403) throw error;
  }

  return paginateReviewItems([], cursor, pageSize);
}


'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';

export async function fetchProfileReviewFeed({
  cursor = null,
  mode = 'authored',
  pageSize = 20,
  userId,
}) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  return requestApiJson('/api/account/reviews', {
    query: {
      cursor,
      mode,
      pageSize,
      userId,
    },
  });
}

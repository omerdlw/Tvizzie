'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';

export { getListReviewContext } from './reviews.context';
export {
  deleteListReview,
  deleteMediaReview,
  deleteStoredReview,
  toggleListReviewLike,
  toggleReviewLike,
  toggleStoredReviewLike,
  upsertListReview,
  upsertMediaReview,
} from './reviews.mutations';
export { subscribeToListReviews, subscribeToMediaReviews } from './reviews.subscriptions';
export { getReviewMinLength, getReviewValidationError } from './reviews.validation';

export async function fetchProfileReviewFeed({ cursor = null, mode = 'authored', pageSize = 20, userId }) {
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

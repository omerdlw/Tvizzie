'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';

export { getListReviewContext } from './review-context.js';
export {
  deleteListReview,
  deleteMediaReview,
  deleteStoredReview,
  toggleListReviewLike,
  toggleReviewLike,
  toggleStoredReviewLike,
  upsertListReview,
  upsertMediaReview,
} from './mutations.js';
export { subscribeToListReviews, subscribeToMediaReviews } from './review-subscriptions.js';
export { getReviewMinLength, getReviewValidationError } from './validation.js';

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

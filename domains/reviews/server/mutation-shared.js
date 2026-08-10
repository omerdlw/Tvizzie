'use client';

import { unwrapReviewWriteResult } from '@/domains/reviews/utils';

import { executeReviewWrite } from '@/domains/reviews/api/reviews-write-client';

export async function toggleReviewLikeByKey({ reviewKey, reviewUserId, userId }) {
  const writePayload = await executeReviewWrite({
    action: 'toggle-review-like',
    reviewKey,
    reviewUserId,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);

  return writeResult?.isNowLiked === true;
}

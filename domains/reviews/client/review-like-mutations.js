'use client';

import { unwrapReviewWriteResult } from '@/domains/reviews/shared/review-utils';

import { executeReviewWrite } from './review-write-client.js';

export async function toggleReviewLikeByKey({ reviewKey, reviewUserId }) {
  const writePayload = await executeReviewWrite({
    action: 'toggle-review-like',
    reviewKey,
    reviewUserId,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);

  return writeResult?.isNowLiked === true;
}

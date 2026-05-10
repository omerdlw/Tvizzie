'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';
import { isUserMediaWatched, markUserWatched } from '../watched-watchlist/watched.service.js';
import { unwrapReviewWriteResult } from './shared.js';

export async function ensureWatchedBeforeMediaReview({ media, mediaKey, userId, watchedAt, hasText }) {
  const alreadyWatched = await isUserMediaWatched({
    mediaKey,
    userId,
  });

  if (alreadyWatched) {
    return {
      autoMarkedWatched: false,
    };
  }

  await markUserWatched({
    media,
    sourceLastAction: hasText ? 'review' : 'rating',
    userId,
    watchedAt,
  });

  return {
    autoMarkedWatched: true,
  };
}

export async function toggleReviewLikeByKey({ reviewKey, reviewUserId }) {
  const writePayload = await requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action: 'toggle-review-like',
      reviewKey,
      reviewUserId,
    },
  });
  const writeResult = unwrapReviewWriteResult(writePayload);

  return writeResult?.isNowLiked === true;
}

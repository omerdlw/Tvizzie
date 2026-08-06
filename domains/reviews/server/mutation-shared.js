'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import {
  isUserMediaWatched,
  markUserWatched,
} from '@/domains/media/server/watched-watchlist/watched-service';
import { unwrapReviewWriteResult } from '@/domains/reviews/utils';

export async function ensureWatchedBeforeMediaReview({
  media,
  mediaKey,
  userId,
  watchedAt,
  hasText,
}) {
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

import { executeReviewWriteServer } from '@/domains/reviews/api/reviews-write.server';

export async function toggleReviewLikeByKey({ reviewKey, reviewUserId, userId }) {
  const writePayload = await executeReviewWriteServer({
    action: 'toggle-review-like',
    reviewKey,
    reviewUserId,
    userId,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);

  return writeResult?.isNowLiked === true;
}

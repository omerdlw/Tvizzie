'use client';

import { requestApiJson } from '@/infrastructure/http/api-request.service';
import {
  isUserMediaWatched,
  markUserWatched,
} from '@/domains/media/server/watched-watchlist/watched.service';
import { unwrapReviewWriteResult } from './review-shared.js';

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

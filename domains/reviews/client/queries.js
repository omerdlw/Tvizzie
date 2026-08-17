'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { buildPollingSubscriptionKey } from '@/infrastructure/realtime/polling-subscription-service';
import {
  createMediaSnapshot,
} from '@/domains/media/utils/media-key';
import {
  isTitleMediaType,
} from '@/domains/media/utils/media-key';

export function getMediaReviewsSubscriptionKey(media) {
  return buildPollingSubscriptionKey('reviews:media', {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  });
}

export function getListReviewsSubscriptionKey({ ownerId, listId }) {
  return buildPollingSubscriptionKey('reviews:list', {
    listId,
    ownerId,
  });
}

export async function fetchMediaReviews(media, limitCount) {
  const mediaSnapshot = createMediaSnapshot(media);

  if (!isTitleMediaType(mediaSnapshot.entityType)) {
    return [];
  }

  const res = await requestApiJson('/api/reviews', {
    query: {
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
      limitCount,
      resource: 'media',
    },
  });

  return Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
}

export async function fetchListReviews({ ownerId, listId }, limitCount) {
  if (!ownerId || !listId) {
    return [];
  }

  const res = await requestApiJson('/api/reviews', {
    query: {
      limitCount,
      listId,
      ownerId,
      resource: 'list',
    },
  });

  return Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
}

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

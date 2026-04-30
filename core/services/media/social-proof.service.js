'use client';

import { createMediaSnapshot } from '@/core/services/shared/media-key.service';
import { isMovieMediaType } from '@/core/utils/media';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';

function createEmptyProofGroup() {
  return {
    count: 0,
    previewUsers: [],
    users: [],
  };
}

function createEmptyMediaSocialProof() {
  return {
    followingCount: 0,
    highlights: [],
    likes: createEmptyProofGroup(),
    lists: {
      count: 0,
      previewLists: [],
      previewUsers: [],
      users: [],
    },
    scope: 'following',
    reviews: createEmptyProofGroup(),
    similarTaste: {
      count: 0,
      previewTitles: [],
    },
    watched: createEmptyProofGroup(),
    watchlist: createEmptyProofGroup(),
  };
}

function normalizeKnownMovieIds(value = []) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item?.id ?? item?.entityId ?? item ?? '').trim())
        .filter(Boolean)
    )
  ).slice(0, 30);
}

async function fetchMediaSocialProof({ media, viewerId, knownMovieIds = [] }) {
  if (!viewerId || !media) {
    return createEmptyMediaSocialProof();
  }

  const mediaSnapshot = createMediaSnapshot(media);

  if (!mediaSnapshot.entityType || !mediaSnapshot.entityId || !mediaSnapshot.title) {
    return createEmptyMediaSocialProof();
  }

  if (!isMovieMediaType(mediaSnapshot.entityType)) {
    return createEmptyMediaSocialProof();
  }

  const payload = await requestApiJson('/api/social-proof', {
    query: {
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
      knownMovieIds: normalizeKnownMovieIds(knownMovieIds).join(','),
    },
  });

  return payload?.data || createEmptyMediaSocialProof();
}

export function subscribeToMediaSocialProof({ media, viewerId, knownMovieIds = [] }, callback, options = {}) {
  return createPollingSubscription(() => fetchMediaSocialProof({ media, viewerId, knownMovieIds }), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('social-proof:media', {
      entityId: media?.entityId ?? media?.id ?? null,
      entityType: media?.entityType ?? media?.media_type ?? null,
      knownMovieIds: normalizeKnownMovieIds(knownMovieIds).join('|'),
      viewerId,
    }),
  });
}

function createEmptyProfileSocialProof() {
  return {
    mutualFollowersCount: 0,
    sharedLikes: {
      count: 0,
      titles: [],
    },
  };
}

export async function getAccountSocialProof({ canViewPrivateContent = false, targetUserId, viewerId }) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return createEmptyProfileSocialProof();
  }

  if (!canViewPrivateContent) {
    return createEmptyProfileSocialProof();
  }

  const payload = await requestApiJson('/api/social-proof', {
    query: {
      canViewPrivateContent,
      resource: 'account',
      targetUserId,
    },
  });

  return payload?.data || createEmptyProfileSocialProof();
}

'use client'

import {
  createMediaSnapshot,
} from '@/services/core/media-key.service'
import { isMovieMediaType } from '@/lib/media'
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
} from '@/services/core/polling-subscription.service'
import { requestApiJson } from '@/services/core/api-request.service'

function createEmptyProofGroup() {
  return {
    count: 0,
    previewUsers: [],
    users: [],
  }
}

function createEmptyMediaSocialProof() {
  return {
    reviews: createEmptyProofGroup(),
    likes: createEmptyProofGroup(),
    watchlist: createEmptyProofGroup(),
  }
}

async function fetchMediaSocialProof({ media, viewerId }) {
  if (!viewerId || !media) {
    return createEmptyMediaSocialProof()
  }

  const mediaSnapshot = createMediaSnapshot(media)

  if (
    !isMovieMediaType(mediaSnapshot.entityType) ||
    !mediaSnapshot.entityType ||
    !mediaSnapshot.entityId ||
    !mediaSnapshot.title
  ) {
    return createEmptyMediaSocialProof()
  }

  const payload = await requestApiJson('/api/social-proof', {
    query: {
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
    },
  })

  return payload?.data || createEmptyMediaSocialProof()
}

export function subscribeToMediaSocialProof(
  { media, viewerId },
  callback,
  options = {}
) {
  return createPollingSubscription(
    () => fetchMediaSocialProof({ media, viewerId }),
    callback,
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('social-proof:media', {
        entityId: media?.entityId ?? media?.id ?? null,
        entityType: media?.entityType ?? media?.media_type ?? null,
        viewerId,
      }),
    }
  )
}

function createEmptyProfileSocialProof() {
  return {
    mutualFollowersCount: 0,
    sharedLikes: {
      count: 0,
      titles: [],
    },
  }
}

export async function getAccountSocialProof({
  canViewPrivateContent = false,
  targetUserId,
  viewerId,
}) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return createEmptyProfileSocialProof()
  }

  if (!canViewPrivateContent) {
    return createEmptyProfileSocialProof()
  }

  const payload = await requestApiJson('/api/social-proof', {
    query: {
      canViewPrivateContent,
      resource: 'account',
      targetUserId,
    },
  })

  return payload?.data || createEmptyProfileSocialProof()
}

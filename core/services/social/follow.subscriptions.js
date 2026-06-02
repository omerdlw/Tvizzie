'use client';

import { createPollingSubscription } from '@/core/services/shared/client';
import { subscribeToUserLiveEvent } from '@/core/services/realtime/live-updates.service';
import { requestApiJson } from '@/core/services/shared/client';

import { createEmptyRelationshipState, FOLLOW_STATUSES } from './follow.constants';
import {
  FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
  FOLLOW_SUBSCRIPTION_INTERVAL_MS,
  PENDING_RELATIONSHIP_FALLBACK_REFETCH_MS,
  PENDING_RELATIONSHIP_MAX_POLLS,
  getFollowersSubscriptionKey,
  getFollowingSubscriptionKey,
  getRelationshipSubscriptionKey,
  normalizeLiveFollowPayload,
  refreshFollowUserSubscriptions,
  refreshRelationshipSubscription,
} from './follow.client-shared';

async function fetchFollowCollection(userId, direction, status) {
  const payload = await requestApiJson('/api/follows', {
    query: {
      resource: direction,
      status,
      userId,
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

export function subscribeToFollowers(userId, callback, options = {}) {
  const status = options.status || FOLLOW_STATUSES.ACCEPTED;
  const subscriptionKey = getFollowersSubscriptionKey(userId, status);
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowCollection(userId, 'followers', status),
    callback,
    {
      ...options,
      hiddenIntervalMs: options.hiddenIntervalMs ?? FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
      intervalMs: options.intervalMs ?? FOLLOW_SUBSCRIPTION_INTERVAL_MS,
      subscriptionKey,
    }
  );
  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'follows', (payload) => {
    const livePayload = normalizeLiveFollowPayload(payload);

    if (livePayload.followingId !== userId) {
      return;
    }

    refreshFollowUserSubscriptions(userId);
  });
  const shouldUsePendingFallback = status === FOLLOW_STATUSES.PENDING && options.enablePendingFallback === true;
  let fallbackTimer = null;
  let fallbackPollCount = 0;
  let disposed = false;

  function schedulePendingFollowersFallbackPoll() {
    if (disposed || typeof window === 'undefined' || !userId || !shouldUsePendingFallback) {
      return;
    }

    fallbackTimer = window.setTimeout(() => {
      if (disposed) return;

      fallbackPollCount += 1;

      if (fallbackPollCount > PENDING_RELATIONSHIP_MAX_POLLS) {
        return;
      }

      refreshFollowUserSubscriptions(userId);
      schedulePendingFollowersFallbackPoll();
    }, PENDING_RELATIONSHIP_FALLBACK_REFETCH_MS);
  }

  schedulePendingFollowersFallbackPoll();

  return () => {
    disposed = true;
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
    }
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToFollowing(userId, callback, options = {}) {
  const status = options.status || FOLLOW_STATUSES.ACCEPTED;
  const subscriptionKey = getFollowingSubscriptionKey(userId, status);
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowCollection(userId, 'following', status),
    callback,
    {
      ...options,
      hiddenIntervalMs: options.hiddenIntervalMs ?? FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
      intervalMs: options.intervalMs ?? FOLLOW_SUBSCRIPTION_INTERVAL_MS,
      subscriptionKey,
    }
  );
  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'follows', (payload) => {
    const livePayload = normalizeLiveFollowPayload(payload);

    if (livePayload.followerId !== userId) {
      return;
    }

    refreshFollowUserSubscriptions(userId);
  });

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

async function fetchFollowRelationshipState(viewerId, targetId) {
  if (!targetId) {
    return createEmptyRelationshipState();
  }

  const payload = await requestApiJson('/api/follows', {
    query: {
      resource: 'relationship',
      targetId,
      viewerId,
    },
  });

  return payload?.data || createEmptyRelationshipState();
}

export function subscribeToFollowRelationship(viewerId, targetId, callback, options = {}) {
  const normalizedViewerId = String(viewerId || '').trim() || null;
  const normalizedTargetId = String(targetId || '').trim() || null;
  const subscriptionKey = getRelationshipSubscriptionKey(normalizedViewerId, normalizedTargetId);
  let latestRelationship = null;
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowRelationshipState(normalizedViewerId, normalizedTargetId),
    (relationship) => {
      latestRelationship = relationship;
      callback(relationship);
    },
    {
      ...options,
      hiddenIntervalMs: options.hiddenIntervalMs ?? FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
      intervalMs: options.intervalMs ?? FOLLOW_SUBSCRIPTION_INTERVAL_MS,
      subscriptionKey,
    }
  );
  const unsubscribeLive = subscribeToUserLiveEvent(normalizedViewerId, 'follows', (payload) => {
    const livePayload = normalizeLiveFollowPayload(payload);
    const matchesDirectRelationship =
      livePayload.followerId === normalizedViewerId && livePayload.followingId === normalizedTargetId;
    const matchesInverseRelationship =
      livePayload.followerId === normalizedTargetId && livePayload.followingId === normalizedViewerId;

    if (!matchesDirectRelationship && !matchesInverseRelationship) {
      return;
    }

    refreshRelationshipSubscription(subscriptionKey, normalizedViewerId);
  });
  let fallbackTimer = null;
  let fallbackPollCount = 0;
  let disposed = false;
  const shouldUsePendingFallback = options.enablePendingFallback === true;

  function scheduleFallbackPoll() {
    if (
      !shouldUsePendingFallback ||
      disposed ||
      typeof window === 'undefined' ||
      !normalizedViewerId ||
      !normalizedTargetId
    ) {
      return;
    }

    fallbackTimer = window.setTimeout(() => {
      if (disposed) return;

      const isRelationshipLoaded =
        latestRelationship?.isOutboundRelationshipLoaded === true ||
        latestRelationship?.isInboundRelationshipLoaded === true;
      const outboundStatus = String(latestRelationship?.outboundStatus || '')
        .trim()
        .toLowerCase();
      const inboundStatus = String(latestRelationship?.inboundStatus || '')
        .trim()
        .toLowerCase();
      const shouldContinuePolling =
        !isRelationshipLoaded ||
        outboundStatus === FOLLOW_STATUSES.PENDING ||
        inboundStatus === FOLLOW_STATUSES.PENDING;

      if (!shouldContinuePolling) {
        return;
      }

      fallbackPollCount += 1;

      if (fallbackPollCount > PENDING_RELATIONSHIP_MAX_POLLS) {
        return;
      }

      refreshRelationshipSubscription(subscriptionKey, normalizedViewerId);
      scheduleFallbackPoll();
    }, PENDING_RELATIONSHIP_FALLBACK_REFETCH_MS);
  }

  scheduleFallbackPoll();

  return () => {
    disposed = true;
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
    }
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToFollowStatus(followerId, followingId, callback, options = {}) {
  return subscribeToFollowRelationship(
    followerId,
    followingId,
    (relationship) => {
      callback(relationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED);
    },
    options
  );
}

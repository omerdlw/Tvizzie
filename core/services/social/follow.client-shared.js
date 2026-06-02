'use client';

import {
  buildPollingSubscriptionKey,
  invalidatePollingSubscriptions,
  scheduleAccountSummaryRefresh,
} from '@/core/services/shared/client';

import { FOLLOW_STATUSES } from './follow.constants';

export const PENDING_RELATIONSHIP_FALLBACK_REFETCH_MS = 2500;
export const PENDING_RELATIONSHIP_MAX_POLLS = 60;
export const FOLLOW_SUBSCRIPTION_INTERVAL_MS = 3000;
export const FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 9000;

export function getFollowersSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:followers', {
    status,
    userId,
  });
}

export function getFollowingSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:following', {
    status,
    userId,
  });
}

export function getRelationshipSubscriptionKey(viewerId, targetId) {
  return buildPollingSubscriptionKey('follows:relationship', {
    targetId,
    viewerId,
  });
}

export function normalizeLiveFollowPayload(payload = {}) {
  return {
    followerId: String(payload?.followerId || '').trim() || null,
    followingId: String(payload?.followingId || '').trim() || null,
    reason:
      String(payload?.reason || '')
        .trim()
        .toLowerCase() || null,
    status:
      String(payload?.status || '')
        .trim()
        .toLowerCase() || null,
  };
}

export function refreshFollowUserSubscriptions(userId) {
  if (!userId) {
    return;
  }

  const keys = [
    getFollowersSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowersSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
    getFollowingSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowingSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
  ];

  invalidatePollingSubscriptions(keys, { refetch: true });
  scheduleAccountSummaryRefresh(userId);
}

export function refreshFollowSubscriptions({ followerId, followingId, status = null }) {
  const relationshipStatuses = status ? [status] : [FOLLOW_STATUSES.ACCEPTED, FOLLOW_STATUSES.PENDING];
  const keys = [
    ...relationshipStatuses.flatMap((currentStatus) => [
      getFollowersSubscriptionKey(followingId, currentStatus),
      getFollowingSubscriptionKey(followerId, currentStatus),
    ]),
    getRelationshipSubscriptionKey(followerId, followingId),
  ];

  invalidatePollingSubscriptions(keys, { refetch: true });
  scheduleAccountSummaryRefresh(followerId);
  scheduleAccountSummaryRefresh(followingId);
}

export function refreshRelationshipSubscription(subscriptionKey, viewerId) {
  if (!subscriptionKey) {
    return;
  }

  invalidatePollingSubscriptions([subscriptionKey], {
    clearCache: false,
    refetch: true,
  });
  if (viewerId) {
    scheduleAccountSummaryRefresh(viewerId);
  }
}

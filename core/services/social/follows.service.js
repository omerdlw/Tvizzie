'use client';

import { subscribeToUserLiveEvent } from '@/core/services/realtime/live-updates.service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscriptions,
} from '@/core/services/shared/polling-subscription.service';
import { scheduleAccountSummaryRefresh } from '@/core/services/shared/account-summary.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';

const PENDING_RELATIONSHIP_FALLBACK_REFETCH_MS = 8000;
const PENDING_RELATIONSHIP_MAX_POLLS = 30;

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

function createEmptyRelationshipState() {
  return {
    canViewPrivateContent: false,
    inboundRelationship: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    inboundStatus: null,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundRelationship: null,
    outboundStatus: null,
    showFollowBack: false,
  };
}

function getFollowersSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:followers', {
    status,
    userId,
  });
}

function getFollowingSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:following', {
    status,
    userId,
  });
}

function getRelationshipSubscriptionKey(viewerId, targetId) {
  return buildPollingSubscriptionKey('follows:relationship', {
    targetId,
    viewerId,
  });
}

function normalizeLiveFollowPayload(payload = {}) {
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

function refreshFollowUserSubscriptions(userId) {
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

function refreshFollowSubscriptions({ followerId, followingId, status = null }) {
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

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');
  if (followerId === followingId) throw new Error('You cannot follow yourself');

  await requestApiJson('/api/follows', {
    method: 'POST',
    body: {
      action: 'follow',
      followingId,
    },
  });

  refreshFollowSubscriptions({
    followerId,
    followingId,
  });
}

export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'unfollow',
      followingId,
    },
  });

  refreshFollowSubscriptions({
    followerId,
    followingId,
  });
}

export async function removeFollower(userId, followerId) {
  if (!userId || !followerId) throw new Error('Invalid user IDs');
  if (userId === followerId) throw new Error('You cannot remove yourself');

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'remove-follower',
      followerId,
    },
  });

  refreshFollowSubscriptions({
    followerId,
    followingId: userId,
  });
}

export async function cancelFollowRequest(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'cancel-request',
      followingId,
    },
  });

  refreshFollowSubscriptions({
    followerId,
    followingId,
  });
}

export async function acceptFollowRequest(userId, requesterId) {
  await requestApiJson('/api/follows', {
    method: 'PATCH',
    body: {
      action: 'accept',
      requesterId,
    },
  });

  refreshFollowSubscriptions({
    followerId: requesterId,
    followingId: userId,
  });
}

export async function rejectFollowRequest(userId, requesterId) {
  await requestApiJson('/api/follows', {
    method: 'PATCH',
    body: {
      action: 'reject',
      requesterId,
    },
  });

  refreshFollowSubscriptions({
    followerId: requesterId,
    followingId: userId,
  });
}

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

  return () => {
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

function refreshRelationshipSubscription(subscriptionKey, viewerId) {
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

export function subscribeToFollowRelationship(viewerId, targetId, callback) {
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

  function scheduleFallbackPoll() {
    if (disposed || typeof window === 'undefined' || !normalizedViewerId || !normalizedTargetId) {
      return;
    }

    fallbackTimer = window.setTimeout(() => {
      if (disposed) return;

      const outboundStatus = String(latestRelationship?.outboundStatus || '')
        .trim()
        .toLowerCase();

      if (outboundStatus !== FOLLOW_STATUSES.PENDING) {
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

export function subscribeToFollowStatus(followerId, followingId, callback) {
  return subscribeToFollowRelationship(followerId, followingId, (relationship) => {
    callback(relationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED);
  });
}

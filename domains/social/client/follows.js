'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscriptions,
  primePollingSubscription,
} from '@/infrastructure/realtime/client';
import { subscribeToUserLiveEvent } from '@/infrastructure/realtime/client';
import { requestApiJson } from '@/infrastructure/http/client';
import { scheduleAccountSummaryRefresh } from '@/domains/account/client';
import { FOLLOW_STATUSES } from '@/domains/social/utils/constants';
import {
  createEmptyRelationshipState,
  normalizeLiveFollowPayload,
} from '@/domains/social/utils/formatting';

export const PENDING_RELATIONSHIP_FALLBACK_REFETCH_MS = 2500;
export const PENDING_RELATIONSHIP_MAX_POLLS = 60;
export const FOLLOW_SUBSCRIPTION_INTERVAL_MS = 60000;
export const FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 180000;

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

export function getFollowersCountSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:followers-count', {
    status,
    userId,
  });
}

export function getFollowingCountSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:following-count', {
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

export { normalizeLiveFollowPayload };

export function refreshFollowUserSubscriptions(userId) {
  if (!userId) {
    return;
  }

  const keys = [
    getFollowersSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowersSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
    getFollowingSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowingSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
    getFollowersCountSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowersCountSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
    getFollowingCountSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowingCountSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
  ];

  invalidatePollingSubscriptions(keys, { refetch: true });
  scheduleAccountSummaryRefresh(userId);
}

export function refreshFollowSubscriptions({ followerId, followingId, status = null }) {
  const relationshipStatuses = status
    ? [status]
    : [FOLLOW_STATUSES.ACCEPTED, FOLLOW_STATUSES.PENDING];
  const keys = [
    ...relationshipStatuses.flatMap((currentStatus) => [
      getFollowersSubscriptionKey(followingId, currentStatus),
      getFollowingSubscriptionKey(followerId, currentStatus),
      getFollowersCountSubscriptionKey(followingId, currentStatus),
      getFollowingCountSubscriptionKey(followerId, currentStatus),
    ]),
    getRelationshipSubscriptionKey(followerId, followingId),
  ];

  invalidatePollingSubscriptions(keys, { clearCache: false, refetch: true });
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

export function primeFollowRelationshipState(viewerId, targetId, relationshipPayload) {
  if (!viewerId || !targetId || !relationshipPayload) return;
  const key = getRelationshipSubscriptionKey(viewerId, targetId);
  primePollingSubscription(key, relationshipPayload, { emit: true });
}

export async function followUser(followerId, followingId, { isPrivate = false } = {}) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');
  if (followerId === followingId) throw new Error('You cannot follow yourself');

  const optimisticStatus = isPrivate ? 'pending' : 'accepted';
  const optimisticPayload = {
    canViewPrivateContent: optimisticStatus === 'accepted',
    inboundRelationship: null,
    inboundStatus: null,
    isInboundRelationshipLoaded: true,
    isOutboundRelationshipLoaded: true,
    isPrivateProfile: Boolean(isPrivate),
    isTargetProfileLoaded: true,
    outboundRelationship: {
      followerId,
      followingId,
      status: optimisticStatus,
    },
    outboundStatus: optimisticStatus,
    showFollowBack: false,
  };

  primeFollowRelationshipState(followerId, followingId, optimisticPayload);

  try {
    const res = await requestApiJson('/api/follows', {
      method: 'POST',
      body: {
        action: 'follow',
        followingId,
      },
    });

    const nextStatus = res?.data?.status || res?.status || optimisticStatus;
    const finalPayload = {
      canViewPrivateContent: nextStatus === 'accepted',
      inboundRelationship: null,
      inboundStatus: null,
      isInboundRelationshipLoaded: true,
      isOutboundRelationshipLoaded: true,
      isPrivateProfile: nextStatus === 'pending',
      isTargetProfileLoaded: true,
      outboundRelationship: {
        followerId,
        followingId,
        status: nextStatus,
      },
      outboundStatus: nextStatus,
      showFollowBack: false,
    };

    primeFollowRelationshipState(followerId, followingId, finalPayload);

    refreshFollowSubscriptions({
      followerId,
      followingId,
      status: nextStatus,
    });

    return nextStatus;
  } catch (error) {
    primeFollowRelationshipState(followerId, followingId, {
      canViewPrivateContent: false,
      inboundRelationship: null,
      inboundStatus: null,
      isInboundRelationshipLoaded: true,
      isOutboundRelationshipLoaded: true,
      isPrivateProfile: Boolean(isPrivate),
      isTargetProfileLoaded: true,
      outboundRelationship: null,
      outboundStatus: null,
      showFollowBack: false,
    });
    refreshFollowSubscriptions({ followerId, followingId });
    throw error;
  }
}

export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');

  const unfollowPayload = {
    canViewPrivateContent: false,
    inboundRelationship: null,
    inboundStatus: null,
    isInboundRelationshipLoaded: true,
    isOutboundRelationshipLoaded: true,
    isPrivateProfile: false,
    isTargetProfileLoaded: true,
    outboundRelationship: null,
    outboundStatus: null,
    showFollowBack: false,
  };

  primeFollowRelationshipState(followerId, followingId, unfollowPayload);

  try {
    await requestApiJson('/api/follows', {
      method: 'DELETE',
      body: {
        action: 'unfollow',
        followingId,
      },
    });

    primeFollowRelationshipState(followerId, followingId, unfollowPayload);

    refreshFollowSubscriptions({
      followerId,
      followingId,
    });
  } catch (error) {
    primeFollowRelationshipState(followerId, followingId, {
      canViewPrivateContent: true,
      inboundRelationship: null,
      inboundStatus: null,
      isInboundRelationshipLoaded: true,
      isOutboundRelationshipLoaded: true,
      isPrivateProfile: false,
      isTargetProfileLoaded: true,
      outboundRelationship: {
        followerId,
        followingId,
        status: 'accepted',
      },
      outboundStatus: 'accepted',
      showFollowBack: false,
    });
    refreshFollowSubscriptions({ followerId, followingId, status: 'accepted' });
    throw error;
  }
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

  const cancelledPayload = {
    canViewPrivateContent: false,
    inboundRelationship: null,
    inboundStatus: null,
    isInboundRelationshipLoaded: true,
    isOutboundRelationshipLoaded: true,
    isPrivateProfile: false,
    isTargetProfileLoaded: true,
    outboundRelationship: null,
    outboundStatus: null,
    showFollowBack: false,
  };

  primeFollowRelationshipState(followerId, followingId, cancelledPayload);

  try {
    await requestApiJson('/api/follows', {
      method: 'DELETE',
      body: {
        action: 'cancel-request',
        followingId,
      },
    });

    primeFollowRelationshipState(followerId, followingId, cancelledPayload);

    refreshFollowSubscriptions({
      followerId,
      followingId,
    });
  } catch (error) {
    throw error;
  }
}

export async function acceptFollowRequest(userId, requesterId) {
  if (!userId || !requesterId) throw new Error('Invalid user IDs');

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
  if (!userId || !requesterId) throw new Error('Invalid user IDs');

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

async function fetchFollowCount(userId, direction, status) {
  const payload = await requestApiJson('/api/follows', {
    query: {
      resource: `${direction}-count`,
      status,
      userId,
    },
  });

  return Number.isFinite(Number(payload?.data)) ? Number(payload.data) : 0;
}

function getFollowCountSubscriptionKey(userId, direction, status) {
  return direction === 'followers'
    ? getFollowersCountSubscriptionKey(userId, status)
    : getFollowingCountSubscriptionKey(userId, status);
}

export function subscribeToFollowerCount(userId, callback, options = {}) {
  return subscribeToFollowCount(userId, 'followers', callback, options);
}

export function subscribeToFollowingCount(userId, callback, options = {}) {
  return subscribeToFollowCount(userId, 'following', callback, options);
}

function subscribeToFollowCount(userId, direction, callback, options = {}) {
  if (!userId) {
    callback(0);
    return () => {};
  }

  const status = options.status || FOLLOW_STATUSES.ACCEPTED;
  const subscriptionKey = getFollowCountSubscriptionKey(userId, direction, status);
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowCount(userId, direction, status),
    (count) => callback(Number.isFinite(Number(count)) ? Number(count) : 0),
    {
      ...options,
      hiddenIntervalMs: options.hiddenIntervalMs ?? FOLLOW_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
      intervalMs: options.intervalMs ?? FOLLOW_SUBSCRIPTION_INTERVAL_MS,
      subscriptionKey,
    },
  );

  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'follows', (payload) => {
    const livePayload = normalizeLiveFollowPayload(payload);
    const matchesSubscription =
      direction === 'followers'
        ? livePayload.followingId === userId
        : livePayload.followerId === userId;

    if (matchesSubscription) {
      refreshFollowUserSubscriptions(userId);
    }
  });

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToFollowers(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

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
    },
  );
  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'follows', (payload) => {
    const livePayload = normalizeLiveFollowPayload(payload);

    if (livePayload.followingId !== userId) {
      return;
    }

    refreshFollowUserSubscriptions(userId);
  });
  const shouldUsePendingFallback =
    status === FOLLOW_STATUSES.PENDING && options.enablePendingFallback === true;
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
    if (fallbackTimer !== null) {
      window.clearTimeout(fallbackTimer);
    }
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToFollowing(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

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
    },
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

  if (!normalizedTargetId) {
    callback(createEmptyRelationshipState());
    return () => {};
  }

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
    },
  );
  const unsubscribeLive = subscribeToUserLiveEvent(normalizedViewerId, 'follows', (payload) => {
    const livePayload = normalizeLiveFollowPayload(payload);
    const matchesDirectRelationship =
      livePayload.followerId === normalizedViewerId &&
      livePayload.followingId === normalizedTargetId;
    const matchesInverseRelationship =
      livePayload.followerId === normalizedTargetId &&
      livePayload.followingId === normalizedViewerId;

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
    if (fallbackTimer !== null) {
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
    options,
  );
}

export { FOLLOW_STATUSES };

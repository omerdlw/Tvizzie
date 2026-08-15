'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { primeFollowRelationshipState, refreshFollowSubscriptions } from './follow-cache';

export async function followUser(followerId, followingId, { isPrivate = false } = {}) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');
  if (followerId === followingId) throw new Error('You cannot follow yourself');

  const optimisticStatus = isPrivate ? 'pending' : 'accepted';

  // 0ms Optimistic UI update
  primeFollowRelationshipState(followerId, followingId, {
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
  });

  refreshFollowSubscriptions({
    followerId,
    followingId,
    status: optimisticStatus,
  });

  try {
    const res = await requestApiJson('/api/follows', {
      method: 'POST',
      body: {
        action: 'follow',
        followingId,
      },
    });

    const nextStatus = res?.data?.status || res?.status || optimisticStatus;
    if (nextStatus !== optimisticStatus) {
      primeFollowRelationshipState(followerId, followingId, {
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
      });

      refreshFollowSubscriptions({
        followerId,
        followingId,
        status: nextStatus,
      });
    }

    return nextStatus;
  } catch (error) {
    // Rollback on failure
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

  // 0ms Optimistic UI update
  primeFollowRelationshipState(followerId, followingId, {
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
  });

  refreshFollowSubscriptions({
    followerId,
    followingId,
  });

  try {
    await requestApiJson('/api/follows', {
      method: 'DELETE',
      body: {
        action: 'unfollow',
        followingId,
      },
    });
  } catch (error) {
    // Rollback to followed state on failure
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

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'cancel-request',
      followingId,
    },
  });

  primeFollowRelationshipState(followerId, followingId, {
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
  });

  refreshFollowSubscriptions({
    followerId,
    followingId,
  });
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

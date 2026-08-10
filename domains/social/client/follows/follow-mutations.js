'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { primeFollowRelationshipState, refreshFollowSubscriptions } from './follow-cache';

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs');
  if (followerId === followingId) throw new Error('You cannot follow yourself');

  const res = await requestApiJson('/api/follows', {
    method: 'POST',
    body: {
      action: 'follow',
      followingId,
    },
  });

  const nextStatus = res?.data?.status || res?.status || 'accepted';
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

  return nextStatus;
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

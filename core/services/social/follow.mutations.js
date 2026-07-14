'use client';

import { requestApiJson } from '@/core/services/shared/client';
import { refreshFollowSubscriptions } from './follow.client-shared';

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

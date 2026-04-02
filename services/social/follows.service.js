'use client'

import { subscribeToUserLiveEvent } from '@/services/realtime/live-updates.service'
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscriptions,
} from '@/services/core/polling-subscription.service'
import { scheduleAccountSummaryRefresh } from '@/services/core/account-summary-v2.service'
import { requestApiJson } from '@/services/core/api-request.service'

const INFRA_V2_CLIENT_ENABLED =
  process.env.NEXT_PUBLIC_INFRA_V2_ENABLED === 'true'

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
})

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
  }
}

function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', {
    userId,
  })
}

function getFollowersSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:followers', {
    status,
    userId,
  })
}

function getFollowingSubscriptionKey(userId, status = FOLLOW_STATUSES.ACCEPTED) {
  return buildPollingSubscriptionKey('follows:following', {
    status,
    userId,
  })
}

function getRelationshipSubscriptionKey(viewerId, targetId) {
  return buildPollingSubscriptionKey('follows:relationship', {
    targetId,
    viewerId,
  })
}

function normalizeLiveFollowPayload(payload = {}) {
  return {
    followerId: String(payload?.followerId || '').trim() || null,
    followingId: String(payload?.followingId || '').trim() || null,
    reason: String(payload?.reason || '').trim().toLowerCase() || null,
    status: String(payload?.status || '').trim().toLowerCase() || null,
  }
}

function refreshFollowUserSubscriptions(userId) {
  if (!userId) {
    return
  }

  const keys = [
    getFollowersSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowersSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
    getFollowingSubscriptionKey(userId, FOLLOW_STATUSES.ACCEPTED),
    getFollowingSubscriptionKey(userId, FOLLOW_STATUSES.PENDING),
  ]

  if (!INFRA_V2_CLIENT_ENABLED) {
    keys.push(getUserAccountSubscriptionKey(userId))
  }

  invalidatePollingSubscriptions(
    keys,
    { refetch: true }
  )

  if (INFRA_V2_CLIENT_ENABLED) {
    scheduleAccountSummaryRefresh(userId)
  }
}

function refreshFollowSubscriptions({ followerId, followingId, status = null }) {
  const relationshipStatuses = status
    ? [status]
    : [FOLLOW_STATUSES.ACCEPTED, FOLLOW_STATUSES.PENDING]
  const keys = [
    ...relationshipStatuses.flatMap((currentStatus) => [
      getFollowersSubscriptionKey(followingId, currentStatus),
      getFollowingSubscriptionKey(followerId, currentStatus),
    ]),
    getRelationshipSubscriptionKey(followerId, followingId),
  ]

  if (!INFRA_V2_CLIENT_ENABLED) {
    keys.push(
      getUserAccountSubscriptionKey(followerId),
      getUserAccountSubscriptionKey(followingId)
    )
  }

  invalidatePollingSubscriptions(
    keys,
    { refetch: true }
  )

  if (INFRA_V2_CLIENT_ENABLED) {
    scheduleAccountSummaryRefresh(followerId)
    scheduleAccountSummaryRefresh(followingId)
  }
}

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs')
  if (followerId === followingId) throw new Error('You cannot follow yourself')

  await requestApiJson('/api/follows', {
    method: 'POST',
    body: {
      action: 'follow',
      followingId,
    },
  })

  refreshFollowSubscriptions({
    followerId,
    followingId,
  })
}

export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs')

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'unfollow',
      followingId,
    },
  })

  refreshFollowSubscriptions({
    followerId,
    followingId,
  })
}

export async function removeFollower(userId, followerId) {
  if (!userId || !followerId) throw new Error('Invalid user IDs')
  if (userId === followerId) throw new Error('You cannot remove yourself')

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'remove-follower',
      followerId,
    },
  })

  refreshFollowSubscriptions({
    followerId,
    followingId: userId,
  })
}

export async function cancelFollowRequest(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs')

  await requestApiJson('/api/follows', {
    method: 'DELETE',
    body: {
      action: 'cancel-request',
      followingId,
    },
  })

  refreshFollowSubscriptions({
    followerId,
    followingId,
  })
}

export async function acceptFollowRequest(userId, requesterId) {
  await requestApiJson('/api/follows', {
    method: 'PATCH',
    body: {
      action: 'accept',
      requesterId,
    },
  })

  refreshFollowSubscriptions({
    followerId: requesterId,
    followingId: userId,
  })
}

export async function rejectFollowRequest(userId, requesterId) {
  await requestApiJson('/api/follows', {
    method: 'PATCH',
    body: {
      action: 'reject',
      requesterId,
    },
  })

  refreshFollowSubscriptions({
    followerId: requesterId,
    followingId: userId,
  })
}

async function fetchFollowCollection(userId, direction, status) {
  const payload = await requestApiJson('/api/follows', {
    query: {
      resource: direction,
      status,
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

export function subscribeToFollowers(userId, callback, options = {}) {
  const status = options.status || FOLLOW_STATUSES.ACCEPTED
  const subscriptionKey = getFollowersSubscriptionKey(userId, status)
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowCollection(userId, 'followers', status),
    callback,
    {
      ...options,
      subscriptionKey,
    }
  )
  const unsubscribeLive = subscribeToUserLiveEvent(
    userId,
    'follows',
    (payload) => {
      const livePayload = normalizeLiveFollowPayload(payload)

      if (livePayload.followingId !== userId) {
        return
      }

      refreshFollowUserSubscriptions(userId)
    }
  )

  return () => {
    unsubscribeLive()
    unsubscribeData()
  }
}

export function subscribeToFollowing(userId, callback, options = {}) {
  const status = options.status || FOLLOW_STATUSES.ACCEPTED
  const subscriptionKey = getFollowingSubscriptionKey(userId, status)
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowCollection(userId, 'following', status),
    callback,
    {
      ...options,
      subscriptionKey,
    }
  )
  const unsubscribeLive = subscribeToUserLiveEvent(
    userId,
    'follows',
    (payload) => {
      const livePayload = normalizeLiveFollowPayload(payload)

      if (livePayload.followerId !== userId) {
        return
      }

      refreshFollowUserSubscriptions(userId)
    }
  )

  return () => {
    unsubscribeLive()
    unsubscribeData()
  }
}

async function fetchFollowRelationshipState(viewerId, targetId) {
  if (!targetId) {
    return createEmptyRelationshipState()
  }

  const payload = await requestApiJson('/api/follows', {
    query: {
      resource: 'relationship',
      targetId,
      viewerId,
    },
  })

  return payload?.data || createEmptyRelationshipState()
}

export function subscribeToFollowRelationship(viewerId, targetId, callback) {
  const subscriptionKey = getRelationshipSubscriptionKey(viewerId, targetId)
  const unsubscribeData = createPollingSubscription(
    () => fetchFollowRelationshipState(viewerId, targetId),
    callback,
    {
      subscriptionKey,
    }
  )
  const unsubscribeLive = subscribeToUserLiveEvent(
    viewerId,
    'follows',
    (payload) => {
      const livePayload = normalizeLiveFollowPayload(payload)
      const matchesDirectRelationship =
        livePayload.followerId === viewerId &&
        livePayload.followingId === targetId
      const matchesInverseRelationship =
        livePayload.followerId === targetId &&
        livePayload.followingId === viewerId

      if (!matchesDirectRelationship && !matchesInverseRelationship) {
        return
      }

      if (INFRA_V2_CLIENT_ENABLED) {
        invalidatePollingSubscriptions([subscriptionKey], { refetch: true })
        scheduleAccountSummaryRefresh(viewerId)
        return
      }

      invalidatePollingSubscriptions(
        [subscriptionKey, getUserAccountSubscriptionKey(viewerId)],
        { refetch: true }
      )
    }
  )

  return () => {
    unsubscribeLive()
    unsubscribeData()
  }
}

export function subscribeToFollowStatus(followerId, followingId, callback) {
  return subscribeToFollowRelationship(
    followerId,
    followingId,
    (relationship) => {
      callback(relationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED)
    }
  )
}

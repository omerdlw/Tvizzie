import { NextResponse } from 'next/server'

import { ACTIVITY_EVENT_TYPES } from '@/lib/constants/activity-events'
import { NOTIFICATION_EVENT_TYPES } from '@/lib/constants/notification-events'
import { requireAuthenticatedRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { readSessionFromRequest } from '@/lib/auth/servers/session/session.server'
import { processActivityEvent } from '@/lib/activity/event-processor.server'
import { publishUserEvent } from '@/lib/live-updates/user-events.server'
import { processNotificationEvent } from '@/lib/notifications/event-processor.server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAccountProfileByUserId,
  getFollowResource,
} from '@/services/browser/browser-data-v2.server'

export const runtime = 'nodejs'

const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
})

function normalizeValue(value) {
  return String(value || '').trim()
}

function normalizeErrorMessage(error, fallbackMessage) {
  return normalizeValue(error?.message || fallbackMessage)
}

function resolveWriteStatusCode(message) {
  const normalizedMessage = normalizeValue(message).toLowerCase()

  if (
    normalizedMessage.includes('authentication session is required') ||
    normalizedMessage.includes('invalid or expired authentication token') ||
    normalizedMessage.includes('authentication token has been revoked')
  ) {
    return 401
  }

  if (
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('already been resolved') ||
    normalizedMessage.includes('cannot follow yourself') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('unsupported')
  ) {
    return 400
  }

  return 500
}

async function getExistingFollow(admin, followerId, followingId) {
  const result = await admin
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message || 'Follow relationship could not be loaded')
  }

  return result.data || null
}

async function saveFollowRelationship(admin, {
  followerId,
  followerProfile,
  followingId,
  followingProfile,
  status,
  createdAt = null,
}) {
  const result = await admin.rpc('follow_upsert_v2', {
    p_created_at: createdAt,
    p_follower_avatar_url: followerProfile?.avatarUrl || null,
    p_follower_display_name: followerProfile?.displayName || 'Anonymous User',
    p_follower_id: followerId,
    p_follower_username: followerProfile?.username || null,
    p_following_avatar_url: followingProfile?.avatarUrl || null,
    p_following_display_name: followingProfile?.displayName || 'Anonymous User',
    p_following_id: followingId,
    p_following_username: followingProfile?.username || null,
    p_status: status,
  })

  if (result.error) {
    throw new Error(result.error.message || 'Follow relationship could not be updated')
  }
}

async function deleteFollowRelationship(admin, {
  actorId,
  followerId,
  followingId,
}) {
  const result = await admin.rpc('follow_delete_v2', {
    p_actor_id: actorId,
    p_follower_id: followerId,
    p_following_id: followingId,
  })

  if (result.error) {
    throw new Error(result.error.message || 'Follow relationship could not be removed')
  }
}

function resolveActivitySubjectId(row = {}) {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  const subject =
    payload?.subject && typeof payload.subject === 'object' ? payload.subject : {}
  const nestedPayload =
    payload?.payload && typeof payload.payload === 'object' ? payload.payload : {}

  return normalizeValue(
    subject?.id || nestedPayload?.subjectId || nestedPayload?.followingId
  )
}

async function deleteFollowActivityEntries(admin, { followerId, followingId }) {
  const existingActivities = await admin
    .from('activity')
    .select('id, payload')
    .eq('user_id', followerId)
    .eq('event_type', ACTIVITY_EVENT_TYPES.FOLLOW_CREATED)
    .order('created_at', { ascending: false })
    .limit(50)

  if (existingActivities.error) {
    throw new Error(existingActivities.error.message || 'Follow activity could not be loaded')
  }

  const activityIds = (existingActivities.data || [])
    .filter((row) => resolveActivitySubjectId(row) === followingId)
    .map((row) => row.id)
    .filter(Boolean)

  if (activityIds.length === 0) {
    return
  }

  const deleteResult = await admin.from('activity').delete().in('id', activityIds)

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message || 'Follow activity could not be removed')
  }
}

async function createAcceptedFollowActivity({ actorUserId, subjectProfile, subjectUserId }) {
  await processActivityEvent({
    actorUserId,
    eventType: ACTIVITY_EVENT_TYPES.FOLLOW_CREATED,
    payload: {
      dedupeKey: `follow-created:${subjectUserId}:accepted`,
      status: FOLLOW_STATUSES.ACCEPTED,
      subjectDisplayName:
        subjectProfile?.displayName || subjectProfile?.username || 'Account',
      subjectId: subjectUserId,
      subjectType: 'user',
      subjectUsername: subjectProfile?.username || null,
    },
  })
}

function publishFollowChange({
  followerId,
  followingId,
  reason,
  status = null,
}) {
  const payload = {
    followerId,
    followingId,
    reason,
    status,
  }

  publishUserEvent(followerId, 'follows', payload)
  publishUserEvent(followingId, 'follows', payload)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionContext = await readSessionFromRequest(request).catch(() => null)
    const resource = normalizeValue(searchParams.get('resource'))
    const userId = normalizeValue(searchParams.get('userId'))
    const targetId = normalizeValue(searchParams.get('targetId'))
    const status = normalizeValue(searchParams.get('status'))
    const data = await getFollowResource({
      resource,
      userId,
      targetId,
      viewerId: sessionContext?.userId || null,
      status: status || null,
    })

    return NextResponse.json({ data })
  } catch (error) {
    const status = Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500

    return NextResponse.json(
      {
        error: String(error?.message || 'Follow resource could not be loaded'),
      },
      { status }
    )
  }
}

export async function POST(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const body = await request.json().catch(() => ({}))
    const action = normalizeValue(body?.action)

    if (action !== 'follow') {
      return NextResponse.json(
        { error: 'Unsupported follow action' },
        { status: 400 }
      )
    }

    const followerId = authContext.userId
    const followingId = normalizeValue(body?.followingId)

    if (!followingId) {
      return NextResponse.json(
        { error: 'followingId is required' },
        { status: 400 }
      )
    }

    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    const [followerProfile, followingProfile] = await Promise.all([
      getAccountProfileByUserId(followerId),
      getAccountProfileByUserId(followingId),
    ])

    if (!followerProfile || !followingProfile) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 400 }
      )
    }

    const status = followingProfile.isPrivate
      ? FOLLOW_STATUSES.PENDING
      : FOLLOW_STATUSES.ACCEPTED
    const admin = createAdminClient()

    await saveFollowRelationship(admin, {
      followerId,
      followerProfile,
      followingId,
      followingProfile,
      status,
    })

    await processNotificationEvent({
      actorUserId: followerId,
      eventType: NOTIFICATION_EVENT_TYPES.FOLLOW_CREATED,
      payload: {
        followerId,
        followingId,
        status,
      },
    })

    if (status === FOLLOW_STATUSES.ACCEPTED) {
      await createAcceptedFollowActivity({
        actorUserId: followerId,
        subjectProfile: followingProfile,
        subjectUserId: followingId,
      })
    } else {
      await deleteFollowActivityEntries(admin, {
        followerId,
        followingId,
      })
    }

    publishFollowChange({
      followerId,
      followingId,
      reason: 'follow',
      status,
    })

    return NextResponse.json({
      status,
      success: true,
    })
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow action failed')

    return NextResponse.json(
      { error: message },
      { status: resolveWriteStatusCode(message) }
    )
  }
}

export async function PATCH(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const body = await request.json().catch(() => ({}))
    const action = normalizeValue(body?.action)
    const requesterId = normalizeValue(body?.requesterId)
    const userId = authContext.userId

    if (!requesterId) {
      return NextResponse.json(
        { error: 'requesterId is required' },
        { status: 400 }
      )
    }

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Unsupported follow action' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const existing = await getExistingFollow(admin, requesterId, userId)

    if (!existing || existing.status !== FOLLOW_STATUSES.PENDING) {
      return NextResponse.json(
        { error: 'Follow request has already been resolved' },
        { status: 400 }
      )
    }

    const [requesterProfile, ownerProfile] = await Promise.all([
      getAccountProfileByUserId(requesterId),
      getAccountProfileByUserId(userId),
    ])

    if (!requesterProfile || !ownerProfile) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 400 }
      )
    }

    const status =
      action === 'accept'
        ? FOLLOW_STATUSES.ACCEPTED
        : FOLLOW_STATUSES.REJECTED

    await saveFollowRelationship(admin, {
      followerId: requesterId,
      followerProfile: requesterProfile,
      followingId: userId,
      followingProfile: ownerProfile,
      status,
      createdAt: existing.created_at || null,
    })

    if (status === FOLLOW_STATUSES.ACCEPTED) {
      await deleteFollowActivityEntries(admin, {
        followerId: requesterId,
        followingId: userId,
      })

      await createAcceptedFollowActivity({
        actorUserId: requesterId,
        subjectProfile: ownerProfile,
        subjectUserId: userId,
      })

      await processNotificationEvent({
        actorUserId: userId,
        eventType: NOTIFICATION_EVENT_TYPES.FOLLOW_ACCEPTED,
        payload: {
          acceptorId: userId,
          requesterId,
        },
      })
    } else {
      await deleteFollowActivityEntries(admin, {
        followerId: requesterId,
        followingId: userId,
      })
    }

    publishFollowChange({
      followerId: requesterId,
      followingId: userId,
      reason: action,
      status,
    })

    return NextResponse.json({
      status,
      success: true,
    })
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow request could not be updated')

    return NextResponse.json(
      { error: message },
      { status: resolveWriteStatusCode(message) }
    )
  }
}

export async function DELETE(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const body = await request.json().catch(() => ({}))
    const action = normalizeValue(body?.action)
    const userId = authContext.userId
    const admin = createAdminClient()

    if (action === 'unfollow' || action === 'cancel-request') {
      const followingId = normalizeValue(body?.followingId)

      if (!followingId) {
        return NextResponse.json(
          { error: 'followingId is required' },
          { status: 400 }
        )
      }

      await deleteFollowRelationship(admin, {
        actorId: userId,
        followerId: userId,
        followingId,
      })

      if (action === 'cancel-request') {
        await deleteFollowActivityEntries(admin, {
          followerId: userId,
          followingId,
        })
      }

      publishFollowChange({
        followerId: userId,
        followingId,
        reason: action,
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'remove-follower') {
      const followerId = normalizeValue(body?.followerId)

      if (!followerId) {
        return NextResponse.json(
          { error: 'followerId is required' },
          { status: 400 }
        )
      }

      await deleteFollowRelationship(admin, {
        actorId: userId,
        followerId,
        followingId: userId,
      })

      publishFollowChange({
        followerId,
        followingId: userId,
        reason: action,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Unsupported follow action' },
      { status: 400 }
    )
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow relationship could not be removed')

    return NextResponse.json(
      { error: message },
      { status: resolveWriteStatusCode(message) }
    )
  }
}

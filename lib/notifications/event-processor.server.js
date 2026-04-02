import 'server-only'

import { NOTIFICATION_EVENT_TYPE_SET, NOTIFICATION_EVENT_TYPES } from '@/lib/constants/notification-events'
import { publishUserEvent } from '@/lib/live-updates/user-events.server'
import { NOTIFICATION_TYPES } from '@/lib/constants/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

const ACTOR_PROFILE_SELECT = ['avatar_url', 'display_name', 'email', 'username'].join(',')

function normalizeValue(value) {
  return String(value || '').trim()
}

function createActorSnapshot(userId, profile = {}) {
  return {
    avatarUrl: profile?.avatar_url || null,
    displayName:
      profile?.display_name || profile?.name || profile?.email || 'Someone',
    id: userId || null,
    username: profile?.username || null,
  }
}

function buildSubject(payload = {}) {
  const subjectType = normalizeValue(payload.subjectType).toLowerCase()
  const subjectId = normalizeValue(payload.subjectId)
  const subjectTitle = normalizeValue(payload.subjectTitle) || 'Untitled'

  if (subjectType === 'list') {
    const ownerUsername =
      normalizeValue(payload.subjectOwnerUsername || payload.ownerUsername)
    const slug = normalizeValue(payload.subjectSlug || payload.listSlug || payload.listId || subjectId)

    return {
      href: ownerUsername && slug ? `/account/${ownerUsername}/lists/${slug}` : null,
      id: subjectId || normalizeValue(payload.listId),
      ownerId: normalizeValue(payload.subjectOwnerId || payload.listOwnerId) || null,
      ownerUsername: ownerUsername || null,
      slug: slug || null,
      title: normalizeValue(payload.listTitle || subjectTitle) || 'Untitled List',
      type: 'list',
    }
  }

  if (subjectType === 'user') {
    const username = normalizeValue(payload.subjectUsername)

    return {
      href: username ? `/account/${username}` : null,
      id: subjectId || normalizeValue(payload.subjectUserId) || null,
      ownerId: null,
      ownerUsername: username || null,
      slug: null,
      title: normalizeValue(payload.subjectDisplayName || subjectTitle) || 'Account',
      type: 'user',
    }
  }

  return {
    href: subjectType && subjectId ? `/${subjectType}/${subjectId}` : null,
    id: subjectId || null,
    ownerId: null,
    ownerUsername: null,
    slug: null,
    title: subjectTitle,
    type: subjectType || null,
  }
}

function mapEventToNotification(eventType, payload = {}, actor = {}) {
  if (eventType === NOTIFICATION_EVENT_TYPES.FOLLOW_CREATED) {
    const targetUserId = normalizeValue(payload.followingId)

    if (!targetUserId) {
      return null
    }

    const status = normalizeValue(payload.status).toLowerCase()

    return {
      body: '',
      eventType:
        status === 'pending'
          ? NOTIFICATION_TYPES.FOLLOW_REQUEST
          : NOTIFICATION_TYPES.NEW_FOLLOWER,
      href: actor?.username ? `/account/${actor.username}` : null,
      userId: targetUserId,
    }
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.FOLLOW_ACCEPTED) {
    const requesterId = normalizeValue(payload.requesterId)

    if (!requesterId) {
      return null
    }

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.FOLLOW_ACCEPTED,
      href: actor?.username ? `/account/${actor.username}` : null,
      userId: requesterId,
    }
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.REVIEW_LIKED) {
    const reviewOwnerId = normalizeValue(payload.reviewOwnerId)

    if (!reviewOwnerId) {
      return null
    }

    const subject = buildSubject(payload)

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.REVIEW_LIKE,
      href: subject.href || null,
      userId: reviewOwnerId,
    }
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.LIST_LIKED) {
    const listOwnerId = normalizeValue(payload.listOwnerId)

    if (!listOwnerId) {
      return null
    }

    const subject = buildSubject({
      ...payload,
      subjectId: payload.listId || payload.subjectId,
      subjectType: 'list',
    })

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.LIST_LIKE,
      href: subject.href || null,
      userId: listOwnerId,
    }
  }

  return null
}

async function getUserProfile(admin, userId) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    return null
  }

  const result = await admin
    .from('profiles')
    .select(ACTOR_PROFILE_SELECT)
    .eq('id', normalizedUserId)
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message || 'Actor profile could not be loaded')
  }

  return result.data || null
}

export async function processNotificationEvent({
  actorUserId,
  eventType,
  payload = {},
}) {
  const normalizedActorUserId = normalizeValue(actorUserId)
  const normalizedEventType = normalizeValue(eventType)

  if (!normalizedActorUserId || !normalizedEventType) {
    return { delivered: false, reason: 'invalid-event-input' }
  }

  if (!NOTIFICATION_EVENT_TYPE_SET.has(normalizedEventType)) {
    return { delivered: false, reason: 'unsupported-event-type' }
  }

  const admin = createAdminClient()
  const actorProfile = await getUserProfile(admin, normalizedActorUserId)
  const actor = createActorSnapshot(normalizedActorUserId, actorProfile || {})
  const mapped = mapEventToNotification(normalizedEventType, payload, actor)

  if (!mapped || !mapped.userId || mapped.userId === normalizedActorUserId) {
    return {
      delivered: false,
      reason: 'notification-target-missing',
    }
  }

  const nowIso = new Date().toISOString()
  const subject = buildSubject(payload)
  const title = `${actor.displayName} sent an update`

  const result = await admin
    .from('notifications')
    .insert({
      user_id: mapped.userId,
      actor_user_id: normalizedActorUserId,
      event_type: mapped.eventType,
      title,
      body: mapped.body || '',
      href: mapped.href || null,
      metadata: {
        actor,
        payload: {
          ...payload,
          subject,
        },
      },
      read: false,
      created_at: nowIso,
      updated_at: nowIso,
    })

  if (result.error) {
    throw new Error(result.error.message || 'Notification could not be created')
  }

  publishUserEvent(mapped.userId, 'notifications', {
    reason: 'created',
  })

  return {
    delivered: true,
  }
}

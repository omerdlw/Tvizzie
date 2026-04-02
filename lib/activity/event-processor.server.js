import 'server-only'

import { ACTIVITY_EVENT_TYPE_SET } from '@/lib/constants/activity-events'
import { createAdminClient } from '@/lib/supabase/admin'

const ACTOR_PROFILE_SELECT = ['avatar_url', 'display_name', 'email', 'is_private', 'username'].join(',')

function normalizeValue(value) {
  return String(value || '').trim()
}

function buildActorSnapshot(userId, profile = {}) {
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
      poster: normalizeValue(payload.subjectPoster) || null,
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
      poster: null,
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
    poster: normalizeValue(payload.subjectPoster) || null,
    slug: null,
    title: subjectTitle,
    type: subjectType || null,
  }
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

async function getExistingActivity(admin, userId, dedupeKey) {
  if (!dedupeKey) {
    return null
  }

  const result = await admin
    .from('activity')
    .select('id')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message || 'Activity event could not be loaded')
  }

  return result.data || null
}

export async function processActivityEvent({
  actorUserId,
  eventType,
  payload = {},
}) {
  const normalizedActorUserId = normalizeValue(actorUserId)
  const normalizedEventType = normalizeValue(eventType)

  if (!normalizedActorUserId || !normalizedEventType) {
    return { delivered: false, reason: 'invalid-event-input' }
  }

  if (!ACTIVITY_EVENT_TYPE_SET.has(normalizedEventType)) {
    return { delivered: false, reason: 'unsupported-event-type' }
  }

  const admin = createAdminClient()
  const actorProfile = await getUserProfile(admin, normalizedActorUserId)
  const actor = buildActorSnapshot(normalizedActorUserId, actorProfile || {})
  const subject = buildSubject(payload)
  const visibility =
    normalizeValue(payload.visibility) ||
    (actorProfile?.is_private === true ? 'followers' : 'public')
  const dedupeKey =
    normalizeValue(payload.dedupeKey) ||
    `${normalizedEventType}:${subject.type || 'unknown'}:${subject.id || 'unknown'}:${Date.now()}`
  const nowIso = new Date().toISOString()
  const recordPayload = {
    event_type: normalizedEventType,
    dedupe_key: dedupeKey,
    payload: {
      actor,
      eventType: normalizedEventType,
      payload,
      subject,
      visibility,
    },
    updated_at: nowIso,
  }
  const existingActivity = await getExistingActivity(
    admin,
    normalizedActorUserId,
    dedupeKey
  )
  const insertResult = existingActivity
    ? await admin
        .from('activity')
        .update(recordPayload)
        .eq('id', existingActivity.id)
    : await admin.from('activity').insert({
        ...recordPayload,
        created_at: nowIso,
        user_id: normalizedActorUserId,
      })

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Activity event could not be saved')
  }

  const updateProfileResult = await admin
    .from('profiles')
    .update({
      last_activity_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', normalizedActorUserId)

  if (updateProfileResult.error) {
    throw new Error(
      updateProfileResult.error.message || 'Profile activity timestamp could not be updated'
    )
  }

  return {
    delivered: true,
  }
}

import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import {
  buildActivityDedupeLikePattern,
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/core/services/activity/canonical-key';
import { ACTIVITY_EVENT_TYPE_SET, ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import { deleteByDedupePattern, deleteByExactDedupeKey, getExistingActivity, getUserProfile } from './event-processor.queries';
import { buildActorSnapshot, buildEventRecord, normalizeValue } from './event-processor.shared';

export async function processActivityEvent({ actorUserId, eventType, payload = {} }) {
  const normalizedActorUserId = normalizeValue(actorUserId);
  const normalizedEventType = normalizeValue(eventType);

  if (!normalizedActorUserId || !normalizedEventType) {
    return { delivered: false, reason: 'invalid-event-input' };
  }

  if (!ACTIVITY_EVENT_TYPE_SET.has(normalizedEventType)) {
    return { delivered: false, reason: 'unsupported-event-type' };
  }

  const admin = createAdminClient();
  const actorProfile = await getUserProfile(admin, normalizedActorUserId);
  const actor = buildActorSnapshot(normalizedActorUserId, actorProfile || {});
  const visibility = normalizeValue(payload.visibility) || (actorProfile?.is_private === true ? 'followers' : 'public');
  const occurredAt = new Date().toISOString();
  const activityRecord = buildEventRecord({
    actor,
    eventType: normalizedEventType,
    occurredAt,
    payload,
    visibility,
  });

  const dedupeKey =
    normalizeValue(payload.dedupeKey) ||
    buildCanonicalActivityDedupeKey({
      actorUserId: normalizedActorUserId,
      primaryRef: activityRecord.primaryRef,
      secondaryRef: activityRecord.secondaryRef,
      slotType: activityRecord.slotType,
    }) ||
    `${normalizedEventType}:${activityRecord.primaryRef || 'unknown'}:${Date.now()}`;

  const recordPayload = {
    event_type: normalizedEventType,
    dedupe_key: dedupeKey,
    payload: {
      ...activityRecord,
      actor,
      dedupeKey,
    },
    updated_at: occurredAt,
  };
  const existingActivity = await getExistingActivity(admin, normalizedActorUserId, dedupeKey);
  const insertResult = existingActivity
    ? await admin.from('activity').update(recordPayload).eq('id', existingActivity.id)
    : await admin.from('activity').insert({
        ...recordPayload,
        created_at: occurredAt,
        user_id: normalizedActorUserId,
      });

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Activity event could not be saved');
  }

  const updateProfileResult = await admin
    .from('profiles')
    .update({
      last_activity_at: occurredAt,
      updated_at: occurredAt,
    })
    .eq('id', normalizedActorUserId);

  if (updateProfileResult.error) {
    throw new Error(updateProfileResult.error.message || 'Profile activity timestamp could not be updated');
  }

  return {
    delivered: true,
  };
}

export async function deleteActivityEvents({ action, actorUserId, listId, subjectId, subjectType }) {
  const normalizedAction = normalizeValue(action).toLowerCase();
  const normalizedActorUserId = normalizeValue(actorUserId);
  const admin = createAdminClient();

  if (normalizedAction === 'delete-media-opinion') {
    const dedupeKey = buildCanonicalActivityDedupeKey({
      actorUserId: normalizedActorUserId,
      primaryRef: buildActivitySubjectRef({
        subjectId,
        subjectType,
      }),
      secondaryRef: '-',
      slotType: ACTIVITY_SLOT_TYPES.MEDIA_OPINION,
    });

    if (!dedupeKey) {
      return { deleted: false, reason: 'invalid-cleanup-input' };
    }

    await deleteByExactDedupeKey(admin, {
      dedupeKey,
      userId: normalizedActorUserId,
    });

    return { deleted: true };
  }

  if (normalizedAction === 'delete-list-opinion') {
    const dedupeKey = buildCanonicalActivityDedupeKey({
      actorUserId: normalizedActorUserId,
      primaryRef: buildActivitySubjectRef({
        subjectId: listId,
        subjectType: 'list',
      }),
      secondaryRef: '-',
      slotType: ACTIVITY_SLOT_TYPES.LIST_OPINION,
    });

    if (!dedupeKey) {
      return { deleted: false, reason: 'invalid-cleanup-input' };
    }

    await deleteByExactDedupeKey(admin, {
      dedupeKey,
      userId: normalizedActorUserId,
    });

    return { deleted: true };
  }

  if (normalizedAction === 'delete-list-activity') {
    const primaryRef = buildActivitySubjectRef({
      subjectId: listId,
      subjectType: 'list',
    });

    if (!primaryRef) {
      return { deleted: false, reason: 'invalid-cleanup-input' };
    }

    await deleteByDedupePattern(
      admin,
      buildActivityDedupeLikePattern({
        slotType: ACTIVITY_SLOT_TYPES.LIST_CREATED,
        primaryRef,
      })
    );
    await deleteByDedupePattern(
      admin,
      buildActivityDedupeLikePattern({
        slotType: ACTIVITY_SLOT_TYPES.LIST_OPINION,
        primaryRef,
      })
    );
    await deleteByDedupePattern(
      admin,
      buildActivityDedupeLikePattern({
        slotType: ACTIVITY_SLOT_TYPES.LIST_LIKE,
        primaryRef,
      })
    );

    return { deleted: true };
  }

  return { deleted: false, reason: 'unsupported-cleanup-action' };
}

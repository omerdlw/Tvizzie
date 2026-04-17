import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { buildActivityDedupeLikePattern, buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_EVENT_TYPE_SET, ACTIVITY_EVENT_TYPES, ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';

const ACTOR_PROFILE_SELECT = ['avatar_url', 'display_name', 'email', 'is_private', 'username'].join(',');

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePreviewItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      return {
        entityId: normalizeValue(item.entityId || item.id),
        entityType: normalizeValue(item.entityType || item.media_type).toLowerCase(),
        mediaKey: normalizeValue(item.mediaKey),
        poster_path: normalizeValue(item.poster_path || item.posterPath) || null,
        title: normalizeValue(item.title || item.name) || 'Untitled',
      };
    })
    .filter((item) => item?.entityId && item?.entityType)
    .slice(0, 5);
}

function buildActorSnapshot(userId, profile = {}) {
  return {
    avatarUrl: profile?.avatar_url || null,
    displayName: profile?.display_name || profile?.name || profile?.email || 'Someone',
    id: userId || null,
    username: profile?.username || null,
  };
}

function buildMovieSubject(payload = {}) {
  const subjectType = normalizeValue(payload.subjectType).toLowerCase();
  const subjectId = normalizeValue(payload.subjectId);
  const subjectTitle = normalizeValue(payload.subjectTitle) || 'Untitled';

  if (!subjectType || !subjectId) {
    throw new Error('invalid-event-payload: movie subject is required');
  }

  return {
    href: `/${subjectType}/${subjectId}`,
    id: subjectId,
    ownerId: null,
    ownerUsername: null,
    poster: normalizeValue(payload.subjectPoster) || null,
    slug: null,
    title: subjectTitle,
    type: subjectType,
  };
}

function buildListSubject(payload = {}) {
  const subjectId = normalizeValue(payload.subjectId || payload.listId);
  const ownerId = normalizeValue(payload.subjectOwnerId || payload.ownerId);
  const ownerUsername = normalizeValue(payload.subjectOwnerUsername || payload.ownerUsername);
  const slug = normalizeValue(payload.subjectSlug || payload.listSlug || subjectId);
  const title = normalizeValue(payload.subjectTitle || payload.listTitle) || 'Untitled List';

  if (!subjectId || !slug) {
    throw new Error('invalid-event-payload: list subject is required');
  }

  return {
    href: ownerUsername ? `/account/${ownerUsername}/lists/${slug}` : null,
    id: subjectId,
    ownerId: ownerId || null,
    ownerUsername: ownerUsername || null,
    poster: normalizeValue(payload.subjectPoster) || null,
    slug,
    title,
    type: 'list',
  };
}

function buildSubject(payload = {}) {
  const subjectType = normalizeValue(payload.subjectType).toLowerCase();

  if (subjectType === 'list') {
    return buildListSubject(payload);
  }

  return buildMovieSubject(payload);
}

function buildReviewCardSnapshot({ actor, occurredAt, payload = {}, subject }) {
  const rating = normalizeOptionalNumber(payload.reviewRating ?? payload.rating);
  const content = normalizeValue(payload.reviewContent ?? payload.content);

  if (!content && rating === null) {
    return null;
  }

  return {
    authorId: actor.id,
    content,
    createdAt: occurredAt,
    id: `${subject.type || 'subject'}:${subject.id || 'unknown'}:${actor.id || 'actor'}:${occurredAt}`,
    isSpoiler: Boolean(payload.reviewIsSpoiler ?? payload.isSpoiler),
    likes: [],
    rating,
    reviewUserId: actor.id,
    subjectHref: subject.href,
    subjectId: subject.id,
    subjectKey: normalizeValue(payload.subjectKey || buildActivitySubjectRef({ subjectId: subject.id, subjectType: subject.type })),
    subjectOwnerId: subject.ownerId || null,
    subjectOwnerUsername: subject.ownerUsername || null,
    subjectPreviewItems: normalizePreviewItems(payload.subjectPreviewItems),
    subjectPoster: subject.poster || null,
    subjectSlug: subject.slug || null,
    subjectTitle: subject.title,
    subjectType: subject.type,
    updatedAt: occurredAt,
    user: {
      avatarUrl: actor.avatarUrl || null,
      id: actor.id,
      name: actor.displayName || 'Anonymous User',
      username: actor.username || null,
    },
  };
}

function buildReviewLikeDetails(payload = {}) {
  const reviewOwnerId = normalizeValue(payload.reviewOwnerId || payload.reviewUserId);
  const reviewOwnerUsername = normalizeValue(payload.reviewOwnerUsername);
  const reviewOwnerDisplayName = normalizeValue(payload.reviewOwnerDisplayName);
  const reviewKey = normalizeValue(payload.reviewKey);

  if (!reviewOwnerId || !reviewKey) {
    throw new Error('invalid-event-payload: review like context is required');
  }

  return {
    reviewKey,
    reviewOwnerDisplayName: reviewOwnerDisplayName || reviewOwnerUsername || 'Someone',
    reviewOwnerId,
    reviewOwnerUsername: reviewOwnerUsername || null,
    reviewRating: normalizeOptionalNumber(payload.reviewRating ?? payload.rating),
  };
}

function buildEventRecord({ actor, eventType, occurredAt, payload = {}, visibility }) {
  const subject = buildSubject(payload);
  const subjectRef = buildActivitySubjectRef({
    subjectId: subject.id,
    subjectType: subject.type,
  });

  if (!subjectRef) {
    throw new Error('invalid-event-payload: subject ref is required');
  }

  switch (eventType) {
    case ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED:
      return {
        details: {},
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text',
        reviewCard: null,
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.WATCHLIST_ENTRY,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.LIKED_ADDED:
      return {
        details: {},
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text',
        reviewCard: null,
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.LIKED_ENTRY,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.WATCHED_ADDED:
      return {
        details: {
          watchedAt: normalizeValue(payload.watchedAt) || occurredAt,
        },
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text',
        reviewCard: null,
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.WATCHED_ENTRY,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.RATING_LOGGED:
      return {
        details: {
          rating: normalizeOptionalNumber(payload.reviewRating ?? payload.rating),
        },
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text',
        reviewCard: null,
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.MEDIA_OPINION,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED:
      return {
        details: {
          rating: normalizeOptionalNumber(payload.reviewRating ?? payload.rating),
        },
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text_with_review',
        reviewCard: buildReviewCardSnapshot({
          actor,
          occurredAt,
          payload,
          subject,
        }),
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.MEDIA_OPINION,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.LIST_CREATED:
      return {
        details: {},
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text',
        reviewCard: null,
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.LIST_CREATED,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.LIST_COMMENTED:
      return {
        details: {
          rating: normalizeOptionalNumber(payload.reviewRating ?? payload.rating),
        },
        eventType,
        occurredAt,
        primaryRef: subjectRef,
        renderKind: 'text_with_review',
        reviewCard: buildReviewCardSnapshot({
          actor,
          occurredAt,
          payload,
          subject,
        }),
        secondaryRef: '-',
        slotType: ACTIVITY_SLOT_TYPES.LIST_OPINION,
        subject,
        version: 2,
        visibility,
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_LIKED: {
      const details = buildReviewLikeDetails(payload);

      return {
        details,
        eventType,
        occurredAt,
        primaryRef: details.reviewKey,
        renderKind: 'text',
        reviewCard: null,
        secondaryRef: details.reviewOwnerId,
        slotType: ACTIVITY_SLOT_TYPES.REVIEW_LIKE,
        subject,
        version: 2,
        visibility,
      };
    }
    default:
      throw new Error('unsupported-event-type');
  }
}

async function getUserProfile(admin, userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const result = await admin.from('profiles').select(ACTOR_PROFILE_SELECT).eq('id', normalizedUserId).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Actor profile could not be loaded');
  }

  return result.data || null;
}

async function getExistingActivity(admin, userId, dedupeKey) {
  if (!dedupeKey) {
    return null;
  }

  const result = await admin.from('activity').select('id').eq('user_id', userId).eq('dedupe_key', dedupeKey).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Activity event could not be loaded');
  }

  return result.data || null;
}

async function deleteByExactDedupeKey(admin, { dedupeKey, userId }) {
  const query = admin.from('activity').delete().eq('dedupe_key', dedupeKey);
  const result = userId ? await query.eq('user_id', userId) : await query;

  if (result.error) {
    throw new Error(result.error.message || 'Activity rows could not be removed');
  }

  return Array.isArray(result.data) ? result.data.length : 0;
}

async function deleteByDedupePattern(admin, pattern) {
  const result = await admin.from('activity').delete().like('dedupe_key', pattern);

  if (result.error) {
    throw new Error(result.error.message || 'Activity rows could not be removed');
  }

  return Array.isArray(result.data) ? result.data.length : 0;
}

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

    return { deleted: true };
  }

  return { deleted: false, reason: 'unsupported-cleanup-action' };
}

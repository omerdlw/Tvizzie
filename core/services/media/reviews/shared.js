import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';

export function normalizeRating(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0.5 || parsedValue > 5) {
    throw new Error('Rating must be a number between 0.5 and 5');
  }

  return Math.round(parsedValue * 2) / 2;
}

export function normalizeReviewContent(value) {
  return String(value || '').trim();
}

export function capitalizeLabel(value) {
  const normalizedValue = normalizeReviewContent(value);

  if (!normalizedValue) {
    return '';
  }

  return `${normalizedValue.charAt(0).toUpperCase()}${normalizedValue.slice(1)}`;
}

export function unwrapReviewWriteResult(payload = {}) {
  if (payload?.result && typeof payload.result === 'object') {
    return payload.result;
  }

  if (payload && typeof payload === 'object') {
    return payload;
  }

  return {};
}

export function createListReviewLikeKey(ownerId, listId) {
  return `list:${ownerId}:${listId}`;
}

export function buildMediaSubjectMetadata(media = {}) {
  const mediaSnapshot = assertMovieMedia(media, 'Only movie reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);

  return {
    subjectHref: `/${mediaSnapshot.entityType}/${mediaSnapshot.entityId}`,
    subjectId: mediaSnapshot.entityId,
    subjectKey: mediaKey,
    subjectPoster: media.posterPath || media.poster_path || null,
    subjectTitle: media.title || media.name || 'Untitled',
    subjectType: mediaSnapshot.entityType,
  };
}

export function buildListSubjectMetadata({ list = null, listId, ownerId, ownerUsername = null }) {
  const resolvedSlug = list?.slug || listId;
  const resolvedOwnerId = ownerId || list?.ownerId || list?.ownerSnapshot?.id;
  const resolvedOwnerUsername = ownerUsername || list?.ownerSnapshot?.username || resolvedOwnerId;

  return {
    subjectHref: `/account/${resolvedOwnerUsername}/lists/${resolvedSlug}`,
    subjectId: listId || list?.id,
    subjectKey: createListReviewLikeKey(resolvedOwnerId, listId || list?.id),
    subjectOwnerId: resolvedOwnerId,
    subjectOwnerUsername: resolvedOwnerUsername,
    subjectPreviewItems: Array.isArray(list?.previewItems) ? list.previewItems : [],
    subjectPoster: list?.coverUrl || list?.previewItems?.[0]?.poster_path || null,
    subjectSlug: resolvedSlug,
    subjectTitle: list?.title || 'Untitled List',
    subjectType: 'list',
  };
}

export function buildMediaOpinionDedupeKey(userId, subjectMetadata = {}) {
  return buildCanonicalActivityDedupeKey({
    actorUserId: userId,
    primaryRef: buildActivitySubjectRef({
      subjectId: subjectMetadata.subjectId,
      subjectType: subjectMetadata.subjectType,
    }),
    slotType: ACTIVITY_SLOT_TYPES.MEDIA_OPINION,
  });
}

export function buildListOpinionDedupeKey(userId, subjectMetadata = {}) {
  return buildCanonicalActivityDedupeKey({
    actorUserId: userId,
    primaryRef: buildActivitySubjectRef({
      subjectId: subjectMetadata.subjectId,
      subjectType: subjectMetadata.subjectType,
    }),
    slotType: ACTIVITY_SLOT_TYPES.LIST_OPINION,
  });
}

export function buildReviewCardPayload({ content, isSpoiler = false, rating = null, subjectMetadata = {}, user }) {
  return {
    content,
    reviewContent: content,
    reviewIsSpoiler: Boolean(isSpoiler),
    reviewRating: rating,
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectKey: subjectMetadata.subjectKey,
    subjectOwnerId: subjectMetadata.subjectOwnerId || null,
    subjectOwnerUsername: subjectMetadata.subjectOwnerUsername || null,
    subjectPoster: subjectMetadata.subjectPoster || null,
    subjectPreviewItems: Array.isArray(subjectMetadata.subjectPreviewItems) ? subjectMetadata.subjectPreviewItems : [],
    subjectSlug: subjectMetadata.subjectSlug || null,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
    user: {
      avatarUrl: user.avatarUrl || user.photoURL || null,
      email: user.email || null,
      id: user.id,
      name: user.displayName || user.name || user.email || 'Anonymous User',
      username: user.username || null,
    },
  };
}

export function buildReviewLikeActivityPayload(review = {}) {
  const subjectType = review.subjectType;
  const subjectId = review.subjectId;
  const reviewUserId = review.reviewUserId || review?.user?.id;
  const reviewKey = review.subjectKey || review.mediaKey || null;

  if (!subjectType || !subjectId || !reviewUserId || !reviewKey) {
    return null;
  }

  return {
    reviewKey,
    reviewOwnerDisplayName: review?.user?.name || 'Anonymous User',
    reviewOwnerId: reviewUserId,
    reviewOwnerUsername: review?.user?.username || null,
    reviewRating: review.rating ?? null,
    subjectHref: review.subjectHref || null,
    subjectId,
    subjectOwnerId: review.subjectOwnerId || null,
    subjectOwnerUsername: review.subjectOwnerUsername || null,
    subjectPoster: review.subjectPoster || null,
    subjectSlug: review.subjectSlug || null,
    subjectTitle: review.subjectTitle || 'Untitled',
    subjectType,
  };
}

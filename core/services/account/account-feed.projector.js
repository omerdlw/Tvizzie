import 'server-only';

import { ACTIVITY_EVENT_TYPES } from '@/core/services/activity/activity-events.constants';
import { normalizeMediaType } from '@/core/utils/media';
import { normalizeValue } from './account-feed.normalizers';

function buildAccountHref({ id = null, username = null } = {}) {
  const normalizedUsername = normalizeValue(username);
  const normalizedId = normalizeValue(id);

  if (normalizedUsername) {
    return `/account/${normalizedUsername}`;
  }

  if (normalizedId) {
    return `/account/${normalizedId}`;
  }

  return null;
}

function createTextPart(text) {
  return {
    kind: 'text',
    text,
  };
}

function createRatingPart(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return {
    kind: 'rating',
    rating: numericValue,
  };
}

function createLinkPart(kind, text, href = null) {
  return {
    href: href || null,
    kind,
    text,
  };
}

function getPossessiveSuffix(label) {
  return normalizeValue(label).toLowerCase().endsWith('s') ? "' " : "'s ";
}

function createActorPart(actor = {}, viewerId = null) {
  const isViewerActor = normalizeValue(actor.id) && normalizeValue(actor.id) === normalizeValue(viewerId);

  return {
    href: buildAccountHref(actor),
    kind: 'actor',
    text: isViewerActor ? 'You' : actor.displayName || actor.username || 'Someone',
  };
}

function createSubjectPart(subject = {}) {
  return createLinkPart('subject', subject.title || 'Untitled', subject.href || null);
}

function buildListReferenceParts(item, viewerId = null) {
  const isViewerActor = normalizeValue(item?.actor?.id) && normalizeValue(item.actor.id) === normalizeValue(viewerId);
  const isOwnList =
    normalizeValue(item?.subject?.ownerId) && normalizeValue(item.subject.ownerId) === normalizeValue(item?.actor?.id);

  if (isOwnList) {
    return [
      createTextPart(isViewerActor ? 'your own ' : 'their own '),
      createSubjectPart(item.subject),
      createTextPart(' list'),
    ];
  }

  const ownerLabel = item?.subject?.ownerUsername || 'someone';
  return [
    createTextPart(`${ownerLabel}${getPossessiveSuffix(ownerLabel)}`),
    createSubjectPart(item.subject),
    createTextPart(' list'),
  ];
}

function projectActivityLine(item = {}, viewerId = null) {
  const actorPart = createActorPart(item.actor, viewerId);
  const subjectPart = createSubjectPart(item.subject);
  const ratingPart = createRatingPart(item?.details?.rating);

  switch (item.eventType) {
    case ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED:
      return {
        parts: [
          actorPart,
          createTextPart(' added '),
          subjectPart,
          createTextPart(actorPart.text === 'You' ? ' to your watchlist' : ' to their watchlist'),
        ],
      };
    case ACTIVITY_EVENT_TYPES.LIKED_ADDED:
      return {
        parts: [actorPart, createTextPart(' liked '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.WATCHED_ADDED:
      return {
        parts: [actorPart, createTextPart(' watched '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.RATING_LOGGED:
      return {
        parts: [
          actorPart,
          createTextPart(' rated '),
          subjectPart,
          ...(ratingPart ? [createTextPart(' '), ratingPart] : []),
        ],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED:
      return {
        parts: [actorPart, createTextPart(' reviewed '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.LIST_CREATED:
      return {
        parts: [actorPart, createTextPart(' created a list: '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.LIST_COMMENTED:
      return {
        parts: [actorPart, createTextPart(' commented on '), ...buildListReferenceParts(item, viewerId)],
      };
    case ACTIVITY_EVENT_TYPES.LIST_LIKED:
      return {
        parts: [actorPart, createTextPart(' liked '), ...buildListReferenceParts(item, viewerId)],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_LIKED: {
      const reviewOwnerLabel = item?.details?.reviewOwnerDisplayName || item?.details?.reviewOwnerUsername || 'Someone';
      const reviewOwnerHref = buildAccountHref({
        id: item?.details?.reviewOwnerId,
        username: item?.details?.reviewOwnerUsername,
      });
      const likedReviewRatingPart =
        normalizeMediaType(item?.subject?.type) === 'movie' ? createRatingPart(item?.details?.reviewRating) : null;

      return {
        parts: likedReviewRatingPart
          ? [
              actorPart,
              createTextPart(' liked '),
              createLinkPart('account', reviewOwnerLabel, reviewOwnerHref),
              createTextPart(getPossessiveSuffix(reviewOwnerLabel)),
              likedReviewRatingPart,
              createTextPart(' review of '),
              subjectPart,
            ]
          : [
              actorPart,
              createTextPart(' liked '),
              createLinkPart('account', reviewOwnerLabel, reviewOwnerHref),
              createTextPart(`${getPossessiveSuffix(reviewOwnerLabel)}review of `),
              subjectPart,
            ],
      };
    }
    default:
      return {
        parts: [actorPart, createTextPart(' updated '), subjectPart],
      };
  }
}

export function projectActivityItem(item = {}, viewerId = null) {
  const line = projectActivityLine(item, viewerId);

  return {
    ...item,
    line,
    renderKind: item.renderKind === 'text_with_review' && item.reviewCard ? 'text_with_review' : 'text',
    reviewCard: item.renderKind === 'text_with_review' ? item.reviewCard : null,
  };
}

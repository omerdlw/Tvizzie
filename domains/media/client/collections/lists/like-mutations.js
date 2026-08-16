'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/domains/social/client/activity/activity-events';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/domains/social/utils';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/domains/social/client/notifications/notification-events';
import { invalidatePollingSubscription } from '@/infrastructure/realtime/polling-subscription-service';
export async function toggleListLike({ ownerId, listId, userId }) {
  if (!ownerId || !listId || !userId) {
    throw new Error('ownerId, listId, and userId are required to like a list');
  }

  if (ownerId === userId) {
    throw new Error('You cannot like your own list');
  }

  const result = await requestApiJson('/api/lists/like', {
    method: 'POST',
    body: {
      listId,
      ownerId,
    },
  });
  const isNowLiked = result?.isNowLiked === true;

  if (isNowLiked) {
    const listOwnerUsername = result?.list?.ownerUsername || null;
    const listTitle = result?.list?.title || 'Untitled List';
    const listSlug = result?.list?.slug || listId;
    const listPoster = result?.list?.poster || null;

    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.LIST_LIKED, {
      listOwnerId: ownerId,
      listId,
      listSlug,
      listTitle,
      subjectId: listId,
      subjectOwnerId: ownerId,
      subjectOwnerUsername: listOwnerUsername,
      subjectSlug: listSlug,
      subjectTitle: listTitle,
      subjectType: 'list',
    });
    fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_LIKED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        primaryRef: buildActivitySubjectRef({
          subjectId: listId,
          subjectType: 'list',
        }),
        secondaryRef: ownerId,
        slotType: ACTIVITY_SLOT_TYPES.LIST_LIKE,
      }),
      listId,
      listSlug,
      listTitle,
      ownerUsername: listOwnerUsername,
      subjectId: listId,
      subjectOwnerId: ownerId,
      subjectOwnerUsername: listOwnerUsername,
      subjectPoster: listPoster,
      subjectSlug: listSlug,
      subjectTitle: listTitle,
      subjectType: 'list',
    });
  }

  invalidatePollingSubscription('lists:slug', { refetch: true });
  invalidatePollingSubscription('lists:liked', { refetch: true });
  invalidatePollingSubscription('lists:user', { refetch: true });
  invalidatePollingSubscription('lists:item', { refetch: true });

  return isNowLiked;
}

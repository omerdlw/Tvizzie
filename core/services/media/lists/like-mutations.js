'use client';

import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/client';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/core/services/notifications/notification-events.service';
import { resolveRpcRow } from './shared.js';

export async function toggleListLike({ ownerId, listId, userId }) {
  if (!ownerId || !listId || !userId) {
    throw new Error('ownerId, listId, and userId are required to like a list');
  }

  if (ownerId === userId) {
    throw new Error('You cannot like your own list');
  }

  const client = getSupabaseClient();
  const listResult = await client
    .from('lists')
    .select('slug,title,payload,poster_path')
    .eq('id', listId)
    .eq('user_id', ownerId)
    .maybeSingle();

  assertSupabaseResult(listResult, 'List could not be loaded');

  if (!listResult.data) {
    throw new Error('List not found');
  }

  const rpcResult = await client.rpc('collection_toggle_list_like', {
    p_list_id: listId,
    p_owner_id: ownerId,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'List like state could not be updated');

  const rpcRow = resolveRpcRow(rpcResult.data);
  const isNowLiked = rpcRow?.is_liked === true;

  if (isNowLiked) {
    const listOwnerUsername = listResult.data?.payload?.ownerSnapshot?.username || null;
    const listTitle = listResult.data.title || listResult.data?.payload?.title || 'Untitled List';
    const listSlug = listResult.data.slug || listId;
    const listPoster = listResult.data?.payload?.coverUrl || listResult.data?.poster_path || null;

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

  return isNowLiked;
}

export async function updateListReviewsCount({ ownerId, listId, delta }) {
  if (!ownerId || !listId || !Number.isFinite(Number(delta))) {
    throw new Error('ownerId, listId, and delta are required');
  }

  const client = getSupabaseClient();
  const listResult = await client
    .from('lists')
    .select('reviews_count')
    .eq('id', listId)
    .eq('user_id', ownerId)
    .maybeSingle();

  assertSupabaseResult(listResult, 'List could not be loaded');

  if (!listResult.data) {
    throw new Error('List not found');
  }

  const nextReviewsCount = Math.max(0, Number(listResult.data.reviews_count || 0) + Number(delta));
  const updateResult = await client
    .from('lists')
    .update({
      reviews_count: nextReviewsCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', ownerId);

  assertSupabaseResult(updateResult, 'List review count could not be updated');
}

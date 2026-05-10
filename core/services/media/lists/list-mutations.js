'use client';

import { cleanString } from '@/core/utils';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import { createMediaPayload, ensureUserId } from '@/core/services/shared/supabase-media-utils.service';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
  removeActivityEvents,
} from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import { LIST_ROW_SELECT } from './constants.js';
import { fetchListById } from './queries.js';
import {
  buildListOwnerSnapshot,
  createListPayload,
  dedupeListItems,
  normalizeListOwnerSnapshot,
  normalizeListPreviewItem,
  normalizeListRow,
  slugifyListTitle,
  validateListDescription,
  validateListTitle,
} from './shared.js';
import { syncUserListDerivedState } from './derived-state.js';

function fireListCreatedActivity({ listId, ownerSnapshot, slug, title, userId }) {
  fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_CREATED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      primaryRef: buildActivitySubjectRef({
        subjectId: listId,
        subjectType: 'list',
      }),
      slotType: ACTIVITY_SLOT_TYPES.LIST_CREATED,
    }),
    listId,
    listSlug: slug,
    listTitle: title,
    subjectOwnerId: userId,
    ownerUsername: ownerSnapshot?.username || null,
    subjectId: listId,
    subjectTitle: title,
    subjectType: 'list',
  });
}

export async function createUserList({ userId, title, description = '', coverUrl = '' }) {
  ensureUserId(userId, 'Authenticated user is required to create a list');

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const slug = slugifyListTitle(validatedTitle) || 'list';
  const ownerSnapshot = await buildListOwnerSnapshot(userId);
  const normalizedCoverUrl = cleanString(coverUrl);
  const nowIso = new Date().toISOString();
  const payload = createListPayload({
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    ownerSnapshot,
    previewItems: [],
    slug,
    title: validatedTitle,
  });
  const client = getSupabaseClient();
  const insertResult = await client
    .from('lists')
    .insert({
      user_id: userId,
      slug,
      title: validatedTitle,
      description: validatedDescription,
      poster_path: normalizedCoverUrl,
      likes_count: 0,
      reviews_count: 0,
      payload,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(LIST_ROW_SELECT)
    .single();

  assertSupabaseResult(insertResult, 'List could not be created');

  fireListCreatedActivity({
    listId: insertResult.data.id,
    ownerSnapshot,
    slug,
    title: validatedTitle,
    userId,
  });

  return normalizeListRow(insertResult.data, new Map());
}

export async function createUserListWithItems({ userId, title, description = '', coverUrl = '', items = [] }) {
  ensureUserId(userId, 'Authenticated user is required to create a list');

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const normalizedItems = dedupeListItems(items);
  const slug = slugifyListTitle(validatedTitle) || 'list';
  const ownerSnapshot = await buildListOwnerSnapshot(userId);
  const normalizedCoverUrl = cleanString(coverUrl);
  const previewItems = normalizedItems.slice(0, 5).map(normalizeListPreviewItem).filter(Boolean);
  const nowIso = new Date().toISOString();
  const payload = createListPayload({
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    itemsCount: normalizedItems.length,
    ownerSnapshot,
    previewItems,
    slug,
    title: validatedTitle,
  });
  const client = getSupabaseClient();
  const insertResult = await client
    .from('lists')
    .insert({
      user_id: userId,
      slug,
      title: validatedTitle,
      description: validatedDescription,
      poster_path: normalizedCoverUrl,
      likes_count: 0,
      reviews_count: 0,
      payload,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(LIST_ROW_SELECT)
    .single();

  assertSupabaseResult(insertResult, 'List could not be created');

  if (normalizedItems.length > 0) {
    const itemRows = normalizedItems.map((item) => {
      const mediaPayload = createMediaPayload(
        {
          ...item,
          position: item.position,
        },
        userId,
        {
          addedAt: nowIso,
          updatedAt: nowIso,
          position: item.position,
        }
      );

      return {
        list_id: insertResult.data.id,
        user_id: userId,
        media_key: mediaPayload.mediaKey,
        entity_id: mediaPayload.entityId,
        entity_type: mediaPayload.entityType,
        title: mediaPayload.title,
        poster_path: mediaPayload.poster_path,
        backdrop_path: mediaPayload.backdrop_path,
        position: Number.isFinite(Number(item.position)) ? Number(item.position) : null,
        payload: mediaPayload,
        added_at: nowIso,
        updated_at: nowIso,
      };
    });

    const itemInsertResult = await client.from('list_items').insert(itemRows);

    assertSupabaseResult(itemInsertResult, 'List items could not be created');

    await syncUserListDerivedState({ userId, listId: insertResult.data.id });
  }

  fireListCreatedActivity({
    listId: insertResult.data.id,
    ownerSnapshot,
    slug,
    title: validatedTitle,
    userId,
  });

  return fetchListById(userId, insertResult.data.id);
}

export async function updateUserList({ userId, listId, title, description = '', coverUrl = '' }) {
  ensureUserId(userId, 'Authenticated user and listId are required to update a list');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to update a list');
  }

  const validatedTitle = validateListTitle(title);
  const validatedDescription = validateListDescription(description);
  const normalizedCoverUrl = cleanString(coverUrl);
  const client = getSupabaseClient();
  const listResult = await client.from('lists').select('payload').eq('id', listId).eq('user_id', userId).maybeSingle();

  assertSupabaseResult(listResult, 'List could not be loaded');

  if (!listResult.data) {
    throw new Error('List not found');
  }

  const existingPayload =
    listResult.data.payload && typeof listResult.data.payload === 'object' ? listResult.data.payload : {};
  const ownerSnapshot =
    normalizeListOwnerSnapshot(existingPayload.ownerSnapshot, userId) || (await buildListOwnerSnapshot(userId));
  const nextPayload = {
    ...existingPayload,
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    ownerSnapshot,
    slug: slugifyListTitle(validatedTitle) || 'list',
    title: validatedTitle,
  };
  const updateResult = await client
    .from('lists')
    .update({
      title: validatedTitle,
      description: validatedDescription,
      slug: slugifyListTitle(validatedTitle) || 'list',
      poster_path: normalizedCoverUrl,
      payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', userId);

  assertSupabaseResult(updateResult, 'List could not be updated');

  return fetchListById(userId, listId);
}

export async function deleteUserList({ userId, listId }) {
  ensureUserId(userId, 'Authenticated user and listId are required to delete a list');

  if (!listId) {
    throw new Error('Authenticated user and listId are required to delete a list');
  }

  const client = getSupabaseClient();
  await removeActivityEvents({
    action: 'delete-list-activity',
    listId,
  });
  const result = await client.from('lists').delete().eq('id', listId).eq('user_id', userId);

  assertSupabaseResult(result, 'List could not be deleted');

  return true;
}
